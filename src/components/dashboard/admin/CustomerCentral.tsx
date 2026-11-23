import React, { useState, useEffect } from 'react';
import { apiService, isSupabaseConfigured, supabase } from '../../../services/api';
import { 
  Users, 
  MessageSquare, 
  Wallet, 
  Award, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Star, 
  TrendingUp, 
  Plus,
  ArrowUpRight,
  Database,
  Phone,
  Mail,
  MapPin
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function CustomerCentral({ selectedBranchId }: { selectedBranchId?: string } = {}) {
  const [activeTab, setActiveTab] = useState('list');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tier: 'Regular Consumer'
  });

  const loadCustomerData = async () => {
    try {
      const data = await apiService.customers.list(selectedBranchId);
      setCustomerList(data || []);
    } catch (e) {
      console.error('Failed to load customers from database', e);
    }
  };

  // Load customers on mount and when branch selection changes
  useEffect(() => {
    loadCustomerData();

    const handleUpdate = () => loadCustomerData();
    window.addEventListener('pharmacy_customers_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let subscription: any = null;
    if (isSupabaseConfigured() && supabase) {
      subscription = supabase
        .channel('public:customers_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          loadCustomerData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('pharmacy_customers_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (subscription && supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedBranchId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      await apiService.customers.add({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        tier: formData.tier,
        pharmacyId: selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      await loadCustomerData();
      toast.success('Customer Record Created & Synced to Database Successfully');
      setFormData({ name: '', phone: '', email: '', address: '', tier: 'Regular Consumer' });
      setIsAddingCustomer(false);
    } catch (err) {
      console.error('Failed to save customer', err);
      toast.error('Failed to create customer record');
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    try {
      await apiService.customers.delete(id);
      await loadCustomerData();
      toast.success(`Record for customer ${name} deleted successfully from database`);
    } catch (err) {
      toast.error(`Failed to delete record for ${name}`);
    }
  };

  const filteredCustomers = customerList.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.tier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Customers</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage your users, reviews, and rewards</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-50 rounded-xl">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Customers</p>
                 <p className="text-sm font-black text-slate-900 italic">{customerList.length} Registered</p>
              </div>
           </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-[2.5rem] inline-flex">
          <TabsTrigger value="list" className="px-8 rounded-3xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12">
            <Users size={16} className="mr-2" /> All Customers
          </TabsTrigger>
          <TabsTrigger value="reviews" className="px-8 rounded-3xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12">
            <MessageSquare size={16} className="mr-2" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="wallet" className="px-8 rounded-3xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12">
            <Wallet size={16} className="mr-2" /> Wallet & Payments
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="px-8 rounded-3xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 h-10 md:h-12">
            <Award size={16} className="mr-2" /> Points Program
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
           <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
             <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6">
                <div className="relative w-full md:w-96">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                   <Input 
                     placeholder="Search customers..." 
                     className="pl-12 h-14 w-full bg-slate-50 border-none rounded-2xl font-bold shadow-sm" 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
                   <DialogTrigger asChild>
                      <Button className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 cursor-pointer">
                         <Plus className="mr-2 w-4 h-4" /> Create New Customer
                      </Button>
                   </DialogTrigger>
                   <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl">
                      <DialogHeader>
                         <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Register New Consumer</DialogTitle>
                         <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add a new retail customer to the registry</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCustomer} className="space-y-6 py-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Identity</label>
                            <Input 
                              required 
                              placeholder="Customer Name" 
                              className="h-14 rounded-xl bg-slate-50 border-none font-bold"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Phone Number</label>
                              <Input 
                                placeholder="+234 800 000 0000" 
                                className="h-14 rounded-xl bg-slate-50 border-none font-bold"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
                              <Input 
                                type="email"
                                placeholder="customer@mail.com" 
                                className="h-14 rounded-xl bg-slate-50 border-none font-bold"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              />
                           </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Delivery / Residential Address</label>
                            <Input 
                              placeholder="Street Address, City" 
                              className="h-14 rounded-xl bg-slate-50 border-none font-bold"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Initial Tier</label>
                            <select 
                              className="w-full h-14 bg-slate-50 border-none rounded-xl px-6 font-bold"
                              value={formData.tier}
                              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                            >
                               <option>Regular Consumer</option>
                               <option>Prime Member</option>
                               <option>B2B Partner</option>
                            </select>
                         </div>
                         <Button type="submit" className="w-full h-16 bg-blue-600 rounded-3xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-blue-600/20">Commit to Registry</Button>
                      </form>
                   </DialogContent>
                </Dialog>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                         <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Customer</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Membership</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Wallet Balance</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Join Date</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                         <TableHead className="px-10"></TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredCustomers.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-black text-xs uppercase tracking-widest">
                              No registered customer records found. Click "Enroll Client" to add one.
                           </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((person, index) => (
                        <TableRow key={person.id || index} className="border-slate-50 hover:bg-slate-50 group transition-all">
                           <TableCell className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full border-2 border-slate-100 p-0.5 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`} alt="user" />
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-900 leading-none italic uppercase">{person.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                                      <span>ID: {person.id}</span>
                                      {person.phone && <span>• {person.phone}</span>}
                                      {person.email && <span>• {person.email}</span>}
                                    </div>
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell>
                              <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[8px] uppercase tracking-widest px-3 py-1">
                                {person.tier}
                              </Badge>
                           </TableCell>
                           <TableCell className="font-black text-slate-900">₦{(Number(person.balance) || 0).toFixed(2)}</TableCell>
                           <TableCell className="font-bold text-slate-400 text-xs">{person.joinDate}</TableCell>
                           <TableCell>
                              <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                 <span className="text-[10px] font-black uppercase text-emerald-600">{person.status}</span>
                              </div>
                           </TableCell>
                           <TableCell className="px-10">
                              <Button 
                                onClick={() => handleDeleteCustomer(person.id, person.name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest px-3 py-1 h-9 rounded-xl border border-red-100 cursor-pointer"
                              >
                                Delete
                              </Button>
                           </TableCell>
                        </TableRow>
                      )))}
                   </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="reviews">
           <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 bg-white p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 mb-2">No Customer Reviews Yet</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider max-w-md mx-auto">
                 Customer ratings and feedback submitted through retail sales and storefront orders will dynamically display here.
              </p>
           </Card>
        </TabsContent>

        <TabsContent value="wallet">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10">
                 <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Payment History</h3>
                    <Button variant="outline" className="h-12 border-2 border-slate-50 rounded-xl font-black text-[10px] uppercase tracking-widest">Download Report</Button>
                 </div>
                 <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-black text-xs uppercase tracking-wider">No Wallet Transactions Recorded</p>
                    <p className="text-slate-400 text-[11px] mt-1 max-w-sm mx-auto">
                       Wallet deposits, member points conversions, and balance deductions will record here in real-time.
                    </p>
                 </div>
              </Card>

              <div className="space-y-8">
                 <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-8 bg-gradient-to-br from-indigo-900 to-slate-950 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
                    <div className="relative z-10">
                       <Award size={42} className="text-indigo-400 mb-6" />
                       <h4 className="text-xl font-black uppercase italic mb-2 tracking-tight leading-none">Rewards Program</h4>
                       <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-widest mb-10">Manage how customers earn points</p>
                       <div className="space-y-6 mb-10">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Active Status</span>
                             <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase">Active</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Multiplier</span>
                             <span className="text-xl font-black italic">1.25x</span>
                          </div>
                       </div>
                       <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl">Edit Rules</Button>
                    </div>
                 </Card>
                 
                 <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-8">
                    <h4 className="text-lg font-black text-slate-900 uppercase italic mb-6">Points & Rewards</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points Per Naira</span>
                          <span className="font-black text-slate-900">1:10</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minimum Points</span>
                          <span className="font-black text-slate-900">1000 Pts</span>
                       </div>
                    </div>
                    <Button variant="ghost" className="w-full mt-6 h-12 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all">Adjust Rules</Button>
                 </Card>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
