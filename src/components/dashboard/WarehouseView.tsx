import React, { useState, useEffect, useMemo } from 'react';
import { 
  Warehouse, 
  ArrowRightLeft, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Layers, 
  ChevronRight, 
  Boxes, 
  ExternalLink,
  Zap,
  RefreshCw,
  Clock,
  Plus,
  Trash2,
  ArrowUpRight,
  Search,
  FileText,
  ShieldAlert,
  Award,
  Database,
  ArrowRight,
  RefreshCcw,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { Product, Pharmacy, Supplier, Batch } from '../../types/pharmacy';
import { format, addDays } from 'date-fns';

interface WarehouseTransfer {
  id: string;
  sourcePharmacyId: string;
  targetPharmacyId: string;
  productName: string;
  quantity: number;
  status: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  productName: string;
  category: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  expiryDate: string;
  batchNumber: string;
  status: 'ordered' | 'received';
  createdAt: string;
}

export function WarehouseView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'procure' | 'pathways' | 'transfers'>('matrix');
  const [isLoading, setIsLoading] = useState(false);

  // Form states for custom manual transfer
  const [selectedProduct, setSelectedProduct] = useState('');
  const [targetBranch, setTargetBranch] = useState('pharma-1');
  const [transferQty, setTransferQty] = useState<number | ''>('');

  // Interactive Visual Node status
  const [selectedVisualNode, setSelectedVisualNode] = useState<'supplier' | 'warehouse' | 'branches' | 'pos' | null>('warehouse');

  // Supplier Procurement PO states
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [procureForm, setProcureForm] = useState({
    supplierId: '',
    productName: '',
    category: 'Antibiotics',
    quantity: '',
    costPrice: '',
    retailPrice: '',
    expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    batchNumber: ''
  });

  // Real-time synchronization log trace
  const [syncLogs, setSyncLogs] = useState<Array<{ id: string; timestamp: string; message: string; type: 'system' | 'success' | 'info' | 'sale' | 'transfer' | 'procure' }>>([
    {
      id: 'L-INIT-01',
      timestamp: new Date(Date.now() - 600000).toLocaleTimeString(),
      message: 'Active WebSocket Handshake established with Lagos Store (B01)',
      type: 'system'
    },
    {
      id: 'L-INIT-02',
      timestamp: new Date(Date.now() - 400000).toLocaleTimeString(),
      message: 'Primary warehouse storage registers recalibrated successfully.',
      type: 'success'
    },
    {
      id: 'L-INIT-03',
      timestamp: new Date(Date.now() - 200000).toLocaleTimeString(),
      message: 'Sync Broker: Decoupled client ledger connected. Operational status: nominal.',
      type: 'info'
    }
  ]);

  useEffect(() => {
    loadData();
    // Load local purchase orders from localStorage
    const storedPOs = localStorage.getItem('ph_purchase_orders');
    if (storedPOs) {
      setPurchaseOrders(JSON.parse(storedPOs));
    } else {
      const demoPOs: PurchaseOrder[] = [
        {
          id: 'PO-7841A',
          supplierId: 'sup-1',
          productName: 'CoughSip Expectorant',
          category: 'Syrups',
          quantity: 2500,
          costPrice: 480,
          retailPrice: 900,
          expiryDate: '2027-08-10',
          batchNumber: 'BAT-CS99',
          status: 'ordered',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setPurchaseOrders(demoPOs);
      localStorage.setItem('ph_purchase_orders', JSON.stringify(demoPOs));
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allProds, allPharmacies, allTransfers, allSuppliers] = await Promise.all([
        apiService.productsAll.list(),
        apiService.pharmacies.list(),
        apiService.transfers.list(),
        apiService.suppliers.list()
      ]);
      setProducts(allProds);
      setPharmacies(allPharmacies);
      setTransfers(allTransfers);
      setSuppliers(allSuppliers);
    } catch (e) {
      toast.error('Failed to load warehouse configurations');
    }
    setIsLoading(false);
  };

  // Dynamically synchronize latest POS sales into our sync tracking queue
  useEffect(() => {
    const fetchOrdersForLogs = async () => {
      try {
        const [b1Orders, b2Orders] = await Promise.all([
          apiService.orders.list('pharma-1'),
          apiService.orders.list('pharma-2')
        ]);
        const combined = [...b1Orders, ...b2Orders]
          .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 3);
        
        const orderLogs = combined.map(o => ({
          id: `ORDER-LOG-${o.id}`,
          timestamp: new Date(o.createdAt).toLocaleTimeString(),
          message: `POS Terminal checkout completed: Sold ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} (Source: ${o.source || 'POS'})`,
          type: 'sale' as const
        }));

        setSyncLogs(prev => {
          const filteredPrev = prev.filter(p => !orderLogs.some(ol => ol.id === p.id));
          return [...orderLogs, ...filteredPrev];
        });
      } catch (e) {
        // Suppressed
      }
    };
    fetchOrdersForLogs();
  }, [products]);

  // Calculations
  const warehouseProducts = products.filter(p => p.pharmacyId === 'warehouse-1');
  const storeProducts = products.filter(p => p.pharmacyId !== 'warehouse-1');

  const totalWarehouseUnits = warehouseProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalWarehouseValue = warehouseProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
  
  const totalStoreUnits = storeProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalStoreValue = storeProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const grandConsolidatedUnits = totalWarehouseUnits + totalStoreUnits;
  const grandConsolidatedValue = totalWarehouseValue + totalStoreValue;

  // Filter unique names of medicines across the entire ecosystem to create our matrix row index
  const uniqueMedicineNames: string[] = Array.from(new Set(products.map(p => p.name as string).filter(Boolean)));

  // Real-time suggested replenishment alerts calculation
  const replenishmentRecommendations = useMemo(() => {
    const recommendations: Array<{
      productName: string;
      branchId: string;
      branchName: string;
      currentStock: number;
      minLevel: number;
      shortfall: number;
      availableInWarehouse: number;
    }> = [];

    const retailLocations = pharmacies.filter(p => p.id !== 'warehouse-1');

    retailLocations.forEach(loc => {
      const bProds = products.filter(p => p.pharmacyId === loc.id);
      bProds.forEach(bp => {
        if (bp.stock < bp.minStockLevel) {
          const whProd = products.find(wp => wp.pharmacyId === 'warehouse-1' && wp.name.toLowerCase() === bp.name.toLowerCase());
          const whStock = whProd ? whProd.stock : 0;
          
          if (whStock > 0) {
            recommendations.push({
              productName: bp.name,
              branchId: loc.id,
              branchName: loc.name === 'Central Pharmacy - Branch 01' ? 'Lagos Branch (B01)' : 'PH Branch (B04)',
              currentStock: bp.stock,
              minLevel: bp.minStockLevel,
              shortfall: (bp.minStockLevel * 2) - bp.stock, // Fulfill up to double minimum for safety threshold Buffer
              availableInWarehouse: whStock
            });
          }
        }
      });
    });

    return recommendations;
  }, [products, pharmacies]);

  const handleExecuteTransfer = async (prodName: string, targetId: string, qtyNeeded: number, silent = false) => {
    if (!prodName || !targetId || !qtyNeeded || qtyNeeded <= 0) {
      if (!silent) toast.error('Invalid transfer arguments');
      return;
    }

    const whProd = warehouseProducts.find(p => p.name === prodName);
    if (!whProd) {
      if (!silent) toast.error(`Product ${prodName} is unavailable in Central Warehouse`);
      return;
    }

    if (whProd.stock < qtyNeeded) {
      if (!silent) toast.error(`Insufficient Central Warehouse stock. Max available: ${whProd.stock}`);
      return;
    }

    try {
      await apiService.transfers.create('warehouse-1', targetId, prodName, whProd.barcode, qtyNeeded);
      
      const targetName = targetId === 'pharma-1' ? 'Lagos Branch (B01)' : 'PH Branch (B04)';
      
      if (!silent) {
        toast.success(`Successfully dispatched ${qtyNeeded.toLocaleString()} units of ${prodName} to ${targetName}`);
      }

      setSyncLogs(prev => [
        {
          id: `LOG-TR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Stock Dispatched: Moved ${qtyNeeded} units of ${prodName} from Warehouse-1 ➔ ${targetName}`,
          type: 'transfer'
        },
        ...prev
      ]);

      await loadData();
    } catch (err: any) {
      if (!silent) toast.error(err.message || 'Dispatch failed');
    }
  };

  const handleBulkReplenish = async () => {
    setIsLoading(true);
    let count = 0;
    
    for (const rec of replenishmentRecommendations) {
      const qty = Math.min(rec.shortfall, rec.availableInWarehouse);
      if (qty > 0) {
        await handleExecuteTransfer(rec.productName, rec.branchId, qty, true);
        count++;
      }
    }

    if (count > 0) {
      toast.success(`Consolidated Auto-Replenishment Successful!`, {
        description: `Triggered ${count} active restocks to replenish depleted branch levels.`
      });
    } else {
      toast.info('No low-stock replenishment gaps could be fulfilled right now.');
    }
    setIsLoading(false);
  };

  const handleCustomFormTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (!transferQty || transferQty <= 0) {
      toast.error('Please specify valid shipment units');
      return;
    }

    await handleExecuteTransfer(selectedProduct, targetBranch, Number(transferQty));
    setSelectedProduct('');
    setTransferQty('');
  };

  // Supplier Procurement lodging PO
  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureForm.supplierId || !procureForm.productName || !procureForm.quantity || !procureForm.costPrice || !procureForm.retailPrice) {
      toast.error('Please complete all procurement fields');
      return;
    }

    const newPO: PurchaseOrder = {
      id: `PO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      supplierId: procureForm.supplierId,
      productName: procureForm.productName,
      category: procureForm.category || 'Antibiotics',
      quantity: Number(procureForm.quantity),
      costPrice: Number(procureForm.costPrice),
      retailPrice: Number(procureForm.retailPrice),
      expiryDate: procureForm.expiryDate,
      batchNumber: procureForm.batchNumber || `BAT-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      status: 'ordered',
      createdAt: new Date().toISOString()
    };

    const updated = [newPO, ...purchaseOrders];
    setPurchaseOrders(updated);
    localStorage.setItem('ph_purchase_orders', JSON.stringify(updated));

    const supName = suppliers.find(s => s.id === procureForm.supplierId)?.name || 'Pfizer Inc.';

    setSyncLogs(prev => [
      {
        id: `LOG-PO-${newPO.id}`,
        timestamp: new Date().toLocaleTimeString(),
        message: `Purchase Order ${newPO.id} triggered to ${supName} for bulk supply line: ${newPO.quantity} units of ${poDesc(newPO.productName)}`,
        type: 'procure'
      },
      ...prev
    ]);

    toast.success(`Purchase Order ${newPO.id} lodged with ${supName}!`, {
      description: `Pending logistics delivery receipt in storage hub.`
    });

    setProcureForm({
      supplierId: '',
      productName: '',
      category: 'Antibiotics',
      quantity: '',
      costPrice: '',
      retailPrice: '',
      expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      batchNumber: ''
    });
  };

  const poDesc = (str: string) => str.length > 25 ? str.slice(0, 25) + "..." : str;

  // Receiving a Purchase Order Shipment from Supplier
  const handleReceivePOStock = async (po: PurchaseOrder) => {
    setIsLoading(true);
    try {
      const existingProduct = products.find(
        p => p.pharmacyId === 'warehouse-1' && p.name.toLowerCase() === po.productName.toLowerCase()
      );

      if (existingProduct) {
        const newBatch: Batch = {
          id: `B-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          batchNumber: po.batchNumber,
          manufactureDate: format(new Date(), 'yyyy-MM-dd'),
          expiryDate: po.expiryDate,
          quantity: po.quantity,
          costPrice: po.costPrice
        };

        const updatedBatches = [...existingProduct.batches, newBatch];
        const updatedStock = existingProduct.stock + po.quantity;

        await apiService.products.update(existingProduct.id, {
          stock: updatedStock,
          batches: updatedBatches,
          costPrice: po.costPrice,
          price: po.retailPrice,
          expiryDate: po.expiryDate
        });
      } else {
        const newProd: Product = {
          id: `P-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          name: po.productName,
          genericName: po.productName,
          category: po.category,
          price: po.retailPrice,
          costPrice: po.costPrice,
          stock: po.quantity,
          minStockLevel: 200,
          baseUnit: 'tablet',
          pharmacyId: 'warehouse-1',
          expiryDate: po.expiryDate,
          barcode: Math.random().toString().slice(2, 12),
          conversionFactor: 1,
          requiresPrescription: false,
          batches: [
            {
              id: `B-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              batchNumber: po.batchNumber,
              manufactureDate: format(new Date(), 'yyyy-MM-dd'),
              expiryDate: po.expiryDate,
              quantity: po.quantity,
              costPrice: po.costPrice
            }
          ]
        };

        await apiService.products.add(newProd);
      }

      // Mark PO status as received
      const updatedPOs = purchaseOrders.map(p => {
        if (p.id === po.id) {
          return { ...p, status: 'received' as const };
        }
        return p;
      });
      setPurchaseOrders(updatedPOs);
      localStorage.setItem('ph_purchase_orders', JSON.stringify(updatedPOs));

      toast.success(`PO ${po.id} Fulfilled! Stock Added to Warehouse`, {
        description: `Successfully stored and logged +${po.quantity} units of ${po.productName}.`
      });

      setSyncLogs(prev => [
        {
          id: `LOG-REC-${po.id}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Procurement Delivery Fulfill: Lodged batch ${po.batchNumber} of ${po.productName} into inventory holds.`,
          type: 'success'
        },
        ...prev
      ]);

      await loadData();
    } catch (e) {
      toast.error('Supply logistics integration failed');
    }
    setIsLoading(false);
  };

  // Helper categories options
  const defaultCats = ['Antibiotics', 'Pain Relief', 'Cholesterol', 'Vitamins', 'Syrups'];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic flex items-center gap-2">
            <Warehouse className="text-blue-600 w-8 h-8 md:w-9 md:h-9 shrink-0" />
            Interconnected Inventory & Warehouse Core
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
            Global Hub, Supply Dispatch Router, Merchant Procurements & Live sync Network Valuation
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={isLoading}
          className="h-11 md:h-12 px-6 rounded-xl md:rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          Force Sync Node
        </Button>
      </div>

      {/* Unified Valuation KPI Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Warehouse Valuation */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700/50">
                <Warehouse className="w-6 h-6 text-blue-400" />
              </div>
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                Storage Core
              </Badge>
            </div>
            
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Warehouse Storage Value</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mt-1">
              ₦{totalWarehouseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center justify-between mt-4 border-t border-slate-800 pt-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Warehouse Holds</span>
              <span className="font-mono text-sm font-black text-blue-400">{totalWarehouseUnits.toLocaleString()} units</span>
            </div>
          </CardContent>
        </Card>

        {/* Combined Storefront Sub-branches Valuation */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden relative group border border-transparent hover:border-slate-100">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                <Boxes className="w-6 h-6 text-indigo-600" />
              </div>
              <Badge className="bg-indigo-50 text-indigo-600 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                Branches Net
              </Badge>
            </div>
            
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Storefronts Assets Value</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mt-1">
              ₦{totalStoreValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Current Storefront Units</span>
              <span className="font-mono text-sm font-black text-indigo-600">{totalStoreUnits.toLocaleString()} units</span>
            </div>
          </CardContent>
        </Card>

        {/* GRAND CONSOLIDATED SYSTEM CARD */}
        <Card className="border-none shadow-2xl shadow-blue-600/5 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[50px] rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/10 text-white border border-white/20 px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                Ecosystem Valuation
              </Badge>
            </div>
            
            <p className="text-[10px] font-black uppercase text-blue-100 tracking-wider">Consolidated System Assets Valuation</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mt-1">
              ₦{grandConsolidatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-4">
              <span className="text-[10px] text-blue-100 font-bold uppercase">Ecosystem Combined Stock</span>
              <span className="font-mono text-sm font-black text-white">{grandConsolidatedUnits.toLocaleString()} units</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('matrix')}
          className={`pb-4 px-6 font-black text-[11px] uppercase tracking-wider transition-all relative ${activeTab === 'matrix' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Consolidated Matrix & Alerts
          {activeTab === 'matrix' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('procure')}
          className={`pb-4 px-6 font-black text-[11px] uppercase tracking-wider transition-all relative ${activeTab === 'procure' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Procurement & Supplier PO Pipe
          {activeTab === 'procure' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('pathways')}
          className={`pb-4 px-6 font-black text-[11px] uppercase tracking-wider transition-all relative ${activeTab === 'pathways' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Supply Chain Nodes & Sync Ticker
          {activeTab === 'pathways' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('transfers')}
          className={`pb-4 px-6 font-black text-[11px] uppercase tracking-wider transition-all relative ${activeTab === 'transfers' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Logistics Transfers & Queue
          {activeTab === 'transfers' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'matrix' && (
        <div className="space-y-8">
          {/* Automated Replenishment Drawer Panel */}
          {replenishmentRecommendations.length > 0 ? (
            <Card className="border border-amber-200/50 rounded-[2rem] bg-amber-50/10 shadow-xl shadow-amber-500/5 overflow-hidden">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row shadow-inner justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3.5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest leading-none">
                    <ShieldAlert size={12} className="shrink-0 animate-bounce text-amber-600" />
                    Auto-Replenish Center: {replenishmentRecommendations.length} Critical Alert{replenishmentRecommendations.length > 1 ? 's' : ''} detected
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
                    Systemic Low Stock Recommendations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Retail locations have run below safe threshold points. Auto-allocation calculated the shortfall holds required to restock sub-stores from General Warehouse.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                  <Button 
                    onClick={handleBulkReplenish}
                    size="lg"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 shadow-md hover:shadow-lg transition-all rounded-xl"
                  >
                    <Zap className="mr-2 w-4 h-4 fill-white shrink-0" />
                    Approve & Dispatch All ({replenishmentRecommendations.length})
                  </Button>
                </div>
              </CardContent>
              {/* Recommendations mini ledger */}
              <div className="border-t border-slate-100 bg-white/70">
                <Table>
                  <TableHeader className="bg-slate-50/55 text-slate-400">
                    <TableRow className="border-none">
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider py-4 pl-8">Recipient Location</TableHead>
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider">Medicine</TableHead>
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider text-center">Remaining Stock</TableHead>
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider text-center">Target Restock Volume</TableHead>
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider text-center">Warehouse Availability</TableHead>
                      <TableHead className="font-extrabold text-[9px] uppercase tracking-wider text-right pr-8">Fulfillment Route</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replenishmentRecommendations.map((rec, idx) => (
                      <TableRow key={`${rec.branchId}-${rec.productName}-${idx}`} className="border-b border-slate-50 text-slate-700">
                        <TableCell className="pl-8 py-4">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            {rec.branchName}
                          </span>
                        </TableCell>
                        <TableCell className="font-black italic text-slate-800">{rec.productName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 font-extrabold tracking-tight">
                            {rec.currentStock} / {rec.minLevel} Min
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-indigo-600 font-bold">
                          +{rec.shortfall} units
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-slate-500">
                          {rec.availableInWarehouse.toLocaleString()} available
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="outline"
                            onClick={() => handleExecuteTransfer(rec.productName, rec.branchId, rec.shortfall)}
                            className="bg-white hover:bg-slate-50 border-2 border-slate-100 text-[8px] font-black uppercase tracking-widest h-8 px-3 rounded-lg"
                          >
                            Dispatch Single
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="bg-emerald-50/20 border border-emerald-100/50 p-6 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">All Storefront Sub-branches stock is fully nominal</h4>
                  <p className="text-xs text-slate-500">No urgent stock replenishment warnings logged across the retail sub-networks.</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">All OK</Badge>
            </div>
          )}

          {/* Core Master Grid Matrix */}
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Ecosystem Stock Matrix</CardTitle>
                <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  Unified live view comparing General Warehouse holdings against active Lagos VII & PH clinical stores
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-5 pl-8 text-slate-400">Medicine SKU description</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">Warehouse Storage</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">Lagos Branch (B01)</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">PH Branch (B04)</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">Combined System Sum</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-center text-slate-400 pr-8">Logistics Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueMedicineNames.map(medName => {
                    const whStock = products.find(p => p.pharmacyId === 'warehouse-1' && p.name === medName)?.stock || 0;
                    const b1Prod = products.find(p => p.pharmacyId === 'pharma-1' && p.name === medName);
                    const b2Prod = products.find(p => p.pharmacyId === 'pharma-2' && p.name === medName);
                    
                    const b1Stock = b1Prod?.stock || 0;
                    const b2Stock = b2Prod?.stock || 0;
                    const systemSum = whStock + b1Stock + b2Stock;

                    const whPrice = products.find(p => p.pharmacyId === 'warehouse-1' && p.name === medName)?.price || 0;

                    const isLowB1 = b1Prod && b1Stock < b1Prod.minStockLevel;
                    const isLowB2 = b2Prod && b2Stock < b2Prod.minStockLevel;

                    return (
                      <TableRow key={medName} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="py-5 pl-8 font-black text-slate-900 text-sm">
                          {medName}
                          {whPrice > 0 && (
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Consolidated Retail: ₦{whPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-blue-600 text-sm">
                          {whStock === 0 ? (
                            <span className="text-slate-300">Out of Stock</span>
                          ) : (
                            whStock.toLocaleString()
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className={isLowB1 ? 'text-red-500 font-black' : 'text-slate-600 font-bold'}>
                            {b1Stock.toLocaleString()}
                          </span>
                          {isLowB1 && <span className="block text-[8px] font-black text-red-500 uppercase tracking-tighter shrink-0 animate-pulse">Low Stock</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className={isLowB2 ? 'text-red-500 font-black' : 'text-slate-600 font-bold'}>
                            {b2Stock.toLocaleString()}
                          </span>
                          {isLowB2 && <span className="block text-[8px] font-black text-red-500 uppercase tracking-tighter shrink-0 animate-pulse">Low Stock</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-black text-indigo-600">
                          {systemSum.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center pr-8">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleExecuteTransfer(medName, 'pharma-1', 100)}
                              disabled={whStock < 100}
                              className="h-8 rounded-lg px-2 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              +100 to B01
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleExecuteTransfer(medName, 'pharma-2', 100)}
                              disabled={whStock < 100}
                              className="h-8 rounded-lg px-2 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              +100 to B04
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'procure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Purchase Order Issuer Form */}
          <Card className="lg:col-span-5 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-8">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-50">
              <CardTitle className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                <Truck className="text-blue-600 w-5 h-5 shrink-0" />
                Lodge Purchase Order
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Trigger a bulk procurement shipment from external supplier lines to WarehouseCore holds
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreatePurchaseOrder} className="py-6 space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Supplier Partner</label>
                <select 
                  value={procureForm.supplierId}
                  onChange={(e) => setProcureForm({ ...procureForm, supplierId: e.target.value })}
                  className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-sm text-slate-900 px-4 focus:outline-none"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name} ({sup.contactName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Medicine Name</label>
                  <Input 
                    placeholder="e.g. Lipitor 20mg"
                    value={procureForm.productName}
                    onChange={(e) => setProcureForm({ ...procureForm, productName: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category</label>
                  <select 
                    value={procureForm.category}
                    onChange={(e) => setProcureForm({ ...procureForm, category: e.target.value })}
                    className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-sm text-slate-900 px-4 focus:outline-none"
                  >
                    {defaultCats.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Quantity (Units)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 5000"
                    value={procureForm.quantity}
                    onChange={(e) => setProcureForm({ ...procureForm, quantity: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Batch Code Reference</label>
                  <Input 
                    placeholder="e.g. TX-A99"
                    value={procureForm.batchNumber}
                    onChange={(e) => setProcureForm({ ...procureForm, batchNumber: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Unit Cost Price (₦)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 1500"
                    value={procureForm.costPrice}
                    onChange={(e) => setProcureForm({ ...procureForm, costPrice: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Target Retail Price (₦)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 2300"
                    value={procureForm.retailPrice}
                    onChange={(e) => setProcureForm({ ...procureForm, retailPrice: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Estimated Expiry Date</label>
                <Input 
                  type="date"
                  value={procureForm.expiryDate}
                  onChange={(e) => setProcureForm({ ...procureForm, expiryDate: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold text-slate-900"
                />
              </div>

              <Button 
                type="submit"
                className="w-full h-14 bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-slate-900/10 mt-6"
              >
                Lodge Procurement Order
              </Button>
            </form>
          </Card>

          {/* Active Logistics Procurement Pipeline */}
          <Card className="lg:col-span-7 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Logistics Pipeline & PO Ledger</CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Deliveries outstanding from external pharmaceutical suppliers. Approve delivery receipt to trigger stock synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-5 pl-8 text-slate-400">PO ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Shipper / Supplier</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Medicine SKU</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">Qty Units</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">COGS Net</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-center pr-8 text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        No pending procurements outstanding
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map(po => {
                      const sup = suppliers.find(s => s.id === po.supplierId);
                      const isReceived = po.status === 'received';

                      return (
                        <TableRow key={po.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                          <TableCell className="py-5 pl-8 font-mono text-xs font-black text-slate-900">{po.id}</TableCell>
                          <TableCell className="font-extrabold text-slate-800 text-xs">
                            {sup ? sup.name : 'Pfizer Inc.'}
                          </TableCell>
                          <TableCell className="font-bold text-slate-700">
                            {po.productName}
                            <span className="block text-[9px] text-slate-400 tracking-wider uppercase font-mono mt-0.5">
                              Batch: {po.batchNumber}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800">{po.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-extrabold text-blue-600">
                            ₦{(po.costPrice * po.quantity).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center pr-8">
                            {isReceived ? (
                              <Badge className="bg-emerald-50 text-emerald-600 border-none px-3.5 py-1 font-black text-[8px] uppercase tracking-widest cursor-default">
                                Synced / Received
                              </Badge>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleReceivePOStock(po)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[8px] uppercase tracking-widest h-8 px-3 rounded-lg flex items-center gap-1.5 mx-auto cursor-pointer"
                              >
                                Accept & Stock Core
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'pathways' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Flow Pathways Diagram */}
          <Card className="lg:col-span-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-8 flex flex-col justify-between">
            <div>
              <CardHeader className="px-0 pt-0 pb-6 border-b border-indigo-50/30">
                <CardTitle className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                  <Activity className="text-blue-600 w-5 h-5 shrink-0 animate-pulse" />
                  Supply Chain Flow pathways
                </CardTitle>
                <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  Click any node pathway terminal below to audit live database state and pipeline connection integrity
                </CardDescription>
              </CardHeader>

              {/* Graphical Node SVG Map */}
              <div className="py-8 bg-slate-50/20 rounded-3xl border border-slate-100/10 p-4 md:p-6 my-6 flex items-center justify-center">
                <svg viewBox="0 0 1000 320" className="w-full h-auto text-slate-400 select-none">
                  {/* Connectors */}
                  {/* Suppliers to Warehouse */}
                  <line x1="130" y1="160" x2="380" y2="160" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6,4" />
                  
                  {/* Warehouse to Lagos Branch */}
                  <path d="M 460 160 Q 570 100 680 90" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6,4" className="animate-[dash_6s_linear_infinite]" />
                  
                  {/* Warehouse to PH Branch */}
                  <path d="M 460 160 Q 570 220 680 230" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6,4" />
                  
                  {/* Branches to POS Sales */}
                  <line x1="740" y1="90" x2="880" y2="160" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6,4" />
                  <line x1="740" y1="230" x2="880" y2="160" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6,4" />

                  {/* Nodes (Supplier) */}
                  <g className="cursor-pointer group" onClick={() => setSelectedVisualNode('supplier')}>
                     <circle cx="110" cy="160" r="45" fill={selectedVisualNode === 'supplier' ? '#f1f5f9' : '#f8fafc'} stroke={selectedVisualNode === 'supplier' ? '#334155' : '#64748b'} strokeWidth={selectedVisualNode === 'supplier' ? '6' : '3.5'} className="transition-all duration-300" />
                     <text x="110" y="156" textAnchor="middle" fill="#0f172a" className="font-extrabold text-[12px] uppercase">Suppliers</text>
                     <text x="110" y="172" textAnchor="middle" fill="#64748b" className="font-bold text-[8px] uppercase">{suppliers.length} Partners</text>
                  </g>

                  {/* Node (Warehouse) */}
                  <g className="cursor-pointer group" onClick={() => setSelectedVisualNode('warehouse')}>
                     <circle cx="420" cy="160" r="58" fill={selectedVisualNode === 'warehouse' ? '#0f172a' : '#1e293b'} stroke="#3b82f6" strokeWidth={selectedVisualNode === 'warehouse' ? '7' : '4.5'} className="transition-all duration-300 animate-none" />
                     <text x="420" y="152" textAnchor="middle" fill="#ffffff" className="font-black text-[13px] uppercase tracking-wider">Storage core</text>
                     <text x="420" y="169" textAnchor="middle" fill="#3b82f6" className="font-mono font-black text-[10px]">{totalWarehouseUnits.toLocaleString()} U</text>
                     <text x="420" y="181" textAnchor="middle" fill="#94a3b8" className="font-black text-[7px] tracking-widest uppercase">General IQ</text>
                  </g>

                  {/* Node (Branch 1) */}
                  <g className="cursor-pointer group" onClick={() => setSelectedVisualNode('branches')}>
                     <circle cx="710" cy="90" r="40" fill={selectedVisualNode === 'branches' ? '#eff6ff' : '#f8fafc'} stroke="#2563eb" strokeWidth={selectedVisualNode === 'branches' ? '6' : '3.5'} className="transition-all duration-300" />
                     <text x="710" y="86" textAnchor="middle" fill="#0f172a" className="font-black text-[10px] uppercase">Lagos VII</text>
                     <text x="710" y="100" textAnchor="middle" fill="#2563eb" className="font-bold font-mono text-[9px]">{products.filter(p => p.pharmacyId === 'pharma-1').reduce((sum, p) => sum + p.stock, 0).toLocaleString()} U</text>
                  </g>

                  {/* Node (Branch 4) */}
                  <g className="cursor-pointer group" onClick={() => setSelectedVisualNode('branches')}>
                     <circle cx="710" cy="230" r="40" fill={selectedVisualNode === 'branches' ? '#eef2ff' : '#f8fafc'} stroke="#6366f1" strokeWidth={selectedVisualNode === 'branches' ? '6' : '3.5'} className="transition-all duration-300" />
                     <text x="710" y="226" textAnchor="middle" fill="#0f172a" className="font-black text-[10px] uppercase">PH Clinical</text>
                     <text x="710" y="240" textAnchor="middle" fill="#6366f1" className="font-bold font-mono text-[9px]">{products.filter(p => p.pharmacyId === 'pharma-2').reduce((sum, p) => sum + p.stock, 0).toLocaleString()} U</text>
                  </g>

                  {/* Node (POS Flow) */}
                  <g className="cursor-pointer group" onClick={() => setSelectedVisualNode('pos')}>
                     <circle cx="910" cy="160" r="45" fill={selectedVisualNode === 'pos' ? '#ecfdf5' : '#f0fdf4'} stroke="#10b981" strokeWidth={selectedVisualNode === 'pos' ? '6' : '3.5'} className="transition-all duration-300 animate-pulse" />
                     <text x="910" y="156" textAnchor="middle" fill="#064e3b" className="font-black text-[12px] uppercase">POS Registers</text>
                     <text x="910" y="172" textAnchor="middle" fill="#059669" className="font-extrabold text-[8px] uppercase">Connected</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Active Audit state block based on clicks above */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 text-left">
              {selectedVisualNode === 'supplier' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Supplier Node Registry State</p>
                  <div className="grid grid-cols-2 gap-4">
                    {suppliers.map(sup => (
                      <div key={sup.id} className="bg-white p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-black text-slate-900 leading-none">{sup.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Contact: {sup.contactName} | {sup.email}</p>
                        <p className="text-[11px] font-extrabold text-blue-600 mt-2">Active outstanding: ₦{sup.totalOwing.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVisualNode === 'warehouse' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Storage Holds Audit State</p>
                    <Badge className="bg-blue-50 text-blue-600 border-none px-2 py-0.5 font-bold text-[8px] uppercase tracking-wider">Central Warehouse Holds</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {warehouseProducts.slice(0, 3).map(p => (
                      <div key={p.id} className="bg-white p-3.5 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-sm font-black text-blue-600 mt-1 leading-none">{p.stock.toLocaleString()}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Min: {p.minStockLevel || 500} units</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVisualNode === 'branches' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Retail Assets Node Stock compare</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-slate-900">Branch 01 (Lagos)</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Operational store records</p>
                      </div>
                      <p className="text-xl font-black text-blue-600">{products.filter(p => p.pharmacyId === 'pharma-1').reduce((acc, p) => acc + p.stock, 0).toLocaleString()} U</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-slate-900">Branch 04 (PH)</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Clinical store records</p>
                      </div>
                      <p className="text-xl font-black text-indigo-600">{products.filter(p => p.pharmacyId === 'pharma-2').reduce((acc, p) => acc + p.stock, 0).toLocaleString()} U</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedVisualNode === 'pos' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">POS Registers Real-time throughput</p>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none px-2.5 py-0.5 font-bold text-[8px] uppercase tracking-widest flex items-center gap-1">
                      <Zap size={8} className="animate-pulse" /> Active Session State
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    State synchronization loops are active. Sales completed at checkout points instantly trigger atomic deductions across regional branch inventory indexes.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Connection Sync Terminal stream console */}
          <Card className="lg:col-span-4 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-slate-900 text-white p-8 flex flex-col h-[460px] md:h-auto overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="space-y-0.5 text-left">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#10b981] flex items-center gap-1.5 leading-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  Node Activity Sync Trace
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Primary stream websocket tracer</p>
              </div>
              <Badge className="bg-slate-800 text-slate-300 border-none text-[8px] font-mono select-none uppercase tracking-wider">
                VITE-HMR LOG
              </Badge>
            </div>

            <ScrollArea className="flex-1 pr-2 py-4 font-mono text-[10px] space-y-3.5 select-text overflow-y-auto">
              {syncLogs.map((log) => {
                const badgeColor = 
                  log.type === 'system' ? 'text-amber-400' :
                  log.type === 'success' ? 'text-[#10b981]' :
                  log.type === 'transfer' ? 'text-blue-400' :
                  log.type === 'procure' ? 'text-purple-400' :
                  log.type === 'sale' ? 'text-emerald-400' : 'text-slate-300';

                return (
                  <div key={log.id} className="border-b border-slate-800/40 pb-2 flex items-start gap-2.5 text-left text-slate-400 leading-relaxed font-medium">
                    <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                    <p className="flex-1">
                      <span className={`font-black uppercase tracking-wider ${badgeColor} mr-1`}>
                        {log.type}:
                      </span>
                      {log.message}
                    </p>
                  </div>
                );
              })}
            </ScrollArea>
          </Card>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Manual Stock Dispatch Form */}
          <Card className="lg:col-span-4 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-8">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-50">
              <CardTitle className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2 text-left">
                <ArrowRightLeft className="text-blue-600 w-5 h-5 shrink-0" />
                Initiate Custom Dispatch
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 text-left">
                Trigger manual allocation shipments from general warehouse holds to storefronts
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCustomFormTransfer} className="py-6 space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Inventory Item</label>
                <select 
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                >
                  <option value="">-- Choose item --</option>
                  {warehouseProducts.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Available: {p.stock.toLocaleString()} units)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Destination Branch Location</label>
                  <select 
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="pharma-1">Central Pharmacy - Branch 01</option>
                    <option value="pharma-2">Eastside Clinic - Branch 04</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Shipment Volume (Units)</label>
                  <Input 
                    type="number"
                    placeholder="Enter Quantity Units"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold text-slate-900"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                disabled={!selectedProduct || !transferQty}
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-600/30 text-white font-black text-xs uppercase tracking-widest cursor-pointer"
              >
                Dispatch Supply Shipment
              </Button>
            </form>
          </Card>

          {/* Transfer Dispatch Logs table */}
          <Card className="lg:col-span-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Dispatch Audit Queue</CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Historical record audit trail of all warehouse transfers out to sub-branch locations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-5 pl-8 text-slate-400">Transfer ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Destination</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Medicine Dispatched</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right text-slate-400">Quantity Units</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Date Logged</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-8 text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        No warehouse dispatches logged yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map(tr => (
                      <TableRow key={tr.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="py-5 pl-8 font-mono text-xs font-black text-slate-900">{tr.id}</TableCell>
                        <TableCell className="font-bold text-slate-800 text-xs">
                          {tr.targetPharmacyId === 'pharma-1' ? 'Central Pharmacy - Branch 01' : 'Eastside Clinic - Branch 04'}
                        </TableCell>
                        <TableCell className="font-black italic text-slate-700">{tr.productName}</TableCell>
                        <TableCell className="text-right font-mono font-black text-blue-600 text-sm">{tr.quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-400">
                          {new Date(tr.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest cursor-default">
                            Settle / Received
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
