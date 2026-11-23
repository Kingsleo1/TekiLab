import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRightLeft, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  MapPin, 
  Package, 
  Tag, 
  TrendingUp,
  History,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Download,
  Share2,
  X,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { apiService } from '../../services/api';
import { Product, Pharmacy, Category } from '../../types/pharmacy';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TransferView() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sourceProducts, setSourceProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);

  // Transfer Cart / Batch selection state
  const [transferCart, setTransferCart] = useState<Array<{ product: Product; quantity: number }>>([]);

  // Modal & share state
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [sharePopoverBatch, setSharePopoverBatch] = useState<string | null>(null);

  // Form State
  const [sourceId, setSourceId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isRefreshingBranches, setIsRefreshingBranches] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sourceId) {
      loadProductsForSource(sourceId);
      // Clear transfer list on source change to avoid cross-source stock corruption
      setTransferCart([]);
    } else {
      setSourceProducts([]);
      setSelectedProductId('');
      setTransferCart([]);
    }
  }, [sourceId]);

  const loadInitialData = async () => {
    try {
      const [ph, cat, tr] = await Promise.all([
        apiService.pharmacies.list(),
        apiService.categories.list(),
        apiService.transfers.list()
      ]);
      const validBranches = (ph || []).filter(b => b.status === 'active' || !b.status);
      setPharmacies(validBranches);
      setCategories(cat || []);
      setTransfers(tr || []);

      // Default to "all" categories so user doesn't have to select a category first
      setSelectedCategory('all');

      // Pre-select first real database branch as source
      if (validBranches && validBranches.length > 0) {
        setSourceId(validBranches[0].id);
        // Pre-select second real database branch as destination if available
        if (validBranches.length > 1) {
          setDestinationId(validBranches[1].id);
        }
      }
    } catch (err) {
      console.error('Error loading initial data for transfer:', err);
      toast.error('Failed to load initial data');
    }
  };

  const handleRefreshBranches = async () => {
    setIsRefreshingBranches(true);
    try {
      const ph = await apiService.pharmacies.list();
      const validBranches = (ph || []).filter(b => b.status === 'active' || !b.status);
      setPharmacies(validBranches);
      toast.success(`Synchronized ${validBranches.length} database branch(es)`);
    } catch (err) {
      toast.error('Failed to reload branches');
    } finally {
      setIsRefreshingBranches(false);
    }
  };

  const loadProductsForSource = async (pharmaId: string) => {
    try {
      const prods = await apiService.products.list(pharmaId);
      setSourceProducts(prods || []);
      setSelectedProductId('');
      setQuantity('');
    } catch (err) {
      console.error('Error loading source products:', err);
      toast.error('Failed to load products for selected source');
    }
  };

  // Filter products by selected category AND search query
  const filteredProducts = sourceProducts.filter(p => {
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = productSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      p.name.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const selectedProduct = sourceProducts.find(p => p.id === selectedProductId);
  const availableDestinations = pharmacies.filter(ph => ph.id !== sourceId);

  const handleAddToTransferCart = () => {
    if (!selectedProductId || !selectedProduct) {
      toast.error('Please select an item or product first');
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (qtyNum > selectedProduct.stock) {
      toast.error(`Insufficient stock! Only ${selectedProduct.stock} units available at source.`);
      return;
    }

    // Check if product is already in the transfer cart
    const existingIndex = transferCart.findIndex(item => item.product.id === selectedProductId);
    if (existingIndex !== -1) {
      const currentCartQty = transferCart[existingIndex].quantity;
      const totalRequested = currentCartQty + qtyNum;
      if (totalRequested > selectedProduct.stock) {
        toast.error(`Cannot add. Combined quantity (${totalRequested}) exceeds available stock (${selectedProduct.stock}).`);
        return;
      }
      const updatedCart = [...transferCart];
      updatedCart[existingIndex].quantity = totalRequested;
      setTransferCart(updatedCart);
    } else {
      setTransferCart([...transferCart, { product: selectedProduct, quantity: qtyNum }]);
    }

    toast.success(`Added ${qtyNum}x ${selectedProduct.name} to the transfer list`);
    
    // Reset product and quantity fields
    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveFromTransferCart = (index: number) => {
    const item = transferCart[index];
    setTransferCart(transferCart.filter((_, idx) => idx !== index));
    toast.info(`Removed ${item.product.name} from transfer list`);
  };

  // Helper to group individual transfer records into batches
  const getGroupedBatches = () => {
    const groups: Record<string, any> = {};
    const safeTransfers = transfers || [];

    safeTransfers.forEach(tr => {
      const bId = tr.batchId || `BATCH-${tr.id}`;
      if (!groups[bId]) {
        groups[bId] = {
          batchId: bId,
          sourcePharmacyId: tr.sourcePharmacyId,
          targetPharmacyId: tr.targetPharmacyId,
          createdAt: tr.createdAt,
          status: tr.status || 'received',
          items: []
        };
      }
      groups[bId].items.push({
        id: tr.id,
        productName: tr.productName,
        quantity: tr.quantity
      });
    });

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Generate and return a jsPDF instance for the transfer batch
  const buildTransferPDF = (batch: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const srcName = getPharmacyName(batch.sourcePharmacyId);
    const destName = getPharmacyName(batch.targetPharmacyId);

    // Colors
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [37, 99, 235]; // Blue 600
    const textColor = [51, 65, 85]; // Slate 700
    const lightGrey = [241, 245, 249]; // Slate 100

    // Top banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('TEKI PHARM LOGISTICS HUB', 15, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('INTER-BRANCH STOCK TRANSFER MANIFEST & GATE PASS', 15, 25);
    doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 30);

    // Badge
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(140, 12, 55, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TRANSFER INVOICE', 144, 18);
    doc.setFontSize(8);
    doc.text(batch.batchId, 144, 23);

    // Routing Header
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGISTICS ROUTE DETAILS', 15, 50);

    // Cards
    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(15, 54, 85, 30, 'F');
    doc.rect(110, 54, 85, 30, 'F');

    // Source card
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SOURCE FACILITY (SENDER)', 20, 60);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(srcName, 20, 66);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID: ${batch.sourcePharmacyId}`, 20, 72);
    doc.text('System status updated: Committed', 20, 77);

    // Destination card
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATION FACILITY (RECEIVER)', 115, 60);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(destName, 115, 66);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID: ${batch.targetPharmacyId}`, 115, 72);
    doc.text('Increments committed on delivery', 115, 77);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 92, 195, 92);

    // Items title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSFERRED MEDICINES BATCH ITEMS', 15, 100);

    const tableRows = batch.items.map((item: any, idx: number) => [
      idx + 1,
      item.id,
      item.productName,
      `${item.quantity} Units`,
      'Success'
    ]);

    autoTable(doc, {
      startY: 104,
      head: [['S/N', 'Transfer Item ID', 'Product Description', 'Quantity', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 35 },
        2: { cellWidth: 83 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Disclaimer: This transfer document certifies that the listed medicines have been authorized for relocation\n' +
      'from the source branch to the target branch. Stock records have been updated automatically across both facilities.',
      15,
      finalY
    );

    finalY += 15;

    const sigWidth = 50;
    doc.setDrawColor(200, 200, 200);
    
    doc.line(15, finalY + 15, 15 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Dispatcher', 15, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Teki Pharm Logistics Svc', 15, finalY + 23);

    doc.line(80, finalY + 15, 80 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Transit Courier', 80, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Secure Logistics Unit', 80, finalY + 23);

    doc.line(145, finalY + 15, 145 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Receiving Pharmacist', 145, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Teki Pharm Care Svc', 145, finalY + 23);

    doc.setFont('courier', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text('J. Wilson', 22, finalY + 10);
    doc.text('SpeedCourier', 85, finalY + 10);
    doc.text('K. Agu (Pharm)', 148, finalY + 10);

    return doc;
  };

  const handleShareBatch = async (batch: any, method: string) => {
    const srcName = getPharmacyName(batch.sourcePharmacyId);
    const destName = getPharmacyName(batch.targetPharmacyId);
    const dateStr = new Date(batch.createdAt).toLocaleString();
    
    const itemsText = batch.items.map((it: any) => `- ${it.quantity}x ${it.productName}`).join('\n');
    const baseShareMessage = `📦 *TEKI PHARM STOCK TRANSFER MANIFEST*\n\n📄 *Invoice No:* ${batch.batchId}\n📍 *From:* ${srcName}\n➡️ *To:* ${destName}\n📅 *Date:* ${dateStr}\n\n💊 *Medicines Relocated:*\n${itemsText}\n\n✅ *Status:* STOCKS RELOCATED AND VERIFIED`;

    // Try sharing as PDF file if Web Share is supported
    let doc: any = null;
    let pdfFile: File | null = null;
    let shareSucceeded = false;

    try {
      doc = buildTransferPDF(batch);
      const pdfBlob = doc.output('blob');
      pdfFile = new File([pdfBlob], `Teki_Pharm_Transfer_${batch.batchId}.pdf`, { type: 'application/pdf' });
    } catch (err) {
      console.error('Error generating PDF for sharing:', err);
    }

    if (method !== 'copy' && pdfFile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Teki Pharm Transfer Invoice ${batch.batchId}`,
          text: baseShareMessage
        });
        toast.success('Successfully shared Transfer Invoice PDF!');
        shareSucceeded = true;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          setSharePopoverBatch(null);
          return;
        }
        console.warn('Native PDF share failed, falling back...', shareErr);
      }
    }

    if (!shareSucceeded) {
      // Fallback behavior: download the PDF so they have the document, then open WhatsApp/Email with special instruction to attach it!
      if (method === 'whatsapp' || method === 'email') {
        try {
          if (doc) {
            doc.save(`Teki_Pharm_Transfer_${batch.batchId}.pdf`);
            toast.info('Transfer PDF Invoice downloaded! Please attach it to the opened window.');
          }
        } catch (downloadErr) {
          console.error('Download fallback failed:', downloadErr);
        }
      }

      const noteText = `\n\n📌 *Note:* The official PDF transfer manifest has been downloaded. Please attach it to this message.`;
      const fullShareMessage = baseShareMessage + noteText;

      if (method === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`, '_blank');
        toast.success('Opened WhatsApp with transfer manifest!');
      } else if (method === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(`Teki Pharm Stock Transfer ${batch.batchId}`)}&body=${encodeURIComponent(fullShareMessage)}`, '_blank');
        toast.success('Opened mail draft with transfer manifest!');
      } else if (method === 'copy') {
        navigator.clipboard.writeText(baseShareMessage);
        toast.success('Transfer manifest text copied to clipboard!');
      } else {
        toast.success(`Shared invoice ${batch.batchId} successfully via ${method}!`);
      }
    }

    setSharePopoverBatch(null);
  };

  const downloadPDF = (batch: any) => {
    try {
      const doc = buildTransferPDF(batch);
      doc.save(`Teki_Pharm_Transfer_${batch.batchId}.pdf`);
      toast.success('Successfully downloaded transfer invoice PDF!');
    } catch (e: any) {
      console.error('Failed to generate PDF:', e);
      toast.error('Failed to download PDF invoice');
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceId) {
      toast.error('Please select a source location');
      return;
    }
    if (!destinationId) {
      toast.error('Please select a destination location');
      return;
    }
    if (sourceId === destinationId) {
      toast.error('Source and destination locations must be different');
      return;
    }
    if (transferCart.length === 0) {
      toast.error('Please add at least one product to the transfer list');
      return;
    }

    try {
      const uniqueBatchId = `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Execute transfers sequentially for all items in the cart with the unified batch ID
      for (const item of transferCart) {
        await apiService.transfers.create(
          sourceId,
          destinationId,
          item.product.name,
          item.product.barcode,
          item.quantity,
          uniqueBatchId
        );
      }

      toast.success(`Successfully transferred ${transferCart.length} product(s) to destination!`);
      
      // Clear transfer list and input state
      setTransferCart([]);
      setQuantity('');
      setSelectedProductId('');
      
      // Refresh products and transfer history
      const updatedProductsPromise = loadProductsForSource(sourceId);
      const updatedTransfers = await apiService.transfers.list();
      setTransfers(updatedTransfers || []);
      await updatedProductsPromise;

      // Automatically open the new batch invoice modal for viewing/downloading/sharing
      const grouped = getGroupedBatches();
      const newBatch = grouped.find((g: any) => g.batchId === uniqueBatchId);
      if (newBatch) {
        setSelectedBatch(newBatch);
      }
    } catch (err: any) {
      console.error('Transfer execution failed:', err);
      toast.error(err.message || 'Failed to complete stock transfer');
    }
  };

  const getPharmacyName = (id: string) => {
    const ph = pharmacies.find(p => p.id === id);
    return ph ? ph.name : id;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-2xl text-white inline-flex shadow-lg shadow-blue-600/20">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            Inter-Branch Stock Transfer
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-wider">
            Reallocate medicine stocks across warehouses, branches, and stores seamlessly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main form card */}
        <Card id="transfer-form-card" className="lg:col-span-7 bg-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="text-blue-400 w-5 h-5" /> Stock Transfer Flow
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">
              Verify availability, select category, specify items, and route safely
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleExecuteTransfer} className="space-y-6">
              
              {/* Step 1: Source Location (Real Database Branches) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-blue-600" /> Source Location (Dispatching From)
                  </label>
                  <button
                    type="button"
                    onClick={handleRefreshBranches}
                    disabled={isRefreshingBranches}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Reload existing branches from database"
                  >
                    <RefreshCw size={11} className={isRefreshingBranches ? "animate-spin" : ""} />
                    <span>Sync Branches</span>
                  </button>
                </div>
                <select
                  id="source-location-select"
                  value={sourceId}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    if (destinationId === e.target.value) {
                      setDestinationId('');
                    }
                  }}
                  className="w-full h-14 rounded-2xl px-5 bg-slate-50 border-2 border-slate-100 font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Source Facility...</option>
                  {pharmacies.map(ph => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name} ({ph.type || 'Branch'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Category & Product Selection (Cart Builder with Search & All Categories) */}
              <AnimatePresence mode="wait">
                {sourceId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden pt-2 border-t border-slate-100"
                  >
                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                          Add Item to Transfer List
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {sourceProducts.length} total products in source inventory
                        </span>
                      </div>

                      {/* Product Search Bar */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Search size={12} className="text-blue-600" /> Search Product to Transfer
                          </span>
                          {productSearchQuery && (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-100/80 px-2 py-0.5 rounded-full">
                              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                          <Input
                            id="product-search-input"
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Type medicine or product name, barcode, or SKU..."
                            className="h-12 pl-10 pr-10 rounded-xl border-2 border-slate-200 bg-white font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600/50 shadow-sm"
                          />
                          {productSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setProductSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                              title="Clear search"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Selection with "All Categories" */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          <Tag size={12} className="text-blue-600" /> Filter by Category
                        </label>
                        <select
                          id="category-select"
                          value={selectedCategory}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setSelectedProductId('');
                            setQuantity('');
                          }}
                          className="w-full h-12 rounded-xl px-4 bg-white border-2 border-slate-100 font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600/50 transition-all appearance-none cursor-pointer"
                        >
                          <option value="all">⭐ All Categories ({sourceProducts.length} products listed)</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Search Matches Results List (if actively searching) */}
                      {productSearchQuery.trim() && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Quick Search Results ({filteredProducts.length})
                          </span>
                          {filteredProducts.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white/90 rounded-2xl border border-blue-100">
                              {filteredProducts.slice(0, 10).map(prod => (
                                <button
                                  type="button"
                                  key={prod.id}
                                  onClick={() => {
                                    setSelectedProductId(prod.id);
                                    setQuantity('');
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border cursor-pointer ${
                                    selectedProductId === prod.id
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                      : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border-slate-100'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <p className="font-bold text-xs truncate">{prod.name}</p>
                                    <p className={`text-[10px] ${selectedProductId === prod.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                      {prod.category} {prod.barcode ? `• Barcode: ${prod.barcode}` : ''}
                                    </p>
                                  </div>
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                                    selectedProductId === prod.id
                                      ? 'bg-white/20 text-white'
                                      : prod.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                  }`}>
                                    {prod.stock} in stock
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl flex items-center gap-1.5">
                              <AlertCircle size={14} /> No products match "{productSearchQuery}" at this source facility.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Product Selection Dropdown (NEVER disabled) */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <Package size={12} className="text-blue-600" /> Select Item or Product
                          </label>
                          {selectedProductId && selectedProduct && (
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                              Stock: {selectedProduct.stock} available
                            </span>
                          )}
                        </div>
                        <select
                          id="product-select"
                          value={selectedProductId}
                          onChange={(e) => {
                            setSelectedProductId(e.target.value);
                            setQuantity('');
                          }}
                          className="w-full h-12 rounded-xl px-4 bg-white border-2 border-slate-100 font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600/50 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">-- Choose product ({filteredProducts.length} available) --</option>
                          {filteredProducts.map(prod => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} (Stock: {prod.stock} units) — {prod.category}
                            </option>
                          ))}
                        </select>
                        {filteredProducts.length === 0 && !productSearchQuery && (
                          <p className="text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl mt-1 flex items-center gap-1.5">
                            <AlertCircle size={14} /> No products available in this category at the source facility.
                          </p>
                        )}
                      </div>

                      {/* Quantity Input and Add Button */}
                      {selectedProductId && selectedProduct && (
                        <div className="space-y-2 pt-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <TrendingUp size={12} className="text-blue-600" /> Transfer Quantity
                          </label>
                          <div className="flex gap-2">
                            <Input
                              id="transfer-quantity-input"
                              type="number"
                              min="1"
                              max={selectedProduct.stock}
                              placeholder={`Qty to transfer (Max: ${selectedProduct.stock})`}
                              value={quantity}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Math.min(selectedProduct.stock, Math.max(1, Number(e.target.value)));
                                setQuantity(val);
                              }}
                              className="h-12 rounded-xl border-2 border-slate-100 bg-white font-bold text-sm px-4 focus-visible:ring-blue-600/10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setQuantity(selectedProduct.stock)}
                              className="h-12 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0 cursor-pointer"
                            >
                              Max
                            </Button>
                          </div>

                          <Button
                            type="button"
                            onClick={handleAddToTransferCart}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Plus size={16} /> Add Item to Transfer List
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3: Selected Items List */}
              <AnimatePresence>
                {transferCart.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2 border-t border-slate-100 pt-4"
                  >
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      Items selected for Transfer ({transferCart.length})
                    </label>
                    <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 max-h-[250px] overflow-y-auto space-y-2">
                      {transferCart.map((item, idx) => (
                        <div key={item.product.id} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-100/80 shadow-sm">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-black text-xs text-slate-900 truncate">{item.product.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{item.product.category}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="font-black text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                              {item.quantity} units
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleRemoveFromTransferCart(idx)}
                              className="h-8 w-8 rounded-xl p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer text-lg font-bold"
                            >
                              &times;
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 4: Destination Location (Existing Real Database Branches Only) */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-blue-600" /> Destination Location (Receiving Branch)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Database Branches Only
                  </span>
                </div>
                {availableDestinations.length > 0 ? (
                  <select
                    id="destination-location-select"
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full h-14 rounded-2xl px-5 bg-slate-50 border-2 border-slate-100 font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Destination Branch...</option>
                    {availableDestinations.map(ph => (
                      <option key={ph.id} value={ph.id}>
                        {ph.name} ({ph.type || 'Branch'}) {ph.address ? `— ${ph.address}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs space-y-1">
                    <p className="font-black flex items-center gap-1.5">
                      <AlertCircle size={14} /> Only 1 branch found in the database.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      To transfer stock between facilities, create an additional branch in Branch Management or in your Supabase database.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <Button
                id="execute-transfer-button"
                type="submit"
                disabled={!sourceId || !destinationId || transferCart.length === 0}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all mt-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer Stock Now
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Transfer statistics & live logs panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Route Visualizer Card */}
          <Card className="bg-gradient-to-br from-blue-900 to-slate-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden p-8">
            <h3 className="text-lg font-black tracking-tight uppercase">Transfer Pathway</h3>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">
              Active Logistics Route
            </p>
            
            <div className="mt-8 flex flex-col items-center justify-center gap-4 py-4 relative">
              <div className="w-full bg-slate-800/40 p-4 rounded-2xl border border-slate-800/80 text-center">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Source</span>
                <span className="font-bold text-sm block truncate">
                  {sourceId ? getPharmacyName(sourceId) : 'No source selected'}
                </span>
              </div>

              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 z-10 my-1 border-4 border-slate-950">
                <ArrowRight className="w-4 h-4 text-white animate-pulse" />
              </div>

              <div className="w-full bg-slate-800/40 p-4 rounded-2xl border border-slate-800/80 text-center">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Destination</span>
                <span className="font-bold text-sm block truncate text-slate-300">
                  {destinationId ? getPharmacyName(destinationId) : 'No destination selected'}
                </span>
              </div>
            </div>
          </Card>

          {/* Transfer Batches History & Invoices */}
          <Card className="bg-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <History className="text-slate-400 w-4 h-4" /> Transfer Batches & Invoices
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                Grouped product relocations with downloadable receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {getGroupedBatches().map((batch: any, index: number) => {
                  const totalUnits = batch.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
                  return (
                    <div 
                      key={batch.batchId} 
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 transition-all hover:bg-slate-100/50 hover:shadow-md cursor-pointer relative"
                      onClick={() => setSelectedBatch(batch)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={14} />
                          </div>
                          <span className="font-black text-xs text-slate-800 uppercase tracking-tight">{batch.batchId}</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Success</span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>{getPharmacyName(batch.sourcePharmacyId)}</span>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span>{getPharmacyName(batch.targetPharmacyId)}</span>
                        </p>
                        <p className="text-xs font-black text-slate-800 truncate">
                          {batch.items.length} Product{batch.items.length > 1 ? 's' : ''} • {totalUnits} unit{totalUnits > 1 ? 's' : ''}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium italic truncate">
                          {batch.items.map((it: any) => it.productName).join(', ')}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50 flex-wrap gap-2">
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {new Date(batch.createdAt).toLocaleDateString()} {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {/* Action buttons inside card */}
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSelectedBatch(batch)}
                            className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1"
                            title="View Invoice"
                          >
                            <Eye size={10} /> View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => downloadPDF(batch)}
                            className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg cursor-pointer flex items-center gap-1"
                            title="Download PDF Invoice"
                          >
                            <Download size={10} /> PDF
                          </Button>
                          
                          <div className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setSharePopoverBatch(sharePopoverBatch === batch.batchId ? null : batch.batchId)}
                              className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg cursor-pointer flex items-center gap-1"
                              title="Share Invoice"
                            >
                              <Share2 size={10} /> Share
                            </Button>
                            
                            {/* Share popover */}
                            <AnimatePresence>
                              {sharePopoverBatch === batch.batchId && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                  className="absolute right-0 bottom-8 z-50 bg-white border border-slate-100 rounded-xl shadow-xl p-2 w-40 flex flex-col gap-1 text-left"
                                >
                                  <button
                                    onClick={() => handleShareBatch(batch, 'whatsapp')}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    WhatsApp
                                  </button>
                                  <button
                                    onClick={() => handleShareBatch(batch, 'email')}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-lg text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    Email Draft
                                  </button>
                                  <button
                                    onClick={() => handleShareBatch(batch, 'copy')}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    Copy Link
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {transfers.length === 0 && (
                  <p className="text-xs font-bold text-slate-400 text-center py-12">No transfer batches found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Details Overlay Modal */}
      <AnimatePresence>
        {selectedBatch && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 md:p-8 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      STOCK INVOICE
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      COMPLETED
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black mt-2 tracking-tight">Invoice: {selectedBatch.batchId}</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">
                    Committed on {new Date(selectedBatch.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedBatch(null)}
                  className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer font-bold text-lg flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6">
                
                {/* Pathway card */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Authorized Logistics Path
                  </h3>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left min-w-0 flex-1">
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        SENDER (SOURCE)
                      </span>
                      <p className="font-black text-slate-800 text-sm mt-1 truncate">
                        {getPharmacyName(selectedBatch.sourcePharmacyId)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        ID: {selectedBatch.sourcePharmacyId}
                      </p>
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Deducted & Relocated
                      </span>
                    </div>

                    <div className="text-center md:text-right min-w-0 flex-1">
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        RECEIVER (DESTINATION)
                      </span>
                      <p className="font-black text-slate-800 text-sm mt-1 truncate">
                        {getPharmacyName(selectedBatch.targetPharmacyId)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        ID: {selectedBatch.targetPharmacyId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Items Batch Manifest ({selectedBatch.items.length})
                  </h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-[10px] text-slate-500 uppercase h-10">S/N</TableHead>
                          <TableHead className="font-black text-[10px] text-slate-500 uppercase h-10">Item Description</TableHead>
                          <TableHead className="font-black text-[10px] text-slate-500 uppercase h-10 text-right">Qty Transferred</TableHead>
                          <TableHead className="font-black text-[10px] text-slate-500 uppercase h-10 text-right">Logistics Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.items.map((item: any, idx: number) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-xs text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-black text-xs text-slate-800">{item.productName}</TableCell>
                            <TableCell className="font-black text-xs text-slate-800 text-right">{item.quantity} Units</TableCell>
                            <TableCell className="text-right">
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                Verified
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Simulated physical signatures */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200 mt-4 space-y-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Security Clearances & Signatures
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    <div className="flex flex-col border-r border-slate-100 pr-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Dispatcher</span>
                      <span className="text-blue-600 text-sm mt-1 h-8 flex items-end font-bold" style={{ fontFamily: 'cursive' }}>J. Wilson</span>
                      <span className="text-[8px] text-slate-400 italic">Facility Lead</span>
                    </div>
                    <div className="flex flex-col border-r border-slate-100 pr-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Transit Courier</span>
                      <span className="text-indigo-600 text-sm mt-1 h-8 flex items-end font-bold" style={{ fontFamily: 'cursive' }}>SpeedCourier</span>
                      <span className="text-[8px] text-slate-400 italic">Secure Transit Svc</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Receiver</span>
                      <span className="text-violet-600 text-sm mt-1 h-8 flex items-end font-bold" style={{ fontFamily: 'cursive' }}>K. Agu</span>
                      <span className="text-[8px] text-slate-400 italic">Lead Pharmacist</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBatch(null)}
                  className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-100 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Close Invoice
                </Button>

                {/* Share action buttons inside modal */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => downloadPDF(selectedBatch)}
                    className="flex-1 sm:flex-none h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} /> Download PDF
                  </Button>

                  <div className="relative flex-1 sm:flex-none">
                    <Button
                      type="button"
                      onClick={() => setSharePopoverBatch(sharePopoverBatch === selectedBatch.batchId ? null : selectedBatch.batchId)}
                      className="w-full h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 size={14} /> Share Invoice
                    </Button>

                    {/* Popover inside modal */}
                    <AnimatePresence>
                      {sharePopoverBatch === selectedBatch.batchId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -5 }}
                          className="absolute right-0 bottom-14 z-50 bg-white border border-slate-100 rounded-xl shadow-xl p-2 w-44 flex flex-col gap-1 text-left"
                        >
                          <button
                            onClick={() => handleShareBatch(selectedBatch, 'whatsapp')}
                            className="w-full text-left px-2.5 py-2 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            WhatsApp Dispatch
                          </button>
                          <button
                            onClick={() => handleShareBatch(selectedBatch, 'email')}
                            className="w-full text-left px-2.5 py-2 hover:bg-blue-50 rounded-lg text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            Email Dispatch
                          </button>
                          <button
                            onClick={() => handleShareBatch(selectedBatch, 'copy')}
                            className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            Copy Link Address
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
