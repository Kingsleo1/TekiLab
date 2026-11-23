import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  FileText, 
  Activity, 
  Layers, 
  Sliders, 
  Plus, 
  Minus, 
  HelpCircle, 
  Menu as MenuIcon, 
  Check, 
  ArrowRight, 
  ChevronRight, 
  UserPlus, 
  Users, 
  TrendingUp, 
  Lock, 
  Code,
  Database,
  Building,
  Info,
  DollarSign,
  Briefcase,
  ExternalLink,
  Receipt,
  X,
  Eye,
  Download,
  Share2,
  Clock,
  History,
  Trash2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function SupplyManager({ subView = 'new_supply', selectedBranchId = 'pharma-1' }: { subView?: 'new_supply' | 'supply_records' | 'new_supplier' | 'list_of_suppliers', selectedBranchId?: string }) {
  const [activeTab, setActiveTab] = useState<'live_app' | 'developer_blueprint'>('live_app');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Antibiotics', 'Pain Relief', 'Cholesterol', 'Vitamins', 'Syrups', 'Beverages', 'Cereals', 'Cosmetics']);
  
  // New Supply form fields
  const [productName, setProductName] = useState('');
  const [sizeValue, setSizeValue] = useState('');
  const [category, setCategory] = useState('Pain Relief');
  const [quantity, setQuantity] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [minQuantity, setMinQuantity] = useState(5);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Destination popup overlay control
  const [showDestinationModal, setShowDestinationModal] = useState(false);

  // Supplier Form Fields
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  interface SupplyBatchItem {
    productName: string;
    sizeValue: string;
    category: string;
    quantity: number;
    totalCost: number;
    unitPrice: number;
    minQuantity: number;
    selectedSupplierId: string;
    supplierName?: string;
  }
  const [supplyBatch, setSupplyBatch] = useState<SupplyBatchItem[]>([]);

  // Unified Supply Batching states
  const [selectedSupplyBatch, setSelectedSupplyBatch] = useState<any | null>(null);
  const [sharePopoverBatchId, setSharePopoverBatchId] = useState<string | null>(null);
  const [supplyRecordsTab, setSupplyRecordsTab] = useState<'grouped' | 'individual'>('grouped');

  // Handle removing a selected item from the current batch in progress
  const handleRemoveFromBatch = (index: number) => {
    setSupplyBatch(prev => prev.filter((_, idx) => idx !== index));
    toast.info('Removed item from current supply batch');
  };

  // Catalog search and batch-select states
  const [branchProducts, setBranchProducts] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedProductsConfig, setSelectedProductsConfig] = useState<Record<string, { quantity: number; totalCost: number; unitPrice: number; sizeValue: string; category: string; minQuantity: number }>>({});
  const [addMethod, setAddMethod] = useState<'catalog' | 'manual'>('catalog');

  // Handler to toggle product selection
  const handleToggleProduct = (product: any) => {
    setSelectedProductIds(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        return prev.filter(id => id !== product.id);
      } else {
        // Initialize config if not existing
        if (!selectedProductsConfig[product.id]) {
          setSelectedProductsConfig(conf => ({
            ...conf,
            [product.id]: {
              quantity: 10,
              totalCost: Math.round((product.costPrice || (product.price * 0.7)) * 10),
              unitPrice: product.price,
              sizeValue: product.size || product.baseUnit || 'Standard unit',
              category: product.category || 'Pain Relief',
              minQuantity: product.minStockLevel || 5
            }
          }));
        }
        return [...prev, product.id];
      }
    });
  };

  // Handler to update config
  const handleUpdateConfig = (productId: string, field: string, value: any) => {
    setSelectedProductsConfig(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // Batch add from catalog selection to current batch
  const handleBatchAddFromCatalog = () => {
    if (selectedProductIds.length === 0) return;

    const matchedSupplier = suppliers.find(s => s.id === selectedSupplierId)?.name || 'MegaPharm Wholesale Ltd';

    const itemsToAdd: SupplyBatchItem[] = selectedProductIds.map(id => {
      const prod = branchProducts.find(p => p.id === id);
      const config = selectedProductsConfig[id] || {
        quantity: 10,
        totalCost: Math.round((prod?.costPrice || (prod?.price ? prod.price * 0.7 : 0)) * 10),
        unitPrice: prod?.price || 0,
        sizeValue: prod?.size || prod?.baseUnit || 'Standard unit',
        category: prod?.category || 'Pain Relief',
        minQuantity: prod?.minStockLevel || 5
      };

      return {
        productName: prod?.name || 'Unknown Product',
        sizeValue: config.sizeValue,
        category: config.category,
        quantity: config.quantity,
        totalCost: config.totalCost,
        unitPrice: config.unitPrice,
        minQuantity: config.minQuantity,
        selectedSupplierId,
        supplierName: matchedSupplier
      };
    });

    setSupplyBatch(prev => [...prev, ...itemsToAdd]);
    toast.success(`Successfully added ${itemsToAdd.length} products to current batch.`);

    // Clear selection and search
    setSelectedProductIds([]);
    setProductSearchQuery('');
  };

  // Filter products based on search query
  const filteredProducts = branchProducts.filter(prod => {
    const q = productSearchQuery.toLowerCase();
    return prod.name.toLowerCase().includes(q) || prod.category.toLowerCase().includes(q);
  });

  // Helper to group individual supply records into unified batches
  const getGroupedSupplyBatches = (records = supplyRecords) => {
    const groups: Record<string, any> = {};
    const safeRecords = records || [];

    safeRecords.forEach(sr => {
      const bId = sr.supplyBatchId || `SUP-BATCH-OLD-${sr.id}`;
      if (!groups[bId]) {
        groups[bId] = {
          supplyBatchId: bId,
          createdAt: sr.date || new Date().toISOString(),
          destination: sr.destination || 'Store',
          supplierName: sr.supplierName || 'MegaPharm Wholesale Ltd',
          pharmacyId: sr.pharmacyId,
          expenseId: sr.expenseId,
          items: []
        };
      }
      groups[bId].items.push({
        id: sr.id,
        productName: sr.productName,
        category: sr.category,
        size: sr.size,
        quantity: sr.quantity,
        totalCost: sr.totalCost,
        unitCost: sr.unitCost,
        unitPrice: sr.unitPrice
      });
    });

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Generate and return a jsPDF instance for the supply batch
  const buildSupplyPDF = (batch: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const destName = batch.destination === 'Store' ? 'Local Store Inventory' : 'Central Bulk Warehouse';
    const supplierName = batch.supplierName;
    const totalCost = batch.items.reduce((acc: number, it: any) => acc + it.totalCost, 0);
    const totalUnits = batch.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

    // Colors
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [249, 115, 22]; // Orange 500
    const textColor = [51, 65, 85]; // Slate 700
    const lightGrey = [241, 245, 249]; // Slate 100

    // Top banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TEKI MED HEALTHCARE INTAKE LEDGER', 15, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('WHOLESALE PRODUCT SUPPLY INVOICE & RECEIVING MANIFEST', 15, 25);
    doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 30);

    // Badge
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(140, 12, 55, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUPPLY INVOICE', 144, 18);
    doc.setFontSize(8);
    doc.text(batch.supplyBatchId, 144, 23);

    // Supply Routing Header
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('WHOLESALE SUPPLY DETAILS', 15, 50);

    // Cards
    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(15, 54, 85, 32, 'F');
    doc.rect(110, 54, 85, 32, 'F');

    // Supplier card
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('WHOLESALE SUPPLIER', 20, 60);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(supplierName, 20, 66);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Expense Reference: ${batch.expenseId || 'EXP-COGS'}`, 20, 72);
    doc.text(`Total Invoice Cost: NGN ${totalCost.toLocaleString()}`, 20, 78);

    // Destination card
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TARGET INTAKE FACILITY', 115, 60);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(destName, 115, 66);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Active Branch ID: ${batch.pharmacyId}`, 115, 72);
    doc.text(`Quantity: ${totalUnits} Units (${batch.items.length} Products)`, 115, 78);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 94, 195, 94);

    // Items title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIED BATCH LINE ITEMS', 15, 102);

    const tableRows = batch.items.map((item: any, idx: number) => [
      idx + 1,
      item.productName,
      item.category,
      item.size,
      `${item.quantity} Units`,
      `NGN ${item.totalCost.toLocaleString()}`,
      `NGN ${(item.totalCost / item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 106,
      head: [['S/N', 'Product Name', 'Category', 'Pack Size', 'Qty', 'Total Cost', 'Unit Cost']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Disclaimer: This invoice certifies that the listed wholesale product supplies have been officially received\n' +
      'and allocated into target facility inventories. Relevant COGS expense logs have been automatically captured.',
      15,
      finalY
    );

    finalY += 15;

    const sigWidth = 50;
    doc.setDrawColor(200, 200, 200);
    
    doc.line(15, finalY + 15, 15 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Receiving Officer', 15, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Teki Pharm Inventory Hub', 15, finalY + 23);

    doc.line(80, finalY + 15, 80 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Representative', 80, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Authorized Delivery agent', 80, finalY + 23);

    doc.line(145, finalY + 15, 145 + sigWidth, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Inspector', 145, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.text('Quality Assurance Unit', 145, finalY + 23);

    doc.setFont('courier', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22);
    doc.text('J. Wilson', 22, finalY + 10);
    doc.text('Onboarded Wholesaler', 82, finalY + 10);
    doc.text('K. Agu (Pharm)', 148, finalY + 10);

    return doc;
  };

  // Handle sharing a supply invoice manifest
  const handleShareSupplyBatch = async (batch: any, method: string) => {
    const destName = batch.destination === 'Store' ? 'Local Store Inventory' : 'Central Bulk Warehouse';
    const dateStr = batch.createdAt;
    const itemsText = batch.items.map((it: any) => `- ${it.quantity}x ${it.productName} (₦${it.totalCost.toLocaleString()})`).join('\n');
    const totalCost = batch.items.reduce((acc: number, it: any) => acc + it.totalCost, 0);
    
    const baseShareMessage = `📦 *TEKI PHARM PRODUCT SUPPLY MANIFEST*\n\n📄 *Invoice No:* ${batch.supplyBatchId}\n📍 *Destination:* ${destName}\n🏢 *Supplier:* ${batch.supplierName}\n📅 *Date:* ${dateStr}\n💰 *Total Batch Cost:* ₦${totalCost.toLocaleString()}\n\n💊 *Supplied Items:*\n${itemsText}\n\n✅ *Status:* RECEIVED AND VERIFIED`;

    // Try sharing as PDF file if Web Share is supported
    let doc: any = null;
    let pdfFile: File | null = null;
    let shareSucceeded = false;

    try {
      doc = buildSupplyPDF(batch);
      const pdfBlob = doc.output('blob');
      pdfFile = new File([pdfBlob], `Teki_Pharm_Supply_${batch.supplyBatchId}.pdf`, { type: 'application/pdf' });
    } catch (err) {
      console.error('Error generating PDF for sharing:', err);
    }

    if (method !== 'copy' && pdfFile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Teki Pharm Supply Invoice ${batch.supplyBatchId}`,
          text: baseShareMessage
        });
        toast.success('Successfully shared Supply Invoice PDF!');
        shareSucceeded = true;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          setSharePopoverBatchId(null);
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
            doc.save(`Teki_Pharm_Supply_${batch.supplyBatchId}.pdf`);
            toast.info('Supply PDF Invoice downloaded! Please attach it to the opened window.');
          }
        } catch (downloadErr) {
          console.error('Download fallback failed:', downloadErr);
        }
      }

      const noteText = `\n\n📌 *Note:* The official PDF invoice has been downloaded. Please attach it to this message.`;
      const fullShareMessage = baseShareMessage + noteText;

      if (method === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`, '_blank');
        toast.success('Opened WhatsApp with supply manifest!');
      } else if (method === 'email') {
        window.open(`mailto:?subject=${encodeURIComponent(`Teki Pharm Product Supply ${batch.supplyBatchId}`)}&body=${encodeURIComponent(fullShareMessage)}`, '_blank');
        toast.success('Opened mail draft with supply manifest!');
      } else if (method === 'copy') {
        navigator.clipboard.writeText(baseShareMessage);
        toast.success('Supply manifest text copied to clipboard!');
      } else {
        toast.success(`Shared invoice ${batch.supplyBatchId} successfully via ${method}!`);
      }
    }

    setSharePopoverBatchId(null);
  };

  // Generate and download a PDF Invoice for the supply batch
  const downloadSupplyPDF = (batch: any) => {
    try {
      const doc = buildSupplyPDF(batch);
      doc.save(`Teki_Pharm_Supply_${batch.supplyBatchId}.pdf`);
      toast.success('Successfully downloaded supply invoice PDF!');
    } catch (e: any) {
      console.error('Failed to generate supply PDF:', e);
      toast.error('Failed to download PDF invoice');
    }
  };

  // Loaded database simulations
  const [supplyRecords, setSupplyRecords] = useState<any[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // 1. Supplier list
        const supList = await apiService.suppliers.list();
        setSuppliers(supList);

        // 2. Supply records
        const supplyList = await apiService.supply.list(selectedBranchId);
        setSupplyRecords(supplyList);

        // 3. Expense records
        const expenseList = await apiService.expenses.list(selectedBranchId);
        setExpenseRecords(expenseList);

        // 4. Products list for search/selection
        const prodList = await apiService.products.list(selectedBranchId);
        setBranchProducts(prodList);
      } catch (err) {
        console.error('Failed to load supply manager data', err);
      }
    };
    loadAllData();
  }, [selectedBranchId]);

  // Form submit - trigger commit popup
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error('Product Name is required');
      return;
    }
    if (quantity <= 0) {
      toast.error('Total Quantity must be greater than 0');
      return;
    }
    if (totalCost <= 0) {
      toast.error('Total Cost of Product Supplied must be greater than 0');
      return;
    }
    if (unitPrice <= 0) {
      toast.error('Unit Selling Price is required and must be greater than 0');
      return;
    }

    // Safe arithmetic check
    const calculatedWholesaleUnitCost = totalCost / quantity;
    if (unitPrice < calculatedWholesaleUnitCost) {
      toast.warning(`Warning: Unit selling price (₦${unitPrice}) is lower than wholesale unit cost (₦${calculatedWholesaleUnitCost.toFixed(2)}). Realize margins carefully.`);
    }

    const matchedSupplier = suppliers.find(s => s.id === selectedSupplierId)?.name || 'MegaPharm Wholesale Ltd';

    setSupplyBatch(prev => [...prev, {
      productName: productName.trim(),
      sizeValue,
      category,
      quantity,
      totalCost,
      unitPrice,
      minQuantity,
      selectedSupplierId,
      supplierName: matchedSupplier
    }]);

    toast.success(`Added ${productName.trim()} to current batch.`);
    
    // Reset Form Fields for next item
    setProductName('');
    setSizeValue('');
    setCategory('Pain Relief');
    setQuantity(0);
    setTotalCost(0);
    setUnitPrice(0);
    setMinQuantity(5);
  };

  // Process item allocation and automated expense generation
  const handleCommitInventory = async (destination: 'Store' | 'Warehouse') => {
    let currentExpenseRecords = [...expenseRecords];
    let currentSupplyRecords = [...supplyRecords];
    let batchPotentialProfit = 0;
    
    try {
      const targetPharmacyId = destination === 'Store' ? selectedBranchId : 'warehouse-1';
      const existingProducts = await apiService.products.list(targetPharmacyId);

      const uniqueSupplyBatchId = `SUP-BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      for (const item of supplyBatch) {
        // 1. Calculate Profitability & Cost
        const unitCostPrice = item.totalCost / item.quantity;
        batchPotentialProfit += (item.unitPrice * item.quantity) - item.totalCost;

        // 2. Generate Reference Keys
        const batchId = `BCH-${Math.floor(1000 + Math.random() * 9000)}`;
        const supplyId = `SUP-B${Math.floor(100 + Math.random() * 900)}`;
        const expenseId = `EXP-COGS-${Math.floor(3000 + Math.random() * 999)}`;

        // 3. Branching Routing State
        const existingProd = existingProducts.find(p => p.name.toLowerCase() === item.productName.trim().toLowerCase());

        if (existingProd) {
          // Update stock
          await apiService.products.update(existingProd.id, { 
            stock: existingProd.stock + item.quantity,
            batches: [
              ...(existingProd.batches || []),
              {
                id: batchId,
                batchNumber: `BAT-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                manufactureDate: new Date().toISOString().split('T')[0],
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                quantity: item.quantity,
                costPrice: unitCostPrice
              }
            ]
          });
        } else {
          // Create new
          const newProductItem = {
            id: `P-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            name: item.productName.trim(),
            category: item.category,
            price: item.unitPrice,
            stock: item.quantity,
            baseUnit: 'pack' as any,
            conversionFactor: 1,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: false,
            pharmacyId: targetPharmacyId,
            minStockLevel: item.minQuantity,
            costPrice: unitCostPrice,
            batches: [
              {
                id: batchId,
                batchNumber: `BAT-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                manufactureDate: new Date().toISOString().split('T')[0],
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                quantity: item.quantity,
                costPrice: unitCostPrice
              }
            ]
          };
          await apiService.products.add(newProductItem);
        }

        // 4. Cross-Module Expense Automation COGS Generation
        const newExpenseRow = {
          id: expenseId,
          vendorId: 'vendor-tekipharm-1',
          date: new Date().toISOString().split('T')[0],
          description: `COGS Stock Purchase: ${item.productName.trim()} (${destination} Intake)`,
          category: 'Cost of Goods Sold',
          amount: item.totalCost,
          status: 'Confirmed',
          pharmacyId: selectedBranchId
        };
        const savedExpense = await apiService.expenses.add(newExpenseRow);
        currentExpenseRecords = [savedExpense, ...currentExpenseRecords];

        // 5. Update supply records array
        const newSupplyRow = {
          id: supplyId,
          supplyBatchId: uniqueSupplyBatchId,
          vendorId: 'vendor-tekipharm-1',
          productName: item.productName.trim(),
          size: item.sizeValue || 'Standard unit',
          category: item.category,
          quantity: item.quantity,
          totalCost: item.totalCost,
          unitCost: unitCostPrice,
          unitPrice: item.unitPrice,
          minQuantity: item.minQuantity,
          destination: destination,
          expenseId: expenseId,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          supplierName: item.supplierName || 'MegaPharm Wholesale Ltd',
          pharmacyId: selectedBranchId
        };
        const savedSupply = await apiService.supply.add(newSupplyRow);
        currentSupplyRecords = [savedSupply, ...currentSupplyRecords];
      }
      
      setExpenseRecords(currentExpenseRecords);
      setSupplyRecords(currentSupplyRecords);

      // Complete flow UI alerts
      toast.success(`Inventory allocated to ${destination}! Batch profitability calculated (₦${batchPotentialProfit.toLocaleString()}) and COGS expenses automatically filed!`);
      
      // Auto open the new batch invoice modal for viewing/downloading/sharing
      const grouped = getGroupedSupplyBatches(currentSupplyRecords);
      const newBatch = grouped.find((g: any) => g.supplyBatchId === uniqueSupplyBatchId);
      if (newBatch) {
        setSelectedSupplyBatch(newBatch);
      }

      // Reload product catalog to reflect newly committed quantities or products
      const updatedProds = await apiService.products.list(selectedBranchId);
      setBranchProducts(updatedProds);

      setSupplyBatch([]);
      setShowDestinationModal(false);
    } catch (err) {
      toast.error('Failed to commit supply inventory allocation');
    }
  };

  // Add Wholesale Partner Onboarding
  const handleAddNewSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supContact.trim() || !supPhone.trim()) {
      toast.error('Wholesale Brand, Representative Name, and Active Contact line are required!');
      return;
    }

    const newSupplier = {
      id: `SP-${Math.floor(9000 + Math.random() * 999)}`,
      name: supName,
      contactName: supContact,
      email: supEmail || 'info@partner-wholesale.org',
      phone: supPhone,
      address: supAddress || 'Commercial District, Nigeria',
      totalOwing: 0
    };

    try {
      const saved = await apiService.suppliers.add(newSupplier);
      setSuppliers(prev => [saved, ...prev]);

      toast.success(`Supplier Onboarded: ${supName} has been registered successfully!`);
      
      // Reset fields
      setSupName('');
      setSupContact('');
      setSupEmail('');
      setSupPhone('');
      setSupAddress('');
    } catch (err) {
      toast.error('Failed to register supplier');
    }
  };

  const batchTotalCost = supplyBatch.reduce((sum, item) => sum + item.totalCost, 0);
  const batchTotalRevenue = supplyBatch.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const batchTotalProfit = batchTotalRevenue - batchTotalCost;
  const batchMarkup = batchTotalCost > 0 ? (batchTotalProfit / batchTotalCost) * 100 : 0;

  return (
    <>
    <div className="space-y-8 animate-in fade-in duration-300 print:hidden">
      
      {/* Upper Module Badge & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="bg-orange-50 text-orange-600 border border-orange-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
            Supply & Logistics Wing
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mt-2 uppercase italic">
            Wholesale In-take Ledger
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1 leading-relaxed">
            Configure multi-vendor supplier catalogs, ledger product supplies to store/warehouse destinations, and track automated expense COGS.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto self-stretch md:self-auto shrink-0">
          <button 
            onClick={() => setActiveTab('live_app')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'live_app' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Truck size={15} /> Sandbox Module
          </button>
          <button 
            onClick={() => setActiveTab('developer_blueprint')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'developer_blueprint' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Code size={15} /> Blueprint Code
          </button>
        </div>
      </div>

      {activeTab === 'live_app' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Main Workspace Frame container left/stretching */}
          <div className="xl:col-span-3 space-y-8">
            
            {/* INTAKE FORM (New Supply View) */}
            {subView === 'new_supply' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden max-w-2xl mx-auto">
                
                {/* Custom Form Header featuring Help, centered orange kite logo, and menu details */}
                <div className="h-20 bg-slate-950 px-8 flex items-center justify-between border-b border-slate-800">
                  <button type="button" onClick={() => toast.info("Help: Trim spaces, specify correct package volume (size), adjust counters, and allocate to desired storage branch on submit.")} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <HelpCircle size={22} />
                  </button>
                  
                  {/* Centered Orange Kite/Geometric SVG Logo */}
                  <div className="flex items-center gap-2.5">
                    <svg width="28" height="28" viewBox="0 0 100 100" fill="none" className="text-orange-500">
                      <polygon points="50,10 90,45 50,90 10,45" fill="none" stroke="#F97316" strokeWidth="8" strokeLinejoin="round" />
                      <line x1="50" y1="10" x2="50" y2="90" stroke="#F97316" strokeWidth="6" />
                      <line x1="10" y1="45" x2="90" y2="45" stroke="#F97316" strokeWidth="6" />
                    </svg>
                    <span className="font-mono text-xs font-black tracking-widest text-[#F97316]">PHARMA_INTAKE</span>
                  </div>

                  <button type="button" className="text-slate-400 hover:text-white transition-colors">
                    <MenuIcon size={22} />
                  </button>
                </div>

                <div className="p-8 md:p-12 space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                      Add Product Record
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Vendor isolation scoped under live vendor ID</p>
                  </div>

                  {/* Choose Wholesaler (Global for both methods) */}
                  <div className="relative flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 h-16 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                    <div className="px-5 text-slate-400">
                      <Building size={18} />
                    </div>
                    <div className="flex-1 pr-4">
                      <label className="absolute top-[-9px] left-6 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 rounded-lg">
                        Supplier / Wholesaler Partner
                      </label>
                      <select 
                        className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer h-full pt-1"
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                      >
                        <option value="">Select Onboarded Supplier...</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.contactName})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Adding Method Tab Selector */}
                  <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex">
                    <button
                      type="button"
                      onClick={() => setAddMethod('catalog')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${addMethod === 'catalog' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Search & Multi-Select from Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMethod('manual')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${addMethod === 'manual' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Manual / Brand-New Entry
                    </button>
                  </div>

                  {addMethod === 'catalog' ? (
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-500 text-white rounded-xl">
                              <TrendingUp size={16} />
                            </div>
                            <div>
                              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Catalog Search</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select multiple existing items to batch</p>
                            </div>
                          </div>
                          {selectedProductIds.length > 0 && (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] uppercase tracking-widest border-none px-2.5 py-1">
                              {selectedProductIds.length} Selected
                            </Badge>
                          )}
                        </div>

                        {/* Search input field */}
                        <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white h-12 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                          <div className="pl-4 pr-2 text-slate-400">
                            <Search size={16} />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Search product catalog by name or category..." 
                            className="flex-1 bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 h-full py-2"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                          />
                          {productSearchQuery && (
                            <button 
                              type="button" 
                              onClick={() => setProductSearchQuery('')}
                              className="pr-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Search Results */}
                        {filteredProducts.length > 0 ? (
                          <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1 border border-slate-200/50 p-2 rounded-2xl bg-white/50">
                            {filteredProducts.map(prod => {
                              const isChecked = selectedProductIds.includes(prod.id);
                              const config = selectedProductsConfig[prod.id] || {
                                quantity: 10,
                                totalCost: Math.round((prod.costPrice || prod.price * 0.7) * 10),
                                unitPrice: prod.price,
                                sizeValue: prod.size || prod.baseUnit || 'Standard unit',
                                category: prod.category || 'Pain Relief',
                                minQuantity: prod.minStockLevel || 5
                              };

                              return (
                                <div key={prod.id} className={`p-3 rounded-xl border transition-all ${isChecked ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                  <div className="flex items-start gap-3">
                                    <input 
                                      type="checkbox"
                                      id={`check-prod-${prod.id}`}
                                      checked={isChecked}
                                      onChange={() => handleToggleProduct(prod)}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <label htmlFor={`check-prod-${prod.id}`} className="block text-xs font-black text-slate-800 uppercase italic cursor-pointer truncate">
                                        {prod.name}
                                      </label>
                                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        <span>{prod.category}</span>
                                        <span>•</span>
                                        <span>Stock: {prod.stock}</span>
                                        <span>•</span>
                                        <span>Retail Price: ₦{prod.price}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* If checked, expand the inline inputs panel */}
                                  {isChecked && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-orange-200/50 grid grid-cols-3 gap-3 animate-in fade-in duration-200">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Qty</label>
                                        <input 
                                          type="number" 
                                          min="1"
                                          className="w-full h-8 px-2 rounded-lg border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-orange-500 bg-white"
                                          value={config.quantity}
                                          onChange={(e) => handleUpdateConfig(prod.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total Cost (₦)</label>
                                        <input 
                                          type="number" 
                                          min="0"
                                          className="w-full h-8 px-2 rounded-lg border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-orange-500 bg-white"
                                          value={config.totalCost}
                                          onChange={(e) => handleUpdateConfig(prod.id, 'totalCost', Math.max(0, parseFloat(e.target.value) || 0))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Retail/Sell (₦)</label>
                                        <input 
                                          type="number" 
                                          min="0"
                                          className="w-full h-8 px-2 rounded-lg border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-orange-500 bg-white"
                                          value={config.unitPrice}
                                          onChange={(e) => handleUpdateConfig(prod.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                            {productSearchQuery ? 'No matching products found in the catalog.' : 'Type in the search field above to display product results...'}
                          </p>
                        )}

                        {/* Multi-add confirmation button */}
                        {selectedProductIds.length > 0 && (
                          <Button 
                            type="button" 
                            onClick={handleBatchAddFromCatalog}
                            className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest shadow-md flex items-center justify-center gap-2"
                          >
                            <Check size={14} /> Add Selected ({selectedProductIds.length}) to Batch
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      {/* Product Name (Text Input with file/document icon inside left edge) */}
                      <div className="relative flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 h-16 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                        <div className="px-5 text-slate-400">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 pr-4">
                          <label className="absolute top-[-9px] left-6 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-[#F97316] border border-orange-100 rounded-lg">
                            Product Name *
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Case-insensitive, trailing trimmed e.g. Metformin 500mg" 
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400/80 placeholder:font-medium h-full pt-1"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Size Product Dosage / Volume details */}
                      <div className="relative flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 h-16 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                        <div className="px-5 text-slate-400">
                          <Sliders size={18} />
                        </div>
                        <div className="flex-1 pr-4">
                          <label className="absolute top-[-9px] left-6 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 rounded-lg">
                            Size / Strength / Packing Format
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. 100mg sachet, Pack of 30, 250ml Bottle" 
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400/80 placeholder:font-medium h-full pt-1"
                            value={sizeValue}
                            onChange={(e) => setSizeValue(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Category Selector Dropdown with shapes group of triangle/square/circle inside left */}
                      <div className="relative flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 h-16 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                        <div className="px-5 text-slate-400">
                          <Layers size={18} />
                        </div>
                        <div className="flex-1 pr-4">
                          <label className="absolute top-[-9px] left-6 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 rounded-lg">
                            Product Category Taxonomy
                          </label>
                          <select 
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer h-full pt-1"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Steppers Area for Numeric Input Fields flanked with Circular Plus and Minus Orange buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        
                        {/* Quantity Intake Stepper */}
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-4 flex flex-col justify-between items-center text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Quantity Supplied</span>
                          
                          <div className="flex items-center gap-5 my-1">
                            <button 
                              type="button"
                              onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Minus size={16} />
                            </button>
                            
                            <input 
                              type="number" 
                              min="0"
                              className="bg-transparent border-none text-center font-mono font-black text-xl w-24 focus:outline-none"
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                            />

                            <button 
                              type="button"
                              onClick={() => setQuantity(prev => prev + 1)}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Item units (e.g. integer counts)</span>
                        </div>

                        {/* Total cost Supplied Stepper (Wholesale Cost) */}
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-4 flex flex-col justify-between items-center text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Cost of batch (₦)</span>
                          
                          <div className="flex items-center gap-5 my-1">
                            <button 
                              type="button"
                              onClick={() => setTotalCost(prev => Math.max(0, prev - 500))}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Minus size={14} />
                            </button>
                            
                            <input 
                              type="number" 
                              min="0"
                              className="bg-transparent border-none text-center font-mono font-black text-xl w-24 focus:outline-none"
                              value={totalCost}
                              onChange={(e) => setTotalCost(Math.max(0, parseFloat(e.target.value) || 0))}
                            />

                            <button 
                              type="button"
                              onClick={() => setTotalCost(prev => prev + 500)}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Calculated wholesale unit: ₦{(quantity > 0 ? (totalCost / quantity) : 0).toFixed(1)} / ea</span>
                        </div>

                        {/* Unit Selling Price Stepper */}
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-4 flex flex-col justify-between items-center text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#F97316] mb-2">Unit/Selling retail Price (₦)</span>
                          
                          <div className="flex items-center gap-5 my-1">
                            <button 
                              type="button"
                              onClick={() => setUnitPrice(prev => Math.max(0, prev - 50))}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Minus size={14} />
                            </button>
                            
                            <input 
                              type="number" 
                              min="0"
                              className="bg-transparent border-none text-center font-mono font-black text-xl w-24 focus:outline-none"
                              value={unitPrice}
                              onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                            />

                            <button 
                              type="button"
                              onClick={() => setUnitPrice(prev => prev + 50)}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Selling retail price to users</span>
                        </div>

                        {/* Min Quantity Limit low-stock threshold stepper */}
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-4 flex flex-col justify-between items-center text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Minimum Warning Stock</span>
                          
                          <div className="flex items-center gap-5 my-1">
                            <button 
                              type="button"
                              onClick={() => setMinQuantity(prev => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Minus size={16} />
                            </button>
                            
                            <input 
                              type="number"
                              min="0"
                              className="bg-transparent border-none text-center font-mono font-black text-xl w-24 focus:outline-none"
                              value={minQuantity}
                              onChange={(e) => setMinQuantity(Math.max(0, parseInt(e.target.value) || 5))}
                            />

                            <button 
                              type="button"
                              onClick={() => setMinQuantity(prev => prev + 1)}
                              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center font-black text-lg cursor-pointer shadow-md shadow-orange-100"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Warn when branch levels fall below</span>
                        </div>

                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-16 rounded-3xl bg-orange-100 hover:bg-orange-200 border border-orange-200 text-orange-700 font-black uppercase text-xs tracking-widest shadow-lg mt-6 cursor-pointer flex items-center justify-center gap-3 group"
                      >
                        <Plus size={16} /> Add Product to Batch
                      </Button>
                    </form>
                  )}
                  
                  {supplyBatch.length > 0 && (
                    <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">Current Batch ({supplyBatch.length} items)</span>
                        <span className="font-mono font-black text-slate-900">₦{supplyBatch.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()}</span>
                      </div>

                      {/* Products in progress batch list */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 p-2 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block pt-1">
                          Products Selected in this Batch
                        </span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                          {supplyBatch.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-slate-800 text-xs truncate uppercase italic">{item.productName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                  {item.category} • {item.sizeValue || 'Standard Size'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-xs font-black text-slate-800">{item.quantity} Units</p>
                                <p className="text-[9px] font-bold text-slate-500">₦{item.totalCost.toLocaleString()}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromBatch(idx)}
                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <Button 
                          type="button"
                          onClick={() => downloadSupplyPDF({
                            supplyBatchId: 'SUP-BATCH-DRAFT',
                            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                            destination: 'Store',
                            supplierName: supplyBatch[0]?.supplierName || 'MegaPharm Wholesale Ltd',
                            pharmacyId: selectedBranchId,
                            expenseId: 'EXP-COGS-DRAFT',
                            items: supplyBatch.map((it, idx) => ({
                              id: `SUP-DRAFT-${idx}`,
                              productName: it.productName,
                              category: it.category,
                              size: it.sizeValue,
                              quantity: it.quantity,
                              totalCost: it.totalCost,
                              unitCost: it.totalCost / it.quantity,
                              unitPrice: it.unitPrice
                            }))
                          })}
                          variant="outline"
                          className="flex-1 h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
                        >
                          Download PDF Draft
                        </Button>
                        <Button 
                          type="button"
                          onClick={() => setShowDestinationModal(true)}
                          className="flex-[2] h-16 rounded-3xl bg-slate-950 hover:bg-slate-900 border border-slate-700 text-orange-500 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-950/20 cursor-pointer flex items-center justify-center gap-3 group"
                        >
                          Review & Receive Batch <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL / BOTTOM SLIDE WINDOW FOR DUAL TARGET DESTINATION LOGIC */}
                {showDestinationModal && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col justify-end transition-all">
                    <div className="bg-white rounded-t-[3rem] p-10 space-y-8 animate-in slide-in-from-bottom duration-300 max-w-2xl mx-auto w-full">
                      <div className="text-center space-y-2">
                        <div className="w-16 h-1 rounded-full bg-slate-200 mx-auto"></div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                          Configure Inventory Physical Route
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Set the physical delivery destination to branch system rules
                        </p>
                      </div>

                      {/* Display calculations for user visualization */}
                      <div className="bg-orange-50/50 rounded-2xl border border-orange-100/80 p-6 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Wholesale Cost</p>
                          <p className="text-lg font-mono font-black text-slate-900">₦{batchTotalCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Potential Batch Revenues</p>
                          <p className="font-mono font-black text-slate-900 text-lg">₦{batchTotalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-orange-100">
                          <p className="text-[8px] font-black text-[#F97316] uppercase tracking-widest">Estimated Profitability Margin</p>
                          <p className="text-xl font-black text-[#F97316] italic">
                            +₦{batchTotalProfit.toLocaleString()} ({batchMarkup.toFixed(1)}% Mark-up)
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <button 
                          onClick={() => handleCommitInventory('Store')}
                          className="w-full bg-slate-900 text-white hover:bg-black p-6 rounded-3xl font-black uppercase text-xs tracking-widest transition-all flex justify-between items-center group cursor-pointer border border-slate-800"
                        >
                          <div className="text-left">
                            <p className="text-sm">Allocate to Local Store Inventory</p>
                            <p className="text-[9px] text-slate-400 font-bold normal-case mt-0.5">Launches directly into POS ledger catalog for immediate customer sale</p>
                          </div>
                          <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-1.5 transition-transform" />
                        </button>

                        <button 
                          onClick={() => handleCommitInventory('Warehouse')}
                          className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 p-6 rounded-3xl font-black uppercase text-xs tracking-widest transition-all flex justify-between items-center group cursor-pointer border border-orange-200/50"
                        >
                          <div className="text-left">
                            <p className="text-sm">Allocate to Central Bulk Warehouse</p>
                            <p className="text-[9px] text-orange-600/80 font-bold normal-case mt-0.5">Isolates in warehousing storage, awaiting custom internal movement approvals</p>
                          </div>
                          <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                      </div>

                      <div className="flex justify-center">
                        <button 
                          type="button" 
                          onClick={() => setShowDestinationModal(false)}
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors uppercase pt-2 cursor-pointer"
                        >
                          Cancel commit and review details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SUPPLY RECORDS LIST VIEW */}
            {subView === 'supply_records' && (
              <Card className="rounded-[2.5rem] bg-white border-slate-200/85 p-8 shadow-xl">
                <CardHeader className="px-3 pb-6 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Supplies Database Ledger</CardTitle>
                      <CardDescription className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historical incoming inventory receipts with automated costs profiling</CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
                      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setSupplyRecordsTab('grouped')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${supplyRecordsTab === 'grouped' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                          Batches & Invoices
                        </button>
                        <button
                          type="button"
                          onClick={() => setSupplyRecordsTab('individual')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${supplyRecordsTab === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                          Individual Records
                        </button>
                      </div>
                      
                      <Badge className="bg-slate-100 text-slate-800 font-black uppercase text-[8px] tracking-widest border-none px-3.5 py-2 shrink-0">
                        {supplyRecordsTab === 'grouped' ? `${getGroupedSupplyBatches().length} Batches` : `${supplyRecords.length} Supplies`}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <div className="overflow-x-auto">
                  {supplyRecordsTab === 'grouped' ? (
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Supply Batch ID</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Date / Time</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Vendor / Supplier</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Allocated Location</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Products</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Total Cost Value</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getGroupedSupplyBatches().map((batch: any, index: number) => {
                          const totalCost = batch.items.reduce((sum: number, it: any) => sum + it.totalCost, 0);
                          return (
                            <TableRow 
                              key={batch.supplyBatchId || index} 
                              className="border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700 cursor-pointer"
                              onClick={() => setSelectedSupplyBatch(batch)}
                            >
                              <TableCell className="py-5 font-sans">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                                    <FileText size={13} />
                                  </div>
                                  <span className="font-mono text-xs font-black text-slate-900 uppercase tracking-tight">{batch.supplyBatchId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <span className="text-xs font-bold text-slate-500">{batch.createdAt}</span>
                              </TableCell>
                              <TableCell className="font-sans">
                                <span className="text-[11px] font-bold text-slate-600">{batch.supplierName}</span>
                              </TableCell>
                              <TableCell className="font-sans">
                                <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 ${batch.destination === 'Store' ? 'bg-[#0F172A] text-[#ffffff]' : 'bg-orange-50 text-orange-600'}`}>
                                  {batch.destination}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div>
                                  <p className="font-black text-slate-800 text-xs">{batch.items.length} Product{batch.items.length > 1 ? 's' : ''}</p>
                                  <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{batch.items.map((it: any) => it.productName).join(', ')}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <span className="font-mono text-xs font-black text-slate-900">₦{totalCost.toLocaleString()}</span>
                              </TableCell>
                              <TableCell className="text-right font-sans" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1.5 justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setSelectedSupplyBatch(batch)}
                                    className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1"
                                    title="View Invoice"
                                  >
                                    <Eye size={10} /> View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => downloadSupplyPDF(batch)}
                                    className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-800 bg-orange-50 rounded-lg cursor-pointer flex items-center gap-1"
                                    title="Download PDF Invoice"
                                  >
                                    <Download size={10} /> PDF
                                  </Button>
                                  
                                  <div className="relative">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => setSharePopoverBatchId(sharePopoverBatchId === batch.supplyBatchId ? null : batch.supplyBatchId)}
                                      className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg cursor-pointer flex items-center gap-1"
                                      title="Share Invoice"
                                    >
                                      <Share2 size={10} /> Share
                                    </Button>
                                    
                                    {/* Share popover */}
                                    <AnimatePresence>
                                      {sharePopoverBatchId === batch.supplyBatchId && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                          className="absolute right-0 bottom-8 z-50 bg-white border border-slate-100 rounded-xl shadow-xl p-2 w-40 flex flex-col gap-1 text-left"
                                        >
                                          <button
                                            onClick={() => handleShareSupplyBatch(batch, 'whatsapp')}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                                          >
                                            WhatsApp
                                          </button>
                                          <button
                                            onClick={() => handleShareSupplyBatch(batch, 'email')}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-lg text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5 cursor-pointer"
                                          >
                                            Email Draft
                                          </button>
                                          <button
                                            onClick={() => handleShareSupplyBatch(batch, 'copy')}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5 cursor-pointer"
                                          >
                                            Copy Link
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {getGroupedSupplyBatches().length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-xs font-bold text-slate-400 uppercase">
                              No supply batches found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Stock ID / Date</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Product Information</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Quantity / size</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Wholesale Unit Cost</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Selling retail price</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Location Allocated</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Automated COGS ID</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Wholesale Vendor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplyRecords.map((supply, idx) => {
                          const batchRevenue = supply.unitPrice * supply.quantity;
                          const batchProfit = batchRevenue - supply.totalCost;
                          return (
                            <TableRow key={supply.id || idx} className="border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                              <TableCell className="py-5 font-sans">
                                <div>
                                  <p className="font-mono text-xs font-black text-slate-900">{supply.id}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{supply.date}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div>
                                  <p className="font-black text-slate-900 uppercase italic text-[13px]">{supply.productName}</p>
                                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider">{supply.category}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div>
                                  <p className="font-mono text-sm font-black text-slate-900">{supply.quantity} Units</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{supply.size}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div>
                                  <p className="font-mono text-xs text-slate-900 font-bold">₦{supply.unitCost.toFixed(2)}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Total: ₦{supply.totalCost.toLocaleString()}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div>
                                  <p className="font-mono text-xs text-slate-900 font-bold">₦{supply.unitPrice.toFixed(2)}</p>
                                  <p className="text-[9px] text-emerald-600 font-black tracking-tight mt-0.5">Potential: +₦{batchProfit.toLocaleString()}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 ${supply.destination === 'Store' ? 'bg-[#0F172A] text-[#ffffff]' : 'bg-orange-50 text-orange-600'}`}>
                                  {supply.destination}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-sans">
                                <div className="flex items-center gap-1.5">
                                  <Receipt size={12} className="text-slate-400" />
                                  <span className="font-mono text-[10px] text-indigo-600 font-black uppercase tracking-tight bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{supply.expenseId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-sans">
                                <span className="text-[11px] font-bold text-slate-500 truncate block max-w-[150px]">{supply.supplierName}</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {supplyRecords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-xs font-bold text-slate-400 uppercase">
                              No individual supply records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            )}

            {/* NEW SUPPLIER CO CATALOG DIRECTORY */}
            {subView === 'new_supplier' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden max-w-lg mx-auto p-10 space-y-8">
                <div className="pb-4 border-b border-slate-100 text-center">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center justify-center gap-2">
                    <UserPlus className="text-orange-500" /> Wholesaler Onboarding
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Onboard high-volume B2B supplier contract channels</p>
                </div>

                <form onSubmit={handleAddNewSupplierSubmit} className="space-y-6">
                  
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Supplier Brand Name *</label>
                     <Input 
                       required 
                       placeholder="e.g. MegaPharm Wholesale Limited" 
                       className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold shadow-sm"
                       value={supName}
                       onChange={(e) => setSupName(e.target.value)}
                     />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Representative Agent Name *</label>
                     <Input 
                       required 
                       placeholder="e.g. Alhaji Mustapha Musa" 
                       className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold shadow-sm"
                       value={supContact}
                       onChange={(e) => setSupContact(e.target.value)}
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Active Call Line *</label>
                       <Input 
                         required 
                         type="tel"
                         placeholder="e.g. +234 803 000 0000" 
                         className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold shadow-sm"
                         value={supPhone}
                         onChange={(e) => setSupPhone(e.target.value)}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Support Mail ID & Correspondence</label>
                       <Input 
                         type="email"
                         placeholder="e.g. b2b@megapharm.com" 
                         className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold shadow-sm"
                         value={supEmail}
                         onChange={(e) => setSupEmail(e.target.value)}
                       />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Central Mailing / Warehousing Address</label>
                     <Input 
                       placeholder="e.g. 10 Warehouse estate layout, Lagos, Nigeria" 
                       className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold shadow-sm"
                       value={supAddress}
                       onChange={(e) => setSupAddress(e.target.value)}
                     />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 cursor-pointer"
                  >
                    Commit Partner Contract
                  </Button>
                </form>
              </div>
            )}

            {/* LIST OF SUPPLIERS */}
            {subView === 'list_of_suppliers' && (
              <Card className="rounded-[2.5rem] bg-white border-slate-200/85 p-8 shadow-xl">
                <CardHeader className="px-3 pb-6 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Registered Wholesaler Channels</CardTitle>
                      <CardDescription className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active commercial suppliers providing pharmaceutical and retail resources</CardDescription>
                    </div>
                    <Badge className="bg-blue-50 text-blue-600 font-black uppercase text-[8px] tracking-widest border-none px-3.5 py-1.5">
                      {suppliers.length} Partners
                    </Badge>
                  </div>
                </CardHeader>
                
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wholesaler ID</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand / Corporation</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Representative Name</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Coordinates</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mailing Office</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier, idx) => (
                        <TableRow key={supplier.id || idx} className="border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                          <TableCell className="py-5 font-mono text-xs text-slate-900 font-extrabold">{supplier.id}</TableCell>
                          <TableCell className="font-black text-slate-900 uppercase italic text-[14px]">
                            {supplier.name}
                          </TableCell>
                          <TableCell className="font-bold text-slate-700">{supplier.contactName}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs text-slate-900 font-mono font-bold">{supplier.phone}</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-tight font-bold">{supplier.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{supplier.address}</TableCell>
                          <TableCell>
                            <span className={`font-mono font-black text-xs ${supplier.totalOwing > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              ₦{supplier.totalOwing.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

          </div>

          {/* Quick Metrics & Logs Panel (Right hand side columns) */}
          <div className="space-y-6">
            
            {/* Expense COGS quick glance */}
            <Card className="rounded-[2rem] bg-slate-950 text-white border-0 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-1">
                <span className="bg-slate-800 text-[#F97316] font-black text-[8px] uppercase tracking-widest px-2.5 py-1 rounded">
                  Expenses Module Glance
                </span>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">COGS Liability Ledger Total</h4>
                <p className="text-2xl font-mono font-black text-[#F97316]">
                  ₦{expenseRecords.reduce((acc, row) => acc + row.amount, 0).toLocaleString()}
                </p>
                <p className="text-[8px] text-slate-400 font-medium">Cross-module expense logs generated from completed supply entries automatically.</p>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-2.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Liability Ledger Logs</p>
                {expenseRecords.slice(0, 3).map((exp, idx) => (
                  <div key={exp.id || idx} className="flex justify-between items-center text-[10px] bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                    <span className="truncate max-w-[120px] font-bold text-slate-300">{exp.description}</span>
                    <span className="font-mono text-[#F97316] font-black">₦{exp.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Live Supply Stats */}
            <Card className="rounded-[2rem] bg-white border-slate-200/85 p-6 shadow-md space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intake Analytics</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Commits to Store</p>
                  <p className="text-xl font-mono font-black text-slate-900">
                    {supplyRecords.filter(s => s.destination === 'Store').length}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Commits to Warehouse</p>
                  <p className="text-xl font-mono font-black text-slate-900">
                    {supplyRecords.filter(s => s.destination === 'Warehouse').length}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 col-span-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-extrabold">Total Stock Volume Onboarded</p>
                  <p className="text-2xl font-mono font-black text-slate-900 italic">
                    {supplyRecords.reduce((acc, row) => acc + row.quantity, 0).toLocaleString()} Units
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Supplier directory access */}
            <Card className="rounded-[2rem] bg-white border-slate-200/85 p-6 shadow-md space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Contacts</h4>
              <div className="space-y-2">
                {suppliers.slice(0, 3).map((sup, idx) => (
                  <div key={sup.id || idx} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-black text-slate-900 uppercase italic truncate max-w-[120px]">{sup.name}</p>
                      <p className="text-[8px] text-slate-400 font-black">{sup.contactName}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-mono">{sup.phone.split(' ')[2] || sup.phone}</Badge>
                  </div>
                ))}
              </div>
            </Card>

          </div>

        </div>
      ) : (
        
        /* SYSTEM ARCHITECT DEVELOPER BLUEPRINT WORKSPACE WITH POSTGRESQL & NODE.JS CONTROLLER CODE */
        <div className="space-y-8 max-w-4xl mx-auto">
          
          <Card className="rounded-[2.5rem] bg-white border-slate-200/80 shadow-xl p-8 md:p-10 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Database size={24} />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Database Schemas & API Blueprints</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Production-Ready Backend Configurations and PostgreSQL Schemas with ACL/Multi-Tenant isolation
                </CardDescription>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              As requested, here is the complete system schema and backend controller logic to persist stock movements, manage physical destination logs (Store vs. Warehouse), prevent division-by-zero errors in wholesale batch profit calculations, and dispatch automated liability entries inside the Expenses ledger synchronously under active database transaction boundaries (ACID compliant).
            </p>

            {/* Tabbed Blueprint Submenu */}
            <div className="space-y-6">
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F97316] mb-3 flex items-center gap-2">
                  <Database size={15} /> 1. PostgreSQL Relational Schema DDL
                </h3>
                <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[11px] text-[#A6E22E] overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                  <span className="text-slate-500">{"-- Schema for Multi-Vendor isolated Inventory Intake Workflow"}<br/></span>
                  <span className="text-slate-400">{"CREATE TABLE "}<span className="text-white">{"vendors"}</span>{" ("}<br/>
                  {"  vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"}<br/>
                  {"  brand_name VARCHAR(255) NOT NULL UNIQUE,"}<br/>
                  {"  access_tier VARCHAR(50) DEFAULT 'Starter',"}<br/>
                  {"  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"}<br/>
                  {");"}<br/><br/>
                  
                  {"CREATE TABLE "}</span><span className="text-white">{"suppliers"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  company_name VARCHAR(255) NOT NULL,"}<br/>
                  {"  contact_representative VARCHAR(150) NOT NULL,"}<br/>
                  {"  contact_phone VARCHAR(50) NOT NULL,"}<br/>
                  {"  contact_email VARCHAR(150),"}<br/>
                  {"  mailing_address TEXT,"}<br/>
                  {"  outstanding_balance DECIMAL(15,2) DEFAULT 0.00,"}<br/>
                  {"  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"}<br/>
                  {");"}<br/><br/>

                  {"CREATE TABLE "}</span><span className="text-white">{"products"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  product_name VARCHAR(255) NOT NULL,"}<br/>
                  {"  size_strength VARCHAR(100),"}<br/>
                  {"  category VARCHAR(100) NOT NULL,"}<br/>
                  {"  min_stock_level INT DEFAULT 5,"}<br/>
                  {"  CONSTRAINT unique_product_vendor UNIQUE(vendor_id, product_name, size_strength)"}<br/>
                  {");"}<br/><br/>

                  {"-- Inbound supply ledger capture batch details"}<br/>
                  {"CREATE TABLE "}</span><span className="text-white">{"supply_ledgers"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  supply_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  supplier_id UUID REFERENCES suppliers(supplier_id),"}<br/>
                  {"  product_id UUID REFERENCES products(product_id),"}<br/>
                  {"  quantity_supplied INT CHECK (quantity_supplied > 0),"}<br/>
                  {"  total_wholesale_cost DECIMAL(15,2) CHECK (total_wholesale_cost >= 0),"}<br/>
                  {"  unit_retail_selling_price DECIMAL(15,2) CHECK (unit_retail_selling_price >= 0),"}<br/>
                  {"  physical_destination VARCHAR(20) NOT NULL CHECK (physical_destination IN ('Store', 'Warehouse')),"}<br/>
                  {"  expense_ref_id VARCHAR(50),"}<br/>
                  {"  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"}<br/>
                  {");"}<br/><br/>

                  {"-- Real-Time isolated inventory balances per target destination"}<br/>
                  {"CREATE TABLE "}</span><span className="text-white">{"store_inventory_balances"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,"}<br/>
                  {"  stock_balance INT DEFAULT 0,"}<br/>
                  {"  PRIMARY KEY(vendor_id, product_id)"}<br/>
                  {");"}<br/><br/>

                  {"CREATE TABLE "}</span><span className="text-white">{"warehouse_inventory_balances"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,"}<br/>
                  {"  stock_balance INT DEFAULT 0,"}<br/>
                  {"  PRIMARY KEY(vendor_id, product_id)"}<br/>
                  {");"}<br/><br/>

                  {"-- Cross-Module Expense automatic row registry"}<br/>
                  {"CREATE TABLE "}</span><span className="text-white">{"expenses"}</span><span className="text-slate-400">{" ("}<br/>
                  {"  expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"}<br/>
                  {"  vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,"}<br/>
                  {"  category VARCHAR(150) DEFAULT 'Cost of Goods Sold',"}<br/>
                  {"  amount DECIMAL(15,2) NOT NULL,"}<br/>
                  {"  description TEXT NOT NULL,"}<br/>
                  {"  billing_date DATE DEFAULT CURRENT_DATE"}<br/>
                  {");"}<br/><br/>

                  {"-- Indices for high-performance multi-vendor isolation"}<br/>
                  {"CREATE INDEX idx_supply_ledgers_vendor ON supply_ledgers(vendor_id);"}<br/>
                  {"CREATE INDEX idx_products_vendor ON products(vendor_id, product_name);"}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F97316] mb-3 flex items-center gap-2">
                  <Code size={15} /> 2. Node.js/Express (TypeScript) REST API Intake Controller
                </h3>
                <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[11px] text-[#A6E22E] overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                  <span className="text-slate-500">{"/**\n * ACID Transaction Intake Controller\n * Scope: Supply Line Product Addition & Financial COGS filing\n */"}<br/></span>
                  <span className="text-indigo-400">{"import"}</span>{" { Request, Response } "}<span className="text-indigo-400">{"from"}</span>{" 'express';"}<br/>
                  <span className="text-indigo-400">{"import"}</span>{" { db } "}<span className="text-indigo-400">{"from"}</span>{" '../config/database';"}<br/><br/>

                  <span className="text-indigo-400">{"export const"}</span> <span className="text-white">{"receiveProductSupply"}</span>{" = "}<span className="text-indigo-400">{"async"}</span>{" (req: Request, res: Response) => {"}<br/>
                  {"  const { "}<br/>
                  {"    vendor_id, "}<span className="text-slate-500">{"// Multi-ventor passport scope"}</span><br/>
                  {"    supplier_id, "}<br/>
                  {"    product_name, "}<br/>
                  {"    size_strength, "}<br/>
                  {"    category, "}<br/>
                  {"    quantity_supplied, "}<br/>
                  {"    total_wholesale_cost, "}<br/>
                  {"    unit_retail_selling_price, "}<br/>
                  {"    physical_destination, "}<span className="text-slate-500">{"// 'Store' | 'Warehouse'"}</span><br/>
                  {"    min_stock_level"}<br/>
                  {"  } = req.body;"}<br/><br/>

                  <span className="text-slate-500">{"  // S-Tier Validation Boundaries"}</span><br/>
                  {"  if (!vendor_id || !product_name || !physical_destination) {"}<br/>
                  {"    return res.status(400).json({ error: 'Missing critical parameters' });"}<br/>
                  {"  }"}<br/><br/>
                  
                  <span className="text-slate-500">{"  // Prevent division-by-zero errors in wholesale unit metrics calculations"}</span><br/>
                  {"  if (!quantity_supplied || quantity_supplied <= 0) {"}<br/>
                  {"    return res.status(400).json({ error: 'Quantity must be higher than zero to prevent calculation exceptions.' });"}<br/>
                  {"  }"}<br/><br/>

                  <span className="text-slate-500">{"  // Calculate Unit cost and verify pricing thresholds safety"}</span><br/>
                  {"  const perUnitCost = Number(total_wholesale_cost) / Number(quantity_supplied);"}<br/><br/>

                  <span className="text-slate-500">{"  // Initialize Postgres transactional boundary"}</span><br/>
                  {"  const client = await db.connect();"}<br/>
                  {"  try {"}<br/>
                  {"    await client.query('BEGIN');"}<br/><br/>

                  <span className="text-slate-500">{"    // 1. Fetch or create unique product reference per specific vendor_id"}</span><br/>
                  {"    let productRes = await client.query("}<br/>
                  {"      `INSERT INTO products (vendor_id, product_name, size_strength, category, min_stock_level) "}<br/>
                  {"       VALUES ($1, $2, $3, $4, $5)"}<br/>
                  {"       ON CONFLICT (vendor_id, product_name, size_strength) "}<br/>
                  {"       DO UPDATE SET category = EXCLUDED.category "}<br/>
                  {"       RETURNING product_id`,"}<br/>
                  {"      [vendor_id, product_name.trim(), size_strength, category, min_stock_level || 5]"}<br/>
                  {"    );"}<br/>
                  {"    const productId = productRes.rows[0].product_id;"}<br/><br/>

                  <span className="text-slate-500">{"    // 2. Cross-Module Automated Expense Registration"}</span><br/>
                  {"    const expenseRes = await client.query("}<br/>
                  {"      `INSERT INTO expenses (vendor_id, category, amount, description, billing_date) "}<br/>
                  {"       VALUES ($1, 'Cost of Goods Sold', $2, $3, CURRENT_DATE) RETURNING expense_id`,"}<br/>
                  {"      [vendor_id, total_wholesale_cost, `Wholesale Stock Buy: ${product_name.trim()} (${quantity_supplied} units)`]"}<br/>
                  {"    );"}<br/>
                  {"    const generatedExpenseId = expenseRes.rows[0].expense_id;"}<br/><br/>

                  <span className="text-slate-500">{"    // 3. Register Supply log row"}</span><br/>
                  {"    await client.query("}<br/>
                  {"      `INSERT INTO supply_ledgers (vendor_id, supplier_id, product_id, quantity_supplied, total_wholesale_cost, unit_retail_selling_price, physical_destination, expense_ref_id) "}<br/>
                  {"       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,"}<br/>
                  {"      [vendor_id, supplier_id, productId, quantity_supplied, total_wholesale_cost, unit_retail_selling_price, physical_destination, generatedExpenseId]"}<br/>
                  {"    );"}<br/><br/>

                  <span className="text-slate-500">{"    // 4. Update the real-time destination ledger balances relative to routing choices"}</span><br/>
                  {"    const balanceTable = physical_destination === 'Store' "}<br/>
                  {"      ? 'store_inventory_balances' "}<br/>
                  {"      : 'warehouse_inventory_balances';"}<br/><br/>

                  {"    await client.query("}<br/>
                  {"      `INSERT INTO ${balanceTable} (vendor_id, product_id, stock_balance) "}<br/>
                  {"       VALUES ($1, $2, $3) "}<br/>
                  {"       ON CONFLICT (vendor_id, product_id) "}<br/>
                  {"       DO UPDATE SET stock_balance = ${balanceTable}.stock_balance + EXCLUDED.stock_balance`,"}<br/>
                  {"      [vendor_id, productId, quantity_supplied]"}<br/>
                  {"    );"}<br/><br/>

                  <span className="text-slate-500">{"    // Commit all alterations successfully"}</span><br/>
                  {"    await client.query('COMMIT');"}<br/>
                  {"    res.status(201).json({ "}<br/>
                  {"      status: 'Success',"}<br/>
                  {"      message: 'Product stock ledger registered and dynamic COGS automatic expense posted successfully!',"}<br/>
                  {"      data: { productId, expenseId: generatedExpenseId, wholesaleUnitCost: perUnitCost } "}<br/>
                  {"    });"}<br/>
                  {"  } catch (err: any) {"}<br/>
                  {"    await client.query('ROLLBACK');"}<br/>
                  {"    res.status(500).json({ error: 'Supply registration failed', log: err.message });"}<br/>
                  {"  } finally {"}<br/>
                  {"    client.release();"}<br/>
                  {"  }"}<br/>
                  {"};"}
                </div>
              </div>

            </div>

          </Card>
          
        </div>
      )}

    </div>

    {/* Dynamic Grouped Batch Invoice Modal */}
    {selectedSupplyBatch && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="bg-slate-950 p-6 text-white flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 bg-orange-500/20 text-orange-400 rounded-lg">
                  <FileText size={15} />
                </span>
                <span className="font-mono text-sm font-black tracking-widest">{selectedSupplyBatch.supplyBatchId}</span>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Supply Intake Invoice • Received {selectedSupplyBatch.createdAt}
              </p>
            </div>
            <button 
              onClick={() => setSelectedSupplyBatch(null)}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white border-none bg-transparent"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-8 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Wholesale Vendor</span>
                <span className="text-xs font-black text-slate-800 uppercase italic">{selectedSupplyBatch.supplierName}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Physical Destination</span>
                <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-2.5 py-1 ${selectedSupplyBatch.destination === 'Store' ? 'bg-slate-900 text-white' : 'bg-orange-100 text-orange-700'}`}>
                  {selectedSupplyBatch.destination}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Products Transferred in Batch</span>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans">Product</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans text-right">Quantity</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans text-right">Unit Cost</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplyBatch.items.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="font-sans">
                          <div>
                            <p className="font-black text-slate-800 text-xs truncate uppercase italic">{item.productName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                              {item.category} • {item.size || 'Standard Unit'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-slate-900 font-sans">{item.quantity} units</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-600 font-sans">₦{item.unitCost.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-slate-800 font-sans">₦{item.totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Total Section */}
            <div className="bg-slate-900 text-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Batch Invoice Cost</span>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">All taxes & duties inclusive</span>
              </div>
              <span className="font-mono text-2xl font-black text-orange-400">
                ₦{selectedSupplyBatch.items.reduce((sum: number, it: any) => sum + it.totalCost, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 justify-between items-center">
            <button 
              onClick={() => setSelectedSupplyBatch(null)}
              className="px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 cursor-pointer border-none bg-transparent"
            >
              Close
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => downloadSupplyPDF(selectedSupplyBatch)}
                className="h-12 px-6 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 cursor-pointer shadow-md shadow-orange-100 border border-orange-200"
              >
                <Download size={14} /> Download PDF
              </Button>
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => setSharePopoverBatchId(sharePopoverBatchId === selectedSupplyBatch.supplyBatchId ? null : selectedSupplyBatch.supplyBatchId)}
                  className="h-12 px-6 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 cursor-pointer shadow-lg shadow-slate-950/20"
                >
                  <Share2 size={14} /> Share Invoice
                </Button>
                
                {/* Share menu inside modal footer */}
                <AnimatePresence>
                  {sharePopoverBatchId === selectedSupplyBatch.supplyBatchId && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 bottom-14 z-50 bg-white border border-slate-100 rounded-xl shadow-2xl p-2.5 w-44 flex flex-col gap-1 text-left"
                    >
                      <button
                        onClick={() => handleShareSupplyBatch(selectedSupplyBatch, 'whatsapp')}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase text-emerald-700 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        WhatsApp Direct
                      </button>
                      <button
                        onClick={() => handleShareSupplyBatch(selectedSupplyBatch, 'email')}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg text-[10px] font-black uppercase text-blue-700 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        Email Invoice Draft
                      </button>
                      <button
                        onClick={() => handleShareSupplyBatch(selectedSupplyBatch, 'copy')}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase text-slate-700 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        Copy Shareable Link
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

    {/* Printable Invoice View */}
    <div className="hidden print:block p-8 bg-white text-slate-900 w-full font-sans absolute top-0 left-0 min-h-screen z-50">
      <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Teki Pharm</h1>
          <p className="text-sm font-bold text-slate-500 mt-2">Supply Intake Invoice / Batch Record</p>
          <p className="text-xs text-slate-400 mt-1">Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p className="font-bold">Branch: {selectedBranchId}</p>
          <p>Generated by Supply Manager Module</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-black uppercase mb-4 text-slate-800">Batch Summary</h2>
        <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Items</p>
            <p className="text-2xl font-mono font-black">{supplyBatch.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Wholesale Cost</p>
            <p className="text-2xl font-mono font-black text-slate-900">₦{supplyBatch.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Revenue</p>
            <p className="text-2xl font-mono font-black text-slate-900">₦{supplyBatch.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-black uppercase mb-4 text-slate-800 border-b border-slate-200 pb-2">Batch Items</h2>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <th className="py-3 px-2 w-1/3">Product Name</th>
            <th className="py-3 px-2">Category</th>
            <th className="py-3 px-2 text-right">Quantity</th>
            <th className="py-3 px-2 text-right">Unit Cost</th>
            <th className="py-3 px-2 text-right">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {supplyBatch.map((item, index) => (
            <tr key={index} className="border-b border-slate-200">
              <td className="py-4 px-2 font-bold text-slate-900">{item.productName} <span className="block text-xs text-slate-500 font-medium">{item.sizeValue}</span></td>
              <td className="py-4 px-2">{item.category}</td>
              <td className="py-4 px-2 text-right font-mono font-bold">{item.quantity}</td>
              <td className="py-4 px-2 text-right font-mono text-slate-600">₦{(item.totalCost / item.quantity).toFixed(2)}</td>
              <td className="py-4 px-2 text-right font-mono font-bold">₦{item.totalCost.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-16 pt-8 border-t border-slate-200 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Official Record • Internal Pharmacy Systems
      </div>
    </div>
    </>
  );
}
