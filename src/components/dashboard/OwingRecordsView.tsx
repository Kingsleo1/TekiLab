import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  ChevronRight,
  Plus,
  Coins,
  ArrowRight,
  Phone,
  User,
  Calendar,
  Layers,
  Sparkles,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { apiService } from '../../services/api';
import { OwingRecord } from '../../types/pharmacy';
import { CustomerSelectInput } from './CustomerSelectInput';
import { format, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function OwingRecordsView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [debts, setDebts] = useState<OwingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially-paid' | 'fully-paid' | 'overdue'>('all');
  
  // Outstanding Debt Dialog states
  const [isSettleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<OwingRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer' | 'card' | 'wallet'>('cash');

  // Manual Creation form states
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({
    customerName: '',
    customerPhone: '',
    totalAmount: '',
    amountPaid: '',
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    itemsDesc: '',
    notes: ''
  });

  useEffect(() => {
    loadOwingRecords();
  }, [selectedBranchId]);

  const loadOwingRecords = async () => {
    try {
      const data = await apiService.owing.list(selectedBranchId);
      setDebts(data);
    } catch (e) {
      toast.error('Failed to load owing records ledger');
    }
  };

  const getSettleLimit = () => {
    if (!selectedDebt) return 0;
    return selectedDebt.amountOwed;
  };

  const handleSettleSubmit = async () => {
    if (!selectedDebt) return;
    if (settleAmount <= 0) {
      toast.error('Please specify a valid payment amount');
      return;
    }
    if (settleAmount > selectedDebt.amountOwed) {
      toast.error(`Repayment cannot exceed the outstanding balance of ₦${selectedDebt.amountOwed.toLocaleString()}`);
      return;
    }

    try {
      await apiService.owing.addPayment(selectedDebt.id, settleAmount, settleMethod);
      toast.success(`Registered payment of ₦${settleAmount.toLocaleString()} successfully!`);
      setSettleDialogOpen(false);
      setSettleAmount(0);
      setSelectedDebt(null);
      await loadOwingRecords();
    } catch (e) {
      toast.error('Failed to log payment on database core');
    }
  };

  const handleCreateSubmit = async () => {
    const { customerName, customerPhone, totalAmount, amountPaid, dueDate, itemsDesc, notes } = newDebt;
    if (!customerName || !customerPhone || !totalAmount || !dueDate) {
      toast.error('Please fulfill all mandatory registry parameters');
      return;
    }

    const tAmt = Number(totalAmount);
    const pAmt = Number(amountPaid || 0);

    if (tAmt <= 0) {
      toast.error('Debt evaluation amount must be greater than zero');
      return;
    }

    if (pAmt > tAmt) {
      toast.error('Downpayment cannot be greater than the total debt liability');
      return;
    }

    const oAmt = tAmt - pAmt;
    const status = oAmt === 0 ? 'fully-paid' : pAmt > 0 ? 'partially-paid' : 'unpaid';

    const itemsParsed = itemsDesc ? [{ name: itemsDesc, quantity: 1 }] : [];

    // Automatically ensure customer is registered in the customer registry
    try {
      await (apiService as any).customers.add(customerName, customerPhone);
    } catch (e) {
      console.error("Failed to automatically register customer in db:", e);
    }

    const record: OwingRecord = {
      id: `OW-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      customerName,
      customerPhone,
      totalAmount: tAmt,
      amountPaid: pAmt,
      amountOwed: oAmt,
      dueDate,
      status,
      items: itemsParsed,
      pharmacyId: selectedBranchId,
      notes,
      createdAt: new Date().toISOString(),
      payments: pAmt > 0 ? [
        {
          id: `PAY-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          amount: pAmt,
          paymentMethod: 'cash',
          createdAt: new Date().toISOString()
        }
      ] : []
    };

    try {
      await apiService.owing.add(record);
      toast.success(`Successfully registered debt ledger account for ${customerName}`);
      setCreateDialogOpen(false);
      setNewDebt({
        customerName: '',
        customerPhone: '',
        totalAmount: '',
        amountPaid: '',
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        itemsDesc: '',
        notes: ''
      });
      await loadOwingRecords();
    } catch (e) {
      toast.error('Failed to record new debt parameter');
    }
  };

  const triggerSMSReminder = (debt: OwingRecord) => {
    toast.success(`SMS Dispatched: To ${debt.customerName} (${debt.customerPhone})`, {
      description: `“Friendly alert: You have an outstanding liability of ₦${debt.amountOwed.toLocaleString()} with Teki Pharm due on ${debt.dueDate}.”`,
      duration: 5000,
      icon: <MessageSquare className="text-blue-600" />
    });
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const filteredDebts = debts.filter(d => {
    const matchesSearch = d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.customerPhone.includes(searchQuery);
    
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') {
      return d.status !== 'fully-paid' && isAfter(new Date(), parseISO(d.dueDate)) && d.dueDate !== todayStr;
    }
    return d.status === statusFilter;
  });

  // Calculate high-concept KPIs
  const totalReceivable = debts
    .filter(d => d.status !== 'fully-paid')
    .reduce((sum, d) => sum + d.amountOwed, 0);

  const totalCollectedOfOwed = debts.reduce((sum, d) => sum + d.amountPaid, 0);

  const activeAccounts = debts.filter(d => d.status !== 'fully-paid').length;
  
  const overdueAccounts = debts.filter(d => 
    d.status !== 'fully-paid' && isAfter(new Date(), parseISO(d.dueDate)) && d.dueDate !== todayStr
  ).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Matrix */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Credit Ledger & Receivables</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Sustain Retail Cash Velocity & Customer Financing Balance Sheets</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="w-full md:w-auto h-12 md:h-14 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-blue-600/20 shadow-inner"
          >
            <Plus size={16} /> Log Credit Account
          </Button>
        </div>
      </div>

      {/* KPI Bento Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-10">
            <Coins className="w-36 h-36" />
          </div>
          <CardHeader className="pb-2">
            <p className="sky-text text-[9px] font-black uppercase tracking-widest text-[#94A3B8]">Total Outstanding Debt</p>
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tighter mt-1 text-blue-400">
              ₦{totalReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-slate-400 font-bold">Consolidated accounts receivable asset balance</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-white border border-slate-100">
          <CardHeader className="pb-2">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Active Debtor Lines</p>
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 mt-1">
              {activeAccounts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded w-max">
              +₦{totalCollectedOfOwed.toLocaleString(undefined, { maximumFractionDigits: 0 })} recovered in downpayments
            </span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-white border border-slate-100">
          <CardHeader className="pb-2">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Delinquent / Overdue Ledger</p>
            <div className="flex items-center gap-3">
              <CardTitle className={`text-3xl md:text-4xl font-black tracking-tighter mt-1 ${overdueAccounts > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {overdueAccounts}
              </CardTitle>
              {overdueAccounts > 0 && (
                <div className="p-1.5 bg-red-50 text-red-600 rounded-full animate-pulse">
                  <AlertTriangle size={14} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-slate-400 font-bold">Past payment schedule limit thresholds</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-white border border-slate-100">
          <CardHeader className="pb-2">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Liquid Settle Ratio</p>
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 mt-1">
              {debts.length > 0 ? Math.round((debts.filter(d => d.status === 'fully-paid').length / debts.length) * 100) : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-[10px] text-slate-400 font-bold">Ratio of completed repayments accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Table Matrix */}
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Accounts' },
              { id: 'unpaid', label: 'Unpaid' },
              { id: 'partially-paid', label: 'Partially Paid' },
              { id: 'fully-paid', label: 'Fully Paid' },
              { id: 'overdue', label: 'Overdue Alerts' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  statusFilter === tab.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <Input 
              placeholder="Search by debtor name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 bg-slate-50 border-none rounded-xl text-xs font-bold w-full"
            />
          </div>
        </div>

        {/* Scrollable list of debtors */}
        <ScrollArea className="h-[520px] rounded-2xl">
          {filteredDebts.length === 0 ? (
            <div className="py-24 text-center">
              <Coins size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest leading-loose">
                No credit accounts match filtering criteria <br/> in terminal cache
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {filteredDebts.map((debt) => {
                const isOverdue = debt.status !== 'fully-paid' && 
                                  isAfter(new Date(), parseISO(debt.dueDate)) && 
                                  debt.dueDate !== todayStr;
                return (
                  <div 
                    key={debt.id} 
                    className={`p-6 bg-white border rounded-[1.75rem] shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-6 ${
                      isOverdue 
                        ? 'border-red-100 bg-red-50/20' 
                        : 'border-slate-100'
                    }`}
                  >
                    {/* Customer Identity */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isOverdue 
                          ? 'bg-red-100 text-red-600' 
                          : debt.status === 'fully-paid' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-indigo-50 text-blue-600'
                      }`}>
                        {debt.status === 'fully-paid' ? <CheckCircle2 size={22} /> : isOverdue ? <AlertTriangle size={20} /> : <User size={22} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-950 uppercase italic text-base">{debt.customerName}</h4>
                          <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            debt.status === 'fully-paid' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : debt.status === 'partially-paid'
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-rose-100 text-rose-700'
                          }`}>
                            {debt.status}
                          </Badge>
                          {isOverdue && (
                            <Badge className="bg-red-600 text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse">
                              OVERDUE DEBT
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-2 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-300" /> {debt.customerPhone}
                          <span className="text-slate-200">|</span> 
                          ID: <span className="text-slate-500 uppercase">{debt.id}</span>
                        </p>
                        {debt.notes && (
                          <p className="text-[10px] text-slate-500 font-medium italic mt-2 max-w-xl">
                            “{debt.notes}”
                          </p>
                        )}
                        {debt.items && debt.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {debt.items.map((it, idx) => (
                              <span key={idx} className="text-[9px] font-bold uppercase tracking-wide bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                {it.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial stats */}
                    <div className="grid grid-cols-3 gap-6 sm:gap-12 xl:w-96 text-left shrink-0 border-t border-slate-100 xl:border-none pt-4 xl:pt-0">
                      <div>
                        <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider">Total Value</p>
                        <p className="text-sm font-black text-slate-800 tracking-tighter mt-0.5">₦{debt.totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider">Settle Amount</p>
                        <p className="text-sm font-black text-emerald-600 tracking-tighter mt-0.5">₦{debt.amountPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider">Unresolved Bal</p>
                        <p className={`text-sm font-black tracking-tighter mt-0.5 ${debt.amountOwed > 0 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>
                          ₦{debt.amountOwed.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Expiry Schedules & Actions */}
                    <div className="flex flex-col sm:flex-row xl:flex-col gap-4 justify-between xl:justify-center items-stretch sm:items-center xl:items-end shrink-0 pointer-events-auto border-t border-slate-100 xl:border-none pt-4 xl:pt-0">
                      <div className="text-left sm:text-right xl:text-right flex items-center xl:block gap-2">
                        <span className="text-slate-400 text-[8px] font-black uppercase tracking-wider block">Due repayment Date</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={12} className={isOverdue ? "text-red-500" : "text-slate-400"} />
                          <span className={`text-[11px] font-mono font-bold ${isOverdue ? 'text-red-600 font-black' : 'text-slate-600'}`}>
                            {debt.dueDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        {debt.amountOwed > 0 ? (
                          <>
                            <Button 
                              onClick={() => triggerSMSReminder(debt)}
                              variant="ghost" 
                              className="h-10 px-4 rounded-xl font-bold text-[9px] uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                            >
                              Remind
                            </Button>
                            <Button 
                              onClick={() => {
                                setSelectedDebt(debt);
                                setSettleAmount(debt.amountOwed);
                                setSettleDialogOpen(true);
                              }}
                              className="h-10 px-5 rounded-xl bg-[#0F172A] hover:bg-black text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-inner"
                            >
                              Settle
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest italic select-none">
                             Settle complete
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* REPAYMENT SETTLEMENT DIALOG */}
      <Dialog open={isSettleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 blur-[60px] rounded-full -mr-24 -mt-24"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Repayment Registrar</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Record payments on Outstanding Debt Account</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Account Holder</p>
                <h4 className="text-lg font-black text-slate-900 mt-0.5">{selectedDebt?.customerName}</h4>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total balance Owed</p>
                <h4 className="text-xl font-extrabold text-red-600 mt-0.5">₦{selectedDebt?.amountOwed.toLocaleString()}</h4>
              </div>
            </div>

            {/* Repayment Installment History if available */}
            {selectedDebt?.payments && selectedDebt.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History className="w-3 h-3" /> repayer transactional log</p>
                <div className="max-h-24 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  {selectedDebt.payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span>{format(new Date(p.createdAt), 'MMM dd, yyyy • HH:mm')} ({p.paymentMethod})</span>
                      <span className="font-bold text-emerald-600">+₦{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Repayment channel</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', icon: <Banknote size={14} />, label: 'Cash' },
                  { id: 'transfer', icon: <Smartphone size={14} />, label: 'Wire' },
                  { id: 'card', icon: <CreditCard size={14} />, label: 'Card' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSettleMethod(m.id as any)}
                    className={`p-3.5 border-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                      settleMethod === m.id 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md' 
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repayment evaluation Amount</p>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">₦</div>
                <Input 
                  type="number"
                  className="pl-8 h-12 text-lg font-black rounded-xl border-slate-100 bg-slate-50 focus:bg-white"
                  placeholder="0"
                  max={getSettleLimit()}
                  value={settleAmount || ''}
                  onChange={(e) => setSettleAmount(Math.min(getSettleLimit(), Number(e.target.value)))}
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right">Repayment amount capped at outstanding balance limit</p>
            </div>

            <Button
              onClick={handleSettleSubmit}
              className="w-full h-14 bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10"
            >
              Log Settlement Repayment <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MANUAL CREDIT CREATION DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full -mr-24 -mt-24"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Credit Account Registrar</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enroll old ledger balances or custom credit transactions</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Debtor Name *</label>
                <CustomerSelectInput 
                  placeholder="Select or type debtor name..."
                  value={newDebt.customerName}
                  onChange={(val) => setNewDebt({ ...newDebt, customerName: val })}
                  onSelectCustomer={(cust) => setNewDebt(prev => ({ 
                    ...prev, 
                    customerName: cust.name, 
                    customerPhone: cust.phone || prev.customerPhone 
                  }))}
                  className="h-11 bg-slate-50/50 border-slate-100 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Debtor Phone *</label>
                <Input 
                  placeholder="e.g. 08012345678"
                  value={newDebt.customerPhone}
                  onChange={(e) => setNewDebt({ ...newDebt, customerPhone: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Items purchased / Purpose *</label>
              <Input 
                placeholder="e.g. Amoxicillin, Antenatal Syrups, Gloves"
                value={newDebt.itemsDesc}
                onChange={(e) => setNewDebt({ ...newDebt, itemsDesc: e.target.value })}
                className="h-11 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Credit Amount (₦) *</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newDebt.totalAmount}
                  onChange={(e) => setNewDebt({ ...newDebt, totalAmount: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white text-xs font-bold font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Downpayment (₦)</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newDebt.amountPaid}
                  onChange={(e) => setNewDebt({ ...newDebt, amountPaid: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repayment Deadline *</label>
              <Input 
                type="date"
                value={newDebt.dueDate}
                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                className="h-11 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white text-xs font-bold font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic notes</label>
              <textarea 
                placeholder="e.g. Clears balance when pension is processed..."
                value={newDebt.notes}
                onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                className="w-full p-4 h-24 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-slate-300 focus:outline-none text-xs font-medium"
              />
            </div>

            <Button
              onClick={handleCreateSubmit}
              className="w-full h-14 bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10 pt-1"
            >
              Enroll Credit Account <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
