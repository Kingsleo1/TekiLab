import React, { useState, useEffect } from 'react';
import { 
  Store, 
  MapPin, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Shield, 
  ArrowRightLeft, 
  MessageSquare, 
  Check, 
  X, 
  User, 
  Phone, 
  Building, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  Bell,
  RefreshCw,
  Loader2,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '../../../services/api';
import { Pharmacy, Product } from '../../../types/pharmacy';

interface BranchTransferRequest {
  id: string;
  sourceBranchId: string;
  targetBranchId: string; // The branch receiving the stock
  productName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface BranchMemo {
  id: string;
  senderBranchId: string;
  senderName: string;
  title: string;
  content: string;
  createdAt: string;
  urgency: 'low' | 'medium' | 'high';
}

export function MerchantStoreView({ onSelectBranch }: { onSelectBranch?: (id: string) => void } = {}) {
  const [activeTab, setActiveTab] = useState('branches');
  const [branches, setBranches] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);

  // Transfer and Memo State
  const [transferRequests, setTransferRequests] = useState<BranchTransferRequest[]>([]);
  const [memos, setMemos] = useState<BranchMemo[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Modal Dialog states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Pharmacy | null>(null);
  
  // New/Editing Branch form state
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchManager, setBranchManager] = useState('');
  const [branchDescription, setBranchDescription] = useState('');
  const [branchStatus, setBranchStatus] = useState<'active' | 'pending' | 'suspended'>('active');
  const [branchType, setBranchType] = useState<'Head Branch' | 'Central Branch' | 'Sub-Branch' | 'Warehouse'>('Sub-Branch');
  const [permissions, setPermissions] = useState<string[]>(['can_transfer']);

  // New Stock Request Form state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqSourceBranch, setReqSourceBranch] = useState('');
  const [reqTargetBranch, setReqTargetBranch] = useState('');
  const [reqProductName, setReqProductName] = useState('');
  const [reqQuantity, setReqQuantity] = useState(1);

  // New Memo Form state
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [memoSenderBranch, setMemoSenderBranch] = useState('');
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoUrgency, setMemoUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // Load Branches, Transfers, Memos, and Products
  const loadData = async () => {
    try {
      setLoading(true);
      const branchesList = await apiService.pharmacies.list();
      setBranches(branchesList);

      // Load Transfers from localStorage
      const storedTransfers = localStorage.getItem('ph_branch_transfer_requests');
      if (storedTransfers) {
        setTransferRequests(JSON.parse(storedTransfers));
      } else {
        setTransferRequests([]);
      }

      // Load Memos
      const storedMemos = localStorage.getItem('ph_branch_memos');
      if (storedMemos) {
        setMemos(JSON.parse(storedMemos));
      } else {
        setMemos([]);
      }

      // Load all products to verify stock transfers
      const productsList = await apiService.productsAll.list();
      setAllProducts(productsList);

    } catch (error) {
      toast.error('Failed to load branch systems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('pharmacies_updated', handleSync);
    window.addEventListener('pharmacy_products_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('pharmacies_updated', handleSync);
      window.removeEventListener('pharmacy_products_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const saveTransfers = (reqs: BranchTransferRequest[]) => {
    setTransferRequests(reqs);
    localStorage.setItem('ph_branch_transfer_requests', JSON.stringify(reqs));
  };

  const saveMemos = (mms: BranchMemo[]) => {
    setMemos(mms);
    localStorage.setItem('ph_branch_memos', JSON.stringify(mms));
  };

  // Filter branches
  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Manage Branch Submissions
  const handleOpenBranchModal = (branch: Pharmacy | null = null) => {
    setEditingBranch(branch);
    if (branch) {
      setBranchName(branch.name);
      setBranchAddress(branch.address);
      setBranchPhone(branch.phone || '');
      setBranchManager(branch.managerName || '');
      setBranchDescription(branch.description || '');
      setBranchStatus(branch.status);
      setBranchType(branch.type || 'Sub-Branch');
      setPermissions(branch.permissions || ['can_transfer']);
    } else {
      setBranchName('');
      setBranchAddress('');
      setBranchPhone('');
      setBranchManager('');
      setBranchDescription('');
      setBranchStatus('active');
      setBranchType('Sub-Branch');
      setPermissions(['can_transfer']);
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchAddress.trim()) {
      toast.error('Please enter branch Name and Address');
      return;
    }

    try {
      setIsSubmittingBranch(true);
      if (editingBranch) {
        // Edit flow
        const updatedBranch: Pharmacy = {
          ...editingBranch,
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim(),
          managerName: branchManager.trim(),
          description: branchDescription.trim(),
          status: branchStatus,
          type: branchType,
          permissions: permissions
        };
        await apiService.pharmacies.update(editingBranch.id, updatedBranch);
        toast.success(`Branch "${branchName}" updated and synchronized across all terminals!`);
      } else {
        // Add flow
        const newId = `branch-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const newBranch: Pharmacy = {
          id: newId,
          name: branchName.trim(),
          address: branchAddress.trim(),
          ownerId: 'merchant-1',
          status: branchStatus,
          revenue: 0,
          createdAt: new Date().toISOString(),
          description: branchDescription.trim(),
          phone: branchPhone.trim(),
          managerName: branchManager.trim(),
          type: branchType,
          permissions: permissions
        };
        await apiService.pharmacies.add(newBranch);
        toast.success(`New Branch "${branchName}" registered into system registry and seeded with independent inventory!`);
      }
      setIsBranchModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error('Could not save branch configuration');
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete branch "${name}"? This will terminate all independent local ledger records associated with this branch.`)) {
      try {
        await apiService.pharmacies.delete(id);
        toast.success(`Branch "${name}" wiped from the system.`);
        loadData();
      } catch (error) {
        toast.error('Failed to delete branch');
      }
    }
  };

  // Manage Stock Request Submissions
  const handleCreateStockRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSourceBranch || !reqTargetBranch || !reqProductName || reqQuantity <= 0) {
      toast.error('Please complete all Stock Request parameters.');
      return;
    }

    if (reqSourceBranch === reqTargetBranch) {
      toast.error('Source branch and Target branch must be different.');
      return;
    }

    const newRequest: BranchTransferRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      sourceBranchId: reqSourceBranch,
      targetBranchId: reqTargetBranch,
      productName: reqProductName,
      quantity: reqQuantity,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    saveTransfers([newRequest, ...transferRequests]);
    setIsRequestModalOpen(false);
    toast.success('Stock Request broadcasted! Source branch has been notified.');
  };

  const handleApproveStockRequest = async (req: BranchTransferRequest) => {
    try {
      // Find source product to check stock
      const sourceProds = allProducts.filter(p => p.pharmacyId === req.sourceBranchId);
      const matchingProd = sourceProds.find(p => p.name.toLowerCase() === req.productName.toLowerCase());

      if (!matchingProd || matchingProd.stock < req.quantity) {
        toast.error(`Stock Request approval failed: Insufficient stock of ${req.productName} at source branch (Current: ${matchingProd?.stock || 0}).`);
        return;
      }

      // Execute actual stock transfer in the background
      await apiService.transfers.create(
        req.sourceBranchId,
        req.targetBranchId,
        matchingProd.name,
        matchingProd.barcode,
        req.quantity
      );

      // Update status to approved
      const updated = transferRequests.map(t => t.id === req.id ? { ...t, status: 'approved' as const } : t);
      saveTransfers(updated);
      toast.success(`Request ${req.id} approved! Stock transferred successfully.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Transfer failed');
    }
  };

  const handleRejectStockRequest = (id: string) => {
    const updated = transferRequests.map(t => t.id === id ? { ...t, status: 'rejected' as const } : t);
    saveTransfers(updated);
    toast.success('Stock request declined.');
  };

  // Manage Bulletin Memo Submissions
  const handlePostMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoSenderBranch || !memoTitle || !memoContent) {
      toast.error('All fields are required to post a memo.');
      return;
    }

    const sender = branches.find(b => b.id === memoSenderBranch);
    const newMemo: BranchMemo = {
      id: `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
      senderBranchId: memoSenderBranch,
      senderName: sender?.name || 'Authorized Branch',
      title: memoTitle,
      content: memoContent,
      createdAt: new Date().toISOString(),
      urgency: memoUrgency
    };

    saveMemos([newMemo, ...memos]);
    setIsMemoModalOpen(false);
    toast.success('Memo broadcasted to notice boards across all branches!');
  };

  const togglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Branch Management Network</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
            Admin Centralized Controller • Configure autonomous stocks, financials, permissions and communications
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={() => handleOpenBranchModal(null)}
            className="flex-1 md:flex-none h-12 md:h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20"
          >
             <Plus className="mr-2 w-4 h-4" /> Register New Branch
          </Button>
          <Button 
            variant="outline"
            onClick={loadData}
            className="h-12 md:h-14 px-4 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Metrics Summary Rows */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] bg-[#0F172A] text-white p-6 overflow-hidden relative group border-none">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Store size={48} /></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Branches Registered</p>
          <h3 className="text-3xl font-black italic">{branches.length} Branches</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-2">Active independent financials</p>
        </Card>
        
        <Card className="rounded-[2rem] bg-emerald-50 border border-emerald-100 text-emerald-900 p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 size={48} /></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Active Status Branches</p>
          <h3 className="text-3xl font-black italic">{branches.filter(b => b.status === 'active').length} Branches</h3>
          <p className="text-[10px] text-emerald-600/80 font-bold mt-2">Providing sales and services</p>
        </Card>

        <Card className="rounded-[2rem] bg-amber-50 border border-amber-100 text-amber-900 p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ArrowRightLeft size={48} /></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Pending Stock Transfers</p>
          <h3 className="text-3xl font-black italic">{transferRequests.filter(t => t.status === 'pending').length} Requests</h3>
          <p className="text-[10px] text-amber-600/80 font-bold mt-2">Inter-branch relations</p>
        </Card>

        <Card className="rounded-[2rem] bg-blue-50 border border-blue-100 text-blue-900 p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><MessageSquare size={48} /></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Notice Board Memos</p>
          <h3 className="text-3xl font-black italic">{memos.length} Messages</h3>
          <p className="text-[10px] text-blue-600/80 font-bold mt-2">Active communication flow</p>
        </Card>
      </div>

      {/* Main Tab Interfaces */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-3xl inline-flex w-full md:w-auto flex-wrap">
          <TabsTrigger value="branches" className="flex-1 md:flex-initial px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12 transition-all">
            <Building size={14} className="mr-2" /> Registered Branches
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex-1 md:flex-initial px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12 transition-all">
            <MessageSquare size={14} className="mr-2" /> Communication Portal & Stock Requests
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Branches Directory */}
        <TabsContent value="branches" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches by Name, ID or Location..." 
                className="pl-11 pr-4 w-full h-12 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-blue-600/10 text-slate-900 font-medium placeholder:text-slate-400"
              />
            </div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Showing {filteredBranches.length} of {branches.length} total branches
            </div>
          </div>

          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardContent className="p-0">
               <Table>
                  <TableHeader className="bg-slate-50/50">
                     <TableRow className="border-none">
                        <TableHead className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Branch Details</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Level / Classification</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Contact / Manager</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Branch Products</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Recorded Revenue</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                        <TableHead className="px-8 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredBranches.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold uppercase text-xs">
                           No branch systems matched your criteria
                         </TableCell>
                       </TableRow>
                     ) : (
                       filteredBranches.map((branch) => (
                         <TableRow key={branch.id} className="border-slate-50 hover:bg-slate-50/50 group transition-all">
                            <TableCell className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                     {branch.type === 'Warehouse' ? <Building size={20} /> : <Store size={20} />}
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-2">
                                       <p className="font-black text-slate-900 uppercase italic leading-none">{branch.name}</p>
                                       {branch.id.includes('warehouse') && (
                                         <Badge className="bg-slate-900 text-white border-none font-black text-[7px] uppercase tracking-widest h-4 px-1.5 rounded">HQ Depot</Badge>
                                       )}
                                     </div>
                                     <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin size={10} className="text-slate-400 shrink-0" /> {branch.address}
                                     </p>
                                     <p className="text-[9px] text-blue-600 font-black tracking-widest uppercase mt-0.5">ID: {branch.id}</p>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge className={`border-none font-black text-[8px] uppercase tracking-widest ${
                                  branch.type === 'Head Branch' ? 'bg-indigo-100 text-indigo-700' :
                                  branch.type === 'Central Branch' ? 'bg-blue-100 text-blue-700' :
                                  branch.type === 'Warehouse' ? 'bg-slate-100 text-slate-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {branch.type || 'Sub-Branch'}
                                </Badge>
                                {branch.description && (
                                  <p className="text-[9px] text-slate-400 font-semibold max-w-[200px] truncate">{branch.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                               <div className="space-y-1 text-xs font-bold text-slate-700">
                                  <p className="flex items-center gap-1.5 text-slate-900">
                                    <User size={12} className="text-slate-400" /> {branch.managerName || 'Unassigned'}
                                  </p>
                                  {branch.phone && (
                                    <p className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                      <Phone size={10} className="text-slate-400" /> {branch.phone}
                                    </p>
                                  )}
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                     <Package size={13} className="text-blue-600" />
                                     <span className="text-xs font-black text-slate-900">
                                       {allProducts.filter(p => p.pharmacyId && p.pharmacyId.toLowerCase() === branch.id.toLowerCase()).length} Items
                                     </span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400">
                                     {allProducts.filter(p => p.pharmacyId && p.pharmacyId.toLowerCase() === branch.id.toLowerCase()).reduce((sum, p) => sum + (Number(p.stock) || 0), 0).toLocaleString()} units available
                                  </p>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="space-y-0.5">
                                  <p className="text-xs font-black text-emerald-600 font-mono">
                                     ₦{Number(branch.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Branch Revenue</span>
                               </div>
                            </TableCell>
                            <TableCell>
                               <Badge className={`border-none font-black text-[8px] uppercase tracking-widest ${
                                 branch.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                 branch.status === 'pending' ? 'bg-amber-50 text-amber-600 animate-pulse' :
                                 'bg-red-50 text-red-600'
                               }`}>
                                 {branch.status || 'active'}
                               </Badge>
                            </TableCell>
                            <TableCell className="px-8 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                {onSelectBranch && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSelectBranch(branch.id)}
                                    className="h-8 px-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                                    title={`View & Manage ${branch.name} Inventory`}
                                  >
                                    <Package size={12} /> Stock
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  aria-label="Modify branch" onClick={() => handleOpenBranchModal(branch)}
                                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                >
                                  <Edit size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteBranch(branch.id, branch.name)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </TableCell>
                         </TableRow>
                       ))
                     )}
                  </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Communications & Stock requests */}
        <TabsContent value="communication" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inter-Branch Stock Transfer Requests */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-900">Inter-Branch Stock Requests</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Request stock transfers and track fulfillments</p>
              </div>
              <Button 
                onClick={() => {
                  if (branches.filter(b => b.status === 'active').length < 2) {
                    toast.error('You need at least 2 active branches to operate stock transfers.');
                    return;
                  }
                  setReqSourceBranch('');
                  setReqTargetBranch('');
                  setReqProductName('');
                  setReqQuantity(10);
                  setIsRequestModalOpen(true);
                }}
                className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest rounded-xl h-10 px-4"
              >
                <Plus size={14} className="mr-1" /> Request Stock
              </Button>
            </div>

            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {transferRequests.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-slate-300">
                    <ArrowRightLeft size={48} className="mb-3" />
                    <p className="font-black text-slate-800 uppercase text-xs tracking-wider">No Transfer Requests</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Inter-branch transfers will populate here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transferRequests.map((req) => {
                      const sourceBranch = branches.find(b => b.id === req.sourceBranchId);
                      const targetBranch = branches.find(b => b.id === req.targetBranchId);

                      return (
                        <div key={req.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-200 text-slate-800 border-none font-bold text-[8px] tracking-tight">{req.id}</Badge>
                              <span className="text-[9px] text-slate-400 font-mono font-bold">
                                {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-black text-slate-800 italic leading-none uppercase">
                              {req.productName} • <span className="text-blue-600 font-bold">{req.quantity} units</span>
                            </p>
                            
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 flex-wrap">
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{sourceBranch?.name || req.sourceBranchId}</span>
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">To</span>
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{targetBranch?.name || req.targetBranchId}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
                            {req.status === 'pending' ? (
                              <div className="flex gap-1.5">
                                <Button 
                                  size="sm"
                                  onClick={() => handleApproveStockRequest(req)}
                                  className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest px-3"
                                >
                                  <Check size={12} className="mr-1" /> Approve
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRejectStockRequest(req.id)}
                                  className="h-8 rounded-lg text-red-500 hover:bg-red-50 font-black text-[9px] uppercase tracking-widest px-2"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 ${
                                req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {req.status === 'approved' ? 'Fulfilled' : 'Declined'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Notice Board & Live Branch Memos */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-900">Branch Notice Board</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Memos, alerts and internal announcements</p>
              </div>
              <Button 
                onClick={() => {
                  setMemoSenderBranch('');
                  setMemoTitle('');
                  setMemoContent('');
                  setMemoUrgency('medium');
                  setIsMemoModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl h-10 px-4"
              >
                <Plus size={14} className="mr-1" /> Post Memo
              </Button>
            </div>

            <div className="space-y-4">
              {memos.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center text-slate-400 font-semibold text-xs py-12">
                  <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                  No memos posted.
                </div>
              ) : (
                memos.map((memo) => (
                  <Card key={memo.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                    <div className="p-5 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-black text-[10px] text-slate-800 uppercase italic tracking-tight">{memo.senderName}</span>
                        </div>
                        <Badge className={`border-none font-black text-[7px] uppercase tracking-widest h-5 px-2 ${
                          memo.urgency === 'high' ? 'bg-red-50 text-red-600 animate-pulse' :
                          memo.urgency === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {memo.urgency} priority
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase italic">{memo.title}</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{memo.content}</p>
                      </div>

                      <div className="pt-2 flex justify-between items-center border-t border-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>{memo.id}</span>
                        <span>{new Date(memo.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL DIALOG 1: Add / Edit Branch --- */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 overflow-y-auto border-none shadow-2xl bg-white">
          <div className="bg-slate-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-2xl rounded-full -mr-12 -mt-12"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl md:text-2xl font-black tracking-tight uppercase italic flex items-center gap-2 text-white">
                <Store className="w-6 h-6 text-blue-500" />
                {editingBranch ? 'Modify Branch Parameters' : 'Register New Branch Node'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Configure physical or logical inventory locations with isolated ledger state
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleSaveBranch}>
            <div className="p-6 md:p-8 space-y-5 max-h-[450px] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Branch Name</label>
                <Input 
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Lekki Branch Hub, Central Warehouse Depot"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Branch Level Classification</label>
                  <select
                    value={branchType}
                    onChange={(e: any) => setBranchType(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="Sub-Branch">Sub-Branch (Local Retail)</option>
                    <option value="Central Branch">Central Branch (Distribution & Retail)</option>
                    <option value="Head Branch">Head Branch (Management HQ)</option>
                    <option value="Warehouse">Warehouse Depot (Logistics Center)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Terminal Status</label>
                  <select
                    value={branchStatus}
                    onChange={(e: any) => setBranchStatus(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="active">Active (On-Line)</option>
                    <option value="pending">Pending Validation</option>
                    <option value="suspended">Suspended (Lock Down)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Physical Address</label>
                <Input 
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="e.g. 22 Admiralty Way, Lekki Phase 1, Lagos"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manager / Operator Name</label>
                  <Input 
                    value={branchManager}
                    onChange={(e) => setBranchManager(e.target.value)}
                    placeholder="e.g. Dr. Ngozi"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Terminal Mobile Hotline</label>
                  <Input 
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="e.g. +234 812 345 6789"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Branch Profile Description</label>
                <textarea
                  value={branchDescription}
                  onChange={(e) => setBranchDescription(e.target.value)}
                  placeholder="Describe location services..."
                  className="w-full h-16 p-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none resize-none"
                />
              </div>

              {/* Administrative Permissions */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Authorized Node Permissions</label>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Grant or restrict actions this branch terminal can carry out:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  <div 
                    onClick={() => togglePermission('can_transfer')}
                    className={`p-2 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                      permissions.includes('can_transfer') ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider">Allow Stock Transfers</span>
                    <Shield size={12} className={permissions.includes('can_transfer') ? 'text-blue-500' : 'text-slate-300'} />
                  </div>

                  <div 
                    onClick={() => togglePermission('can_view_financials')}
                    className={`p-2 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                      permissions.includes('can_view_financials') ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider">Access Global Financials</span>
                    <Shield size={12} className={permissions.includes('can_view_financials') ? 'text-blue-500' : 'text-slate-300'} />
                  </div>

                  <div 
                    onClick={() => togglePermission('can_approve_supply')}
                    className={`p-2 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                      permissions.includes('can_approve_supply') ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider">Approve Supplier Orders</span>
                    <Shield size={12} className={permissions.includes('can_approve_supply') ? 'text-blue-500' : 'text-slate-300'} />
                  </div>

                  <div 
                    onClick={() => togglePermission('can_override_prices')}
                    className={`p-2 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                      permissions.includes('can_override_prices') ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider">Override Product Prices</span>
                    <Shield size={12} className={permissions.includes('can_override_prices') ? 'text-blue-500' : 'text-slate-300'} />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsBranchModalOpen(false)}
                className="rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingBranch}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                {isSubmittingBranch ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  'Apply Configurations'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DIALOG 2: Create Stock Request --- */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-y-auto border-none shadow-2xl bg-white">
          <div className="bg-[#0F172A] p-6 md:p-8 text-white relative">
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl font-black tracking-tight uppercase italic flex items-center gap-2 text-white">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Inter-Branch Stock Request
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Initiate stock transfer request from one active branch registry to another
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleCreateStockRequest}>
            <div className="p-6 md:p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Request From (Source Branch / Warehouse)</label>
                <select
                  value={reqSourceBranch}
                  onChange={(e) => setReqSourceBranch(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  required
                >
                  <option value="">-- Select Source Facility --</option>
                  {branches.filter(b => b.status === 'active').map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recipient Branch (Destination Branch)</label>
                <select
                  value={reqTargetBranch}
                  onChange={(e) => setReqTargetBranch(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  required
                >
                  <option value="">-- Select Destination Facility --</option>
                  {branches.filter(b => b.status === 'active').map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Name</label>
                <select
                  value={reqProductName}
                  onChange={(e) => setReqProductName(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  required
                >
                  <option value="">-- Select Medicine / Item --</option>
                  <option value="Amoxicillin 500mg">Amoxicillin 500mg</option>
                  <option value="Paracetamol 500mg">Paracetamol 500mg</option>
                  <option value="Lipitor 20mg">Lipitor 20mg</option>
                  <option value="Insulin Humulin N">Insulin Humulin N</option>
                  <option value="Ventolin Inhaler">Ventolin Inhaler</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantity to Request</label>
                <Input 
                  type="number"
                  min="1"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(parseInt(e.target.value) || 1)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  required
                />
              </div>
            </div>
            
            <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest"
              >
                Dismiss
              </Button>
              <Button
                type="submit"
                className="bg-slate-900 text-white rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest"
              >
                Send Request Memo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DIALOG 3: Post Notice Bulletin Memo --- */}
      <Dialog open={isMemoModalOpen} onOpenChange={setIsMemoModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-y-auto border-none shadow-2xl bg-white">
          <div className="bg-blue-600 p-6 md:p-8 text-white relative">
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl font-black tracking-tight uppercase italic flex items-center gap-2 text-white">
                <Bell className="w-5 h-5 text-white animate-bounce" />
                Broadcast Notice Board Memo
              </DialogTitle>
              <DialogDescription className="text-blue-100 font-bold text-[9px] uppercase tracking-widest mt-1">
                Post an announcement or memo to notice boards across all other branch networks
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handlePostMemo}>
            <div className="p-6 md:p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Posting From Branch</label>
                <select
                  value={memoSenderBranch}
                  onChange={(e) => setMemoSenderBranch(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  required
                >
                  <option value="">-- Select Your Branch --</option>
                  {branches.filter(b => b.status === 'active').map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Memo Title</label>
                <Input 
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  placeholder="e.g. Price Adjustments, Amoxicillin Surplus alert"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Memo Announcement Content</label>
                <textarea
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  placeholder="Enter details of your broadcast announcement..."
                  className="w-full h-24 p-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Urgency Level</label>
                <select
                  value={memoUrgency}
                  onChange={(e: any) => setMemoUrgency(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="low">Low Priority (General Update)</option>
                  <option value="medium">Medium Priority (Action Suggested)</option>
                  <option value="high">High Priority (Urgent Attention Required)</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMemoModalOpen(false)}
                className="rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest"
              >
                Dismiss
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest"
              >
                <Send size={12} className="mr-1.5 inline-block" /> Publish Memo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
