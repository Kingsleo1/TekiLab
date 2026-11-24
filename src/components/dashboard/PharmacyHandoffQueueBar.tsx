import React, { useEffect, useState, useRef } from 'react';
import { FlaskConical, Pill, CheckCircle2, ArrowDownToLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PharmacyHandoffPayload } from '../../types/tekilab';
import {
  fetchPharmacyHandoffQueue,
  getLocalPharmacyHandoffQueue,
  updatePharmacyHandoffStatus
} from '../../lib/cross-module-handoff';
import { useTenantModules } from '../../context/TenantModuleContext';
import { toast } from 'sonner';

interface PharmacyHandoffQueueBarProps {
  onLoadSuggestionToCart: (item: PharmacyHandoffPayload, dryRun?: boolean) => boolean;
}

export function PharmacyHandoffQueueBar({
  onLoadSuggestionToCart
}: PharmacyHandoffQueueBarProps) {
  const { config, isModuleEnabled } = useTenantModules();
  const [queue, setQueue] = useState<PharmacyHandoffPayload[]>(() =>
    getLocalPharmacyHandoffQueue(config.tenantId)
  );

  useEffect(() => {
    if (!isModuleEnabled('pharmacy')) return;
    let active = true;
    fetchPharmacyHandoffQueue(config.tenantId).then(items => { if (active) setQueue(items); });

    const onUpdate = () => setQueue(getLocalPharmacyHandoffQueue(config.tenantId));
    window.addEventListener('tekilab_pharmacy_queue_updated', onUpdate);
    return () => { active = false; window.removeEventListener('tekilab_pharmacy_queue_updated', onUpdate); };
  }, [config.tenantId, isModuleEnabled]);

  const loading = useRef(false);
  const pendingItems = queue.filter((q) => q.tenantId === config.tenantId && q.status !== 'DISPENSED');
  if (!isModuleEnabled('pharmacy') || pendingItems.length === 0) return null;

  const handleLoad = async (item: PharmacyHandoffPayload) => {
    if (loading.current) return;
    loading.current = true;
    try {
      if (!onLoadSuggestionToCart(item, true)) return;
      const updated = await updatePharmacyHandoffStatus(item.handoffId, 'LOADED_IN_POS', config.tenantId);
      if (!onLoadSuggestionToCart(item)) toast.warning('Prescription reserved; review the cart before dispensing.');
      setQueue(updated);
    } catch (error: any) { toast.error(error.message); }
    finally { loading.current = false; }
  };

  const handleDispensed = async (handoffId: string) => {
    const updated = await updatePharmacyHandoffStatus(handoffId, 'DISPENSED', config.tenantId);
    setQueue(updated);
    toast.success(`Lab prescription ${handoffId} marked dispensed.`);
  };

  return (
    <div className="mb-3 bg-white text-slate-900 rounded-xl border border-slate-200 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <FlaskConical className="w-4 h-4" />
          <span>Clinician-approved prescriptions ({pendingItems.length})</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Cross-Module LIMS -&gt; Pharmacy Queue
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {pendingItems.slice(0, 4).map((item) => (
          <div
            key={item.handoffId}
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-900 truncate">{item.patientName}</span>
                <span className="font-mono text-[11px] text-slate-500">{item.accessionNumber}</span>
                {item.anomalySeverity === 'critical' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {item.aiSuggestedDrug.drugName} ({item.aiSuggestedDrug.dosage} ·{' '}
                  {item.aiSuggestedDrug.frequency})
                </span>
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Dx: {item.likelyDiagnosis}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => handleLoad(item)}
                disabled={item.status !== 'QUEUED'}
                className="h-8 px-3 bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5 cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Load POS
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="h-8 px-2.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                title="Dispensing is recorded after successful POS checkout"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
