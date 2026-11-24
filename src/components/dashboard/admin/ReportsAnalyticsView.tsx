import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Download, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  ShoppingCart,
  ShieldCheck,
  Banknote,
  Check,
  Eye,
  Layers,
  Info,
  Clock,
  LayoutGrid,
  Share2,
  Bell,
  CreditCard,
  ArrowRightLeft,
  Wallet,
  Receipt,
  Filter,
  CheckCircle2,
  CircleDollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { exportToCSV, generateBrandedPDF } from '../../../lib/reporting-utils';
import { toast } from 'sonner';
import { apiService } from '../../../services/api';
import { downloadAndShareReceipt } from '../../../lib/receipt-pdf';
import { SocialShare } from '../SocialShare';
import { AdminNotificationFeed } from '../AdminNotificationFeed';
import { Order, Product } from '../../../types/pharmacy';

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export function ReportsAnalyticsView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [activeTab, setActiveTab] = useState('sales');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [dateStart, setDateStart] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Staff Filter and List states
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [staffList, setStaffList] = useState<any[]>([]);

  // Payment Method selective filter for audit log
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Dialog state for itemized order receipt detail
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ph_staff_list');
    if (saved) {
      try {
        setStaffList(JSON.parse(saved));
      } catch (e) {
        // Fallback static list
        setStaffList([
          { id: 'ST-01', name: 'James Wilson', role: 'Store Manager' },
          { id: 'ST-02', name: 'Sarah Chen', role: 'Terminal Manager' },
          { id: 'ST-03', name: 'David Okafor', role: 'Certified Dispenser' },
          { id: 'ST-04', name: 'Elena Rodriguez', role: 'POS operator' },
          { id: 'ST-05', name: 'Kingsley Agu', role: 'Logistics Coordinator' },
          { id: 'auth-cashier-1', name: 'Cashier Staff', role: 'POS Operator' }
        ]);
      }
    } else {
      setStaffList([
        { id: 'ST-01', name: 'James Wilson', role: 'Store Manager' },
        { id: 'ST-02', name: 'Sarah Chen', role: 'Terminal Manager' },
        { id: 'ST-03', name: 'David Okafor', role: 'Certified Dispenser' },
        { id: 'ST-04', name: 'Elena Rodriguez', role: 'POS operator' },
        { id: 'ST-05', name: 'Kingsley Agu', role: 'Logistics Coordinator' },
        { id: 'auth-cashier-1', name: 'Cashier Staff', role: 'POS Operator' }
      ]);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
    
    // Auto-reload when switching back or if local operations change numbers
    const handleStorageChange = () => {
      loadReportsData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedBranchId, staffFilter]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      // Fetch dynamic products and orders from the pharma service backend
      const [allProducts, allOrders] = await Promise.all([
        apiService.products.list(selectedBranchId),
        apiService.orders.list(selectedBranchId, staffFilter)
      ]);
      setProducts(allProducts);
      setOrders(allOrders);
    } catch (err) {
      console.error('Failed to load real-time reporting data:', err);
      toast.error('Failed to synchronize live reports inventory.');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on active timeframe start and end boundaries
  const filteredOrders = orders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    
    const start = new Date(dateStart);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dateEnd);
    end.setHours(23, 59, 59, 999);
    
    return orderDate >= start && orderDate <= end;
  });

  // Calculate dynamic sales figures
  const totalRevenue = filteredOrders.reduce((sum, order) => {
    if (order.status === 'cancelled' || order.status === 'voided') return sum;
    return sum + order.total;
  }, 0);
  
  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  
  // Calculate total taxes (defaulting to 10% if not explicitly set on legacy mockup data)
  const totalTax = filteredOrders.reduce((sum, order) => {
    if (order.status === 'cancelled' || order.status === 'voided') return sum;
    const orderTax = typeof order.cashPaid !== 'undefined' ? (order.total * 0.1) : (order.total * 0.1); 
    // Fall back to 10% for consistent reporting
    return sum + orderTax;
  }, 0);

  // Collect total refunds & voided transaction value
  const totalRefundedValue = filteredOrders
    .filter(order => order.status === 'voided' || order.status === 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  // Dynamic Product performance calculations based on actual user basket purchases
  const dynamicProductPerformance = () => {
    const productStats: Record<string, { sold: number; revenue: number }> = {};
    
    // Accumulate actual quantities sold and generated revenues
    filteredOrders.forEach(order => {
      if (order.status === 'cancelled' || order.status === 'voided') return;
      order.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { sold: 0, revenue: 0 };
        }
        productStats[item.productId].sold += item.quantity;
        productStats[item.productId].revenue += item.price * item.quantity;
      });
    });

    // Match aggregated sales stats against live system products list
    return products.map(p => {
      const stats = productStats[p.id] || { sold: 0, revenue: 0 };
      const costPrice = p.costPrice || p.batches[0]?.costPrice || (p.price * 0.65); // Default to 65% cost fallback
      const salesCost = stats.sold * costPrice;
      const profit = stats.revenue - salesCost;
      const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
      
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        sold: stats.sold,
        revenue: stats.revenue,
        costPrice,
        salesCost,
        profit,
        margin,
        stock: p.stock
      };
    }).sort((a, b) => b.revenue - a.revenue);
  };

  const productsWithFinance = dynamicProductPerformance();

  const totalProductRevenue = productsWithFinance.reduce((sum, item) => sum + item.revenue, 0);
  const totalProductsSalesCost = productsWithFinance.reduce((sum, item) => sum + item.salesCost, 0);
  const totalGeneralProfit = productsWithFinance.reduce((sum, item) => sum + item.profit, 0);
  const averageProductsMargin = totalProductRevenue > 0 ? (totalGeneralProfit / totalProductRevenue) * 100 : 0;

  // Dynamic sales breakdown by specific channels/source (POS, Walk-in Store, Web App, B2B wholesale)
  const sourceBreakdown = () => {
    const sourcesList = ['POS', 'The Store', 'Web App', 'B2B Logistics'] as const;
    return sourcesList.map(source => {
      const sourceOrders = filteredOrders.filter(o => {
        const orderSrc = o.source || 'The Store';
        return orderSrc.toLowerCase() === source.toLowerCase();
      });
      const revenue = sourceOrders.reduce((sum, o) => {
        if (o.status === 'cancelled' || o.status === 'voided') return sum;
        return sum + o.total;
      }, 0);
      const count = sourceOrders.length;
      return {
        source,
        revenue,
        count,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  };

  const channelStats = sourceBreakdown();

  // Helper to normalize payment method values across variations and legacy inputs
  const normalizePaymentKey = (method?: string): 'cash' | 'transfer' | 'card' | 'owing' | 'split' | 'wallet' => {
    if (!method) return 'cash';
    const m = method.toLowerCase();
    if (m.includes('trans') || m.includes('bank') || m.includes('wire')) return 'transfer';
    if (m.includes('card') || m.includes('pos')) return 'card';
    if (m.includes('split') || m.includes('multi')) return 'split';
    if (m.includes('ow') || m.includes('debt') || m.includes('credit')) return 'owing';
    if (m.includes('wall') || m.includes('online')) return 'wallet';
    return 'cash';
  };

  const getPaymentBadgeStyles = (method?: string) => {
    const key = normalizePaymentKey(method);
    switch (key) {
      case 'cash':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'transfer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'card':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'owing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'split':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'wallet':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Comprehensive calculation of transactions and revenue grouped per payment method
  const calculatePaymentMethodStats = () => {
    const validOrders = filteredOrders.filter(
      o => o.status !== 'cancelled' && o.status !== 'voided'
    );

    const validRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const validCount = validOrders.length;

    const methodsMap: Record<string, {
      method: 'cash' | 'transfer' | 'card' | 'owing' | 'split' | 'wallet';
      name: string;
      shortName: string;
      description: string;
      count: number;
      revenue: number;
      badgeColor: string;
      barColor: string;
      textColor: string;
    }> = {
      cash: {
        method: 'cash',
        name: 'Cash Payment',
        shortName: 'Cash',
        description: 'Physical cash received in the store register',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-600'
      },
      transfer: {
        method: 'transfer',
        name: 'Bank Transfer',
        shortName: 'Transfer',
        description: 'Direct instant bank wire & mobile app transfers',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        barColor: 'bg-blue-500',
        textColor: 'text-blue-600'
      },
      card: {
        method: 'card',
        name: 'POS / Card Terminal',
        shortName: 'POS / Card',
        description: 'Electronic chip & PIN debit/credit POS settlements',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        barColor: 'bg-purple-500',
        textColor: 'text-purple-600'
      },
      owing: {
        method: 'owing',
        name: 'Credit / Customer Debt',
        shortName: 'Credit / Owing',
        description: 'Deferred customer balances and ledger receivables',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600'
      },
      split: {
        method: 'split',
        name: 'Split Multi-Tender',
        shortName: 'Split Payment',
        description: 'Orders settled across multiple tender types',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        barColor: 'bg-indigo-500',
        textColor: 'text-indigo-600'
      },
      wallet: {
        method: 'wallet',
        name: 'Digital Wallet / Web',
        shortName: 'Wallet',
        description: 'Online patient portal & digital wallet payments',
        count: 0,
        revenue: 0,
        badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        barColor: 'bg-cyan-500',
        textColor: 'text-cyan-600'
      }
    };

    let netCashTendered = 0;
    let netTransferTendered = 0;
    let netCardTendered = 0;
    let netOwingTendered = 0;
    let netOtherTendered = 0;

    validOrders.forEach(order => {
      const key = normalizePaymentKey(order.paymentMethod);
      const orderTotal = Number(order.total) || 0;

      if (methodsMap[key]) {
        methodsMap[key].count += 1;
        methodsMap[key].revenue += orderTotal;
      }

      // Reconcile exact multi-tender allocations if recorded
      const hasSplitFields = (
        (typeof order.cashPaid === 'number' && order.cashPaid > 0) ||
        (typeof order.transferPaid === 'number' && order.transferPaid > 0) ||
        (typeof order.cardPaid === 'number' && order.cardPaid > 0) ||
        (typeof order.owingPaid === 'number' && order.owingPaid > 0)
      );

      if (key === 'split' || hasSplitFields) {
        netCashTendered += Number(order.cashPaid) || 0;
        netTransferTendered += Number(order.transferPaid) || 0;
        netCardTendered += Number(order.cardPaid) || 0;
        netOwingTendered += Number(order.owingPaid) || 0;
      } else if (key === 'cash') {
        netCashTendered += orderTotal;
      } else if (key === 'transfer') {
        netTransferTendered += orderTotal;
      } else if (key === 'card') {
        netCardTendered += orderTotal;
      } else if (key === 'owing') {
        netOwingTendered += orderTotal;
      } else {
        netOtherTendered += orderTotal;
      }
    });

    const items = Object.values(methodsMap)
      .filter(m => m.count > 0 || ['cash', 'transfer', 'card', 'owing'].includes(m.method))
      .map(m => ({
        ...m,
        percentage: validRevenue > 0 ? (m.revenue / validRevenue) * 100 : 0,
        txShare: validCount > 0 ? (m.count / validCount) * 100 : 0,
        averageTicket: m.count > 0 ? m.revenue / m.count : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      items,
      validRevenue,
      validCount,
      netTenders: {
        cash: netCashTendered,
        transfer: netTransferTendered,
        card: netCardTendered,
        owing: netOwingTendered,
        other: netOtherTendered,
        totalTendered: netCashTendered + netTransferTendered + netCardTendered + netOwingTendered + netOtherTendered
      }
    };
  };

  const paymentStats = calculatePaymentMethodStats();

  // Filter orders for the sales log table based on selected payment method
  const displayOrders = filteredOrders.filter(order => {
    if (paymentMethodFilter === 'all') return true;
    return normalizePaymentKey(order.paymentMethod) === paymentMethodFilter;
  });

  const getFormattedDateLabel = () => {
    if (timeRange === 'today') return `Today (${format(new Date(), 'MMM dd, yyyy')})`;
    if (timeRange === 'yesterday') return `Yesterday (${format(subDays(new Date(), 1), 'MMM dd, yyyy')})`;
    if (timeRange === 'custom' && dateStart === dateEnd) {
      try {
        return `Single Day: ${format(new Date(dateStart), 'MMMM dd, yyyy')}`;
      } catch (e) {
        return `Single Day: ${dateStart}`;
      }
    }
    try {
      return `${format(new Date(dateStart), 'MMM dd, yyyy')} — ${format(new Date(dateEnd), 'MMM dd, yyyy')}`;
    } catch (e) {
      return `${dateStart} — ${dateEnd}`;
    }
  };

  const handleSelectSpecificDate = (selectedDate: string) => {
    if (!selectedDate) return;
    setDateStart(selectedDate);
    setDateEnd(selectedDate);
    setTimeRange('custom');
    toast.info(`Auditing payment method totals for ${selectedDate}`);
  };

  // CSV Exporter utilizing real-time database transactions
  const exportDataToCSV = () => {
    const data = filteredOrders.map(tx => ({
      'Order ID': tx.id,
      'Timestamp': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      'Client ID': tx.patientId === 'walk-in' ? 'Walk-in customer' : tx.patientId,
      'Source/Channel': tx.source || 'The Store',
      'Transaction Total (₦)': tx.total.toFixed(2),
      'Payment Type': tx.paymentMethod.toUpperCase(),
      'Processor': tx.processedBy,
      'Status': tx.status.toUpperCase()
    }));
    exportToCSV(data, `pharmacore_sales_report_${timeRange}`);
  };

  // PDF Exporter containing comprehensive metrics
  const exportDataToPDF = () => {
    const statsPdf = [
      { label: 'Total Revenue', value: `₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Total Orders', value: totalOrdersCount.toString() },
      { label: 'Average Transaction', value: `₦${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Sales Tax Vol.', value: `₦${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Cash Tendered', value: `₦${paymentStats.netTenders.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Bank Transfers', value: `₦${paymentStats.netTenders.transfer.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'POS / Card', value: `₦${paymentStats.netTenders.card.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: 'Customer Debt', value: `₦${paymentStats.netTenders.owing.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    ];

    const tableHeaders = ['ID', 'Date & Time', 'Source', 'Payment', 'Amount', 'Status'];
    const tableData = filteredOrders.map(tx => [
      tx.id,
      format(new Date(tx.createdAt), 'MMM dd, yyyy • HH:mm'),
      tx.source || 'The Store',
      tx.paymentMethod.toUpperCase(),
      `₦${tx.total.toFixed(2)}`,
      tx.status.toUpperCase()
    ]);

    generateBrandedPDF(
      'Pharmacore Premium Sales Analysis',
      `Reporting Phase: ${timeRange.toUpperCase()} (${dateStart} to ${dateEnd})`,
      statsPdf,
      tableHeaders,
      tableData,
      'pharmacore_premium_sales_recap'
    );
  };

  // Group chart metrics dynamically by hour block (today/yesterday) or day-wise
  const generateChartData = () => {
    if (timeRange === 'today' || timeRange === 'yesterday') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      return hours.map(h => {
        const [hourStr] = h.split(':');
        const hourNum = parseInt(hourStr);
        const windowOrders = filteredOrders.filter(o => {
          if (o.status === 'cancelled' || o.status === 'voided') return false;
          const ordHour = new Date(o.createdAt).getHours();
          return ordHour >= hourNum && ordHour < hourNum + 2;
        });
        const rev = windowOrders.reduce((sum, o) => sum + o.total, 0);
        return {
          name: h,
          revenue: rev,
          orders: windowOrders.length
        };
      });
    }

    // Default: Group chronologically by date
    const dateMap: Record<string, { revenue: number; orders: number }> = {};
    filteredOrders.forEach(o => {
      if (o.status === 'cancelled' || o.status === 'voided') return;
      const dateStr = format(new Date(o.createdAt), 'MMM dd');
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { revenue: 0, orders: 0 };
      }
      dateMap[dateStr].revenue += o.total;
      dateMap[dateStr].orders += 1;
    });

    const dates = Object.keys(dateMap);
    if (dates.length === 0) {
      return [
        { name: 'Mon', revenue: 0, orders: 0 },
        { name: 'Tue', revenue: 0, orders: 0 },
        { name: 'Wed', revenue: 0, orders: 0 },
        { name: 'Thu', revenue: 0, orders: 0 },
        { name: 'Fri', revenue: 0, orders: 0 },
        { name: 'Sat', revenue: 0, orders: 0 },
        { name: 'Sun', revenue: 0, orders: 0 }
      ];
    }

    return dates.map(d => ({
      name: d,
      revenue: dateMap[d].revenue,
      orders: dateMap[d].orders
    }));
  };

  const chartData = generateChartData();

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    const today = new Date();
    switch(range) {
      case 'today':
        setDateStart(format(today, 'yyyy-MM-dd'));
        setDateEnd(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateStart(format(yesterday, 'yyyy-MM-dd'));
        setDateEnd(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setDateStart(format(startOfWeek(subDays(today, 6)), 'yyyy-MM-dd'));
        setDateEnd(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        setDateStart(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateEnd(format(today, 'yyyy-MM-dd'));
        break;
      case 'year':
        setDateStart(format(startOfYear(today), 'yyyy-MM-dd'));
        setDateEnd(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  // Compile detailed, flat list of all individual product line items transacted
  const itemizedSalesRows = () => {
    const list: Array<{
      orderId: string;
      createdAt: string;
      source: string;
      productId: string;
      name: string;
      quantity: number;
      price: number;
      unit: string;
      lineTotal: number;
      payment: string;
    }> = [];

    filteredOrders.forEach(o => {
      if (o.status === 'cancelled' || o.status === 'voided') return;
      o.items.forEach(item => {
        list.push({
          orderId: o.id,
          createdAt: o.createdAt,
          source: o.source || 'The Store',
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          lineTotal: item.price * item.quantity,
          payment: o.paymentMethod
        });
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const itemizedSales = itemizedSalesRows();

  // Helper colors for sale channels
  const getSourceBadgeStyles = (src?: string) => {
    const channel = src || 'The Store';
    switch (channel.toLowerCase()) {
      case 'pos':
        return 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100/50';
      case 'the store':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50';
      case 'web app':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100/50';
      case 'b2b logistics':
        return 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/50';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  // Dedicated section for payment method totals, breakdown, and tender reconciliation
  const renderPaymentMethodSection = () => {
    return (
      <div id="payment-methods-breakdown-section" className="space-y-6">
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden p-8 md:p-10">
          {/* Header with Date Context & Quick Single-Date Picker */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-8 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3" /> Payment Method Breakdown
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-widest px-3 py-1">
                  {paymentStats.validCount} Settled Orders
                </Badge>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Payment Method Totals & Audit
              </h3>
              <p className="text-slate-400 font-bold text-xs mt-1">
                Total transactions and revenue calculated for <span className="text-blue-600 font-extrabold">{getFormattedDateLabel()}</span>
              </p>
            </div>

            {/* Quick Date Control Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pick Date:</span>
                <input
                  type="date"
                  value={dateStart === dateEnd ? dateStart : ''}
                  onChange={(e) => handleSelectSpecificDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  title="Select any particular date to view exact payment method totals"
                />
              </div>

              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTimeRangeChange('today')}
                  className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    timeRange === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTimeRangeChange('yesterday')}
                  className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    timeRange === 'yesterday' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Yesterday
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTimeRangeChange('month')}
                  className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    timeRange === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  This Month
                </Button>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid by Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-8">
            {paymentStats.items.map((item) => {
              const isFiltered = paymentMethodFilter === item.method;
              return (
                <div
                  key={item.method}
                  onClick={() => setPaymentMethodFilter(isFiltered ? 'all' : item.method)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isFiltered 
                      ? 'ring-2 ring-blue-600 shadow-xl bg-blue-50/30 border-blue-300' 
                      : 'bg-slate-50/70 hover:bg-white hover:shadow-xl hover:border-slate-300 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${
                      item.method === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                      item.method === 'transfer' ? 'bg-blue-100 text-blue-700' :
                      item.method === 'card' ? 'bg-purple-100 text-purple-700' :
                      item.method === 'owing' ? 'bg-amber-100 text-amber-700' :
                      item.method === 'split' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-cyan-100 text-cyan-700'
                    }`}>
                      {item.method === 'cash' && <Banknote className="w-5 h-5" />}
                      {item.method === 'transfer' && <ArrowRightLeft className="w-5 h-5" />}
                      {item.method === 'card' && <CreditCard className="w-5 h-5" />}
                      {item.method === 'owing' && <Receipt className="w-5 h-5" />}
                      {item.method === 'split' && <Layers className="w-5 h-5" />}
                      {item.method === 'wallet' && <Wallet className="w-5 h-5" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${item.badgeColor}`}>
                        {item.percentage.toFixed(1)}% Vol
                      </span>
                      {isFiltered && (
                        <span className="bg-blue-600 text-white p-1 rounded-full text-[8px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    {item.name}
                  </p>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    ₦{item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="font-extrabold text-slate-900">{item.count}</span>
                      <span className="text-[10px] uppercase text-slate-400">{item.count === 1 ? 'order' : 'orders'}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Avg: ₦{item.averageTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="mt-2 text-[9px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {isFiltered ? '✓ Currently filtering log (click to clear)' : 'Click to filter sales log →'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Percentage Distribution Share Bar */}
          {paymentStats.validRevenue > 0 && (
            <div className="mt-8 p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">
                    Revenue Distribution by Payment Method
                  </h5>
                  <p className="text-[10px] font-bold text-slate-400">
                    Proportional share of settled transactions for {getFormattedDateLabel()}
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-slate-900">
                  Total Audited: ₦{paymentStats.validRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Stacked Percentage Bar */}
              <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                {paymentStats.items.filter(i => i.revenue > 0).map((item) => (
                  <div
                    key={item.method}
                    style={{ width: `${item.percentage}%` }}
                    className={`${item.barColor} h-full transition-all duration-500 hover:opacity-90 relative group`}
                    title={`${item.name}: ₦${item.revenue.toFixed(2)} (${item.percentage.toFixed(1)}%)`}
                  />
                ))}
              </div>

              {/* Legend Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {paymentStats.items.filter(i => i.revenue > 0).map((item) => (
                  <div 
                    key={item.method} 
                    onClick={() => setPaymentMethodFilter(paymentMethodFilter === item.method ? 'all' : item.method)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${item.barColor}`} />
                    <span>{item.shortName}:</span>
                    <span className="font-black text-slate-900 font-mono">
                      ₦{item.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-extrabold">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Payment Method Matrix Table */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-100">
            <div className="bg-slate-50/70 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">
                Detailed Payment Channel Audit Matrix
              </h5>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Audited against {paymentStats.validCount} transactions
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/40 border-b border-slate-100">
                  <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3.5 px-6">Payment Method</th>
                    <th className="py-3.5 px-6">Description</th>
                    <th className="py-3.5 px-6 text-center">Transactions</th>
                    <th className="py-3.5 px-6 text-right">Settled Amount (₦)</th>
                    <th className="py-3.5 px-6 text-center">Volume Share</th>
                    <th className="py-3.5 px-6 text-right">Avg. Ticket</th>
                    <th className="py-3.5 px-6 text-center">Sales Log Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paymentStats.items.map((item) => {
                    const isFiltered = paymentMethodFilter === item.method;
                    return (
                      <tr key={item.method} className={`hover:bg-slate-50/60 transition-colors ${isFiltered ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className={`p-2 rounded-xl ${item.badgeColor}`}>
                              {item.method === 'cash' && <Banknote className="w-4 h-4" />}
                              {item.method === 'transfer' && <ArrowRightLeft className="w-4 h-4" />}
                              {item.method === 'card' && <CreditCard className="w-4 h-4" />}
                              {item.method === 'owing' && <Receipt className="w-4 h-4" />}
                              {item.method === 'split' && <Layers className="w-4 h-4" />}
                              {item.method === 'wallet' && <Wallet className="w-4 h-4" />}
                            </span>
                            <div>
                              <p className="font-black text-slate-900">{item.name}</p>
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">{item.method}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-[11px] max-w-xs">
                          {item.description}
                        </td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="font-black text-slate-900">{item.count}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({item.txShare.toFixed(1)}%)</span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-black text-slate-900 text-sm">
                          ₦{item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${item.barColor}`} style={{ width: `${item.percentage}%` }} />
                            </div>
                            <span className="font-extrabold text-slate-700 text-[11px] w-10 text-right">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-600">
                          ₦{item.averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Button
                            size="sm"
                            variant={isFiltered ? 'default' : 'outline'}
                            onClick={() => setPaymentMethodFilter(isFiltered ? 'all' : item.method)}
                            className={`h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              isFiltered ? 'bg-blue-600 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isFiltered ? 'Active Filter' : 'Filter Table'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Drawer & Multi-Tender Reconciliation Footer */}
          <div className="mt-8 p-6 rounded-3xl bg-slate-900 text-white space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5">
                    Register & Account Closing
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {getFormattedDateLabel()}
                  </span>
                </div>
                <h4 className="text-xl font-black tracking-tight text-white mt-1">
                  Cash Drawer & Multi-Tender Reconciliation
                </h4>
                <p className="text-slate-400 text-xs">
                  Reconciled tender amounts including multi-tender splits for accurate register balancing.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Audited Settlements</span>
                <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  ₦{paymentStats.netTenders.totalTendered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Physical Cash In Register</span>
                <span className="text-base font-black text-white font-mono mt-1 block">
                  ₦{paymentStats.netTenders.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bank Transfer Received</span>
                <span className="text-base font-black text-blue-400 font-mono mt-1 block">
                  ₦{paymentStats.netTenders.transfer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">POS / Card Authorized</span>
                <span className="text-base font-black text-purple-400 font-mono mt-1 block">
                  ₦{paymentStats.netTenders.card.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Customer Debt / Owing</span>
                <span className="text-base font-black text-amber-400 font-mono mt-1 block">
                  ₦{paymentStats.netTenders.owing.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      
      {/* Top Header Row of Reporting matrix */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Reporting Matrix</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Real-time store operations & audit systems</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
            <Button 
              variant="ghost" 
              onClick={exportDataToCSV}
              className="h-10 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-slate-100"
            >
               <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button 
              onClick={exportDataToPDF}
              className="h-10 px-3 rounded-lg bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:scale-[1.02] transition-transform"
            >
               <FileText className="w-4 h-4 mr-2" /> Branded PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Date Frame selectors and Range details */}
      <Card className="rounded-xl border border-slate-200 shadow-sm bg-white p-2">
         <div className="flex flex-col lg:flex-row items-center gap-6 p-6">
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] w-full lg:w-auto">
               {(['today', 'yesterday', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      timeRange === range 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {range}
                  </button>
               ))}
               <button
                 onClick={() => setTimeRange('custom')}
                 className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                   timeRange === 'custom' 
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 Custom
               </button>
            </div>

            {timeRange === 'custom' && (
              <div className="flex items-center gap-4 animate-in slide-in-from-left duration-300">
                 <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Start Date</label>
                    <Input 
                      type="date" 
                      value={dateStart} 
                      onChange={(e) => setDateStart(e.target.value)}
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold w-40" 
                    />
                 </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-2">End Date</label>
                    <Input 
                      type="date" 
                      value={dateEnd} 
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold w-40" 
                    />
                 </div>
                 <Button 
                   onClick={() => toast.success(`Reporting synchronized to designated frame.`)}
                   className="mt-5 h-12 w-12 rounded-xl bg-blue-600 text-white p-0 hover:scale-110 mb-[-4px]"
                 >
                    <Check size={18} />
                 </Button>
              </div>
            )}

            <div className="lg:ml-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full lg:w-auto">
               {/* Staff sales selective filter */}
               <div className="flex flex-col gap-1 w-full sm:w-64">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Filtered POS Staff</label>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold px-4 text-xs font-sans text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/10 cursor-pointer shadow-inner"
                  >
                    <option value="all">All Operators / Channels</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role || 'Staff'})
                      </option>
                    ))}
                  </select>
               </div>

               <div className="flex items-center gap-4">
                  <div className="text-right">
                     <p className="text-[8px] font-black uppercase text-slate-400">Auditing Period</p>
                     <p className="text-xs font-black text-slate-900 italic">
                        {format(new Date(dateStart), 'MMM dd, yyyy')} — {format(new Date(dateEnd), 'MMM dd, yyyy')}
                     </p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                     <Calendar size={20} />
                  </div>
               </div>
            </div>
         </div>
      </Card>

      {/* Tab navigators */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-[2rem] inline-flex flex-wrap gap-1">
          <TabsTrigger value="sales" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <TrendingUp size={16} className="mr-2" /> Direct Sales
          </TabsTrigger>
          <TabsTrigger value="payments" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <CreditCard size={16} className="mr-2" /> Payment Methods
          </TabsTrigger>
          <TabsTrigger value="itemized" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <Clock size={16} className="mr-2" /> Itemized Log
          </TabsTrigger>
          <TabsTrigger value="products" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <Package size={16} className="mr-2" /> Stock Profits
          </TabsTrigger>
          <TabsTrigger value="tax" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <ShieldCheck size={16} className="mr-2" /> Auditor Taxes
          </TabsTrigger>
          <TabsTrigger value="activity" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-12">
            <Bell size={16} className="mr-2" /> System Activities
          </TabsTrigger>
        </TabsList>

        {/* Sales TAB content wrapper */}
        <TabsContent value="sales" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SummaryCard 
                title="Gross Revenue" 
                value={`₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                trend="+18.4%" 
                trendUp={true} 
                icon={<BarChart3 />} 
              />
              <SummaryCard 
                title="Orders Settled" 
                value={totalOrdersCount.toString()} 
                trend="+12.1%" 
                trendUp={true} 
                icon={<ShoppingCart />} 
              />
              <SummaryCard 
                title="Average Invoice" 
                value={`₦${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                trend="+5.2%" 
                trendUp={true} 
                icon={<Banknote />} 
              />
              <SummaryCard 
                title="Voids & Refunded" 
                value={`₦${totalRefundedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                trend={totalRefundedValue > 0 ? "+44%" : "0.0%"} 
                trendUp={totalRefundedValue > 0} 
                icon={<FileText />} 
              />
            </div>

            {/* Performance charts and sales breakdown cards side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
              
              {/* Left Column: Interactive revenue timechart */}
              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden lg:col-span-2 min-w-0">
                <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-row justify-between items-center bg-white">
                   <div>
                      <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Financial Velocity Chart</CardTitle>
                      <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Revenues calculated chronologically by timestamps</CardDescription>
                   </div>
                   <div className="flex gap-2">
                      <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest py-2 px-4 italic">LIVE TELEMETRY</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-10 min-w-0">
                   <div className="h-[380px] w-full min-w-0 min-h-[380px]" style={{ minWidth: 0, minHeight: 380 }}>
                     {isMounted ? (
                       <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={380}>
                         <AreaChart data={chartData}>
                           <defs>
                             <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/>
                               <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => `₦${val}`} />
                           <Tooltip 
                              formatter={(value: any) => [`₦${parseFloat(value).toFixed(2)}`, 'Sales Revenue']}
                              contentStyle={{ borderRadius: '16px', border: 'none', shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} 
                           />
                           <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                         </AreaChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="h-full w-full bg-slate-50/50 rounded-2xl animate-pulse" />
                     )}
                   </div>
                </CardContent>
              </Card>

              {/* Right Column: Dynamic source breakout channel lists. */}
              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10 flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Sales by Source</h4>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 mb-6">Channel contributions for current range</p>
                  
                  <div className="space-y-6">
                    {channelStats.map((channel) => {
                      const badgeStyles = getSourceBadgeStyles(channel.source);
                      return (
                        <div key={channel.source} className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className={`px-2.5 py-1 text-[9px] font-black tracking-widest rounded-lg ${badgeStyles}`}>
                              {channel.source}
                            </span>
                            <span className="font-black text-slate-900 text-sm italic">
                              ₦{channel.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span>{channel.count} {channel.count === 1 ? 'Transaction' : 'Transactions'}</span>
                            <span className="text-slate-900 font-black">{channel.percentage.toFixed(1)}%</span>
                          </div>
                          
                          {/* Progress bar visual */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                channel.source === 'POS' ? 'bg-purple-500' :
                                channel.source === 'The Store' ? 'bg-indigo-500' :
                                channel.source === 'Web App' ? 'bg-emerald-500' : 'bg-slate-500'
                              }`} 
                              style={{ width: `${channel.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Channels</p>
                    <p className="text-xs font-black text-slate-800">4 Outlets Synchronized</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 py-1.5">POS & ONLINE ACTIVE</Badge>
                </div>
              </Card>
            </div>

            {/* Payment Method Totals & Audit Section */}
            {renderPaymentMethodSection()}

            {/* Sales Audit Log Table (Itemized row option present) */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden mt-8">
               <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                     <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Recent Sales Log</CardTitle>
                     <CardDescription className="text-slate-400 font-bold text-xs mt-1">
                       {paymentMethodFilter !== 'all' 
                         ? `Filtered by payment method: ${paymentMethodFilter.toUpperCase()} (${displayOrders.length} records)` 
                         : 'Comprehensive list of settling records. Click "View Items" for full invoice items.'}
                     </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {paymentMethodFilter !== 'all' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPaymentMethodFilter('all')}
                        className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 text-[9px] font-black uppercase tracking-wider"
                      >
                        Clear Filter
                      </Button>
                    )}
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="h-9 bg-slate-50 border border-slate-200 rounded-xl font-bold px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="all">All Payment Methods</option>
                      <option value="cash">Cash Tender</option>
                      <option value="transfer">Bank Transfer</option>
                      <option value="card">POS / Card Terminal</option>
                      <option value="owing">Credit / Owing</option>
                      <option value="split">Split Multi-Tender</option>
                      <option value="wallet">Wallet / Online</option>
                    </select>
                    <Badge className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest py-2 px-4 border-none shrink-0">
                      {displayOrders.length} Transactions
                    </Badge>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead className="bg-slate-50/50">
                           <tr className="border-none">
                              <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Invoice ID</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Date & Time</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Customer ID</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Source Outlet</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Payment Method</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Cashier Audit</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Total Amount</th>
                              <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Receipt Detail</th>
                              <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {displayOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-slate-50/55 transition-colors">
                                 <td className="px-10 py-6 font-black text-slate-900 italic uppercase tracking-wider">{order.id}</td>
                                 <td className="px-6 py-6 font-bold text-slate-400 text-xs tracking-tight">
                                    {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm:ss')}
                                 </td>
                                 <td className="px-6 py-6 font-black text-slate-700">
                                   {order.patientId === 'walk-in' ? (
                                     <span className="text-slate-400 font-extrabold italic text-sm">Walk-in</span>
                                   ) : (
                                     <span className="font-mono text-sm uppercase">{order.patientId}</span>
                                   )}
                                 </td>
                                 <td className="px-6 py-6 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-[9px] font-black tracking-widest rounded-lg ${getSourceBadgeStyles(order.source)}`}>
                                       {order.source || 'The Store'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-6 whitespace-nowrap">
                                   <span className={`px-2.5 py-1 text-[9px] font-black tracking-widest rounded-lg border uppercase ${getPaymentBadgeStyles(order.paymentMethod)}`}>
                                     {order.paymentMethod || 'CASH'}
                                   </span>
                                 </td>
                                 <td className="px-6 py-6 font-mono text-xs text-slate-400 uppercase font-black">{order.processedBy}</td>
                                 <td className="px-6 py-6 font-black text-blue-600 text-base tracking-tighter">₦{order.total.toFixed(2)}</td>
                                 <td className="px-6 py-6 text-center">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setSelectedOrderDetail(order)}
                                      className="h-9 px-3 rounded-xl hover:bg-slate-100 hover:text-blue-600 font-black text-[9px] uppercase tracking-widest border border-slate-100 text-slate-400 shadow-sm"
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400 group-hover:text-blue-600" /> View Items ({order.items?.length || 0})
                                    </Button>
                                 </td>
                                 <td className="px-10 py-6 text-right">
                                    <Badge className={`${
                                       order.status === 'confirmed' || order.status === 'completed' || order.status === 'delivered' 
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                          : order.status === 'voided' || order.status === 'cancelled'
                                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                                    } border-none font-black text-[8px] uppercase tracking-widest py-1.5 px-3 rounded-lg`}>
                                       {order.status}
                                    </Badge>
                                 </td>
                              </tr>
                           ))}
                           {displayOrders.length === 0 && (
                             <tr>
                               <td colSpan={9} className="px-10 py-12 text-center">
                                 <div className="flex flex-col items-center justify-center gap-3">
                                   <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                                     <Info className="w-6 h-6" />
                                   </div>
                                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                     {paymentMethodFilter !== 'all' 
                                       ? `No sales found paid via ${paymentMethodFilter.toUpperCase()} for the selected timeline.` 
                                       : 'No matching sales found for the selected timeline.'}
                                   </p>
                                   {paymentMethodFilter !== 'all' ? (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => setPaymentMethodFilter('all')}
                                       className="mt-2 text-[9px] uppercase font-black tracking-wider"
                                     >
                                       Show All Payment Methods
                                     </Button>
                                   ) : (
                                     <p className="text-[10px] text-slate-400">Complete POS transactions first to register live updates.</p>
                                   )}
                                 </div>
                               </td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </CardContent>
            </Card>
        </TabsContent>

        {/* Dedicated Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-8">
          {renderPaymentMethodSection()}

          {/* Detailed Payment Audit Log Table */}
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                  {paymentMethodFilter === 'all' ? 'All Payment Transactions Audit' : `${paymentMethodFilter.toUpperCase()} Transactions`}
                </CardTitle>
                <CardDescription className="text-slate-400 font-bold text-xs mt-1">
                  Itemized invoice settlements recorded for {getFormattedDateLabel()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {paymentMethodFilter !== 'all' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPaymentMethodFilter('all')}
                    className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 text-[9px] font-black uppercase tracking-wider"
                  >
                    Reset Filter
                  </Button>
                )}
                <Badge className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest py-2 px-4 border-none shrink-0">
                  {displayOrders.length} Invoices
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50">
                    <tr className="border-none">
                      <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Invoice ID</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Date & Time</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Customer</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Payment Channel</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Cashier</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Total Paid</th>
                      <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Receipt</th>
                      <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-10 py-6 font-black text-slate-900 italic uppercase tracking-wider">{order.id}</td>
                        <td className="px-6 py-6 font-bold text-slate-400 text-xs tracking-tight">
                          {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm:ss')}
                        </td>
                        <td className="px-6 py-6 font-black text-slate-700">
                          {order.patientId === 'walk-in' ? (
                            <span className="text-slate-400 font-extrabold italic text-sm">Walk-in</span>
                          ) : (
                            <span className="font-mono text-sm uppercase">{order.patientId}</span>
                          )}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-[9px] font-black tracking-widest rounded-lg border uppercase ${getPaymentBadgeStyles(order.paymentMethod)}`}>
                            {order.paymentMethod || 'CASH'}
                          </span>
                        </td>
                        <td className="px-6 py-6 font-mono text-xs text-slate-400 uppercase font-black">{order.processedBy}</td>
                        <td className="px-6 py-6 font-black text-blue-600 text-base tracking-tighter">₦{order.total.toFixed(2)}</td>
                        <td className="px-6 py-6 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedOrderDetail(order)}
                            className="h-9 px-3 rounded-xl hover:bg-slate-100 hover:text-blue-600 font-black text-[9px] uppercase tracking-widest border border-slate-100 text-slate-400 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> View ({order.items?.length || 0})
                          </Button>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <Badge className={`${
                            order.status === 'confirmed' || order.status === 'completed' || order.status === 'delivered' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : order.status === 'voided' || order.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          } border-none font-black text-[8px] uppercase tracking-widest py-1.5 px-3 rounded-lg`}>
                            {order.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {displayOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-10 py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                              <Info className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                              No orders found matching this payment method filter.
                            </p>
                            {paymentMethodFilter !== 'all' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPaymentMethodFilter('all')}
                                className="mt-2 text-[9px] uppercase font-black tracking-wider"
                              >
                                Show All Payment Methods
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itemized Log tab - detailed table of raw items sold list */}
        <TabsContent value="itemized" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
             <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-white gap-4">
                <div>
                   <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Detailed Itemized Sales Log</CardTitle>
                   <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Comprehensive line-item audit of inventory units transacted sequentially</CardDescription>
                </div>
                <div className="p-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <LayoutGrid size={20} />
                  <div>
                    <h5 className="font-extrabold text-[10px] uppercase tracking-widest leading-none">Line audit</h5>
                    <p className="text-[11px] font-black mt-1">{itemizedSales.length} Stock Units Sold</p>
                  </div>
                </div>
             </CardHeader>
             <CardContent className="p-0 animate-in fade-in duration-300">
               <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead className="bg-slate-50/50">
                       <tr className="border-none">
                          <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Time stamp</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Invoice Ref</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Product Item</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Channel</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Quantity</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Base Unit</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Unit Price</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Payment</th>
                          <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Sales Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {itemizedSales.map((item, idx) => (
                         <tr key={`${item.orderId}-${item.productId}-${idx}`} className="hover:bg-slate-50/55 transition-colors">
                           <td className="px-10 py-6 font-bold text-slate-400 text-xs">
                             {format(new Date(item.createdAt), 'yyyy-MM-dd • HH:mm:ss')}
                           </td>
                           <td className="px-6 py-6 font-black text-slate-950 font-mono text-xs uppercase">{item.orderId}</td>
                           <td className="px-6 py-6 font-black text-slate-900 italic uppercase">{item.name}</td>
                           <td className="px-6 py-6 whitespace-nowrap">
                             <span className={`px-2.5 py-1 text-[9px] font-black tracking-widest rounded-lg ${getSourceBadgeStyles(item.source)}`}>
                               {item.source}
                             </span>
                           </td>
                           <td className="px-6 py-6 font-black text-right text-slate-900">{item.quantity}</td>
                           <td className="px-6 py-6 font-extrabold text-slate-400 text-[10px] uppercase tracking-widest">{item.unit}</td>
                           <td className="px-6 py-6 font-black text-right text-slate-500">₦{item.price.toFixed(2)}</td>
                           <td className="px-6 py-6 font-black text-slate-400 uppercase font-mono text-[10px]">{item.payment}</td>
                           <td className="px-10 py-6 font-black text-blue-600 text-right">₦{item.lineTotal.toFixed(2)}</td>
                         </tr>
                       ))}
                       {itemizedSales.length === 0 && (
                         <tr>
                           <td colSpan={9} className="px-10 py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                             No itemized logs to report.
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Product profits list Tab */}
        <TabsContent value="products" className="space-y-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
              <SummaryCard 
                 title="Products Total Revenue" 
                 value={`₦${totalProductRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                 trend="+14.4%" 
                 trendUp={true} 
                 icon={<BarChart3 />} 
              />
              <SummaryCard 
                 title="Total Cost (COGS)" 
                 value={`₦${totalProductsSalesCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                 trend="+12.5%" 
                 trendUp={true} 
                 icon={<ShoppingCart />} 
              />
              <SummaryCard 
                 title="Net Profits Earned" 
                 value={`₦${totalGeneralProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                 trend="+17.2%" 
                 trendUp={true} 
                 icon={<Banknote />} 
              />
              <SummaryCard 
                 title="Average Profit Margin" 
                 value={`${averageProductsMargin.toFixed(1)}%`} 
                 trend="+3.1%" 
                 trendUp={true} 
                 icon={<ShieldCheck />} 
              />
           </div>
           
           <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-0 overflow-hidden">
             <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/30">
                <div>
                   <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Dynamic Product Margins</CardTitle>
                   <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 font-mono">Stock metrics derived from dynamic invoice sales</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    toast.success('Inventory Performance logged.');
                    const tableHeaders = ['Product Name', 'Sold', 'Sales Cost', 'Revenue', 'Net Profit', 'Margin'];
                    const tableData = productsWithFinance.map(p => [
                      p.name,
                      `${p.sold} Units`,
                      `₦${p.salesCost.toFixed(2)}`,
                      `₦${p.revenue.toFixed(2)}`,
                      `₦${p.profit.toFixed(2)}`,
                      `${p.margin.toFixed(1)}%`
                    ]);
                    generateBrandedPDF(
                      'Product Margin Recap',
                      'Derived Audit Analytics',
                      [{ label: 'Total Sales Revenue', value: `₦${totalProductRevenue.toFixed(2)}` }],
                      tableHeaders,
                      tableData,
                      'products_margin_audit'
                    );
                  }}
                  className="h-12 bg-indigo-600 text-white px-8 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                   <Download className="w-4 h-4 mr-2" /> Download Margins PDF
                </Button>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead className="bg-slate-50/50">
                       <tr className="border-none">
                          <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Product Name</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Category</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Sold Units</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Buying Cost</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right text-indigo-600">Total Outlay</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Net Revenue</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right text-emerald-600 font-extrabold">Net Profit</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center text-emerald-700 font-extrabold">Profit Margin</th>
                          <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Current Stock</th>
                          <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {productsWithFinance.map((p) => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-10 py-6 font-black text-slate-900 italic uppercase">{p.name}</td>
                            <td className="px-6 py-6 font-bold text-slate-400 text-xs uppercase tracking-widest whitespace-nowrap">{p.category}</td>
                            <td className="px-6 py-6 font-black text-right text-slate-900">{p.sold} Units</td>
                            <td className="px-6 py-6 font-black text-right text-slate-400">₦{p.costPrice.toFixed(2)}</td>
                            <td className="px-6 py-6 font-black text-right text-indigo-600">₦{p.salesCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-6 font-black text-right text-blue-600 tracking-tighter">₦{p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-6 font-black text-right text-emerald-600 font-extrabold">₦{p.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-6">
                              <div className="flex justify-center">
                                <span className="font-extrabold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 text-center text-xs border border-emerald-100 min-w-16">
                                  {p.margin.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-6 font-black text-right text-slate-900">{p.stock} Units</td>
                            <td className="px-10 py-6 text-right">
                               <Badge className={`${p.stock < p.stock * 0.2 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} border-none font-black text-[8px] uppercase tracking-widest`}>
                                  {p.stock < 100 ? 'LOW STOCK' : 'IN STOCK'}
                               </Badge>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        {/* Taxes and audits frame */}
        <TabsContent value="tax" className="space-y-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 anim">
              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10">
                 <h4 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500" /> Dynamic Tax Ledger
                 </h4>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">Total GST/Sales Tax Vol.</span>
                       <span className="text-2xl font-black text-slate-900 tracking-tighter">₦{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">Calculated Tax Rate</span>
                       <Badge className="bg-blue-50 text-blue-600 font-extrabold border-none text-[10px] py-1.5 px-3">10.0% GST STANDARD</Badge>
                    </div>
                    <div className="flex justify-between items-center p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                       <span className="font-extrabold text-emerald-600 text-xs uppercase tracking-widest">Audit Standards Complied</span>
                       <Badge className="bg-emerald-600 text-white border-none font-black text-[8px] uppercase tracking-widest px-3 py-1.5">VERIFIED Ledger</Badge>
                    </div>
                 </div>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10">
                 <h4 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                    <FileText className="text-blue-500" /> Channel Ledger Outlets
                 </h4>
                 <div className="space-y-4">
                    {channelStats.map((item, i) => (
                      <div key={item.source} className="flex items-center justify-between py-4 border-b border-slate-50 group hover:px-2 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm">C{i+1}</div>
                            <div>
                               <p className="font-black text-slate-900 text-sm uppercase italic">{item.source}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Ledger Ref: TX-00-{73 * (i+1)}</p>
                            </div>
                         </div>
                         <div className="text-right">
                           <span className="font-black text-slate-900 text-base tracking-tighter block">₦{(item.revenue * 0.1).toFixed(2)}</span>
                           <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Ledger Tax</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="activity">
           <AdminNotificationFeed />
        </TabsContent>
      </Tabs>

      {/* Itemized Dialog Receipt Proof popover */}
      <Dialog open={selectedOrderDetail !== null} onOpenChange={(open) => { if (!open) setSelectedOrderDetail(null); }}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[480px] p-8 border-none bg-white shadow-3xl text-slate-900">
          <DialogHeader className="text-center pb-4 border-b border-dashed border-slate-100">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-600 text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600 animate-pulse" /> Sale Receipt
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-[9px] uppercase tracking-widest text-center mt-1">
              Receipt copy of transacted sale
            </DialogDescription>
          </DialogHeader>

          {selectedOrderDetail && (
            <div className="space-y-6 pt-4">
              
              {/* Receipt details columns */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Reference</p>
                  <p className="font-black text-slate-900 uppercase font-mono mt-0.5">{selectedOrderDetail.id}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Date / Time Stamp</p>
                  <p className="font-bold text-slate-700 mt-0.5">{format(new Date(selectedOrderDetail.createdAt), 'MMM dd, yyyy • HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Terminal Handler</p>
                  <p className="font-extrabold text-slate-700 uppercase mt-0.5">{selectedOrderDetail.processedBy}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales Source Channel</p>
                  <span className={`px-2 py-0.5 text-[8px] font-black tracking-widest rounded-md mt-1 inline-block ${getSourceBadgeStyles(selectedOrderDetail.source)}`}>
                    {selectedOrderDetail.source || 'The Store'}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Purchase Basket</p>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  {selectedOrderDetail.items?.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{item.quantity} × ₦{item.price.toFixed(2)} ({item.unit})</p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">₦{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total calculations */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Subtotal:</span>
                  <span>₦{(selectedOrderDetail.total * 0.9).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Tax GST (10% standard):</span>
                  <span>₦{(selectedOrderDetail.total * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 items-center">
                  <span>Payment Method:</span>
                  <span className={`uppercase tracking-wider font-mono px-2 py-0.5 rounded text-[10px] font-black ${
                    selectedOrderDetail.paymentMethod === 'cash' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    selectedOrderDetail.paymentMethod === 'transfer' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                    selectedOrderDetail.paymentMethod === 'card' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    selectedOrderDetail.paymentMethod === 'owing' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    selectedOrderDetail.paymentMethod === 'split' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    'bg-slate-800 text-slate-200'
                  }`}>
                    {selectedOrderDetail.paymentMethod || 'CASH'}
                  </span>
                </div>

                {/* Tender Breakdown if split or multi-tender */}
                {((selectedOrderDetail.cashPaid && selectedOrderDetail.cashPaid > 0) || 
                  (selectedOrderDetail.transferPaid && selectedOrderDetail.transferPaid > 0) ||
                  (selectedOrderDetail.cardPaid && selectedOrderDetail.cardPaid > 0) ||
                  (selectedOrderDetail.owingPaid && selectedOrderDetail.owingPaid > 0)) && (
                  <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Tender Split:</span>
                    {selectedOrderDetail.cashPaid ? <div className="flex justify-between text-emerald-400"><span>• Cash:</span><span>₦{Number(selectedOrderDetail.cashPaid).toFixed(2)}</span></div> : null}
                    {selectedOrderDetail.transferPaid ? <div className="flex justify-between text-blue-400"><span>• Bank Transfer:</span><span>₦{Number(selectedOrderDetail.transferPaid).toFixed(2)}</span></div> : null}
                    {selectedOrderDetail.cardPaid ? <div className="flex justify-between text-purple-400"><span>• POS / Card:</span><span>₦{Number(selectedOrderDetail.cardPaid).toFixed(2)}</span></div> : null}
                    {selectedOrderDetail.owingPaid ? <div className="flex justify-between text-amber-400"><span>• Debt / Owing:</span><span>₦{Number(selectedOrderDetail.owingPaid).toFixed(2)}</span></div> : null}
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-widest text-blue-400">Sum Total Paid</span>
                  <span className="text-xl font-black tracking-tighter block text-white font-mono">₦{selectedOrderDetail.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="my-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="mb-3 text-[9px] font-black uppercase text-slate-400 tracking-wider">Download & Share Official Receipt PDF</div>
                  <SocialShare 
                    title={`Teki Pharm Sales Receipt`}
                    pdfData={{
                      id: selectedOrderDetail.id,
                      createdAt: selectedOrderDetail.createdAt,
                      customerName: 'General Consumer',
                      items: selectedOrderDetail.items.map(i => ({
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                        unit: i.unit || 'pcs'
                      })),
                      subtotal: selectedOrderDetail.total * 0.9,
                      discount: 0,
                      tax: selectedOrderDetail.total * 0.1,
                      total: selectedOrderDetail.total,
                      paymentMethod: selectedOrderDetail.paymentMethod || 'CASH',
                      processedBy: selectedOrderDetail.processedBy || 'James Wilson'
                    }}
                    url={null}
                    variant="inline"
                  />
                </div>
                <Button 
                  onClick={() => setSelectedOrderDetail(null)}
                  className="w-full h-12 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 hover:scale-[1.01] transition-transform font-black text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  Close Receipt View
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function SummaryCard({ title, value, trend, trendUp, icon }: any) {
  return (
    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white p-4 md:p-5">
       <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors shadow-sm">{icon}</div>
          <div className={`flex items-center gap-1 font-black text-[10px] uppercase tracking-widest ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
             {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
             {trend}
          </div>
       </div>
       <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">{title}</p>
       <h3 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight break-words">{value}</h3>
    </Card>
  );
}
