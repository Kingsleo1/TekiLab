// =============================================================================
// TEKILAB LIMS — CORE MODULAR SAAS, RAPID WORKFLOW & CROSS-MODULE TYPES
// =============================================================================

export type TekiLabModuleKey =
  | 'lims'
  | 'emr'
  | 'hospital_management'
  | 'pharmacy'
  | 'billing'
  | 'ai_analytics';

export type TenantTierPreset =
  | 'lims_core'
  | 'lims_pharmacy'
  | 'lims_emr'
  | 'hospital_full';

export interface TenantFeatureToggles {
  /** Primary Core: Sample Lifecycle, Rapid Result Console, Instrument Hub, WhatsApp Dispatch */
  lims: boolean;
  /** Secondary: Patient EMR Consultations & Clinical Notes */
  emr: boolean;
  /** Secondary: Radiology, Inpatient Wards, Hospital Queue & Appointments */
  hospital_management: boolean;
  /** Secondary: Pharmacy POS, Multi-Batch Drug Inventory, Warehouse & Lab-to-Pharmacy Handoff */
  pharmacy: boolean;
  /** Secondary: Unified Hospital Charge Capture, HMO Claims & Financial Ledgers */
  billing: boolean;
  /** AI Anomaly Validation, Technician Protocol Chatbot & Predictive Equipment Maintenance */
  ai_analytics: boolean;
}

export interface TenantConfiguration {
  tenantId: string;
  tenantSlug: string;
  facilityName: string;
  subscriptionTier: TenantTierPreset;
  modules: TenantFeatureToggles;
  slaConfig: {
    rapidTurnaroundTargetMinutes: number;
    maxSlaMinutes: number;
    autoAiAnomalyCheck: boolean;
    requirePathologistSignoffOnCritical: boolean;
  };
  whatsappDispatch: {
    enabled: boolean;
    senderName: string;
    includeQrVerification: boolean;
    autoAttachPdf: boolean;
  };
  instrumentHub: {
    webhookEnabled: boolean;
    allowedInstruments: string[];
  };
  updatedBy?: string;
  updatedAt: string;
}

export interface RapidLabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical' | 'Positive' | 'Negative';
}

export interface AIAnomalyFlaggedParameter {
  parameter: string;
  value: string;
  referenceRange: string;
  deviation: string;
  clinicalNote: string;
}

export interface AISuggestedDrug {
  drugName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  rationale: string;
  contraindicationCheck: string;
}

export interface AIAnomalyCheckResult {
  anomalyDetected: boolean;
  severity: 'normal' | 'attention' | 'critical';
  likelyDiagnosis: string;
  clinicalSummary: string;
  flaggedParameters: AIAnomalyFlaggedParameter[];
  aiSuggestedDrug: AISuggestedDrug | null;
  checkedAt: string;
  model: string;
}

export interface RapidResultDispatchRecord {
  id: string;
  tenantId: string;
  accessionNumber: string;
  sampleBarcode: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientPhone: string;
  testName: string;
  category: string;
  sampleType: string;
  intakeSource: 'manual_entry' | 'barcode_scan' | 'instrument_webhook';
  instrumentId?: string;
  status: 'COLLECTED' | 'ANALYZING' | 'AI_CHECKED' | 'VALIDATED' | 'DISPATCHED';
  parameters: RapidLabParameter[];
  aiAnomalyReport?: AIAnomalyCheckResult;
  whatsappDispatch?: {
    dispatched: boolean;
    recipientPhone: string;
    pdfReportNumber: string;
    dispatchedAt: string;
    whatsappUrl: string;
    turnaroundSeconds: number;
    slaMet: boolean;
  };
  pharmacyHandoff?: {
    handedOff: boolean;
    handoffId: string;
    handedOffAt: string;
    pharmacyStatus: 'QUEUED' | 'LOADED_IN_POS' | 'DISPENSED';
  };
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
}

export interface PharmacyHandoffPayload {
  handoffId: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientPhone?: string;
  labResultId: string;
  accessionNumber: string;
  testName: string;
  testResultSummary: string;
  likelyDiagnosis: string;
  anomalySeverity: 'normal' | 'attention' | 'critical';
  aiSuggestedDrug: AISuggestedDrug;
  validatedBy: string;
  status: 'QUEUED' | 'LOADED_IN_POS' | 'DISPENSED';
  createdAt: string;
}

export interface InstrumentWebhookPacket {
  packetId: string;
  instrumentId: string;
  instrumentModel: string;
  accessionNumber: string;
  sampleBarcode: string;
  patientName?: string;
  testName: string;
  parameters: RapidLabParameter[];
  receivedAt: string;
  consumed?: boolean;
}

export interface LabEquipmentAsset {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  department: string;
  status: 'Operational' | 'Calibration Due' | 'Maintenance Scheduled';
  cyclesCompleted: number;
  cycleMaintenanceThreshold: number;
  lastCalibratedAt: string;
  predictedMaintenanceDate: string;
  uptimePercent: number;
}
