import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  DollarSign,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiService } from '../../services/api';
import { Product, Order } from '../../types/pharmacy';
import { generateBrandedPDF } from '../../lib/reporting-utils';
import { format, subDays, isSameDay } from 'date-fns';

export function AdminAnalytics({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();

    const handleSyncRefresh = () => {
      loadData();
    };

    window.addEventListener('orders_updated', handleSyncRefresh);
    window.addEventListener('database_synced', handleSyncRefresh);
    window.addEventListener('storage', handleSyncRefresh);

    return () => {
      window.removeEventListener('orders_updated', handleSyncRefresh);
      window.removeEventListener('database_synced', handleSyncRefresh);
      window.removeEventListener('storage', handleSyncRefresh);
    };
  }, [selectedBranchId]);

  const loadData = async () => {
    const [p, o] = await Promise.all([
      apiService.products.list(selectedBranchId),
      apiService.orders.list(selectedBranchId)
    ]);
    setProducts(p);
    setOrders(o);
  };

  const validOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled' && o.status !== 'voided');
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return validOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  }, [validOrders]);

  const today = new Date();
  const todayOrders = useMemo(() => {
    return validOrders.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), today));
  }, [validOrders]);

  const todayRevenue = useMemo(() => {
    return todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  }, [todayOrders]);

  const totalItemsDispensed = useMemo(() => {
    return validOrders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    }, 0);
  }, [validOrders]);

  // Compute profit margin dynamically
  const profitMargin = useMemo(() => {
    if (totalRevenue === 0) return '0.0';
    let totalCost = 0;
    validOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const prod = products.find(p => p.id === item.productId || p.name === item.name);
        const cost = prod?.costPrice || (item.price * 0.75);
        totalCost += cost * (item.quantity || 1);
      });
    });
    const margin = ((totalRevenue - totalCost) / totalRevenue) * 100;
    return Math.max(0, margin).toFixed(1);
  }, [validOrders, totalRevenue, products]);

  // Generate 7-day trend data from real orders
  const weeklyData = useMemo(() => {
    const days = [6, 5, 4, 3, 2, 1, 0].map(offset => subDays(today, offset));
    return days.map(d => {
      const dayOrders = validOrders.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), d));
      const dayRev = dayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      return {
        name: format(d, 'EEE'),
        date: format(d, 'dd MMM'),
        revenue: dayRev,
        transactions: dayOrders.length,
      };
    });
  }, [validOrders]);

  // Top products from real transaction lines
  const topProducts = useMemo(() => {
    const salesMap: Record<string, { id: string, name: string, quantity: number, revenue: number, price: number }> = {};
    validOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const key = item.productId || item.name;
        if (!salesMap[key]) {
          salesMap[key] = {
            id: key,
            name: item.name || 'Medicinal Item',
            quantity: 0,
            revenue: 0,
            price: item.price || 0
          };
        }
        salesMap[key].quantity += (item.quantity || 1);
        salesMap[key].revenue += (item.total || ((item.price || 0) * (item.quantity || 1)));
      });
    });

    const sorted = Object.values(salesMap).sort((a, b) => b.quantity - a.quantity);
    if (sorted.length > 0) return sorted.slice(0, 4);

    // Fallback to in-stock products if no sales recorded yet
    return products.slice(0, 4).map(p => ({
      id: p.id,
      name: p.name,
      quantity: 0,
      revenue: 0,
      price: p.price
    }));
  }, [validOrders, products]);

  const downloadDailyReport = () => {
    const stats = [
      { label: "Today's Gross", value: `₦${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Today Transactions', value: `${todayOrders.length}` },
      { label: 'Calculated Margin', value: `${profitMargin}%` },
      { label: 'Units Dispensed', value: `${totalItemsDispensed}` },
    ];

    const tableHeaders = ['SKU', 'Product', 'Sold', 'Price', 'Status'];
    const tableData = topProducts.length > 0 
      ? topProducts.map(p => [
          `SKU-${p.id.slice(0, 4)}`,
          p.name,
          p.quantity.toString(),
          `₦${p.price.toFixed(2)}`,
          p.quantity > 0 ? 'ACTIVE' : 'IN STOCK'
        ])
      : [['--', 'No products registered yet', '0', '₦0.00', 'NOMINAL']];

    generateBrandedPDF(
      'Administrative Sales Analysis',
      `Analytics recap for: ${format(new Date(), 'PPP')}`,
      stats,
      tableHeaders,
      tableData,
      'admin_analytics_recap'
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Sales Analytics</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Real-time revenue and inventory stats</p>
        </div>
        <div className="flex p-1.5 bg-white rounded-xl md:rounded-2xl border-2 border-slate-100 shadow-sm overflow-x-auto w-full md:w-auto">
           <Button variant="ghost" className="flex-1 md:flex-none h-10 px-3 md:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50">7 Days</Button>
           <Button variant="ghost" className="flex-1 md:flex-none h-10 px-3 md:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">30 Days</Button>
           <Button variant="ghost" className="flex-1 md:flex-none h-10 px-3 md:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">1 Year</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <MetricCard 
          title="Total Revenue" 
          value={`₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          trend={totalRevenue > 0 ? "Active Flow" : "Awaiting Sales"} 
          isPositive={totalRevenue > 0} 
          icon={<CreditCard size={20} />} 
        />
        <MetricCard 
          title="Total Transactions" 
          value={validOrders.length.toString()} 
          trend={`${validOrders.length} orders`} 
          isPositive={validOrders.length > 0} 
          icon={<Activity size={20} />} 
        />
        <MetricCard 
          title="Profit Margin" 
          value={`${profitMargin}%`} 
          trend="Database Yield" 
          isPositive={Number(profitMargin) > 0} 
          icon={<Target size={20} />} 
        />
        <MetricCard 
          title="Units Dispensed" 
          value={totalItemsDispensed.toString()} 
          trend="Fulfilled Items" 
          isPositive={totalItemsDispensed > 0} 
          icon={<BarChart3 size={20} />} 
        />
      </div>

      {/* Today's Sales Summary Callout */}
      <Card className="rounded-xl border-none bg-blue-600 p-5 md:p-6 text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <TrendingUp size={120} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-2">Today's Performance Matrix</p>
               <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-3">
                 TODAY: ₦{todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h2>
               <div className="flex flex-wrap gap-3">
                  <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase px-4 py-2">
                    {todayOrders.length} Transactions
                  </Badge>
                  <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase px-4 py-2">
                    {todayRevenue > 0 ? 'Active Sales Recorded' : 'Awaiting Today\'s Sales'}
                  </Badge>
                  <Badge className={`${todayOrders.length > 0 ? 'bg-emerald-400 text-slate-900' : 'bg-blue-500/50 text-white'} border-none font-black text-[9px] uppercase px-4 py-2`}>
                    {todayOrders.length > 0 ? 'Active Today' : 'Standby'}
                  </Badge>
               </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
               <Button 
                onClick={downloadDailyReport}
                className="flex-1 md:flex-none h-16 bg-white text-blue-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest px-10 rounded-2xl shadow-xl shadow-blue-900/20"
               >
                  Daily Report PDF
               </Button>
               <Button variant="outline" className="flex-1 md:flex-none h-16 border-2 border-white/30 text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest px-10 rounded-2xl">
                  Quick Stats
               </Button>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-w-0">
        <Card className="lg:col-span-8 rounded-[2rem] md:rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden min-w-0">
          <CardHeader className="p-6 md:p-10 border-b border-slate-50">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Revenue Over Time</CardTitle>
                <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Daily revenue performance from database records</CardDescription>
              </div>
              <Button onClick={downloadDailyReport} variant="outline" className="w-fit rounded-xl border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400 px-4 h-10">
                Download Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-10 min-w-0">
            <div className="h-[250px] md:h-[350px] w-full min-w-0 min-h-[250px]" style={{ minWidth: 0, minHeight: 250 }}>
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}
                      dy={16}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                      itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                      formatter={(val: any) => [`₦${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563eb" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full bg-slate-50/50 rounded-2xl animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 rounded-[2rem] md:rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
          <CardHeader className="p-6 md:p-10 border-b border-slate-50">
            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Top Products</CardTitle>
            <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Best selling items from sales records</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8">
            {topProducts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">No Products Recorded</p>
                <p className="text-[11px] text-slate-400 mt-1">Inventory and sales items will appear here.</p>
              </div>
            ) : (
              topProducts.map((product, i) => (
                <div key={product.id} className="flex items-center gap-4 md:gap-6 group cursor-pointer">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm text-sm">
                     0{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="font-black text-slate-900 tracking-tight truncate text-sm md:text-base">{product.name}</p>
                     <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {product.quantity > 0 ? `Sold: ${product.quantity}` : 'In Stock'}
                        </span>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-black text-blue-600 tracking-tighter text-base md:text-lg">₦{product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
            
            <Button onClick={downloadDailyReport} className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest transition-all">
              Full Analysis <ArrowRight size={14} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, isPositive, icon }: any) {
  return (
    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 md:mb-6">
           <div className={`p-3 md:p-4 rounded-xl md:rounded-[1.4rem] shadow-lg ${isPositive ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              {icon}
           </div>
           <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend}
           </div>
        </div>
        <p className="text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] mb-1 md:mb-1.5 px-0.5">{title}</p>
        <h3 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight leading-tight break-words">{value}</h3>
      </CardContent>
    </Card>
  );
}
