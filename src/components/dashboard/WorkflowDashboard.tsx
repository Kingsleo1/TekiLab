import {useMemo} from 'react';
import {summarizeWorkflow} from '../../lib/workflow';
import {getRoleDefinition} from '../../config/roles';
import {FinancialOverview} from './FinancialOverview';
export function WorkflowDashboard({labs,imaging,tickets,charges,user,onNavigate,patients=[],encounters=[],staff=[],branches=[]}:{patients?:any[];encounters?:any[];staff?:any[];branches?:any[];labs:any[];imaging:any[];tickets:any[];charges:any[];user:any;onNavigate:(view:string)=>void}){
 const stats=useMemo(()=>summarizeWorkflow(labs,imaging,tickets,charges),[labs,imaging,tickets,charges]);
 const role=getRoleDefinition(user?.role),permissions=new Set([...role.permissions,...(user?.permissions||[])]);
 const finance=permissions.has('canManageBilling')||permissions.has('canViewBranchAnalytics');
 const metrics:[string,string|number,string][]=[
 ['Registered patients',patients.length,'patients'],['Consultations',encounters.length,'emr'],['Team members',staff.length,'admin_users'],['Facility branches',branches.length,'admin_merchants'],['Active queue',stats.activeQueue,'queue'],['Pending laboratory',stats.pendingLabs,'lab'],['Awaiting review',stats.awaitingReview,'lab'],['Pending scans',stats.pendingImaging,'radiology'],
 ['Released lab reports',stats.released,'lab'],['Average lab turnaround',stats.averageTat===null?'No completed timings':stats.averageTat.toFixed(1)+' min','lab'],['Within 10 minutes',stats.slaPercent===null?'No completed timings':stats.slaPercent+'%','lab']];
 const links=[['Staff & permissions','admin_users'],['Branches & facilities','admin_merchants'],['Consultations','emr'],['Appointments','appointments'],['Inpatient care','inpatient'],['Patient portal','patient_portal'],['Analytics & reports','admin_reports'],['Feature visibility','module_config'],['New test or scan','rapid_console'],['Laboratory worklist','lab'],['Radiology & scans','radiology'],['Bookings & reception','queue'],['Patient registry','patients'],...(finance?[['Business financials','financials']]:[])];
 return <div className="space-y-5"><section className="rounded-xl border bg-white text-slate-900 p-4 sm:p-6 space-y-4" aria-label="Clinical workflow analytics">
 <div><h1 className="text-3xl font-black">Lab Overview</h1><p className="text-sm text-slate-500">{role.shortLabel} · Current local records and recorded turnaround times</p></div>
 <nav aria-label="Lab overview shortcuts" className="flex flex-wrap gap-2">{links.map(([label,view])=><button key={view} onClick={()=>onNavigate(view)} className="border rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">{label}</button>)}</nav>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label,value,view])=><button key={label} onClick={()=>onNavigate(view)} className={"text-left rounded-xl border p-4 shadow-sm hover:shadow-md "+(["bg-blue-50 border-blue-200","bg-emerald-50 border-emerald-200","bg-violet-50 border-violet-200","bg-amber-50 border-amber-200"][metrics.findIndex(m=>m[0]===label)%4])}><span className="block text-xs text-slate-500">{label}</span><strong className="block mt-1 text-lg break-words">{value}</strong></button>)}</div>
 </section>{finance&&<FinancialOverview canManageBilling={permissions.has('canManageBilling')} charges={charges} onNavigate={onNavigate} compact/>}</div>;
}
