import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  ChevronRight,
  Printer,
  FileText,
  Share2,
  Download,
  List,
  LayoutGrid,
  Calendar,
  User as UserIcon,
  Package,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiService } from '../../services/api';
import { syncOfflineCache } from '../../services/syncManager';
import { Order, Pharmacy } from '../../types/pharmacy';
import { format, isSameDay, subDays, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { buildReceiptPDF, ReceiptData } from '../../lib/receipt-pdf';
import { TransactionDetailModal } from './TransactionDetailModal';
import { QuickShareModal } from './QuickShareModal';

export function OrderHistoryView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modals
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [selectedOrderForShare, setSelectedOrderForShare] = useState<Order | null>(null);

  // Sync state with selectedBranchId if passed
  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      setBranchFilter(selectedBranchId);
    }
  }, [selectedBranchId]);

  const loadData = async (silent = false) => {
    try {
      const [allPharmacies, allOrders] = await Promise.all([
        apiService.pharmacies.list(),
        apiService.orders.list(branchFilter === 'all' ? undefined : branchFilter)
      ]);
      setPharmacies(allPharmacies);
      setOrders(allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      console.error('Failed to load sales records:', e);
      if (!silent) toast.error('Could not refresh sales records.');
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData(true);
    };

    window.addEventListener('orders_updated', handleUpdate);
    window.addEventListener('database_synced', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('orders_updated', handleUpdate);
      window.removeEventListener('database_synced', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [branchFilter]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineCache(branchFilter === 'all' ? undefined : branchFilter);
      await loadData();
      toast.success(`Sales ledger synchronized successfully! (${orders.length} total orders loaded)`);
    } catch (err) {
      console.error('Manual sync failed', err);
      toast.error('Synchronization failed. Please check network connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickDownload = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const receiptData: ReceiptData = {
        id: order.id,
        createdAt: order.createdAt,
        customerName: order.patientId === 'walk-in' ? 'General Consumer' : order.patientId,
        items: order.items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          unit: i.unit || 'pcs',
          saleType: i.saleType || 'Retail',
          packageSize: i.packageSize
        })),
        subtotal: order.subtotal || (order.total - (order.tax || 0)),
        discount: order.discount || 0,
        tax: order.tax || 0,
        total: order.total,
        paymentMethod: order.paymentMethod || 'CASH',
        processedBy: order.processedBy || 'James Wilson'
      };

      const doc = buildReceiptPDF(receiptData);
      const fileName = `teki_pharm_receipt_${order.id.toLowerCase()}.pdf`;
      doc.save(fileName);
      toast.success(`Receipt for ${order.id} downloaded!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not download PDF receipt.');
    }
  };

  const handleQuickShare = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOrderForShare(order);
  };

  const handleVoidOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'voided' as const } : o));
    if (selectedOrderForDetail && selectedOrderForDetail.id === orderId) {
      setSelectedOrderForDetail(prev => prev ? { ...prev, status: 'voided' as const } : null);
    }
    toast.success(`Order ${orderId} has been marked as voided.`);
  };

  // Filter orders by search, payment method, status, branch, and date period
  const filteredOrders = useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const sevenDaysAgo = subDays(today, 7);
    const thirtyDaysAgo = subDays(today, 30);

    return orders.filter(o => {
      // Branch filter
      if (branchFilter !== 'all' && o.pharmacyId && o.pharmacyId !== branchFilter) {
        return false;
      }

      // Date Period Filter
      if (dateFilter !== 'all' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        if (dateFilter === 'today') {
          if (!isSameDay(orderDate, today)) return false;
        } else if (dateFilter === 'yesterday') {
          if (!isSameDay(orderDate, yesterday)) return false;
        } else if (dateFilter === 'week') {
          if (!isAfter(orderDate, startOfDay(sevenDaysAgo))) return false;
        } else if (dateFilter === 'month') {
          if (!isAfter(orderDate, startOfDay(thirtyDaysAgo))) return false;
        }
      }

      // Search Query
      const query = searchQuery.toLowerCase();
      const matchesQuery = 
        !searchQuery ||
        o.id.toLowerCase().includes(query) ||
        o.patientId.toLowerCase().includes(query) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(query)) ||
        o.items.some(item => item.name.toLowerCase().includes(query));

      const matchesPayment = paymentFilter === 'all' || (o.paymentMethod && o.paymentMethod.toLowerCase() === paymentFilter);
      const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter;

      return matchesQuery && matchesPayment && matchesStatus;
    });
  }, [orders, branchFilter, dateFilter, searchQuery, paymentFilter, statusFilter]);

  const totalVolume = useMemo(() => {
    return filteredOrders
      .filter(o => o.status !== 'cancelled' && o.status !== 'voided')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  const branchLookup = useMemo(() => {
    const map = new Map<string, string>();
    pharmacies.forEach(p => map.set(p.id, p.name));
    return map;
  }, [pharmacies]);

  const getOrderSaleTypeBadge = (order: Order) => {
    const orderItems = order.items || [];
    const wholesaleCount = orderItems.filter(i => i.saleType === 'Wholesale' || i.saleType === 'Volume Price').length;
    const retailCount = orderItems.length - wholesaleCount;
    if (wholesaleCount > 0 && retailCount > 0) {
      return {
        label: `Mixed (${retailCount}R • ${wholesaleCount}W)`,
        cls: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }
    if (wholesaleCount > 0) {
      return {
        label: 'Wholesale',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    }
    return {
      label: 'Retail',
      cls: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Sales Records</h1>
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'sale' : 'sales'}
            </Badge>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Real-time transaction history, verified Supabase audit sync & multi-channel receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Force Re-sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="h-9 px-3 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Synchronize all offline queues and reconcile with Supabase cloud database"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Database'}</span>
          </Button>

          {/* Revenue badge */}
          <div className="px-3.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Verified Volume</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              ₦{totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* List vs Grid Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('list')}
              title="List View (Compact Brief History)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={15} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View (Card Format)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Search by order ID, customer name, medication name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full bg-slate-50/70 hover:bg-slate-50 border-slate-200 rounded-xl text-xs font-medium shadow-xs"
            />
          </div>

          {/* Branch Filter Selector */}
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">🏢 All Branches</option>
              {pharmacies.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === 'pharma-1' ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills (Date Range & Payment Channels) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Quick Date Period Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Period:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick Payment Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Channel:</span>
            {[
              { id: 'all', label: 'All Channels' },
              { id: 'cash', label: 'Cash' },
              { id: 'card', label: 'Card' },
              { id: 'transfer', label: 'Transfer' },
              { id: 'split', label: 'Split' },
              { id: 'owing', label: 'Credit / Owing' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setPaymentFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  paymentFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area: List or Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="p-16 text-center border border-slate-200 shadow-xs rounded-2xl bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <History size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">No transactions match your criteria</p>
              <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or payment filter</p>
            </div>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        /* ================== LIST VIEW (BRIEF HISTORY FORMAT) ================== */
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3">Order ID & Date</div>
            <div className="col-span-3">Customer & Items Summary</div>
            <div className="col-span-2">Payment</div>
            <div className="col-span-2 text-left pl-2">Total Amount</div>
            <div className="col-span-2 text-right">Quick Actions</div>
          </div>

          {filteredOrders.map(order => {
            const customerName = order.patientId === 'walk-in' ? 'General Consumer' : order.patientId;
            const itemsBrief = order.items.map(i => i.name).slice(0, 2).join(', ') + 
              (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');
            const saleTypeBadge = getOrderSaleTypeBadge(order);

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderForDetail(order)}
                className="p-4 lg:px-5 lg:py-3.5 hover:bg-blue-50/40 transition-colors cursor-pointer flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 items-start lg:items-center group"
              >
                {/* Column 1: Order ID & Date */}
                <div className="w-full lg:w-auto lg:col-span-3 flex items-center justify-between lg:justify-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
                      {order.status === 'confirmed' ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <XCircle size={16} className="text-rose-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">{order.id}</span>
                        <Badge className={`${order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} text-[10px] px-1.5 py-0 rounded font-medium`}>
                          {order.status}
                        </Badge>
                        <Badge className={`${saleTypeBadge.cls} text-[10px] px-1.5 py-0 rounded font-medium`}>
                          {saleTypeBadge.label}
                        </Badge>
                        {branchFilter === 'all' && order.pharmacyId && (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] px-1 py-0 rounded font-normal">
                            {branchLookup.get(order.pharmacyId) || order.pharmacyId}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                        {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Customer & Items Summary */}
                <div className="w-full lg:w-auto lg:col-span-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium truncate">
                    <UserIcon size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{customerName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                    <Package size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ({itemsBrief})
                    </span>
                  </div>
                </div>

                {/* Column 3: Payment Method */}
                <div className="w-full lg:w-auto lg:col-span-2 flex items-center justify-between lg:justify-start">
                  <div className="flex items-center gap-1.5">
                    {order.paymentMethod === 'cash' ? <Banknote size={13} className="text-emerald-600" /> :
                     order.paymentMethod === 'card' ? <CreditCard size={13} className="text-blue-600" /> :
                     <Smartphone size={13} className="text-amber-600" />}
                    <span className="text-xs font-medium text-slate-700 capitalize">
                      {order.paymentMethod || 'Cash'}
                    </span>
                  </div>
                </div>

                {/* Column 4: Total Amount (Desktop - Shifted to the LEFT with ample room) */}
                <div className="hidden lg:flex flex-col items-start justify-center col-span-2 pl-2">
                  <span className="text-sm font-extrabold text-slate-900 font-mono tracking-tight">
                    ₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Verified Total</span>
                </div>

                {/* Column 5: Direct Action Buttons (Desktop Quick Actions) */}
                <div className="hidden lg:flex items-center justify-end gap-1.5 col-span-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleQuickDownload(order, e)}
                    className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                    title="Download PDF Receipt directly"
                  >
                    <Download size={13} />
                    <span className="text-[11px]">Download</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleQuickShare(order, e)}
                    className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                    title="Share to WhatsApp, Facebook, Telegram..."
                  >
                    <Share2 size={13} className="text-emerald-600" />
                    <span className="text-[11px]">Share</span>
                  </Button>

                  <div className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all ml-1 shrink-0">
                    <ChevronRight size={16} />
                  </div>
                </div>

                {/* Mobile / Tablet View: Total Amount on the LEFT, Action Buttons on the RIGHT */}
                <div className="w-full lg:hidden flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                      ₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleQuickDownload(order, e)}
                      className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                      title="Download PDF Receipt directly"
                    >
                      <Download size={13} />
                      <span className="text-[11px]">Download</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleQuickShare(order, e)}
                      className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-medium cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                      title="Share to WhatsApp, Facebook, Telegram..."
                    >
                      <Share2 size={13} className="text-emerald-600" />
                      <span className="text-[11px]">Share</span>
                    </Button>

                    <div className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all ml-0.5 shrink-0">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================== GRID VIEW (BRIEF CARD FORMAT) ================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const customerName = order.patientId === 'walk-in' ? 'General Consumer' : order.patientId;
            const itemsBrief = order.items.map(i => i.name).slice(0, 2).join(', ') + 
              (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');
            const saleTypeBadge = getOrderSaleTypeBadge(order);

            return (
              <Card
                key={order.id}
                onClick={() => setSelectedOrderForDetail(order)}
                className="group border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-slate-900">{order.id}</span>
                        <Badge className={`${order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} text-[10px] px-1.5 py-0 rounded font-medium`}>
                          {order.status}
                        </Badge>
                        <Badge className={`${saleTypeBadge.cls} text-[10px] px-1.5 py-0 rounded font-medium`}>
                          {saleTypeBadge.label}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal block mt-1">
                        {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 font-medium">
                      {order.paymentMethod === 'cash' ? <Banknote size={12} className="text-emerald-600" /> :
                       order.paymentMethod === 'card' ? <CreditCard size={12} className="text-blue-600" /> :
                       <Smartphone size={12} className="text-amber-600" />}
                      <span className="capitalize">{order.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>

                  {/* Customer & Items Overview */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 truncate">
                      <UserIcon size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{customerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <Package size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}: {itemsBrief}
                      </span>
                    </div>
                  </div>

                  {/* Total price highlight - shifted to the left and cleanly housed */}
                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 flex flex-col items-start justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                    <span className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      ₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleQuickDownload(order, e)}
                        className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                        title="Download PDF"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleQuickShare(order, e)}
                        className="h-8 px-2.5 rounded-lg border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-medium cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                        title="Share Receipt"
                      >
                        <Share2 size={13} className="text-emerald-600" />
                        <span>Share</span>
                      </Button>
                    </div>

                    <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                      Details <ChevronRight size={14} className="ml-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Transaction Screen Dialog */}
      <TransactionDetailModal
        order={selectedOrderForDetail}
        open={!!selectedOrderForDetail}
        onOpenChange={(open) => !open && setSelectedOrderForDetail(null)}
        onVoidOrder={handleVoidOrder}
      />

      {/* Quick Share Modal Dialog */}
      <QuickShareModal
        order={selectedOrderForShare}
        open={!!selectedOrderForShare}
        onOpenChange={(open) => !open && setSelectedOrderForShare(null)}
      />
    </div>
  );
}
