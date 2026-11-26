import React from 'react';
import {useSiteSettings} from '../../hooks/useSiteSettings';
export function DashboardFooter({logoUrl,companyName,onInstallApp,isInstalled}:{logoUrl?:string;companyName?:string;onInstallApp?:()=>void;isInstalled?:boolean}={}){
 const {settings}=useSiteSettings();
 return <footer className="w-full bg-white px-4 md:px-8 py-3 shrink-0 border-t border-slate-200">
  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
   <div className="flex items-center gap-3 min-w-0"><img src={logoUrl||settings.logoUrl||'/logo.png'} alt={companyName||settings.facilityName} className="h-9 w-24 object-contain" referrerPolicy="no-referrer"/><div><p className="font-bold text-slate-900">{companyName||settings.facilityName}</p><p className="text-[10px] text-slate-500">{settings.footerText}</p></div></div>
   <div className="text-center sm:text-right text-slate-500"><p>© {new Date().getFullYear()} {companyName||settings.facilityName}</p><div className="flex justify-center sm:justify-end gap-3 mt-1">{onInstallApp&&!isInstalled&&<button onClick={onInstallApp} className="font-semibold" style={{color:settings.accentColor}}>Download TekiLab App</button>}<a href="/book" className="hover:underline">Book tests & scans</a><a href="/schemas/tekilab-database-schema.json" className="hover:underline">Database schema</a></div></div>
  </div>
 </footer>;
}
