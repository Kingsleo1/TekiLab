import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  Receipt, 
  DollarSign, 
  Trash2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiService } from '../../services/api';

interface Expense {
  id: string;
  vendorId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: 'Confirmed' | 'Pending';
}

export function ExpensesView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Load expenses from apiService
    apiService.expenses.list(selectedBranchId).then((data) => {
      setExpenses(data);
    }).catch(err => {
      console.error('Failed to load expenses', err);
      setExpenses([]);
    });
  }, [selectedBranchId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    const newExpense: Expense = {
      id: `EXP-OPS-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: 'vendor-tekipharm-1',
      date,
      description: description.trim(),
      category,
      amount: val,
      status: 'Confirmed'
    };

    try {
      const saved = await apiService.expenses.add({
        ...newExpense,
        pharmacyId: selectedBranchId
      });
      setExpenses(prev => [saved, ...prev]);
      toast.success(`Expense filed: Manual log ${newExpense.id} for ₦${val.toLocaleString()} added successfully.`);

      // Reset Form
      setDescription('');
      setAmount('');
      setShowAddForm(false);
    } catch (err) {
      toast.error('Failed to add expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await apiService.expenses.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Expense record removed.');
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const categories = ['Cost of Goods Sold', 'Utilities', 'Rent', 'Logistics', 'Staff Salaries', 'Marketing', 'Miscellaneous'];

  const filteredExpensesByDate = expenses.filter(exp => {
    if (dateFilter === 'all') return true;

    const expDate = new Date(exp.date);
    expDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      return expDate.getTime() === today.getTime();
    }

    if (dateFilter === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return expDate >= startOfWeek && expDate <= today;
    }

    if (dateFilter === 'month') {
      return expDate.getFullYear() === today.getFullYear() && expDate.getMonth() === today.getMonth();
    }

    if (dateFilter === 'year') {
      return expDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter === 'custom') {
      if (!customStartDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      
      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999);

      return expDate >= start && expDate <= end;
    }

    return true;
  });

  const filteredExpenses = categoryFilter === 'all' 
    ? filteredExpensesByDate 
    : filteredExpensesByDate.filter(e => e.category === categoryFilter);

  const totalCostOfGoods = filteredExpensesByDate
    .filter(e => e.category === 'Cost of Goods Sold')
    .reduce((acc, current) => acc + current.amount, 0);

  const totalOperating = filteredExpensesByDate
    .filter(e => e.category !== 'Cost of Goods Sold')
    .reduce((acc, current) => acc + current.amount, 0);

  const grandTotal = totalCostOfGoods + totalOperating;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
            Financial Health & Audit
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mt-2 uppercase italic flex items-center gap-2">
            Expenses Ledger
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1 leading-relaxed">
            Monitor auto-filed inventory COGS and record operational expenses like rents, utilities, and logistics.
          </p>
        </div>

        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl bg-slate-950 text-white hover:bg-slate-900 font-bold text-xs tracking-wider px-5 py-3 h-11 uppercase flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Plus size={15} /> {showAddForm ? 'Close Form' : 'Log New Expense'}
        </Button>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[1.5rem] bg-slate-900 text-white border-0 shadow-xl p-6 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Cumulative Gross</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Grand Total Outlays</p>
            <p className="text-3xl font-mono font-black text-[#F97316]">₦{grandTotal.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Overall operational or acquisition expenditures filed.</p>
          </div>
          <div className="absolute right-6 bottom-6 opacity-10">
            <DollarSign size={55} />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] bg-white border border-slate-200 shadow-md p-6 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Inventory Acquisitions</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Cost of Goods Sold (COGS)</p>
            <p className="text-3xl font-mono font-black text-blue-600">₦{totalCostOfGoods.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Automatically posted from wholesale supply intake records.</p>
          </div>
          <div className="absolute right-6 bottom-6 opacity-5">
            <TrendingUp size={55} />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] bg-white border border-slate-200 shadow-md p-6 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">Fixed & Running Cost</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Operating Expenses (OPEX)</p>
            <p className="text-3xl font-mono font-black text-slate-800">₦{totalOperating.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Manually logged logistics, staff, rents, utilities, and marketing.</p>
          </div>
          <div className="absolute right-6 bottom-6 opacity-5">
            <TrendingDown size={55} />
          </div>
        </Card>
      </div>

      {showAddForm && (
        <Card className="rounded-[2rem] bg-white border-slate-200 p-8 shadow-lg max-w-xl mx-auto border-orange-200">
          <CardHeader className="p-0 pb-6 border-b border-slate-100">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Log Operational Expense</CardTitle>
            <CardDescription className="text-slate-400 text-xs font-semibold">Manually input real-world store outlays</CardDescription>
          </CardHeader>
          <form onSubmit={handleAddExpense} className="space-y-5 pt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expense Title / Description</label>
              <Input 
                required 
                placeholder="e.g. Purchase of diesel generator fuel, printer cartridges..." 
                className="h-12 border-slate-200 rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <select 
                  className="w-full h-12 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold focus:outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (₦)</label>
                <Input 
                  required 
                  type="number"
                  placeholder="₦" 
                  className="h-12 border-slate-200 rounded-xl font-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expense Date</label>
              <Input 
                required 
                type="date"
                className="h-12 border-slate-200 rounded-xl font-mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-slate-900 border-0 text-white hover:bg-slate-800 rounded-xl font-bold uppercase text-xs tracking-wider"
            >
              Verify & Post Expense
            </Button>
          </form>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="rounded-[2.5rem] bg-white border-slate-200 p-8 shadow-xl">
        <CardHeader className="px-0 pb-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Posted Expenses Records</CardTitle>
            <CardDescription className="text-slate-400 text-xs font-semibold">Historical ledger entries with category filter tags</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
            {/* Category Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 md:flex-initial">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <select
                className="bg-transparent border-0 text-xs font-black text-slate-700 focus:outline-none cursor-pointer w-full py-0.5"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Expense Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 md:flex-initial">
              <span className="text-[#F97316] shrink-0 font-black text-[11px]">🗓</span>
              <select
                className="bg-transparent border-0 text-xs font-black text-slate-700 focus:outline-none cursor-pointer w-full py-0.5"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex-wrap w-full md:w-auto animate-in slide-in-from-top-2">
                <Input
                  type="date"
                  className="h-7 text-[10px] font-mono border-none bg-transparent p-1 focus:ring-0 w-28"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase">to</span>
                <Input
                  type="date"
                  className="h-7 text-[10px] font-mono border-none bg-transparent p-1 focus:ring-0 w-28"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardHeader>

        <div className="overflow-x-auto pt-4">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expense Reference ID</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logged Description</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxonomy Group</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporting Date</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Filed Amount</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Audit Status</TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                      <AlertCircle size={32} className="mb-2 text-slate-300" />
                      <p className="font-bold text-sm">No expenses found for this category.</p>
                      <p className="text-xs text-slate-400">Try changing filters or record a new outgoings voucher.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <TableRow key={exp.id || idx} className="border-slate-50 hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                    <TableCell className="py-4 font-mono text-xs font-black text-slate-900">{exp.id}</TableCell>
                    <TableCell className="font-semibold text-slate-900 py-4">{exp.description}</TableCell>
                    <TableCell>
                      <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 ${
                        exp.category === 'Cost of Goods Sold' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : exp.category === 'Rent' 
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{exp.date}</TableCell>
                    <TableCell className="font-mono text-sm font-black text-slate-900 text-right">
                      ₦{exp.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] text-emerald-600 font-black tracking-wider uppercase">{exp.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {exp.category !== 'Cost of Goods Sold' ? (
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)} 
                          className="hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">SYSTEM</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
