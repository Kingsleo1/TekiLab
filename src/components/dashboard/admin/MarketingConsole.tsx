import React, { useState } from 'react';
import { 
  Megaphone, 
  Image as ImageIcon, 
  Ticket, 
  Percent, 
  Bell, 
  Plus, 
  Search, 
  Target, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  MoreHorizontal,
  Edit,
  Trash2
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

export function MarketingConsole() {
  const [activeTab, setActiveTab] = useState('banners');
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Marketing Campaign Initialized');
    setIsAddingCampaign(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Marketing</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage banners, coupons, and announcements</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           <Dialog open={isAddingCampaign} onOpenChange={setIsAddingCampaign}>
             <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none h-12 md:h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">
                   <Plus className="w-4 h-4 mr-2" /> New Campaign
                </Button>
             </DialogTrigger>
             <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl">
                <DialogHeader>
                   <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Initialize Campaign</DialogTitle>
                   <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Launch a new promotion or notification wave</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} className="space-y-6 py-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Campaign Label</label>
                      <Input required placeholder="Promotion Title" className="h-14 rounded-xl bg-slate-50 border-none font-bold" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Distribution Hub</label>
                      <select className="w-full h-14 bg-slate-50 border-none rounded-xl px-6 font-bold">
                         <option>Discover Banners</option>
                         <option>Push Notifications</option>
                         <option>Email Blast</option>
                         <option>Coupon Generation</option>
                      </select>
                   </div>
                   <Button type="submit" className="w-full h-16 bg-indigo-600 rounded-3xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20">Launch Sequence</Button>
                </form>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <MetricCard title="Active Campaigns" value="12" icon={<Target className="text-indigo-500" />} />
         <MetricCard title="Coupon Usage" value="42%" icon={<Ticket className="text-blue-500" />} />
         <MetricCard title="Performance" value="18.4%" icon={<TrendingUp className="text-emerald-500" />} />
         <MetricCard title="Reach" value="2.4M" icon={<Megaphone className="text-amber-500" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-[2rem] inline-flex">
          <TabsTrigger value="banners" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-12">
            <ImageIcon size={16} className="mr-2" /> Banners
          </TabsTrigger>
          <TabsTrigger value="coupons" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-12">
            <Ticket size={16} className="mr-2" /> Coupons
          </TabsTrigger>
          <TabsTrigger value="notifications" className="px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-12">
            <Bell size={16} className="mr-2" /> Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banners">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all shadow-slate-200/40 bg-white overflow-hidden group">
                  <div className="h-48 bg-slate-900 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-blue-600/30"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-black text-white/10 text-6xl rotate-12">PROMO {i}</span>
                     </div>
                     <div className="absolute top-6 left-6">
                        <Badge className="bg-indigo-600/80 backdrop-blur-md text-white border-none font-black text-[8px] uppercase tracking-widest">Main Header</Badge>
                     </div>
                  </div>
                  <CardHeader className="p-8">
                     <CardTitle className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center justify-between">
                        Banner Alpha {i}
                        <Edit size={16} className="text-slate-300 hover:text-indigo-600 cursor-pointer" />
                     </CardTitle>
                     <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Active on Discover Hub</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <div className="flex items-center gap-1.5"><Clock size={12} /> Ends in 4d</div>
                     <div className="flex items-center gap-1.5"><ArrowUpRight size={12} className="text-emerald-500" /> 12k Clicks</div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="coupons">
           <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
             <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/30">
                <div>
                   <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Coupon Management</CardTitle>
                   <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Manage all active discount codes</CardDescription>
                </div>
                <div className="flex gap-3">
                   <Input placeholder="Search codes..." className="h-12 w-60 bg-white border-none rounded-xl font-bold shadow-sm" />
                </div>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                         <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Coupon Code</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Discount</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Redemptions</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Expiration</TableHead>
                         <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                         <TableHead className="px-10"></TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {['PHARMA20', 'SHIELD15', 'VELOCITY10', 'QUANTUM'].map((code, i) => (
                        <TableRow key={code} className="border-slate-50 hover:bg-slate-50 px-10 group transition-all">
                           <TableCell className="px-10 py-6">
                              <span className="font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-lg italic tracking-widest shadow-sm">{code}</span>
                           </TableCell>
                           <TableCell className="font-black text-slate-900">{10 + i * 5}% OFF</TableCell>
                           <TableCell className="font-bold text-slate-500 text-sm">{120 + i * 42} Redemptions</TableCell>
                           <TableCell>
                              <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[8px] uppercase tracking-widest">Fixed Dec 2026</Badge>
                           </TableCell>
                           <TableCell>
                              <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                           </TableCell>
                           <TableCell className="px-10">
                              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-indigo-600">
                                 <MoreHorizontal />
                              </Button>
                           </TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="notifications">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10">
                 <CardTitle className="text-2xl font-black text-slate-900 tracking-tight mb-8">Send Announcement</CardTitle>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Audience</label>
                       <select className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20">
                          <option>Global Push (All Platforms)</option>
                          <option>Client Core Only</option>
                          <option>Merchant Terminal Only</option>
                          <option>Custom Segment</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Message Content</label>
                       <textarea className="w-full h-32 bg-slate-50 border-none rounded-2xl p-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 resize-none" placeholder="Enter broadcast message..."></textarea>
                    </div>
                    <Button className="w-full h-16 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/20">Send Message</Button>
                 </div>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                 <CardHeader className="p-8 border-b border-slate-50">
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Recent Announcements</CardTitle>
                 </CardHeader>
                 <div className="divide-y divide-slate-50">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-8 flex gap-6 items-start hover:bg-slate-50 transition-all cursor-pointer group">
                         <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Bell size={20} />
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                               <h4 className="font-black text-slate-900 uppercase italic">System Update</h4>
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">2h ago</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">New medical hub opening in Terminal North Sector 7...</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8 group hover:-translate-y-1 transition-all">
       <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors shadow-sm">{icon}</div>
          <Badge className="bg-slate-50 text-slate-400 font-black border-none text-[8px] uppercase tracking-widest">Campaign HQ</Badge>
       </div>
       <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">{title}</p>
       <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
    </Card>
  );
}
