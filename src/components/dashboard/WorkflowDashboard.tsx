import { useMemo } from 'react';
import { summarizeWorkflow } from '../../lib/workflow';
import { getRoleDefinition } from '../../config/roles';
export function WorkflowDashboard({ labs, imaging, tickets, charges, user, onNavigate }: {
  labs: any[]; imaging: any[]; tickets: any[]; charges: any[]; user: any; onNavigate: (view: string) => void;
}) {
  const stats = useMemo(() => summarizeWorkflow(labs, imaging, tickets, charges), [labs, imaging, tickets, charges]);
  const role = getRoleDefinition(user?.role);
  const metrics: [string, string | number, string][] = [
    ['Active queue', stats.activeQueue, 'queue'], ['Pending laboratory', stats.pendingLabs, 'lab'],
    ['Awaiting review', stats.awaitingReview, 'lab'], ['Pending scans', stats.pendingImaging, 'radiology'],
    ['Released lab reports', stats.released, 'lab'], ['Average lab turnaround', stats.averageTat === null ? 'No completed timings' : stats.averageTat.toFixed(1) + ' min', 'lab'],
    ['Within 10 minutes', stats.slaPercent === null ? 'No completed timings' : stats.slaPercent + '%', 'lab']
  ];
  if (role.permissions.includes('canManageBilling')) metrics.push(['Collected', 'NGN ' + stats.collected.toLocaleString(), 'billing'], ['Outstanding', 'NGN ' + stats.outstanding.toLocaleString(), 'billing']);
  return <section className="rounded-xl border bg-white text-slate-900 p-4 space-y-4" aria-label="Clinical workflow analytics">
    <div><h2 className="text-lg font-semibold">{role.shortLabel} workflow dashboard</h2><p className="text-xs text-slate-500">Current local records. Turnaround uses recorded creation and release times.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label,value,view]) =>
      <button key={label} onClick={() => onNavigate(view)} className="text-left rounded-lg border p-3 hover:bg-slate-50"><span className="block text-xs text-slate-500">{label}</span><strong className="block mt-1 text-lg break-words">{value}</strong></button>)}</div>
  </section>;
}
