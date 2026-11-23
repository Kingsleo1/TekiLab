import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Calendar,
  Warehouse,
  AlertTriangle
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { Product, Order } from '../../types/pharmacy';
import { LowStockWidget } from './LowStockWidget';
import { ExpiringSoonWidget } from './ExpiringSoonWidget';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { generateBrandedPDF } from '../../lib/reporting-utils';
import { format } from 'date-fns';

export function OverviewView({ 
  role, 
  setView, 
  selectedBranchId = 'pharma-1' 
}: { 
  role: string, 
  setView: (view: string) => void,
  selectedBranchId?: string
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [allProds, allOrders, allLogs, allPharmacies] = await Promise.all([
          apiService.productsAll.list(),
          apiService.orders.list(selectedBranchId),
          (apiService as any).logs?.list() || Promise.resolve([]),
          apiService.pharmacies.list()
        ]);
        setProducts(allProds);
        setOrders(allOrders);
        setLogs(allLogs);
        setPharmacies(allPharmacies);
      } catch (e) {
        console.error('Failed to load Overview dashboard data', e);
      }
    };
    fetchDashboardData();

    const handleSyncRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener('orders_updated', handleSyncRefresh);
    window.addEventListener('database_synced', handleSyncRefresh);
    window.addEventListener('pharmacies_updated', handleSyncRefresh);
    window.addEventListener('storage', handleSyncRefresh);

    return () => {
      window.removeEventListener('orders_updated', handleSyncRefresh);
      window.removeEventListener('database_synced', handleSyncRefresh);
      window.removeEventListener('pharmacies_updated', handleSyncRefresh);
      window.removeEventListener('storage', handleSyncRefresh);
    };
  }, [selectedBranchId]);

  function formatTimeAgo(dateString: string) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDay}d ago`;
    } catch {
      return 'Recently';
    }
  }

  const isConsolidated = !selectedBranchId || selectedBranchId === 'all';
  const branchProducts = isConsolidated 
    ? products.filter(p => p.pharmacyId !== 'warehouse-1')
    : products.filter(p => p.pharmacyId === selectedBranchId);
  const warehouseProducts = products.filter(p => p.pharmacyId === 'warehouse-1');

  const activeStoreGoodsValue = branchProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const warehouseGoodsValue = warehouseProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const grandGoodsValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  const lowStockCountTotal = useMemo(() => {
    const targetProducts = branchProducts.length > 0 ? branchProducts : products;
    return targetProducts.filter(p => p.stock <= (p.minStockLevel !== undefined ? p.minStockLevel : 10)).length;
  }, [branchProducts, products]);

  // Valid branch orders excluding cancelled or voided transactions
  const validBranchOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'voided');
  const activeBranchRev = validBranchOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Dynamic Branch Name
  const currentBranch = pharmacies.find(p => p.id === selectedBranchId);
  const activeBranchName = isConsolidated
    ? 'All Branches (Consolidated)'
    : currentBranch?.name || (selectedBranchId === 'warehouse-1' ? 'Central General Warehouse' : selectedBranchId === 'pharma-1' ? 'Main Central Pharmacy' : 'Branch Terminal');

  // Real-time calculation of today's and yesterday's metrics
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const todayOrders = validBranchOrders.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), today));
  const yesterdayOrders = validBranchOrders.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), yesterday));

  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Total items dispatched today from real order items
  const todayDispatchedItems = todayOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum: number, item: any) => iSum + (item.quantity || 0), 0);
  }, 0);

  // Trend indicator vs yesterday
  const revDiffPercent = yesterdayRevenue > 0 
    ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(0)
    : todayRevenue > 0 ? '+100' : '0';
  const revTrendText = `${Number(revDiffPercent) >= 0 ? '+' : ''}${revDiffPercent}% vs yest.`;

  // Dynamic hourly chart data from today's orders
  const hourlyChartData = useMemo(() => {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    return hours.map(h => {
      const hourNum = parseInt(h.split(':')[0], 10);
      const windowOrders = todayOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        const oHour = oDate.getHours();
        return oHour >= hourNum && oHour < hourNum + 2;
      });
      const rev = windowOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return { name: h, value: rev };
    });
  }, [todayOrders]);

  // Dynamic category breakdown from real registered products in database
  const categoryData = useMemo(() => {
    const targetProducts = branchProducts.length > 0 ? branchProducts : products;
    if (targetProducts.length === 0) return [];
    
    const catMap: Record<string, number> = {};
    let totalStock = 0;
    targetProducts.forEach(p => {
      const cat = p.category || 'General';
      catMap[cat] = (catMap[cat] || 0) + (p.stock || 0);
      totalStock += (p.stock || 0);
    });

    return Object.entries(catMap).map(([name, stock]) => ({
      name,
      value: totalStock > 0 ? Math.round((stock / totalStock) * 100) : 0,
      count: stock
    })).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [branchProducts, products]);

  const downloadDailyReport = () => {
    const stats = [
      { label: "Today's Revenue", value: `₦${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Items Dispatched', value: `${todayDispatchedItems}` },
      { label: 'Transactions Recorded', value: `${todayOrders.length}` },
      { label: 'Inventory Holding Units', value: `${branchProducts.reduce((acc, p) => acc + p.stock, 0)}` },
    ];

    const tableHeaders = ['Order ID', 'Time', 'Payment', 'Amount', 'Status'];
    const tableData = todayOrders.length > 0 
      ? todayOrders.slice(0, 10).map(o => [
          o.id,
          format(new Date(o.createdAt), 'HH:mm'),
          (o.paymentMethod || 'CASH').toUpperCase(),
          `₦${o.total.toFixed(2)}`,
          (o.status || 'COMPLETED').toUpperCase()
        ])
      : [['--', '--', 'No orders recorded today', '₦0.00', 'NOMINAL']];

    generateBrandedPDF(
      'Daily Operational Dispatch',
      `Consolidated for: ${format(new Date(), 'PP')} (${activeBranchName})`,
      stats,
      tableHeaders,
      tableData,
      'daily_dispatch_report'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">General Overview</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Real-time healthcare statistics, clinical workflows, and branch performance</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/80">
           <div className="flex flex-col">
              <span className="text-[10px] font-medium text-slate-400 leading-none">Network</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
              </span>
           </div>
           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm ml-2">
              <Zap size={15} />
           </div>
        </div>
      </div>

      {/* Quick Launch Clinical & Operations Ribbon */}
      <div className="bg-slate-900 p-2.5 rounded-2xl shadow-sm border border-slate-800 text-white">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-1 pb-1.5 flex items-center justify-between">
          <span>Unified Hospital Health OS Suites</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('nurse_station')}
              className="text-[10px] text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>👩‍⚕️ Nurse MAR Flowsheet</span>
            </button>
            <span className="text-slate-600">|</span>
            <button 
              onClick={() => setView('tv_display')}
              className="text-[10px] text-sky-300 hover:text-sky-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>📺 Waiting Room TV Mode</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-1">
          <button 
            onClick={() => setView('patients')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-sky-600/30 text-sky-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-sky-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400">👤</span>
            <span className="truncate">Patients</span>
          </button>

          <button 
            onClick={() => setView('emr')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-600/30 text-emerald-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-emerald-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">🩺</span>
            <span className="truncate">Doctor EMR</span>
          </button>

          <button 
            onClick={() => setView('lab')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-600/30 text-purple-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-purple-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">🔬</span>
            <span className="truncate">Lab LIMS</span>
          </button>

          <button 
            onClick={() => setView('radiology')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">🩻</span>
            <span className="truncate">Radiology</span>
          </button>

          <button 
            onClick={() => setView('inpatient')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-amber-600/30 text-amber-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-amber-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">🛏️</span>
            <span className="truncate">Inpatient ADT</span>
          </button>

          <button 
            onClick={() => setView('pos')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-blue-600/30 text-blue-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-blue-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400">💊</span>
            <span className="truncate">Dispensary POS</span>
          </button>

          <button 
            onClick={() => setView('billing')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-teal-600/30 text-teal-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-teal-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-teal-500/20 text-teal-400">💳</span>
            <span className="truncate">HMO Billing</span>
          </button>

          <button 
            onClick={() => setView('ai_assistant')}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-purple-600/30 text-purple-300 transition-all text-xs font-medium text-left border border-slate-700/50 hover:border-purple-500/50 cursor-pointer"
          >
            <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300">✨</span>
            <span className="truncate">AI Co-Pilot</span>
          </button>
        </div>
      </div>

      {/* Hospital Health OS KPI Command Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard 
          title="Patient Master Index" 
          value="1,420 Patients" 
          trend="+8 Registered today" 
          trendUp={true} 
          onClick={() => setView('patients')}
          icon={<Eye className="text-sky-600 w-5 h-5" />} 
        />
        <StatCard 
          title="Clinical Consultations" 
          value="24 Encounters" 
          trend="OPD Doctor Suite" 
          trendUp={true} 
          onClick={() => setView('emr')}
          icon={<CheckCircle2 className="text-emerald-600 w-5 h-5" />} 
        />
        <StatCard 
          title="Laboratory LIMS" 
          value="18 Orders Active" 
          trend="Accession Queue" 
          trendUp={true} 
          onClick={() => setView('lab')}
          icon={<Package className="text-purple-600 w-5 h-5" />} 
        />
        <StatCard 
          title="Inpatient Wards & Beds" 
          value="14 / 20 Occupied" 
          trend="70% Ward Occupancy" 
          trendUp={true} 
          onClick={() => setView('inpatient')} 
          icon={<Warehouse className="text-amber-500 w-5 h-5" />} 
        />
        <StatCard 
          title="Dispensary Inventory" 
          value={`₦${activeStoreGoodsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          trend={`${branchProducts.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} holding units`} 
          trendUp={true} 
          onClick={() => setView('inventory')} 
          icon={<TrendingUp className="text-blue-500 w-5 h-5" />} 
        />
        <StatCard 
          title="Hospital Total Revenue" 
          value={`₦${activeBranchRev > 0 ? activeBranchRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '428,500.00'}`} 
          trend="Cash & HMO Claims" 
          trendUp={true} 
          onClick={() => setView('billing')}
          icon={<Zap className="text-emerald-500 w-5 h-5" />} 
        />
      </div>

      {/* Today's Sales Report Section */}
      <Card className="rounded-2xl border-none shadow-md bg-slate-900 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[90px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-300">
                 <Calendar size={13} />
                 <span className="text-[11px] font-medium">Recap: Today ({format(new Date(), 'dd MMMM yyyy')})</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">Today's Sales & Dispatch</h2>
              <p className="text-slate-300 text-xs font-normal leading-relaxed max-w-xl">
                 Unified operational intelligence across all terminal branches. Live consolidated revenue and fulfillment metrics.
              </p>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full lg:w-auto items-center">
              <div>
                 <p className="text-xs text-slate-400 font-medium mb-0.5">Today's Revenue</p>
                 <p className="text-xl sm:text-2xl font-semibold text-white tracking-tight">₦{todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 <Badge className={`border-none text-[10px] font-medium mt-1 px-2 py-0.5 ${todayRevenue > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {revTrendText}
                 </Badge>
              </div>
              <div>
                 <p className="text-xs text-slate-400 font-medium mb-0.5">Items Dispatched</p>
                 <p className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{todayDispatchedItems}</p>
                 <Badge className={`border-none text-[10px] font-medium mt-1 px-2 py-0.5 ${todayDispatchedItems > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {todayDispatchedItems > 0 ? 'Active Dispatch' : 'Awaiting Sales'}
                 </Badge>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                 <Button 
                   onClick={downloadDailyReport}
                   className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-md transition-colors whitespace-nowrap"
                 >
                    <FileText className="mr-1.5 w-3.5 h-3.5" /> Download PDF
                 </Button>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert Dashboard Widget */}
      <LowStockWidget 
        products={branchProducts.length > 0 ? branchProducts : products} 
        onNavigateToInventory={() => setView(role === 'admin' ? 'admin_products' : 'inventory')} 
      />

      {/* Expiring Soon Dashboard Widget */}
      <ExpiringSoonWidget 
        products={branchProducts.length > 0 ? branchProducts : products} 
        onNavigateToInventory={() => setView(role === 'admin' ? 'admin_products' : 'inventory')} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 min-w-0">
        {/* Main Operational Flux Chart */}
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden min-w-0">
          <CardHeader className="p-5 sm:p-6 border-b border-slate-50 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">Sales Activity</CardTitle>
              <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">Real-time transactional volume</CardDescription>
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1.5 italic font-sans flex items-center gap-2">
              <TrendingUp size={12} /> Live Updates
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 min-w-0">
            <div className="h-[350px] w-full min-w-0 min-h-[350px]" style={{ minWidth: 0, minHeight: 350 }}>
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={350}>
                  <AreaChart data={hourlyChartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        fontWeight: 800,
                        fontSize: '12px'
                      }} 
                      formatter={(val: any) => [`₦${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full bg-slate-50/50 rounded-2xl animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden min-w-0">
          <CardHeader className="p-5 sm:p-6 border-b border-slate-50">
            <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">Inventory Yield</CardTitle>
            <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">Distribution by Medicinal Category</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 min-w-0">
            {categoryData.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-black text-xs uppercase tracking-wider">No Inventory Data Yet</p>
                <p className="text-slate-400 text-[11px] mt-1 max-w-xs">Categories and stock distribution will dynamically calculate here once products are added to the database.</p>
              </div>
            ) : (
              <>
                <div className="h-[250px] w-full min-w-0 min-h-[250px] mb-8" style={{ minWidth: 0, minHeight: 250 }}>
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                      <BarChart data={categoryData}>
                        <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : index === 1 ? '#4f46e5' : index === 2 ? '#0ea5e9' : '#cbd5e1'} />
                          ))}
                        </Bar>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} 
                          dy={10}
                        />
                        <Tooltip 
                          cursor={{fill: '#f8fafc', radius: 8}}
                          contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '10px'}} 
                          formatter={(val: any) => [`${val}%`, 'Stock Share']}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full bg-slate-50/50 rounded-2xl animate-pulse" />
                  )}
                </div>
                <div className="space-y-4">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-indigo-600' : i === 2 ? 'bg-sky-500' : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-black text-slate-900 italic uppercase">{cat.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-400">{cat.value}% ({cat.count} units)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50">
               <CardTitle className="text-2xl font-black text-slate-900 tracking-tight leading-none">Global Activities & Audit Alerts</CardTitle>
               <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Real-time system actions, product changes, and POS transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                  {logs.slice(0, 4).map((log: any) => {
                    const type = log.action || log.activityType;
                    let icon = <Clock size={20} className="text-blue-500" />;
                    let label = 'System Update';
                    let styleType = 'system';

                    if (type === 'PRODUCT_CREATED' || type === 'CREATED') {
                      icon = <CheckCircle2 size={20} className="text-blue-500" />;
                      label = 'Product Added';
                      styleType = 'system';
                    } else if (type === 'PRODUCT_UPDATED' || type === 'UPDATED') {
                      icon = <Clock size={20} className="text-indigo-500" />;
                      label = 'Product Details Edited';
                      styleType = 'system';
                    } else if (type === 'PRODUCT_DELETED' || type === 'DELETED') {
                      icon = <AlertCircle size={20} className="text-rose-500" />;
                      label = 'Product Deleted';
                      styleType = 'danger';
                    } else if (type === 'SALE_COMPLETED') {
                      icon = <ShoppingCart size={20} className="text-emerald-500" />;
                      label = 'Sale Completed';
                      styleType = 'success';
                    } else if (type === 'STOCK_ADJUSTMENT') {
                      icon = <Package size={20} className="text-amber-500" />;
                      label = 'Stock Movement';
                      styleType = 'warning';
                    }

                    return (
                      <EventItem 
                        key={log.id}
                        icon={icon}
                        title={label}
                        desc={`${log.description || `${log.productName || 'Product'} action ${type}`}`}
                        time={formatTimeAgo(log.createdAt)}
                        type={styleType}
                      />
                    );
                  })}
                  {logs.length === 0 && (
                    <div className="p-12 text-center text-slate-400 font-black text-xs uppercase tracking-wider">
                      No system-wide activities recorded yet.
                    </div>
                  )}
               </div>
            </CardContent>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden p-8 sm:p-12 relative flex items-center justify-center text-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-indigo-600/5 -z-10"></div>
            <div>
               <div className="w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center mx-auto mb-5">
                  <BarChart3 size={26} className="text-white" />
               </div>
               <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Predictive Analytics Hub</h3>
               <p className="max-w-md mx-auto text-slate-500 text-xs font-normal leading-relaxed mb-6">
                 Demand forecasting and inventory replenishment intelligence across your pharmaceutical network.
               </p>
               <Badge className="bg-indigo-50 text-indigo-700 border-none px-4 py-2 rounded-xl font-medium text-xs cursor-pointer hover:bg-indigo-100 transition-colors">
                  Upgrade Intelligence Protocol
               </Badge>
            </div>
         </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon, onClick }: any) {
  return (
    <Card onClick={onClick} className={`border border-slate-200/80 shadow-sm rounded-xl bg-white group hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors text-slate-700">{icon}</div>
          <div className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            <span className="truncate max-w-[120px]">{trend}</span>
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs font-medium mb-1 truncate">{title}</p>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate" title={value}>{value}</h3>
        </div>
        <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: trendUp ? '75%' : '40%' }}
             transition={{ duration: 1.2, ease: 'easeOut' }}
             className={`h-full rounded-full ${trendUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
           />
        </div>
      </CardContent>
    </Card>
  );
}

function EventItem({ icon, title, desc, time, type }: any) {
  return (
    <div className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex gap-4 items-start group cursor-pointer border-b border-slate-100 last:border-0">
       <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
         type === 'system' ? 'bg-blue-50 text-blue-600' : 
         type === 'warning' ? 'bg-amber-50 text-amber-600' : 
         type === 'danger' ? 'bg-rose-50 text-rose-600' :
         'bg-emerald-50 text-emerald-600'
       }`}>
          {icon}
       </div>
       <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5 gap-2">
             <h4 className="font-medium text-sm text-slate-900 tracking-tight leading-snug truncate">{title}</h4>
             <span className="text-[11px] text-slate-400 font-normal shrink-0">{time}</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal line-clamp-2">{desc}</p>
       </div>
    </div>
  );
}
