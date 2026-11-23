import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Search, 
  Plus, 
  MoreHorizontal, 
  AlertCircle, 
  ArrowUpRight, 
  Edit,
  Trash2,
  FileText,
  Calendar,
  Truck,
  ArrowRightLeft,
  ChevronRight,
  TrendingDown,
  Warehouse
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiService } from '../../services/api';
import { Product, Batch, Supplier, Category } from '../../types/pharmacy';
import { LowStockWidget } from './LowStockWidget';
import { ExpiringSoonWidget } from './ExpiringSoonWidget';
import { format, isBefore, addDays } from 'date-fns';

import { toast } from 'sonner';

export function InventoryView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogBatchOpen, setIsLogBatchOpen] = useState(false);

  // Stock Transfer states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSource, setTransferSource] = useState(selectedBranchId);
  const [transferDestination, setTransferDestination] = useState('');
  const [sourceProducts, setSourceProducts] = useState<Product[]>([]);
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [transferQuantities, setTransferQuantities] = useState<{ [productId: string]: number }>({});
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [transferSelectedProductIds, setTransferSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  useEffect(() => {
    if (isTransferDialogOpen) {
      loadSourceProducts();
    }
  }, [transferSource, isTransferDialogOpen]);

  const loadSourceProducts = async () => {
    try {
      const prods = await apiService.products.list(transferSource);
      setSourceProducts(prods);
      setTransferQuantities(prev => {
        const next = { ...prev };
        prods.forEach(p => {
          if (next[p.id] === undefined) {
            next[p.id] = Math.min(1, p.stock);
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Error loading source products:', err);
    }
  };

  const handleOpenTransferDialog = () => {
    setTransferSource(selectedBranchId);
    if (selectedProductIds.length > 0) {
      setTransferSelectedProductIds(selectedProductIds);
      const qtys: { [id: string]: number } = {};
      products.forEach(p => {
        if (selectedProductIds.includes(p.id)) {
          qtys[p.id] = Math.min(1, p.stock);
        }
      });
      setTransferQuantities(prev => ({ ...prev, ...qtys }));
    } else {
      setTransferSelectedProductIds([]);
    }
    
    const otherPharma = pharmacies.find(p => p.id !== selectedBranchId);
    if (otherPharma) {
      setTransferDestination(otherPharma.id);
    } else {
      setTransferDestination('');
    }
    setIsTransferDialogOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!transferSource) {
      toast.error('Please select a source facility');
      return;
    }
    if (!transferDestination) {
      toast.error('Please select a destination facility');
      return;
    }
    if (transferSource === transferDestination) {
      toast.error('Source and destination facilities must be different');
      return;
    }
    if (transferSelectedProductIds.length === 0) {
      toast.error('Please select at least one product to transfer');
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let errors: string[] = [];

    for (const pId of transferSelectedProductIds) {
      const prod = sourceProducts.find(p => p.id === pId);
      if (!prod) continue;

      const qty = transferQuantities[pId] || 0;
      if (qty <= 0) {
        errors.push(`${prod.name}: Quantity must be greater than 0`);
        failedCount++;
        continue;
      }
      if (qty > prod.stock) {
        errors.push(`${prod.name}: Insufficient stock (transferring ${qty}, available ${prod.stock})`);
        failedCount++;
        continue;
      }

      try {
        await apiService.transfers.create(
          transferSource,
          transferDestination,
          prod.name,
          prod.barcode,
          qty
        );
        successCount++;
      } catch (err: any) {
        errors.push(`${prod.name}: ${err.message || 'Transfer failed'}`);
        failedCount++;
      }
    }

    if (successCount > 0) {
      const sourceName = pharmacies.find(p => p.id === transferSource)?.name || transferSource;
      const destName = pharmacies.find(p => p.id === transferDestination)?.name || transferDestination;
      toast.success(`Successfully transferred ${successCount} products from ${sourceName} to ${destName}!`);
    }

    if (failedCount > 0) {
      errors.forEach(err => toast.error(err));
    }

    setSelectedProductIds([]);
    setTransferSelectedProductIds([]);
    setIsTransferDialogOpen(false);
    loadData();
  };

  const loadData = async () => {
    const [p, s, c, ph] = await Promise.all([
      apiService.products.list(selectedBranchId),
      apiService.suppliers.list(),
      apiService.categories.list(),
      apiService.pharmacies ? apiService.pharmacies.list() : Promise.resolve([])
    ]);
    setProducts(p);
    setSuppliers(s);
    setCategories(c);
    setPharmacies(ph || []);
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    genericName: '',
    category: '',
    batchId: '',
    qty: 0,
    price: 0,
    cost: 0,
    expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd')
  });

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.qty) return;
    
    const product: Product = {
      id: `P-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      name: newProduct.name,
      genericName: newProduct.genericName || "Generic Reference",
      category: newProduct.category || (categories[0]?.name || "Tablets"),
      price: newProduct.price || 10,
      costPrice: newProduct.cost || 6.5,
      stock: newProduct.qty,
      minStockLevel: 20,
      baseUnit: "tablet",
      pharmacyId: selectedBranchId,
      expiryDate: newProduct.expiryDate,
      barcode: Math.random().toString().slice(2, 12),
      batches: [
        {
          id: `B-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          batchNumber: newProduct.batchId || 'B-001',
          manufactureDate: format(new Date(), 'yyyy-MM-dd'),
          expiryDate: newProduct.expiryDate,
          quantity: newProduct.qty,
          costPrice: newProduct.cost || 6.5
        }
      ],
      conversionFactor: 1,
      requiresPrescription: false
    };

    await apiService.products.add(product);
    toast.success(`${product.name} committed to warehouse`);
    setIsLogBatchOpen(false);
    setNewProduct({
      name: '',
      genericName: '',
      category: '',
      batchId: '',
      qty: 0,
      price: 0,
      cost: 0,
      expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd')
    });
    loadData();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.genericName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  );

  const getExpiryStatus = (date: string) => {
    const now = new Date();
    const expiry = new Date(date);
    if (isBefore(expiry, now)) return 'expired';
    if (isBefore(expiry, addDays(now, 90))) return 'warning';
    return 'healthy';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Inventory Management</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Warehouse stock optimization and batch controller</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
              <Button 
                variant="outline" 
                onClick={handleOpenTransferDialog}
                className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 shadow-sm transition-all cursor-pointer inline-flex items-center justify-center"
              >
                <ArrowRightLeft className="mr-1.5 w-3.5 h-3.5 text-blue-600" /> Move Stock
              </Button>
              <DialogContent className="sm:max-w-2xl rounded-2xl p-6 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2 text-slate-900">
                    <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Inter-Branch Stock Transfer
                  </DialogTitle>
                  <DialogDescription className="font-normal text-slate-500 text-xs mt-1">
                    Direct logistics and stock routing between branches and central warehouses
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-medium text-slate-700">Source Facility</label>
                    <select
                      value={transferSource}
                      onChange={(e) => {
                        setTransferSource(e.target.value);
                        setTransferSelectedProductIds([]);
                      }}
                      className="w-full h-10 rounded-lg px-3 bg-slate-50 border border-slate-200 font-medium text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      {pharmacies.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-medium text-slate-700">Destination Facility</label>
                    <select
                      value={transferDestination}
                      onChange={(e) => setTransferDestination(e.target.value)}
                      className="w-full h-10 rounded-lg px-3 bg-slate-50 border border-slate-200 font-medium text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">-- Select Destination --</option>
                      {pharmacies
                        .filter(p => p.id !== transferSource)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-700">Select Products ({transferSelectedProductIds.length} chosen)</label>
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <Input
                        placeholder="Search items..."
                        value={transferSearchQuery}
                        onChange={(e) => setTransferSearchQuery(e.target.value)}
                        className="pl-8 h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-60 overflow-y-auto bg-white p-2">
                    {sourceProducts
                      .filter(p => p.name.toLowerCase().includes(transferSearchQuery.toLowerCase()))
                      .map(p => {
                        const isSelected = transferSelectedProductIds.includes(p.id);
                        const qty = transferQuantities[p.id] || 1;
                        return (
                          <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${isSelected ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTransferSelectedProductIds(prev => [...prev, p.id]);
                                  } else {
                                    setTransferSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                  {p.category} • <span className="text-blue-600 font-mono font-bold">{p.stock} units available</span>
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8 rounded-lg border-slate-100 bg-white"
                                  onClick={() => {
                                    setTransferQuantities(prev => ({
                                      ...prev,
                                      [p.id]: Math.max(1, qty - 1)
                                    }));
                                  }}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={p.stock}
                                  value={qty}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(p.stock, Number(e.target.value)));
                                    setTransferQuantities(prev => ({
                                      ...prev,
                                      [p.id]: val
                                    }));
                                  }}
                                  className="w-16 h-8 text-center font-bold text-xs bg-slate-50 border-none rounded-lg focus-visible:ring-0"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8 rounded-lg border-slate-100 bg-white"
                                  onClick={() => {
                                    setTransferQuantities(prev => ({
                                      ...prev,
                                      [p.id]: Math.min(p.stock, qty + 1)
                                    }));
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {sourceProducts.filter(p => p.name.toLowerCase().includes(transferSearchQuery.toLowerCase())).length === 0 && (
                      <p className="text-xs font-bold text-slate-400 text-center py-6">No products found in this source facility</p>
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <div className="w-full flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsTransferDialogOpen(false)}
                      className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-100 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleExecuteTransfer}
                      disabled={transferSelectedProductIds.length === 0 || !transferDestination}
                      className="flex-1 h-14 bg-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 text-white cursor-pointer"
                    >
                      Execute Transfer ({transferSelectedProductIds.length} items)
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
           <Dialog open={isLogBatchOpen} onOpenChange={setIsLogBatchOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 px-3.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-xs text-white shadow-sm transition-all cursor-pointer inline-flex items-center justify-center">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-8 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Supply Log Entry</DialogTitle>
                <DialogDescription className="font-bold text-slate-400 text-xs uppercase tracking-widest">Register incoming stock shipment and batch details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6 font-sans">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Product Name</label>
                       <Input 
                         placeholder="Name (e.g. Paracetamol)" 
                         className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                         value={newProduct.name}
                         onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1.5 text-left">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Generic Formula</label>
                       <Input 
                         placeholder="Acetaminophen" 
                         className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                         value={newProduct.genericName}
                         onChange={(e) => setNewProduct({...newProduct, genericName: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category Select</label>
                    <select 
                      className="w-full h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold text-sm text-slate-900 focus:outline-none"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Batch ID (e.g. TX-201)" 
                      className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                      onChange={(e) => setNewProduct({...newProduct, batchId: e.target.value})}
                    />
                    <Input 
                      placeholder="Qty in Units" 
                      type="number" 
                      className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                      onChange={(e) => setNewProduct({...newProduct, qty: Number(e.target.value)})}
                    />
                 </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Retail Price (₦)" 
                      type="number" 
                      className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                      onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                     />
                     <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Product Cost Price (₦)</label>
                        <Input 
                          placeholder="Unit Cost Price (₦)" 
                          type="number" 
                          className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold text-slate-700" 
                          onChange={(e) => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                        />
                     </div>
                     {/* Batch economics live calculations */}
                     {newProduct.price > 0 && newProduct.cost > 0 && (
                        <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 space-y-3 animate-in slide-in-from-bottom duration-300 col-span-2 text-left">
                           <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Calculated Batch Economics</p>
                           <div className="grid grid-cols-3 gap-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-100/40 shadow-sm">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Profit / Unit</p>
                                 <p className="text-sm font-black text-emerald-600 mt-1 leading-none">₦{(newProduct.price - newProduct.cost).toFixed(2)}</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100/40 shadow-sm">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Profit Margin</p>
                                 <p className="text-sm font-black text-blue-600 mt-1 leading-none">{((newProduct.price - newProduct.cost) / newProduct.price * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100/40 shadow-sm">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Est. Profit</p>
                                 <p className="text-sm font-black text-emerald-700 mt-1 leading-none">₦{((newProduct.price - newProduct.cost) * newProduct.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                              </div>
                           </div>
                        </div>
                     )}
                     <span className="hidden"
                    />
                    <Input 
                      placeholder="Expiry Date" 
                      type="date" 
                      className="h-14 rounded-2xl px-6 bg-slate-50 border-none font-bold" 
                      defaultValue={newProduct.expiryDate}
                      onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                    />
                 </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddProduct}
                  className="w-full h-14 bg-blue-600 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 text-white"
                >
                  Commit to Warehouse
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatsCard 
          title="Total Stock Units" 
          value={products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} 
          subtitle="Aggregate inventory count" 
          icon={<Warehouse className="w-4 h-4 text-blue-600" />} 
          color="blue"
        />
        <StatsCard 
          title="Stock Alerts" 
          value={products.filter(p => p.stock <= (p.minStockLevel !== undefined ? p.minStockLevel : 10)).length} 
          subtitle="Low inventory priority" 
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />} 
          color="red"
        />
        <StatsCard 
          title="Near Expiry" 
          value={products.filter(p => getExpiryStatus(p.expiryDate) === 'warning').length} 
          subtitle="Under 90-day window" 
          icon={<Calendar className="w-4 h-4 text-amber-600" />} 
          color="amber"
        />
        <StatsCard 
          title="Stock Valuation" 
          value={`₦${products.reduce((acc, p) => acc + (p.stock * p.price), 0).toLocaleString()}`} 
          subtitle={`Cost: ₦${products.reduce((acc, p) => acc + (p.stock * (p.costPrice || p.price * 0.65)), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          icon={<TrendingDown className="w-4 h-4 text-emerald-600" />} 
          color="blue"
        />
        <StatsCard 
          title="Active Suppliers" 
          value={suppliers.length} 
          subtitle="Verified B2B channels" 
          icon={<Truck className="w-4 h-4 text-indigo-600" />} 
          color="indigo"
        />
      </div>

      {/* Low Stock Dashboard Widget */}
      <LowStockWidget products={products} />

      {/* Expiring Soon Dashboard Widget */}
      <ExpiringSoonWidget products={products} />

      <Card className="rounded-xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">Medicinal Master Index</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-normal mt-0.5">Real-time batch tracking and multi-unit visibility</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <Input 
              placeholder="Search by name, generic, barcode..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus-visible:ring-1 focus-visible:ring-blue-600"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-10 px-4 py-3 text-center whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(filteredProducts.map(p => p.id));
                        } else {
                          setSelectedProductIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-xs text-slate-600 tracking-normal whitespace-nowrap">Product & Generic</TableHead>
                  <TableHead className="px-3 py-3 font-semibold text-xs text-slate-600 tracking-normal whitespace-nowrap">Category</TableHead>
                  <TableHead className="px-3 py-3 font-semibold text-xs text-slate-600 tracking-normal whitespace-nowrap">Current Stock</TableHead>
                  <TableHead className="px-3 py-3 font-semibold text-xs text-slate-600 tracking-normal whitespace-nowrap">Pricing</TableHead>
                  <TableHead className="px-3 py-3 font-semibold text-xs text-slate-600 tracking-normal whitespace-nowrap">Expiry Date</TableHead>
                  <TableHead className="w-12 px-3 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const expiryStatus = getExpiryStatus(product.expiryDate);
                  return (
                    <TableRow key={product.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0 group">
                      <TableCell className="w-10 px-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(prev => [...prev, product.id]);
                            } else {
                              setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-semibold text-xs text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                               {product.name[0]}
                            </div>
                            <div>
                               <p className="font-medium text-slate-900 text-xs leading-snug">{product.name}</p>
                               <p className="text-[11px] text-slate-500 font-normal mt-0.5">{product.genericName || 'Unspecified'}</p>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                         <Badge variant="ghost" className="bg-slate-100 text-slate-700 font-normal text-xs px-2 py-0.5 rounded-md">
                            {product.category}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                         <div className="space-y-1">
                            <p className={`font-medium text-xs ${product.stock < product.minStockLevel ? 'text-rose-600' : 'text-slate-900'}`}>
                               {product.stock.toLocaleString()} {product.baseUnit}s
                            </p>
                            <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                  className={`h-full rounded-full ${product.stock < product.minStockLevel ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${Math.min(100, (product.stock / (product.minStockLevel * 2)) * 100)}%` }}
                                />
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                         <div>
                            <p className="text-xs font-semibold text-slate-900">₦{product.price.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500">per {product.baseUnit}</p>
                         </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                         <div className="flex items-center gap-1.5">
                            {expiryStatus === 'expired' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            {expiryStatus === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                            <span className={`text-xs font-normal ${expiryStatus === 'expired' ? 'text-rose-600 font-medium' : expiryStatus === 'warning' ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                               {format(new Date(product.expiryDate), 'MMM dd, yyyy')}
                            </span>
                         </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right">
                         <DropdownMenu>
                           <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
                             <MoreHorizontal className="h-4 w-4" />
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="rounded-xl p-1.5 w-48 shadow-lg border border-slate-200">
                             <div className="text-[11px] font-medium text-slate-400 px-2.5 py-1 pointer-events-none select-none">Actions</div>
                             <DropdownMenuItem className="rounded-lg px-2.5 py-1.5 text-xs font-normal text-slate-700 hover:bg-slate-50 cursor-pointer">
                                <Edit className="mr-2 h-3.5 w-3.5 text-slate-400" /> Modify
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                               onClick={() => {
                                 setSelectedProductIds([product.id]);
                                 setTimeout(() => handleOpenTransferDialog(), 50);
                               }}
                               className="rounded-lg px-2.5 py-1.5 text-xs font-normal text-slate-700 hover:bg-slate-50 cursor-pointer"
                             >
                                <ArrowRightLeft className="mr-2 h-3.5 w-3.5 text-slate-400" /> Move Stock
                             </DropdownMenuItem>
                             <DropdownMenuItem className="rounded-lg px-2.5 py-1.5 text-xs font-normal text-slate-700 hover:bg-slate-50 cursor-pointer">
                                <FileText className="mr-2 h-3.5 w-3.5 text-slate-400" /> Audit Log
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="my-1 bg-slate-100" />
                             <DropdownMenuItem className="text-rose-600 focus:text-rose-600 rounded-lg px-2.5 py-1.5 text-xs font-normal hover:bg-rose-50 cursor-pointer">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedProductIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 30, x: "-50%" }}
            className="fixed bottom-6 left-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-4 z-50 border border-slate-800"
          >
            <span className="text-xs font-medium">
              <span className="font-semibold text-blue-400 mr-1">{selectedProductIds.length}</span> items selected
            </span>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleOpenTransferDialog}
                className="bg-blue-600 hover:bg-blue-500 h-8 px-3 rounded-lg text-xs font-medium text-white transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Transfer
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setSelectedProductIds([])}
                className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon, color }: any) {
  const iconBgMap: any = {
    red: 'bg-rose-50 text-rose-600 border border-rose-100/60',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100/60',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100/60',
    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100/60'
  };

  return (
    <Card className="border border-slate-200/80 shadow-sm rounded-xl bg-white hover:border-slate-300/80 transition-all">
      <CardContent className="p-4 sm:p-4.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 font-medium truncate">{title}</span>
          <div className={`p-1.5 rounded-lg ${iconBgMap[color] || 'bg-slate-50 text-slate-600'}`}>
            {icon}
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight leading-tight truncate">{value}</div>
          <p className="text-[11px] text-slate-500 font-normal mt-1 truncate">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
