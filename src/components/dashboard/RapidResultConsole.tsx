import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FlaskConical,
  ScanLine,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Pill,
  Clock,
  RefreshCw,
  FileDown,
  Plus,
  Trash2,
  Activity,
  Wrench,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ArrowRight,
  Lock
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { LabOrder, LabTestCatalogItem, PatientRecord } from '../../types/pharmacy';
import {
  AIAnomalyCheckResult,
  InstrumentWebhookPacket,
  LabEquipmentAsset,
  RapidLabParameter,
  RapidResultDispatchRecord
} from '../../types/tekilab';
import { useTenantModules, ModuleGuard } from '../../context/TenantModuleContext';
import { handoffLabResultToPharmacyQueue } from '../../lib/cross-module-handoff';
import { generateLabReportPDF } from '../../lib/reporting-utils';

interface RapidResultConsoleProps {
  labOrders: LabOrder[];
  labCatalog: LabTestCatalogItem[];
  patients: PatientRecord[];
  onUpdateLabOrder: (order: LabOrder) => void;
  onNavigate?: (view: string) => void;
  currentUser?: any;
  companyLogo?: string;
}

const DEFAULT_LAB_EQUIPMENT: LabEquipmentAsset[] = [
  {
    id: 'eq-1',
    name: 'Sysmex XN-550 Hematology',
    model: 'XN-550 Automated 6-Part Diff',
    serialNumber: 'SYS-XN550-01',
    department: 'Haematology',
    status: 'Operational',
    cyclesCompleted: 1420,
    cycleMaintenanceThreshold: 2000,
    lastCalibratedAt: '2026-11-18',
    predictedMaintenanceDate: '2026-12-14',
    uptimePercent: 99.6
  },
  {
    id: 'eq-2',
    name: 'Roche Cobas c 311 Chemistry',
    model: 'Cobas c 311 Clinical Chemistry',
    serialNumber: 'ROCHE-C311-02',
    department: 'Clinical Chemistry',
    status: 'Calibration Due',
    cyclesCompleted: 1845,
    cycleMaintenanceThreshold: 2000,
    lastCalibratedAt: '2026-10-29',
    predictedMaintenanceDate: '2026-11-26',
    uptimePercent: 98.4
  },
  {
    id: 'eq-3',
    name: 'Mindray BC-5000 Backup Unit',
    model: 'BC-5000 Auto Hematology',
    serialNumber: 'MINDRAY-BC5000',
    department: 'Haematology',
    status: 'Operational',
    cyclesCompleted: 640,
    cycleMaintenanceThreshold: 1500,
    lastCalibratedAt: '2026-11-20',
    predictedMaintenanceDate: '2027-01-19',
    uptimePercent: 99.9
  },
  {
    id: 'eq-4',
    name: 'Abbott ARCHITECT i1000SR',
    model: 'Chemiluminescent Immunoassay',
    serialNumber: 'ABBOTT-I1000SR',
    department: 'Immunology & Serology',
    status: 'Maintenance Scheduled',
    cyclesCompleted: 2390,
    cycleMaintenanceThreshold: 2500,
    lastCalibratedAt: '2026-10-15',
    predictedMaintenanceDate: '2026-11-24',
    uptimePercent: 96.8
  }
];

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function SampleScannerModal({
  open,
  onOpenChange,
  onDecoded
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecoded: (code: string) => void;
}) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!open) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const el = document.getElementById('tekilab-sample-scanner');
      if (!el) return;
      const scanner = new Html5QrcodeScanner(
        'tekilab-sample-scanner',
        { fps: 10, qrbox: { width: 240, height: 240 } },
        false
      );
      scanner.render(
        (decodedText) => {
          onDecoded(decodedText.trim());
          scanner.clear().catch(() => {});
          onOpenChange(false);
        },
        () => {}
      );
      scannerRef.current = scanner;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onDecoded, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-neutral-200 p-0 overflow-hidden">
        <div className="bg-neutral-950 text-white px-5 py-4 border-b border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              Scan Sample Barcode or QR
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Center the specimen tube barcode or accession QR label within the optical frame.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-5 space-y-3">
          <div
            id="tekilab-sample-scanner"
            className="rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50"
          />
          <p className="text-xs text-neutral-500 text-center font-mono">
            Supported: Code 128 · QR · EAN-13 · DataMatrix
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RapidResultConsole({
  labOrders,
  labCatalog,
  patients,
  onUpdateLabOrder,
  onNavigate,
  currentUser,
  companyLogo = '/logo.png?v=4'
}: RapidResultConsoleProps) {
  const { config, isModuleEnabled } = useTenantModules();

  // Left-rail sub-panel mode
  const [leftTab, setLeftTab] = useState<'queue' | 'instruments' | 'maintenance'>('queue');
  const [scanInput, setScanInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Active specimen & patient state
  const initialOrder = labOrders[0] || null;
  const [activeOrderId, setActiveOrderId] = useState<string>(initialOrder?.id || '');
  const [accessionNumber, setAccessionNumber] = useState<string>(
    initialOrder?.accessionNumber || 'ACC-2026-9041'
  );
  const [sampleBarcode, setSampleBarcode] = useState<string>(
    initialOrder ? `TLAB-${initialOrder.accessionNumber.slice(-4)}-EDTA` : 'TLAB-9041-EDTA'
  );
  const [patientId, setPatientId] = useState<string>(
    initialOrder?.patientId || patients[0]?.id || 'PAT-001'
  );
  const [patientName, setPatientName] = useState<string>(
    initialOrder?.patientName || patients[0]?.fullName || 'Chinedu Okafor'
  );
  const [patientMrn, setPatientMrn] = useState<string>(
    initialOrder?.mrn || patients[0]?.mrn || 'TL-2026-0101'
  );
  const [patientPhone, setPatientPhone] = useState<string>(
    initialOrder?.patientPhone || patients[0]?.phone || '+234 803 123 4567'
  );
  const [testName, setTestName] = useState<string>(
    initialOrder?.testName || 'Complete Blood Count (CBC) + Malaria Parasite'
  );
  const [sampleType, setSampleType] = useState<string>(
    initialOrder?.sampleType || 'EDTA Venous Blood'
  );
  const [intakeSource, setIntakeSource] = useState<
    'manual_entry' | 'barcode_scan' | 'instrument_webhook'
  >('barcode_scan');
  const [activeInstrumentId, setActiveInstrumentId] = useState<string>('');

  // Structured analyte parameters
  const [parameters, setParameters] = useState<RapidLabParameter[]>([
    { name: 'Hemoglobin (Hb)', value: '9.4', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'Low' },
    { name: 'White Blood Cell (WBC)', value: '14.8', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'High' },
    { name: 'Platelets', value: '112', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'Low' },
    {
      name: 'Malaria Parasite (P. falciparum)',
      value: 'Positive (+++)',
      unit: 'Trophozoites',
      referenceRange: 'Negative',
      flag: 'Positive'
    }
  ]);

  // 5-Minute SLA stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);

  // Instrument API Hub packets
  const [instrumentPackets, setInstrumentPackets] = useState<InstrumentWebhookPacket[]>([]);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);
  const [isSimulatingPush, setIsSimulatingPush] = useState(false);

  // AI Anomaly Check state
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<AIAnomalyCheckResult | null>(null);

  // WhatsApp Dispatch & Persistence state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchRecord, setDispatchRecord] = useState<RapidResultDispatchRecord | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Cross-module Pharmacy Handoff state
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [handoffId, setHandoffId] = useState<string | null>(null);

  const slaTargetSeconds = (config.slaConfig.rapidTurnaroundTargetMinutes || 5) * 60;
  const maxSlaSeconds = (config.slaConfig.maxSlaMinutes || 10) * 60;

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const fetchInstrumentInbox = async () => {
    setIsLoadingInstruments(true);
    try {
      const res = await fetch('/api/lims/instruments/inbox');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.packets)) {
          setInstrumentPackets(json.packets);
        }
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setIsLoadingInstruments(false);
    }
  };

  useEffect(() => {
    fetchInstrumentInbox();
  }, []);

  const matchedPatient = useMemo(
    () =>
      patients.find(
        (p) =>
          p.id === patientId ||
          p.mrn === patientMrn ||
          p.fullName.toLowerCase() === patientName.toLowerCase()
      ),
    [patients, patientId, patientMrn, patientName]
  );

  // Load an existing LabOrder into the Rapid Result Console
  const loadOrderIntoConsole = (order: LabOrder, source: 'barcode_scan' | 'manual_entry' = 'barcode_scan') => {
    const pat = patients.find((p) => p.id === order.patientId || p.mrn === order.mrn);
    const catalogItem = labCatalog.find((c) => c.id === order.testId);

    setActiveOrderId(order.id);
    setAccessionNumber(order.accessionNumber);
    setSampleBarcode(`TLAB-${order.accessionNumber.replace(/[^0-9A-Z]/gi, '').slice(-6)}`);
    setPatientId(order.patientId);
    setPatientName(order.patientName);
    setPatientMrn(order.mrn);
    setPatientPhone(pat?.phone || pat?.whatsapp || order.patientPhone || '+234 803 123 4567');
    setTestName(order.testName);
    setSampleType(order.sampleType || 'Venous Blood');
    setIntakeSource(source);
    setActiveInstrumentId('');
    setAiReport(null);
    setAiError(null);
    setDispatchRecord(null);
    setHandoffId(null);
    setElapsedSeconds(0);
    setTimerRunning(true);

    if (order.results && Object.keys(order.results).length > 0) {
      setParameters(
        Object.entries(order.results).map(([name, val]) => ({
          name,
          value: String(val.value ?? ''),
          unit: val.unit || '',
          referenceRange: val.referenceRange || 'Normal',
          flag: val.flag || 'Normal'
        }))
      );
    } else if (catalogItem?.parameters && catalogItem.parameters.length > 0) {
      setParameters(
        catalogItem.parameters.map((p) => ({
          name: p.name,
          value: '',
          unit: p.unit || '',
          referenceRange: p.referenceRange || 'Normal',
          flag: 'Normal'
        }))
      );
    } else {
      setParameters([
        { name: 'Primary Analyte Reading', value: '', unit: '', referenceRange: 'Within Reference', flag: 'Normal' }
      ]);
    }

    toast.success(`Loaded sample ${order.accessionNumber} — 5-minute SLA timer started.`);
  };

  // Load a live analyzer webhook packet directly into the console
  const loadInstrumentPacket = (pkt: InstrumentWebhookPacket) => {
    const existingOrder = labOrders.find(
      (o) => o.accessionNumber.toLowerCase() === pkt.accessionNumber.toLowerCase()
    );
    const pat =
      patients.find((p) => p.id === existingOrder?.patientId) ||
      patients.find((p) => pkt.patientName && p.fullName.toLowerCase().includes(pkt.patientName.toLowerCase())) ||
      patients[0];

    setActiveOrderId(existingOrder?.id || '');
    setAccessionNumber(pkt.accessionNumber);
    setSampleBarcode(pkt.sampleBarcode);
    setPatientId(pat?.id || 'PAT-INST');
    setPatientName(pkt.patientName || pat?.fullName || 'Walk-in Diagnostic Patient');
    setPatientMrn(pat?.mrn || 'TL-2026-INST');
    setPatientPhone(pat?.phone || pat?.whatsapp || '+234 803 123 4567');
    setTestName(pkt.testName);
    setSampleType('Automated Analyzer Specimen');
    setIntakeSource('instrument_webhook');
    setActiveInstrumentId(`${pkt.instrumentId} (${pkt.instrumentModel})`);
    setParameters(pkt.parameters);
    setAiReport(null);
    setAiError(null);
    setDispatchRecord(null);
    setHandoffId(null);
    setElapsedSeconds(0);
    setTimerRunning(true);

    toast.success(`Imported analyzer telemetry from ${pkt.instrumentId} for ${pkt.accessionNumber}.`);
  };

  // Lookup by scanned barcode or accession number
  const handleBarcodeLookup = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setScanInput(clean);

    // 1. Check live instrument inbox first
    const matchedPacket = instrumentPackets.find(
      (p) =>
        p.accessionNumber.toLowerCase() === clean.toLowerCase() ||
        p.sampleBarcode.toLowerCase() === clean.toLowerCase()
    );
    if (matchedPacket) {
      loadInstrumentPacket(matchedPacket);
      return;
    }

    // 2. Check existing lab orders
    const matchedOrder = labOrders.find(
      (o) =>
        o.accessionNumber.toLowerCase().includes(clean.toLowerCase()) ||
        o.mrn.toLowerCase() === clean.toLowerCase() ||
        o.patientName.toLowerCase().includes(clean.toLowerCase())
    );
    if (matchedOrder) {
      loadOrderIntoConsole(matchedOrder, 'barcode_scan');
      return;
    }

    // 3. Treat as newly scanned walk-in rapid specimen
    setAccessionNumber(clean.toUpperCase());
    setSampleBarcode(clean.toUpperCase());
    setIntakeSource('barcode_scan');
    setAiReport(null);
    setDispatchRecord(null);
    setHandoffId(null);
    setElapsedSeconds(0);
    setTimerRunning(true);
    toast.info(`New specimen barcode ${clean.toUpperCase()} initialized in Rapid Console.`);
  };

  // Push a real simulated packet into POST /api/lims/instruments/webhook
  const handleSimulateAnalyzerWebhook = async () => {
    setIsSimulatingPush(true);
    try {
      const codeSuffix = Math.floor(4000 + Math.random() * 5000);
      const res = await fetch('/api/lims/instruments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrumentId: 'ROCHE-C311-02',
          instrumentModel: 'Roche Cobas c 311 Clinical Chemistry',
          accessionNumber: `ACC-2026-${codeSuffix}`,
          sampleBarcode: `TLAB-${codeSuffix}-SERUM`,
          patientName: patients[0]?.fullName || 'Ngozi Adeyemi',
          testName: 'Acute Bacterial UTI & Renal Urinalysis Panel',
          parameters: [
            { name: 'Urine Leukocyte Esterase', value: 'Positive (3+)', unit: 'Cells/uL', referenceRange: 'Negative', flag: 'Positive' },
            { name: 'Urine Nitrites', value: 'Positive', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Positive' },
            { name: 'C-Reactive Protein (CRP)', value: '68.4', unit: 'mg/L', referenceRange: '< 5.0', flag: 'High' },
            { name: 'Serum Creatinine', value: '1.04', unit: 'mg/dL', referenceRange: '0.60 - 1.20', flag: 'Normal' }
          ]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Webhook push failed');
      }
      const data = await res.json();
      await fetchInstrumentInbox();
      if (data?.packet) {
        loadInstrumentPacket(data.packet);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to push analyzer webhook packet.');
    } finally {
      setIsSimulatingPush(false);
    }
  };

  // Step 3: Run Real Server-Side Gemini AI Anomaly Check
  const handleRunAIAnomalyCheck = async () => {
    const nonEmptyParams = parameters.filter((p) => p.name.trim() && String(p.value).trim());
    if (nonEmptyParams.length === 0) {
      toast.error('Enter at least one measured parameter value before running AI validation.');
      return;
    }

    setIsAnalyzingAI(true);
    setAiError(null);

    try {
      const ageYears = matchedPatient?.dob
        ? Math.max(0, new Date().getFullYear() - new Date(matchedPatient.dob).getFullYear())
        : 36;

      const res = await fetch('/api/lims/rapid-result/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessionNumber,
          testName,
          sampleType,
          patient: {
            ageYears,
            sex: matchedPatient?.sex || 'Unknown',
            allergies: matchedPatient?.allergies || [],
            chronicConditions: matchedPatient?.chronicConditions || []
          },
          parameters: nonEmptyParams
        })
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `AI analysis failed (HTTP ${res.status})`);
      }

      setAiReport(data.analysis);
      toast.success(
        data.analysis.anomalyDetected
          ? `AI Anomaly Check flagged ${data.analysis.severity.toUpperCase()} findings.`
          : 'AI Anomaly Check completed: readings within expected baselines.'
      );
    } catch (err: any) {
      const msg = err?.message || 'Unable to reach Gemini AI validation service.';
      setAiError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Step 4: Validate, Persist to Astra/Backend, Generate PDF & Trigger WhatsApp Dispatch
  const handleValidateAndDispatchWhatsApp = async () => {
    if (!accessionNumber.trim() || !patientName.trim()) {
      toast.error('Accession number and patient name are required.');
      return;
    }

    setIsDispatching(true);
    try {
      const res = await fetch('/api/lims/rapid-result/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: config.tenantId,
          accessionNumber,
          sampleBarcode,
          patientId,
          patientName,
          patientMrn,
          patientPhone,
          testName,
          sampleType,
          intakeSource,
          instrumentId: activeInstrumentId || undefined,
          parameters,
          aiAnomalyReport: aiReport,
          validatedBy: currentUser?.name || currentUser?.displayName || 'TekiLab Lead Scientist',
          turnaroundSeconds: Math.max(1, elapsedSeconds)
        })
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Dispatch failed');
      }

      setTimerRunning(false);
      setDispatchRecord(data.record);

      // Update parent LabOrder state so LIMS worklist stays in sync
      const structuredResults: LabOrder['results'] = {};
      parameters.forEach((p) => {
        if (p.name.trim()) {
          structuredResults[p.name] = {
            value: p.value,
            unit: p.unit,
            referenceRange: p.referenceRange,
            flag: p.flag
          };
        }
      });

      const existingOrder = labOrders.find((o) => o.id === activeOrderId || o.accessionNumber === accessionNumber);
      if (existingOrder) {
        onUpdateLabOrder({
          ...existingOrder,
          orderStatus: 'RELEASED',
          sampleStatus: 'Completed',
          results: structuredResults,
          likelyIssue: aiReport?.likelyDiagnosis || existingOrder.likelyIssue || 'Verified Result',
          clinicalInterpretation: aiReport?.clinicalSummary || existingOrder.clinicalInterpretation,
          validatedByName: currentUser?.name || 'TekiLab Lead Scientist',
          validatedAt: new Date().toISOString(),
          releasedAt: new Date().toISOString(),
          whatsappSentAt: new Date().toISOString(),
          reportNumber: data.pdfReportNumber
        });
      }

      // Immediately trigger local branded TekiLab PDF download
      await generateLabReportPDF(
        {
          accessionNumber,
          patientName,
          mrn: patientMrn,
          patientPhone,
          sampleType,
          testName,
          reportNumber: data.pdfReportNumber,
          results: structuredResults,
          likelyIssue: aiReport?.likelyDiagnosis || 'Verified Diagnostic Panel',
          clinicalInterpretation:
            aiReport?.clinicalSummary || 'Validated via TekiLab 5-Minute Rapid Result Console.',
          validatedByName: currentUser?.name || 'TekiLab Lead Scientist'
        },
        matchedPatient,
        companyLogo
      );

      toast.success(
        `Report ${data.pdfReportNumber} validated & PDF generated in ${formatElapsedTime(elapsedSeconds)}. Ready for WhatsApp delivery.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to validate and dispatch result.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Cross-Module Handoff: Send Validated Result + AI Suggested Drug to Pharmacy Queue
  const handlePrescribeToPharmacy = async () => {
    if (!aiReport) {
      toast.error('Run AI Anomaly Check first to generate the clinical drug recommendation.');
      return;
    }

    setIsHandingOff(true);
    try {
      const summaryText = parameters
        .map((p) => `${p.name}: ${p.value} ${p.unit} (${p.flag})`)
        .join('; ');

      const result = await handoffLabResultToPharmacyQueue(
        {
          tenantId: config.tenantId,
          patientId,
          patientName,
          patientMrn,
          patientPhone,
          labResultId: dispatchRecord?.id || activeOrderId || `lab-${Date.now()}`,
          accessionNumber,
          testName,
          testResultSummary: summaryText,
          aiReport,
          validatedBy: currentUser?.name || 'TekiLab Lead Scientist'
        },
        config
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setHandoffId(result.payload?.handoffId || null);
      toast.success(result.message);
    } finally {
      setIsHandingOff(false);
    }
  };

  const addParameterRow = () => {
    setParameters((prev) => [
      ...prev,
      { name: '', value: '', unit: '', referenceRange: '', flag: 'Normal' }
    ]);
  };

  const removeParameterRow = (index: number) => {
    setParameters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateParameter = (index: number, patch: Partial<RapidLabParameter>) => {
    setParameters((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const slaRatio = Math.min(100, (elapsedSeconds / slaTargetSeconds) * 100);
  const slaState =
    elapsedSeconds <= slaTargetSeconds
      ? 'Within 5m Target'
      : elapsedSeconds <= maxSlaSeconds
        ? 'Within 10m SLA'
        : 'SLA Exceeded';

  const lifecycleSteps = [
    { label: 'Sample Scan', done: Boolean(accessionNumber) },
    { label: 'Data Capture', done: parameters.some((p) => String(p.value).trim().length > 0) },
    { label: 'AI Anomaly Check', done: Boolean(aiReport) },
    { label: 'WhatsApp PDF Dispatch', done: Boolean(dispatchRecord) }
  ];

  return (
    <div className="space-y-6 font-sans text-neutral-950">
      {/* Top Rapid SLA Telemetry Header (Obsidian Black + TekiLab Green) */}
      <div className="bg-neutral-950 text-white rounded-xl border border-neutral-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="text-green-400 font-semibold">TekiLab Rapid LIMS</span>
              <span aria-hidden="true">·</span>
              <span>{config.facilityName}</span>
              <span aria-hidden="true">·</span>
              <span>Target SLA {config.slaConfig.rapidTurnaroundTargetMinutes} min</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Rapid Result Console
            </h1>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Scan specimen barcode or ingest diagnostic analyzer webhooks, run Gemini AI anomaly checks, and dispatch verified PDF reports via WhatsApp in under 5 minutes.
            </p>
          </div>

          {/* Live SLA Stopwatch & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 min-w-[190px]">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span>Turnaround Timer</span>
                <span
                  className={
                    elapsedSeconds <= slaTargetSeconds
                      ? 'text-green-400 font-medium'
                      : elapsedSeconds <= maxSlaSeconds
                        ? 'text-amber-400 font-medium'
                        : 'text-red-400 font-medium'
                  }
                >
                  {slaState}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-2xl font-mono font-semibold tabular-nums text-white">
                  {formatElapsedTime(elapsedSeconds)}
                </span>
                <span className="text-xs font-mono tabular-nums text-neutral-500">
                  / {formatElapsedTime(slaTargetSeconds)}
                </span>
              </div>
              <div className="mt-2 h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    elapsedSeconds <= slaTargetSeconds
                      ? 'bg-green-500'
                      : elapsedSeconds <= maxSlaSeconds
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${slaRatio}%` }}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="h-10 px-4 bg-green-600 hover:bg-green-500 text-white font-medium text-xs gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              Scan Barcode
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSimulateAnalyzerWebhook}
              disabled={isSimulatingPush}
              className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700 font-medium text-xs gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-green-400" />
              {isSimulatingPush ? 'Pushing Telemetry...' : 'Simulate Analyzer Push'}
            </Button>
          </div>
        </div>

        {/* 4-Step Workflow Progress Bar */}
        <div className="mt-5 pt-4 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {lifecycleSteps.map((step, idx) => (
            <div key={step.label} className="flex items-center gap-2.5 text-xs">
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 ${
                  step.done
                    ? 'bg-green-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                {step.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span className={step.done ? 'text-white font-medium' : 'text-neutral-400'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Asymmetric Split Console */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Sample Lookup, Queue, Instrument Hub & Predictive Maintenance */}
        <div className="xl:col-span-4 space-y-4">
          {/* Quick Barcode / Accession Search Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
            <label className="text-xs font-semibold text-neutral-900 block">
              Barcode / Accession Rapid Intake
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBarcodeLookup(scanInput);
              }}
              className="flex gap-2"
            >
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type ACC-2026-9041..."
                className="h-9 text-xs font-mono bg-neutral-50 border-neutral-200"
              />
              <Button
                type="submit"
                className="h-9 px-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load
              </Button>
            </form>

            {/* Segmented Mode Filter */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLeftTab('queue')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  leftTab === 'queue'
                    ? 'bg-white text-neutral-950 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                Worklist ({labOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('instruments')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  leftTab === 'instruments'
                    ? 'bg-white text-neutral-950 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                Analyzers ({instrumentPackets.length})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('maintenance')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  leftTab === 'maintenance'
                    ? 'bg-white text-neutral-950 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                Equipment
              </button>
            </div>
          </div>

          {/* Left Tab Content */}
          {leftTab === 'queue' && (
            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-[540px] overflow-y-auto">
              {labOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No pending specimens in queue. Scan a barcode or push from an analyzer.
                </div>
              ) : (
                labOrders.map((order) => {
                  const selected = order.accessionNumber === accessionNumber;
                  return (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => loadOrderIntoConsole(order, 'manual_entry')}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        selected ? 'bg-green-50/70' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-950 truncate">
                          {order.testName}
                        </span>
                        <span
                          className={`text-[11px] font-mono shrink-0 ${
                            order.orderStatus === 'RELEASED'
                              ? 'text-green-700 font-semibold'
                              : 'text-neutral-500'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
                        <span className="truncate">{order.patientName}</span>
                        <span className="font-mono tabular-nums text-neutral-900 font-medium">
                          {order.accessionNumber}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1.5">
                        <span>{order.sampleType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{order.mrn}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {leftTab === 'instruments' && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-950">Instrument API Hub</h3>
                  <p className="text-[11px] font-mono text-neutral-500">
                    POST /api/lims/instruments/webhook
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchInstrumentInbox}
                  className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-600 cursor-pointer"
                  title="Refresh instrument packets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInstruments ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[480px] overflow-y-auto">
                {instrumentPackets.map((pkt) => (
                  <div key={pkt.packetId} className="p-4 space-y-2 hover:bg-neutral-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-950 truncate">
                        {pkt.testName}
                      </span>
                      <span className="text-[11px] font-mono text-green-700 font-medium shrink-0">
                        {pkt.instrumentId}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-600 flex items-center justify-between">
                      <span>{pkt.patientName || 'Unassigned'}</span>
                      <span className="font-mono tabular-nums">{pkt.accessionNumber}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {pkt.parameters.length} analytes · {pkt.sampleBarcode}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => loadInstrumentPacket(pkt)}
                        className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-[11px] cursor-pointer"
                      >
                        Pull to Console
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leftTab === 'maintenance' && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-green-600" />
                  <h3 className="text-xs font-semibold text-neutral-950">
                    Predictive Equipment Maintenance
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">4 Analyzers</span>
              </div>
              <div className="divide-y divide-neutral-100">
                {DEFAULT_LAB_EQUIPMENT.map((eq) => {
                  const pct = Math.min(
                    100,
                    Math.round((eq.cyclesCompleted / eq.cycleMaintenanceThreshold) * 100)
                  );
                  return (
                    <div key={eq.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-950">{eq.name}</span>
                        <span
                          className={`text-[11px] font-medium ${
                            eq.status === 'Operational'
                              ? 'text-green-700'
                              : eq.status === 'Calibration Due'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {eq.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center justify-between font-mono tabular-nums">
                        <span>{eq.serialNumber}</span>
                        <span>
                          {eq.cyclesCompleted} / {eq.cycleMaintenanceThreshold} cycles ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            pct >= 90
                              ? 'bg-red-600'
                              : pct >= 80
                                ? 'bg-amber-500'
                                : 'bg-green-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                        <span>Next forecast: {eq.predictedMaintenanceDate}</span>
                        <span className="font-mono tabular-nums">Uptime {eq.uptimePercent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sample Barcode & QR Tracking Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-medium text-neutral-500">Active Specimen Tracking</p>
              <p className="text-sm font-mono font-semibold text-neutral-950 truncate">
                {accessionNumber}
              </p>
              <p className="text-[11px] font-mono text-neutral-500 truncate">
                Barcode: {sampleBarcode}
              </p>
              <p className="text-[11px] text-green-700 font-medium">
                Source: {intakeSource.replace('_', ' ')}
              </p>
            </div>
            <div className="p-2.5 bg-neutral-950 text-white rounded-lg shrink-0 flex flex-col items-center">
              <QrCode className="w-10 h-10 text-green-400" />
              <span className="text-[9px] font-mono mt-1 text-neutral-300">ISO-15189</span>
            </div>
          </div>
        </div>

        {/* RIGHT STAGE: Structured Parameters, Gemini AI Anomaly Check & Dispatch / Pharmacy Handoff */}
        <div className="xl:col-span-8 space-y-5">
          {/* Specimen & Patient Header Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-neutral-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
                  <span className="font-mono font-semibold text-neutral-950">{accessionNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sampleType}</span>
                  {activeInstrumentId && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-green-700 font-medium">{activeInstrumentId}</span>
                    </>
                  )}
                </div>
                <h2 className="text-lg font-bold text-neutral-950">{testName}</h2>
                <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
                  <span className="font-medium text-neutral-900">{patientName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{patientMrn}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{patientPhone}</span>
                  {matchedPatient?.allergies && matchedPatient.allergies.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-red-700 font-medium">
                        Allergies: {matchedPatient.allergies.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="WhatsApp Phone (+234...)"
                  className="h-9 text-xs font-mono bg-neutral-50 border-neutral-200 md:w-44"
                  aria-label="Patient WhatsApp Number"
                />
                <Button
                  type="button"
                  onClick={handleRunAIAnomalyCheck}
                  disabled={isAnalyzingAI}
                  className="h-9 px-4 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 text-green-400 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                  {isAnalyzingAI ? 'Analyzing with Gemini...' : 'Run AI Anomaly Check'}
                </Button>
              </div>
            </div>

            {/* Structured Parameters Data Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-900">
                  Measured Diagnostic Parameters
                </h3>
                <button
                  type="button"
                  onClick={addParameterRow}
                  className="text-xs font-medium text-green-700 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Parameter
                </button>
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                    <tr>
                      <th className="py-2.5 px-3">Analyte Parameter</th>
                      <th className="py-2.5 px-3">Measured Value</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Reference Interval</th>
                      <th className="py-2.5 px-3">Flag</th>
                      <th className="py-2.5 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parameters.map((param, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70">
                        <td className="py-2 px-3">
                          <Input
                            value={param.name}
                            onChange={(e) => updateParameter(idx, { name: e.target.value })}
                            placeholder="Parameter name"
                            className="h-8 text-xs border-neutral-200"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={param.value}
                            onChange={(e) => updateParameter(idx, { value: e.target.value })}
                            placeholder="Value"
                            className="h-8 text-xs font-mono tabular-nums font-semibold border-neutral-200"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={param.unit}
                            onChange={(e) => updateParameter(idx, { unit: e.target.value })}
                            placeholder="g/dL"
                            className="h-8 text-xs font-mono text-neutral-600 border-neutral-200 w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={param.referenceRange}
                            onChange={(e) => updateParameter(idx, { referenceRange: e.target.value })}
                            placeholder="12.0 - 16.0"
                            className="h-8 text-xs font-mono tabular-nums text-neutral-600 border-neutral-200 w-32"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={param.flag}
                            onChange={(e) =>
                              updateParameter(idx, {
                                flag: e.target.value as RapidLabParameter['flag']
                              })
                            }
                            className={`h-8 rounded-md border px-2 text-xs font-medium bg-white ${
                              param.flag === 'Critical' || param.flag === 'High' || param.flag === 'Positive'
                                ? 'border-red-300 text-red-700'
                                : param.flag === 'Low'
                                  ? 'border-amber-300 text-amber-700'
                                  : 'border-neutral-200 text-green-700'
                            }`}
                          >
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                            <option value="Critical">Critical</option>
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeParameterRow(idx)}
                            className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                            aria-label="Remove parameter row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Anomaly Check Error Notice */}
            {aiError && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">AI Anomaly Check Unavailable</p>
                  <p className="mt-0.5 text-red-800">{aiError}</p>
                </div>
              </div>
            )}

            {/* Gemini AI Anomaly Check Structured Output */}
            {aiReport && (
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div
                  className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b ${
                    aiReport.severity === 'critical'
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : aiReport.severity === 'attention'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-green-50 border-green-200 text-green-950'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {aiReport.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                    ) : aiReport.severity === 'attention' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    <span>
                      AI Validation Verdict: {aiReport.severity.toUpperCase()} — {aiReport.likelyDiagnosis}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-600">
                    Model: {aiReport.model}
                  </span>
                </div>

                <div className="p-4 space-y-4 bg-white">
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {aiReport.clinicalSummary}
                  </p>

                  {aiReport.flaggedParameters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-neutral-900">
                        Flagged Deviations ({aiReport.flaggedParameters.length})
                      </p>
                      <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg">
                        {aiReport.flaggedParameters.map((fp, i) => (
                          <div key={i} className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <span className="font-semibold text-neutral-950">{fp.parameter}</span>
                              <span className="text-neutral-500"> · {fp.clinicalNote}</span>
                            </div>
                            <div className="font-mono tabular-nums text-[11px] shrink-0">
                              <span className="font-semibold text-red-700">{fp.value}</span>
                              <span className="text-neutral-400"> (Ref: {fp.referenceRange})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggested Drug + Cross-Module Pharmacy Handoff Block */}
                  {aiReport.aiSuggestedDrug && (
                    <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-neutral-950">
                            AI Suggested Therapeutic Intervention
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">
                          {aiReport.aiSuggestedDrug.dosage} · {aiReport.aiSuggestedDrug.frequency} ·{' '}
                          {aiReport.aiSuggestedDrug.durationDays} days
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-neutral-950">
                          {aiReport.aiSuggestedDrug.drugName}{' '}
                          <span className="font-normal text-neutral-500">
                            ({aiReport.aiSuggestedDrug.genericName})
                          </span>
                        </p>
                        <p className="text-neutral-600">{aiReport.aiSuggestedDrug.rationale}</p>
                        <p className="text-[11px] text-green-800 font-medium">
                          Safety Check: {aiReport.aiSuggestedDrug.contraindicationCheck}
                        </p>
                      </div>

                      {/* Contextual Cross-Module Handoff Button (Muted when Pharmacy is OFF) */}
                      <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                        <ModuleGuard
                          module="pharmacy"
                          fallback={
                            <div className="flex items-center justify-between w-full gap-2 text-xs text-neutral-500">
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                Pharmacy Module is muted for this facility. Enable it to hand off prescriptions.
                              </span>
                              {onNavigate && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('module_config')}
                                  className="text-green-700 font-semibold hover:underline whitespace-nowrap cursor-pointer"
                                >
                                  Configure Modules
                                </button>
                              )}
                            </div>
                          }
                        >
                          <div className="flex flex-wrap items-center justify-between w-full gap-3">
                            <span className="text-xs text-neutral-600">
                              Pharmacy Module Active — Ready to draft medication order.
                            </span>
                            <div className="flex items-center gap-2">
                              {handoffId ? (
                                <>
                                  <span className="text-xs font-mono font-semibold text-green-700">
                                    Queued: {handoffId}
                                  </span>
                                  {onNavigate && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => onNavigate('pos')}
                                      className="h-8 px-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs gap-1.5 cursor-pointer"
                                    >
                                      Open Pharmacy Queue <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handlePrescribeToPharmacy}
                                  disabled={isHandingOff}
                                  className="h-8 px-3.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium gap-1.5 whitespace-nowrap cursor-pointer"
                                >
                                  <Pill className="w-3.5 h-3.5" />
                                  {isHandingOff ? 'Sending to Pharmacy...' : 'Prescribe Action -> Pharmacy Queue'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </ModuleGuard>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Bar: Validate & Trigger WhatsApp PDF Dispatch */}
            <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                Validated By:{' '}
                <span className="font-medium text-neutral-900">
                  {currentUser?.name || currentUser?.displayName || 'TekiLab Lead Scientist'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const map: any = {};
                    parameters.forEach((p) => {
                      if (p.name.trim()) map[p.name] = p;
                    });
                    await generateLabReportPDF(
                      {
                        accessionNumber,
                        patientName,
                        mrn: patientMrn,
                        patientPhone,
                        sampleType,
                        testName,
                        reportNumber: dispatchRecord?.whatsappDispatch?.pdfReportNumber || `TLAB-DRAFT`,
                        results: map,
                        likelyIssue: aiReport?.likelyDiagnosis || 'Pending AI Validation',
                        clinicalInterpretation: aiReport?.clinicalSummary || 'Draft report preview.',
                        validatedByName: currentUser?.name || 'TekiLab Scientist'
                      },
                      matchedPatient,
                      companyLogo
                    );
                    toast.success('Downloaded TekiLab PDF report.');
                  }}
                  className="h-10 px-4 border-neutral-300 text-neutral-900 hover:bg-neutral-50 text-xs font-medium gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </Button>

                <Button
                  type="button"
                  onClick={handleValidateAndDispatchWhatsApp}
                  disabled={isDispatching}
                  className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isDispatching ? 'Validating & Generating PDF...' : 'Validate & Dispatch WhatsApp PDF'}
                </Button>
              </div>
            </div>
          </div>

          {/* Verified WhatsApp Dispatch Confirmation Card */}
          {dispatchRecord?.whatsappDispatch && (
            <div className="bg-neutral-950 text-white rounded-xl border border-neutral-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-green-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Validated & Persisted — {dispatchRecord.whatsappDispatch.pdfReportNumber}
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  Turnaround:{' '}
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {formatElapsedTime(dispatchRecord.whatsappDispatch.turnaroundSeconds)}
                  </span>{' '}
                  · Recipient:{' '}
                  <span className="font-mono">{dispatchRecord.whatsappDispatch.recipientPhone}</span>{' '}
                  · {dispatchRecord.whatsappDispatch.slaMet ? 'Sub-10m SLA Met' : 'SLA Logged'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(dispatchRecord.whatsappDispatch!.whatsappUrl);
                    setCopiedWhatsApp(true);
                    toast.success('WhatsApp dispatch link copied.');
                    setTimeout(() => setCopiedWhatsApp(false), 2000);
                  }}
                  className="h-9 px-3 bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-xs gap-1.5 cursor-pointer"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWhatsApp ? 'Copied' : 'Copy Link'}
                </Button>
                <a
                  href={dispatchRecord.whatsappDispatch.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold gap-1.5 whitespace-nowrap transition-colors"
                >
                  Send via WhatsApp <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <SampleScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onDecoded={handleBarcodeLookup}
      />
    </div>
  );
}
