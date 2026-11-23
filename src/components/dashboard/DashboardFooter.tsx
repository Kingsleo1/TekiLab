import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function DashboardFooter({
  logoUrl,
  companyName
}: {
  logoUrl?: string;
  companyName?: string;
} = {}) {
  return (
    <footer className="w-full bg-white px-4 md:px-8 py-2.5 shrink-0 select-none border-t border-slate-200/80">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-6 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-lg bg-white px-2 py-0.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs overflow-hidden">
            <img src={logoUrl || '/logo.png?v=4'} alt={companyName || 'Teki Med Logo'} className="h-full w-full object-contain scale-105" />
          </div>
          <div>
            <p className="font-bold text-slate-900 tracking-tight leading-none text-xs">{companyName || 'Teki Med'}</p>
            <p className="text-[10px] text-slate-400 font-medium">Healthcare Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mainframe Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Secure Channel</span>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-end">
          <p className="text-[11px] text-slate-500 leading-none font-medium">© 2026 Teki Med • Unified Healthcare Management Platform</p>
          <div className="flex gap-3 mt-1">
             <a href="#" className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors">Audit Trail</a>
             <a href="#" className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors">Protocol Specs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

