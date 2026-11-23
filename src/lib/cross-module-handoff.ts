import {
  AIAnomalyCheckResult,
  AISuggestedDrug,
  PharmacyHandoffPayload,
  TenantConfiguration
} from '../types/tekilab';

const PHARMACY_QUEUE_STORAGE_KEY = 'tekilab_pharmacy_handoff_queue_v2';

export interface LabToPharmacyHandoffInput {
  tenantId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientPhone?: string;
  labResultId: string;
  accessionNumber: string;
  testName: string;
  testResultSummary: string;
  aiReport: AIAnomalyCheckResult;
  overrideDrug?: AISuggestedDrug;
  validatedBy: string;
}

export interface HandoffExecutionResult {
  ok: boolean;
  reason?: 'PHARMACY_MODULE_MUTED' | 'MISSING_SUGGESTED_DRUG' | 'SERVER_ERROR';
  deliveryMode?: 'PHARMACY_POS_QUEUE' | 'BACKGROUND_E_PRESCRIPTION';
  message: string;
  payload?: PharmacyHandoffPayload;
}

/**
 * Reads all queued lab-to-pharmacy handoffs from local browser cache.
 */
export function getLocalPharmacyHandoffQueue(tenantId?: string): PharmacyHandoffPayload[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PHARMACY_QUEUE_STORAGE_KEY);
    const list: PharmacyHandoffPayload[] = raw ? JSON.parse(raw) : [];
    if (!tenantId) return list;
    return list.filter((item) => !item.tenantId || item.tenantId === tenantId);
  } catch {
    return [];
  }
}

function saveLocalPharmacyHandoffQueue(queue: PharmacyHandoffPayload[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PHARMACY_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('tekilab_pharmacy_queue_updated', { detail: queue }));
}

/**
 * Cross-Module Handoff Function:
 * Passes a validated lab result payload (Patient ID, Test Result, AI Suggested Drug)
 * into the Pharmacy backend queue. Even when the Pharmacy UI module is muted,
 * the backend hook stays 100% functional and stores a structured e-Prescription record.
 */
export async function handoffLabResultToPharmacyQueue(
  input: LabToPharmacyHandoffInput,
  tenantConfig: TenantConfiguration
): Promise<HandoffExecutionResult> {
  const isPharmacyUiActive = Boolean(tenantConfig.modules.pharmacy);
  const deliveryMode: 'PHARMACY_POS_QUEUE' | 'BACKGROUND_E_PRESCRIPTION' = isPharmacyUiActive
    ? 'PHARMACY_POS_QUEUE'
    : 'BACKGROUND_E_PRESCRIPTION';

  const suggestedDrug = input.overrideDrug || input.aiReport.aiSuggestedDrug;
  if (!suggestedDrug || !suggestedDrug.drugName) {
    return {
      ok: false,
      reason: 'MISSING_SUGGESTED_DRUG',
      message:
        'No AI-suggested medication is attached to this lab result. Run AI Anomaly Check or enter a therapeutic recommendation first.'
    };
  }

  // 2. Construct Typed Cross-Module Payload
  const payload: PharmacyHandoffPayload = {
    handoffId: `RX-LAB-${Date.now().toString(36).toUpperCase()}`,
    tenantId: input.tenantId,
    patientId: input.patientId,
    patientName: input.patientName,
    patientMrn: input.patientMrn,
    patientPhone: input.patientPhone,
    labResultId: input.labResultId,
    accessionNumber: input.accessionNumber,
    testName: input.testName,
    testResultSummary: input.testResultSummary,
    likelyDiagnosis: input.aiReport.likelyDiagnosis,
    anomalySeverity: input.aiReport.severity,
    aiSuggestedDrug: suggestedDrug,
    validatedBy: input.validatedBy,
    status: 'QUEUED',
    createdAt: new Date().toISOString()
  };

  // 3. Persist to Express/Astra Backend API Route
  try {
    const res = await fetch('/api/lims/handoff/pharmacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        pharmacyEnabled: tenantConfig.modules.pharmacy
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        ok: false,
        reason: 'SERVER_ERROR',
        message: errJson.error || `Pharmacy handoff rejected (HTTP ${res.status}).`
      };
    }
  } catch {
    // Allow resilient offline-first local queue persistence if network is temporarily offline
  }

  // 4. Sync to live Pharmacy Queue cache & broadcast event to POSView
  const currentQueue = getLocalPharmacyHandoffQueue();
  const deduped = [payload, ...currentQueue.filter((q) => q.handoffId !== payload.handoffId)];
  saveLocalPharmacyHandoffQueue(deduped);

  return {
    ok: true,
    deliveryMode,
    message: isPharmacyUiActive
      ? `Prescription order (${suggestedDrug.drugName}) queued in Pharmacy POS for ${input.patientName}.`
      : `e-Prescription (${suggestedDrug.drugName}) logged to backend Pharmacy queue for ${input.patientName} (Pharmacy UI currently muted).`,
    payload
  };
}

/**
 * Updates the dispensing status of a queued Lab-to-Pharmacy prescription handoff.
 */
export async function updatePharmacyHandoffStatus(
  handoffId: string,
  status: PharmacyHandoffPayload['status']
): Promise<PharmacyHandoffPayload[]> {
  const current = getLocalPharmacyHandoffQueue();
  const updated = current.map((item) =>
    item.handoffId === handoffId ? { ...item, status } : item
  );
  saveLocalPharmacyHandoffQueue(updated);

  try {
    await fetch(`/api/lims/handoff/pharmacy/${encodeURIComponent(handoffId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch {
    // Offline-first safe
  }

  return updated;
}

/**
 * Fetches latest Pharmacy Handoff Queue from server and merges with local cache.
 */
export async function fetchPharmacyHandoffQueue(
  tenantId: string
): Promise<PharmacyHandoffPayload[]> {
  const local = getLocalPharmacyHandoffQueue(tenantId);
  try {
    const res = await fetch(
      `/api/lims/handoff/pharmacy?tenantId=${encodeURIComponent(tenantId)}`
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.queue)) {
        const mergedMap = new Map<string, PharmacyHandoffPayload>();
        [...json.queue, ...local].forEach((item: PharmacyHandoffPayload) => {
          if (item?.handoffId) mergedMap.set(item.handoffId, item);
        });
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalPharmacyHandoffQueue(merged);
        return merged;
      }
    }
  } catch {
    // Fallback to local
  }
  return local;
}
