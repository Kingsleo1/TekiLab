import { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  ArrowUpRight, 
  Search, 
  MapPin, 
  Calendar, 
  Box, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiService } from '../../services/api';
import { Supplier } from '../../types/pharmacy';

export function B2BLogisticsView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    apiService.suppliers.list().then(setSuppliers);
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Supply Chain Matrix</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Global Procurement & Logistic Orchestrator</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           <Button className="flex-1 md:flex-none h-12 md:h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20">
              New Supply Order
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <MetricCard title="Awaiting Dispatch" value="08" icon={<Clock className="text-amber-500" />} />
         <MetricCard title="In-Transit Cargo" value="14" icon={<Truck className="text-blue-500" />} />
         <MetricCard title="Delivered Today" value="23" icon={<CheckCircle2 className="text-emerald-500" />} />
         <MetricCard title="Return Flow" value="02" icon={<ArrowUpRight className="text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50">
               <CardTitle className="text-2xl font-black text-slate-900 tracking-tight leading-none">Active Shipments</CardTitle>
               <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Real-time GPS Integrated Cargo Tracking</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-slate-50 transition-colors group cursor-pointer">
                       <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <Truck size={32} />
                       </div>
                       <div className="flex-1 w-full">
                          <div className="flex justify-between items-start mb-2">
                             <h4 className="text-lg font-black text-slate-900 tracking-tight">Shipment #TRK-882{i}</h4>
                             <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[8px] uppercase tracking-widest">In Transit</Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                             <span className="flex items-center gap-1.5"><MapPin size={12} className="text-blue-500" /> Lagos Distribution Hub</span>
                             <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber-500" /> ETA: 4.2 Hours</span>
                          </div>
                          <div className="mt-4 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600 rounded-full" style={{ width: `${60 + i * 10}%` }}></div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50">
               <CardTitle className="text-2xl font-black text-slate-900 tracking-tight leading-none">Preferred Suppliers</CardTitle>
               <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Verified B2B Supply Channels</CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-10">
               <div className="space-y-8">
                  {suppliers.map(supplier => (
                    <div key={supplier.id} className="flex items-center gap-6 group cursor-pointer">
                       <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {supplier.name[0]}
                       </div>
                       <div className="flex-1">
                          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors uppercase italic">{supplier.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                             <ShieldCheck size={12} className="text-emerald-500" /> Verified Merchant
                          </p>
                       </div>
                       <ArrowRight size={20} className="text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8 group hover:-translate-y-1 transition-all">
       <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">{icon}</div>
          <Badge className="bg-slate-50 text-slate-400 font-black border-none text-[8px] uppercase tracking-widest">Live Flux</Badge>
       </div>
       <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">{title}</p>
       <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
    </Card>
  );
}
