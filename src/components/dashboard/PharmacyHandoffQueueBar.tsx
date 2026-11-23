import React, { useEffect, useState } from 'react';
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
  onLoadSuggestionToCart: (item: PharmacyHandoffPayload) => void;
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
    fetchPharmacyHandoffQueue(config.tenantId).then(setQueue);

    const onUpdate = () => setQueue(getLocalPharmacyHandoffQueue(config.tenantId));
    window.addEventListener('tekilab_pharmacy_queue_updated', onUpdate);
    return () => window.removeEventListener('tekilab_pharmacy_queue_updated', onUpdate);
  }, [config.tenantId, isModuleEnabled]);

  const pendingItems = queue.filter((q) => q.status !== 'DISPENSED');
  if (!isModuleEnabled('pharmacy') || pendingItems.length === 0) return null;

  const handleLoad = async (item: PharmacyHandoffPayload) => {
    onLoadSuggestionToCart(item);
    const updated = await updatePharmacyHandoffStatus(item.handoffId, 'LOADED_IN_POS');
    setQueue(updated);
  };

  const handleDispensed = async (handoffId: string) => {
    const updated = await updatePharmacyHandoffStatus(handoffId, 'DISPENSED');
    setQueue(updated);
    toast.success(`Lab prescription ${handoffId} marked dispensed.`);
  };

  return (
    <div className="mb-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
          <FlaskConical className="w-4 h-4" />
          <span>Incoming TekiLab Prescription Handoffs ({pendingItems.length})</span>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">
          Cross-Module LIMS -&gt; Pharmacy Queue
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {pendingItems.slice(0, 4).map((item) => (
          <div
            key={item.handoffId}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-white truncate">{item.patientName}</span>
                <span className="font-mono text-[11px] text-neutral-400">{item.accessionNumber}</span>
                {item.anomalySeverity === 'critical' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {item.aiSuggestedDrug.drugName} ({item.aiSuggestedDrug.dosage} ·{' '}
                  {item.aiSuggestedDrug.frequency})
                </span>
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                Dx: {item.likelyDiagnosis}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => handleLoad(item)}
                className="h-8 px-3 bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5 cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Load POS
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDispensed(item.handoffId)}
                className="h-8 px-2.5 bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs cursor-pointer"
                title="Mark as Dispensed"
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
