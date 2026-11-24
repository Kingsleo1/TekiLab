import { AIAnomalyCheckResult, AISuggestedDrug, PharmacyHandoffPayload, TenantConfiguration } from '../types/tekilab';
import { ClinicalEncounter } from '../types/pharmacy';
const KEY = 'tekilab_pharmacy_handoff_queue_v2';
export interface LabToPharmacyHandoffInput {
  tenantId: string; patientId: string; patientName: string; patientMrn: string; patientPhone?: string;
  labResultId: string; accessionNumber: string; testName: string; testResultSummary: string;
  aiReport: AIAnomalyCheckResult; overrideDrug?: AISuggestedDrug; validatedBy: string;
}
export interface HandoffExecutionResult {
  ok: boolean; reason?: 'SERVER_ERROR' | 'MISSING_SUGGESTED_DRUG' | 'PHARMACY_MODULE_MUTED';
  deliveryMode?: 'PHARMACY_POS_QUEUE' | 'BACKGROUND_E_PRESCRIPTION'; message: string; payload?: PharmacyHandoffPayload;
}
export type ClinicianHandoff = PharmacyHandoffPayload & {
  reportApproval?: import('./report-approval').ReportApproval;
  source: 'CLINICIAN_PRESCRIPTION'; prescriberId: string; prescriberName: string; prescribedAt: string; productId?: string;
};
export function getLocalPharmacyHandoffQueue(tenantId?: string): PharmacyHandoffPayload[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter(item => !tenantId || item.tenantId === tenantId) : [];
  } catch { return []; }
}
function save(queue: PharmacyHandoffPayload[]) {
  localStorage.setItem(KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('tekilab_pharmacy_queue_updated'));
}
function saveTenant(tenantId: string, queue: PharmacyHandoffPayload[]) {
  save([...getLocalPharmacyHandoffQueue().filter(item => item.tenantId !== tenantId), ...queue]);
}
// AI findings can be referred to a clinician; they are never prescriptions.
export async function handoffLabResultToPharmacyQueue(_input: LabToPharmacyHandoffInput, _config: TenantConfiguration): Promise<HandoffExecutionResult> {
  return { ok: false, reason: 'SERVER_ERROR', message: 'A clinician must independently prescribe from the consultation view.' };
}
export async function queueClinicianPrescriptions(encounter: ClinicalEncounter, user: any, config: TenantConfiguration) {
  if (encounter.status !== 'Completed' || !encounter.prescriptions?.length) return;
  if (!user?.id || !/doctor|physician|consult|kernel admin|^admin$/i.test(user.role || '')) throw Error('An authorized clinician must approve prescriptions.');
  for (const rx of encounter.prescriptions) {
    if (!rx.drugName?.trim() || !rx.dosage?.trim() || !rx.frequency?.trim() || !Number.isInteger(rx.quantity) || rx.quantity < 1 || !Number.isInteger(rx.durationDays) || rx.durationDays < 1) throw Error('Complete every prescription dose, frequency, duration and quantity.');
    const payload: ClinicianHandoff = {
      handoffId: 'RX-' + encounter.id + '-' + rx.id, tenantId: config.tenantId, patientId: encounter.patientId,
      patientName: encounter.patientName, patientMrn: encounter.mrn, labResultId: encounter.id, accessionNumber: encounter.id,
      testName: 'Clinical prescription', testResultSummary: encounter.primaryDiagnosis, likelyDiagnosis: encounter.primaryDiagnosis,
      anomalySeverity: 'attention', aiSuggestedDrug: { drugName: rx.drugName, genericName: rx.genericName || '', dosage: rx.dosage,
        frequency: rx.frequency, durationDays: rx.durationDays, quantity: rx.quantity, rationale: rx.instructions || 'Clinician prescription',
        contraindicationCheck: 'Pharmacist must independently check allergies, interactions and contraindications.' },
      reportApproval: encounter.reportApproval,
      validatedBy: user.name || user.displayName, source: 'CLINICIAN_PRESCRIPTION', prescriberId: user.id,
      prescriberName: user.name || user.displayName, prescribedAt: encounter.completedAt || new Date().toISOString(),
      productId: rx.productId, status: 'QUEUED', createdAt: new Date().toISOString()
    };
    const res = await fetch('/api/lims/handoff/pharmacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, pharmacyEnabled: config.modules.pharmacy }) });
    if (!res.ok) throw Error('Prescription handoff was not accepted. Retry to complete the consultation.');
  }
  await fetchPharmacyHandoffQueue(config.tenantId);
}
export async function fetchPharmacyHandoffQueue(tenantId: string): Promise<PharmacyHandoffPayload[]> {
  try {
    const res = await fetch('/api/lims/handoff/pharmacy?tenantId=' + encodeURIComponent(tenantId));
    if (!res.ok) throw Error('Queue unavailable');
    const data = await res.json();
    if (!Array.isArray(data.queue)) throw Error('Invalid queue');
    const merged = new Map(getLocalPharmacyHandoffQueue(tenantId).map(item => [item.handoffId, item]));
    data.queue.filter((item: PharmacyHandoffPayload) => item.tenantId === tenantId).forEach((item: PharmacyHandoffPayload) => merged.set(item.handoffId, item));
    const queue = Array.from(merged.values());
    saveTenant(tenantId, queue);
    return queue;
  } catch { return getLocalPharmacyHandoffQueue(tenantId); }
}
export async function updatePharmacyHandoffStatus(handoffId: string, status: PharmacyHandoffPayload['status'], tenantId?: string) {
  const item = getLocalPharmacyHandoffQueue(tenantId).find(i => i.handoffId === handoffId);
  if (!item || !tenantId) throw Error('Prescription not found for this tenant.');
  const res = await fetch('/api/lims/handoff/pharmacy/' + encodeURIComponent(handoffId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, tenantId })
  });
  if (!res.ok) throw Error('Prescription status was not saved. Retry after reconnecting.');
  const queue = getLocalPharmacyHandoffQueue(tenantId).map(i => i.handoffId === handoffId ? { ...i, status } : i);
  saveTenant(tenantId, queue); return queue;
}
