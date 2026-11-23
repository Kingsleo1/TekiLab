import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FlaskConical,
  ScanLine,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Pill,
  Clock,
  RefreshCw,
  FileDown,
  Plus,
  Trash2,
  Printer,
  UserPlus,
  Search,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sliders,
  List,
  LayoutGrid,
  ChevronRight
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
  RapidLabParameter,
  RapidResultDispatchRecord
} from '../../types/tekilab';
import { useTenantModules } from '../../context/TenantModuleContext';
import { useNotifications } from '../../context/NotificationContext';
import { normalizeNigerianWhatsAppPhone, TekiLabDepartment } from '../../config/roles';
import { handoffLabResultToPharmacyQueue } from '../../lib/cross-module-handoff';
import { generateLabReportPDF } from '../../lib/reporting-utils';

interface RapidResultConsoleProps {
  labOrders: LabOrder[];
  labCatalog: LabTestCatalogItem[];
  patients: PatientRecord[];
  onUpdateLabOrder: (order: LabOrder) => void;
  onRegisterPatient?: (patient: PatientRecord) => void;
  onNavigate?: (view: string) => void;
  currentUser?: any;
  companyLogo?: string;
}

type WorkflowStep = 1 | 2 | 3 | 4 | 5;

interface RapidPanelPreset {
  id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  tubeColor: string;
  targetTatMinutes: number;
  isQualitative?: boolean;
  parameters: RapidLabParameter[];
}

const RAPID_TEST_PANELS: RapidPanelPreset[] = [
  {
    id: 'panel-malaria-rdt',
    code: 'MP-RDT',
    name: 'Malaria RDT (P. falciparum / Pan)',
    category: 'Parasitology',
    sampleType: 'Capillary / Venous Blood',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'P. falciparum HRP-II Band', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Pan-Malaria pLDH Band', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Control Line (C)', value: 'Valid', unit: 'QC', referenceRange: 'Valid', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-typhoid-widal',
    code: 'TYP-RDT',
    name: 'Typhoid Rapid IgM / Widal',
    category: 'Serology',
    sampleType: 'Serum / Whole Blood',
    tubeColor: 'Red (Plain)',
    targetTatMinutes: 6,
    isQualitative: true,
    parameters: [
      { name: 'Salmonella Typhi IgM', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Salmonella Typhi O-Titre', value: '1:40', unit: 'Titre', referenceRange: '< 1:80', flag: 'Normal' },
      { name: 'Salmonella Typhi H-Titre', value: '1:40', unit: 'Titre', referenceRange: '< 1:80', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-glucose-hba1c',
    code: 'GLU-A1C',
    name: 'Blood Glucose & HbA1c Rapid',
    category: 'Clinical Chemistry',
    sampleType: 'Fluoride Oxalate Blood',
    tubeColor: 'Grey (Fl-Ox)',
    targetTatMinutes: 5,
    parameters: [
      { name: 'Fasting Blood Glucose', value: '92', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'Normal' },
      { name: 'HbA1c', value: '5.3', unit: '%', referenceRange: '4.0 - 5.6', flag: 'Normal' },
      { name: 'Serum Creatinine (eGFR guard)', value: '0.88', unit: 'mg/dL', referenceRange: '0.60 - 1.20', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-cbc-rapid',
    code: 'CBC-5P',
    name: 'Complete Blood Count (CBC) Rapid',
    category: 'Haematology',
    sampleType: 'Venous Blood',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 5,
    parameters: [
      { name: 'Hemoglobin (Hb)', value: '13.8', unit: 'g/dL', referenceRange: '12.0 - 17.0', flag: 'Normal' },
      { name: 'White Blood Cell (WBC)', value: '6.8', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'Normal' },
      { name: 'Platelets', value: '245', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'Normal' },
      { name: 'Packed Cell Volume (PCV)', value: '41', unit: '%', referenceRange: '36 - 50', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-lipid',
    code: 'LIP-4',
    name: 'Lipid Profile Rapid',
    category: 'Clinical Chemistry',
    sampleType: 'Serum',
    tubeColor: 'Gold (SST)',
    targetTatMinutes: 7,
    parameters: [
      { name: 'Total Cholesterol', value: '182', unit: 'mg/dL', referenceRange: '< 200', flag: 'Normal' },
      { name: 'LDL Cholesterol', value: '96', unit: 'mg/dL', referenceRange: '< 100', flag: 'Normal' },
      { name: 'HDL Cholesterol', value: '54', unit: 'mg/dL', referenceRange: '> 40', flag: 'Normal' },
      { name: 'Triglycerides', value: '128', unit: 'mg/dL', referenceRange: '< 150', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-urine-10',
    code: 'URI-10',
    name: 'Urine Dipstick 10-Param',
    category: 'Urinalysis',
    sampleType: 'Midstream Urine',
    tubeColor: 'Sterile Universal Cup',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'Leukocyte Esterase', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Nitrite', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Urine Protein', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Urine Glucose', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-covid-flu',
    code: 'RESP-3',
    name: 'COVID-19 / Flu A+B Rapid Swab',
    category: 'Virology',
    sampleType: 'Nasopharyngeal Swab',
    tubeColor: 'Viral Transport Buffer',
    targetTatMinutes: 8,
    isQualitative: true,
    parameters: [
      { name: 'SARS-CoV-2 Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Influenza A Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Influenza B Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-hep-bc',
    code: 'HEP-BC',
    name: 'Hepatitis B (HBsAg) & C Rapid',
    category: 'Serology',
    sampleType: 'Serum / Plasma',
    tubeColor: 'Red (Plain)',
    targetTatMinutes: 6,
    isQualitative: true,
    parameters: [
      { name: 'HBsAg Rapid', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Anti-HCV Rapid', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-pregnancy',
    code: 'BHCG',
    name: 'Pregnancy β-hCG Rapid',
    category: 'Immunoassay',
    sampleType: 'Urine / Serum',
    tubeColor: 'Sterile Cup / SST',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'Qualitative β-hCG', value: 'Negative', unit: 'mIU/mL', referenceRange: 'Negative (<5)', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-sti',
    code: 'STI-3',
    name: 'STI Rapid Screening (HIV / Syphilis)',
    category: 'Serology',
    sampleType: 'Whole Blood / Serum',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 8,
    isQualitative: true,
    parameters: [
      { name: 'HIV 1/2 Antibody', value: 'Negative', unit: 'Qualitative', referenceRange: 'Non-Reactive', flag: 'Negative' },
      { name: 'Syphilis (Treponema pallidum)', value: 'Negative', unit: 'Qualitative', referenceRange: 'Non-Reactive', flag: 'Negative' }
    ]
  }
];

const STEPS: { num: WorkflowStep; label: string; sub: string }[] = [
  { num: 1, label: 'Registration', sub: '30–60s' },
  { num: 2, label: 'Sample', sub: '30s' },
  { num: 3, label: 'AI Analysis', sub: '2–5m' },
  { num: 4, label: 'Approval', sub: '15–30s' },
  { num: 5, label: 'Delivery', sub: '30s' }
];

function generateSampleUid(): string {
  const yr = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 89999);
  return `TK-${yr}-${num}`;
}

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
          scannerRef.current = null;
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
      <DialogContent className="sm:max-w-md bg-white border border-neutral-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-950">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Scan Specimen QR / Barcode
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            Verify tube custody or load an existing accession barcode (`TK-YYYY-XXXXX`).
          </DialogDescription>
        </DialogHeader>
        <div id="tekilab-sample-scanner" className="w-full min-h-[260px] rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200" />
      </DialogContent>
    </Dialog>
  );
}

export function RapidResultConsole({
  labOrders,
  patients,
  onUpdateLabOrder,
  onRegisterPatient,
  onNavigate,
  currentUser,
  companyLogo = '/logo.png?v=5'
}: RapidResultConsoleProps) {
  const { config, isModuleEnabled } = useTenantModules();
  const { notifyTransfer, notifyOrderArrival } = useNotifications();
  const isPharmacyActive = isModuleEnabled('pharmacy');

  // Stepper & SLA Timer
  const [step, setStep] = useState<WorkflowStep>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(true);
  const [panelViewMode, setPanelViewMode] = useState<'list' | 'grid'>('list');
  const [panelSearch, setPanelSearch] = useState<string>('');
  const [orderSource, setOrderSource] = useState<'WALK_IN' | 'ONLINE'>('WALK_IN');
  const [whatsappWarningMsg, setWhatsappWarningMsg] = useState<string | null>(null);

  // Step 1: Registration
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('32');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female'>('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAllergies, setPatientAllergies] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<string>(RAPID_TEST_PANELS[0].id);

  // Step 2: Sample & Custody
  const [sampleUid, setSampleUid] = useState<string>(() => generateSampleUid());
  const [sampleType, setSampleType] = useState<string>(RAPID_TEST_PANELS[0].sampleType);
  const [tubeColor, setTubeColor] = useState<string>(RAPID_TEST_PANELS[0].tubeColor);
  const [collectionSite, setCollectionSite] = useState<string>('Express Phlebotomy Bay 1');
  const [storageLocation, setStorageLocation] = useState<string>('Rapid Bench A');
  const [custodyVerified, setCustodyVerified] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Step 3: Analyzer Workstation & AI
  const [parameters, setParameters] = useState<RapidLabParameter[]>(
    RAPID_TEST_PANELS[0].parameters.map((p) => ({ ...p }))
  );
  const [intakeSource, setIntakeSource] = useState<'manual_entry' | 'barcode_scan' | 'instrument_webhook'>('manual_entry');
  const [instrumentId, setInstrumentId] = useState<string>('');
  const [instrumentInbox, setInstrumentInbox] = useState<InstrumentWebhookPacket[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AIAnomalyCheckResult | null>(null);

  // Step 4: Approval
  const [approvedBy, setApprovedBy] = useState<string>(
    currentUser?.name || currentUser?.displayName || 'Dr. Kingsley Agu (Lead Scientist)'
  );
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [approvalMode, setApprovalMode] = useState<'AUTO_VERIFIED' | 'PATHOLOGIST_SIGNED' | null>(null);

  // Step 5: Delivery
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    pdfReportNumber: string;
    whatsappUrl: string;
    slaMet: boolean;
    turnaroundSeconds: number;
  } | null>(null);
  const [isHandingOffRx, setIsHandingOffRx] = useState<boolean>(false);
  const [rxHandoffResult, setRxHandoffResult] = useState<{
    handoffId: string;
    deliveryMode: 'PHARMACY_POS_QUEUE' | 'BACKGROUND_E_PRESCRIPTION';
    message: string;
  } | null>(null);
  const [copiedUid, setCopiedUid] = useState<boolean>(false);

  // Recent dispatches history
  const [recentDispatches, setRecentDispatches] = useState<RapidResultDispatchRecord[]>(() => {
    try {
      const saved = localStorage.getItem('tekilab_rapid_dispatches_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const selectedPanel = useMemo(
    () => RAPID_TEST_PANELS.find((p) => p.id === selectedPanelId) || RAPID_TEST_PANELS[0],
    [selectedPanelId]
  );

  // Live SLA elapsed timer
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  // Fetch Diagnostic Instrument Webhook Inbox
  const refreshInstrumentInbox = async () => {
    try {
      const res = await fetch('/api/lims/instruments/inbox');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.packets)) {
          setInstrumentInbox(json.packets);
        }
      }
    } catch {
      // Offline-safe
    }
  };

  useEffect(() => {
    refreshInstrumentInbox();
  }, []);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 5);
    return patients
      .filter(
        (p) =>
          p.fullName?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [patients, patientSearch]);

  const handleSelectExistingPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
    setPatientName(p.fullName);
    setPatientPhone(p.phone || '');
    const g = (p as any).gender || (p as any).sex;
    setPatientGender(g === 'Female' ? 'Female' : 'Male');
    setPatientAllergies((p.allergies || []).join(', '));
    toast.success(`Selected ${p.fullName} (${p.mrn})`);
  };

  const handleSelectPanel = (panel: RapidPanelPreset) => {
    setSelectedPanelId(panel.id);
    setSampleType(panel.sampleType);
    setTubeColor(panel.tubeColor);
    setParameters(panel.parameters.map((p) => ({ ...p })));
    setAiReport(null);
    setIsApproved(false);
    setApprovalMode(null);
  };

  // Step 1 -> Step 2
  const handleCompleteRegistration = () => {
    if (!patientName.trim()) {
      toast.error('Enter patient full name or select an existing patient.');
      return;
    }

    const uid = generateSampleUid();
    setSampleUid(uid);
    setElapsedSeconds(0);
    setTimerActive(true);
    setCustodyVerified(false);
    setAiReport(null);
    setIsApproved(false);
    setApprovalMode(null);
    setDispatchResult(null);
    setRxHandoffResult(null);

    let pid = selectedPatientId;
    if (!pid) {
      pid = `pat-${Date.now()}`;
      setSelectedPatientId(pid);
      onRegisterPatient?.({
        id: pid,
        mrn: `MRN-${Math.floor(10000 + Math.random() * 89999)}`,
        fullName: patientName.trim(),
        phone: patientPhone.trim() || '08030000000',
        gender: patientGender,
        dob: `${new Date().getFullYear() - (Number(patientAge) || 30)}-01-01`,
        allergies: patientAllergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        chronicConditions: [],
        createdAt: new Date().toISOString()
      } as any);
    }

    toast.success(`Express Accession Created: ${uid}`, {
      description: `${patientName.trim()} — ${selectedPanel.name}`
    });
    setStep(2);
  };

  // Pull automated analyzer packet into Step 3
  const handleLoadInstrumentPacket = (pkt: InstrumentWebhookPacket) => {
    if (pkt.patientName && !patientName) setPatientName(pkt.patientName);
    setSampleUid(pkt.accessionNumber || sampleUid);
    setParameters(pkt.parameters.map((p) => ({ ...p })));
    setIntakeSource('instrument_webhook');
    setInstrumentId(pkt.instrumentId);
    setAiReport(null);
    toast.success(`Synced live readings from ${pkt.instrumentModel}`);
  };

  // Update individual parameter
  const handleParamChange = (idx: number, field: keyof RapidLabParameter, val: string) => {
    setParameters((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [field]: val };
        if (field === 'value') {
          const lower = val.toLowerCase();
          if (lower.includes('pos') || lower.includes('react')) next.flag = 'Positive';
          else if (lower.includes('neg') || lower.includes('non-react')) next.flag = 'Negative';
        }
        return next;
      })
    );
  };

  // Step 3: Run TekiLab AI Analysis
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/lims/rapid-result/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessionNumber: sampleUid,
          testName: selectedPanel.name,
          sampleType,
          patient: {
            ageYears: Number(patientAge) || 32,
            sex: patientGender,
            allergies: patientAllergies
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          },
          parameters
        })
      });

      const json = await res.json();
      if (!res.ok || !json?.analysis) {
        throw new Error(json?.error || 'AI analysis failed');
      }

      const analysis: AIAnomalyCheckResult = json.analysis;
      setAiReport(analysis);
      setApprovalNotes(analysis.clinicalSummary);

      // Autonomous Auto-Verification if strictly normal
      if (!analysis.anomalyDetected && analysis.severity === 'normal') {
        setIsApproved(true);
        setApprovalMode('AUTO_VERIFIED');
        toast.success('AI Auto-Verification Passed (Normal Reference Range)', {
          description: 'Cleared automatically — ready for immediate delivery.'
        });
      } else {
        setIsApproved(false);
        setApprovalMode(null);
        toast.warning(
          analysis.severity === 'critical'
            ? 'CRITICAL / PANIC VALUE DETECTED — Pathologist Sign-Off Required'
            : 'Abnormal Result Flagged — Review & Sign Off in Step 4'
        );
      }
      setStep(4);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to run AI verification.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 4: Pathologist Sign-off
  const handleSignOff = () => {
    if (!approvedBy.trim()) {
      toast.error('Enter validating scientist / pathologist name.');
      return;
    }
    setIsApproved(true);
    setApprovalMode('PATHOLOGIST_SIGNED');
    toast.success(`Result digitally signed by ${approvedBy}`);
    setStep(5);
  };

  // Step 5: Instant PDF + WhatsApp Dispatch
  const handleInstantDispatch = async () => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/lims/rapid-result/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: config.tenantId,
          accessionNumber: sampleUid,
          sampleBarcode: sampleUid,
          patientId: selectedPatientId || `walkin-${Date.now()}`,
          patientName: patientName || 'Walk-in Patient',
          patientMrn: selectedPatientId || 'WALK-IN',
          patientPhone: patientPhone || '08031234567',
          testName: selectedPanel.name,
          category: selectedPanel.category,
          sampleType,
          intakeSource,
          instrumentId,
          parameters,
          aiAnomalyReport: aiReport,
          validatedBy: approvalMode === 'AUTO_VERIFIED' ? 'TekiLab AI Auto-Verification' : approvedBy,
          turnaroundSeconds: Math.max(elapsedSeconds, 45)
        })
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Dispatch failed');
      }

      setTimerActive(false);
      setWhatsappWarningMsg(json.whatsappWarning || null);
      setDispatchResult({
        pdfReportNumber: json.pdfReportNumber,
        whatsappUrl: json.whatsappUrl,
        slaMet: json.slaMet,
        turnaroundSeconds: Math.max(elapsedSeconds, 45)
      });

      if (json.whatsappWarning) {
        toast.warning('WhatsApp Delivery Notice', {
          description: json.whatsappWarning,
          duration: 7000
        });
      }

      // Persist to lab worklist & local history
      const mappedResults: Record<string, { value: string; flag: RapidLabParameter['flag'] }> = {};
      parameters.forEach((p) => {
        mappedResults[p.name] = { value: p.value, flag: p.flag };
      });

      onUpdateLabOrder({
        id: json.record?.id || `lab-${Date.now()}`,
        accessionNumber: sampleUid,
        patientId: selectedPatientId || 'walk-in',
        patientName: patientName || 'Walk-in Patient',
        mrn: selectedPatientId || 'WALK-IN',
        testId: selectedPanel.id,
        testName: selectedPanel.name,
        category: selectedPanel.category,
        sampleType,
        sampleStatus: 'Sample Collected',
        orderStatus: 'RELEASED',
        results: mappedResults,
        likelyIssue: aiReport?.likelyDiagnosis || 'Verified Reference Result',
        clinicalInterpretation: approvalNotes || aiReport?.clinicalSummary || '',
        validatedByName: approvalMode === 'AUTO_VERIFIED' ? 'TekiLab AI Auto-Verify' : approvedBy,
        validatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        priceNaira: 5000,
        billingStatus: 'Paid'
      } as any);

      if (json.record) {
        const nextHistory = [json.record, ...recentDispatches].slice(0, 12);
        setRecentDispatches(nextHistory);
        localStorage.setItem('tekilab_rapid_dispatches_v2', JSON.stringify(nextHistory));
      }

      toast.success(`Report ${json.pdfReportNumber} dispatched!`, {
        description: `Turnaround: ${formatElapsedTime(Math.max(elapsedSeconds, 45))} (${json.slaMet ? 'Within 5–10m SLA' : 'Completed'})`
      });
    } catch (err: any) {
      toast.error(err?.message || 'Dispatch failed');
    } finally {
      setIsDispatching(false);
    }
  };

  // Download branded PDF
  const handleDownloadPDF = () => {
    const mappedResults: Record<string, { value: string; flag: string }> = {};
    parameters.forEach((p) => {
      mappedResults[p.name] = { value: `${p.value} ${p.unit || ''}`.trim(), flag: p.flag };
    });

    generateLabReportPDF(
      {
        id: sampleUid,
        accessionNumber: sampleUid,
        patientName: patientName || 'Walk-in Patient',
        mrn: selectedPatientId || 'WALK-IN',
        testName: selectedPanel.name,
        category: selectedPanel.category,
        sampleType,
        orderStatus: 'RELEASED',
        results: mappedResults,
        likelyIssue: aiReport?.likelyDiagnosis || 'Normal Reference Values',
        clinicalInterpretation: approvalNotes || aiReport?.clinicalSummary || '',
        validatedByName: approvalMode === 'AUTO_VERIFIED' ? 'TekiLab AI Auto-Verification' : approvedBy,
        validatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as any,
      {
        name: config.facilityName || 'TekiLab Medical Laboratory',
        logoUrl: companyLogo
      }
    );
    toast.success('Official TekiLab PDF Report downloaded');
  };

  // Direct Diagnostic-to-Pharmacy Handoff (works even when Pharmacy UI is muted!)
  const handlePharmacyHandoff = async () => {
    if (!aiReport?.aiSuggestedDrug) {
      toast.info('No medication suggestion attached to this normal result.');
      return;
    }
    setIsHandingOffRx(true);
    try {
      const result = await handoffLabResultToPharmacyQueue(
        {
          tenantId: config.tenantId,
          patientId: selectedPatientId || 'walk-in',
          patientName: patientName || 'Walk-in Patient',
          patientMrn: selectedPatientId || 'WALK-IN',
          patientPhone,
          labResultId: sampleUid,
          accessionNumber: sampleUid,
          testName: selectedPanel.name,
          testResultSummary: parameters.map((p) => `${p.name}: ${p.value} ${p.unit}`).join('; '),
          aiReport,
          validatedBy: approvalMode === 'AUTO_VERIFIED' ? 'TekiLab AI Auto-Verify' : approvedBy
        },
        config
      );

      if (result.ok && result.payload) {
        setRxHandoffResult({
          handoffId: result.payload.handoffId,
          deliveryMode: result.deliveryMode || (isPharmacyActive ? 'PHARMACY_POS_QUEUE' : 'BACKGROUND_E_PRESCRIPTION'),
          message: result.message
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsHandingOffRx(false);
    }
  };

  // Start Next Rapid Sample
  const handleResetWorkflow = () => {
    setStep(1);
    setSelectedPatientId('');
    setPatientName('');
    setPatientPhone('');
    setPatientAllergies('');
    setSampleUid(generateSampleUid());
    setParameters(selectedPanel.parameters.map((p) => ({ ...p })));
    setAiReport(null);
    setIsApproved(false);
    setApprovalMode(null);
    setDispatchResult(null);
    setRxHandoffResult(null);
    setElapsedSeconds(0);
    setTimerActive(true);
    setCustodyVerified(false);
  };

  const isWithinSla = elapsedSeconds <= 600;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 font-sans text-neutral-950">
      {/* Minimalist White / Blue / Black Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>TekiLab Rapid LIMS Engine</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-500 font-mono">{sampleUid}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            5–10 Minute Rapid Diagnostic Workflow
          </h1>
          <p className="text-sm text-neutral-500">
            Express registration, QR specimen custody, AI auto-verification, and instant patient &amp; pharmacy delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Live SLA Stopwatch */}
          <div className="px-4 py-2.5 rounded-xl bg-neutral-950 text-white flex items-center gap-3">
            <Clock className={`w-4 h-4 ${isWithinSla ? 'text-blue-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Turnaround SLA</div>
              <div className="text-base font-mono font-bold tabular-nums leading-tight">
                {formatElapsedTime(elapsedSeconds)}
                <span className="text-[11px] font-normal text-neutral-400 ml-1.5">/ 10:00</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => onNavigate?.('module_config')}
            className="h-12 px-4 rounded-xl border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50"
          >
            <Sliders className="w-4 h-4 mr-2 text-blue-600" />
            Modules
          </Button>
        </div>
      </div>

      {/* Clean 5-Step Progress Stepper */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num <= step || (s.num === 2 && patientName.trim()) || (s.num === 3 && patientName.trim())) {
                    setStep(s.num);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isCompleted
                      ? 'bg-blue-50/70 text-neutral-950 border-blue-200 hover:bg-blue-50'
                      : 'bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-600'
                      : isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div className="text-xs font-bold truncate">{s.label}</div>
                  <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-neutral-400'}`}>
                    {s.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: EXPRESS REGISTRATION                                          */}
      {/* ===================================================================== */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Patient Intake Card */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-950">1. Express Patient Intake</h2>
                  <p className="text-xs text-neutral-500">Lookup existing patient or register in seconds</p>
                </div>
              </div>
            </div>

            {/* Quick Lookup */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by Name, Phone, or MRN..."
                className="pl-10 h-10 bg-neutral-50 border-neutral-200 rounded-xl text-sm"
              />
            </div>

            {filteredPatients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectExistingPatient(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedPatientId === p.id
                        ? 'bg-neutral-950 text-white border-neutral-950'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-blue-400 hover:text-blue-700'
                    }`}
                  >
                    {p.fullName}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Patient Full Name *</label>
                <Input
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setSelectedPatientId('');
                  }}
                  placeholder="e.g. Chinedu Okafor"
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Age (Years)</label>
                  <Input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="h-10 rounded-xl border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Male', 'Female'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setPatientGender(g)}
                        className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                          patientGender === g
                            ? 'bg-neutral-950 text-white border-neutral-950'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-700">WhatsApp / Phone Number (+234)</label>
                  {patientPhone.trim().length > 6 && (
                    <span className={`text-[11px] font-semibold ${normalizeNigerianWhatsAppPhone(patientPhone).isWhatsAppQualified ? 'text-blue-600' : 'text-amber-600'}`}>
                      {normalizeNigerianWhatsAppPhone(patientPhone).isWhatsAppQualified ? '✓ +234 WhatsApp Qualified' : 'Check +234 mobile'}
                    </span>
                  )}
                </div>
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Order Source</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['WALK_IN', 'ONLINE'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setOrderSource(src)}
                      className={`h-9 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        orderSource === src
                          ? src === 'ONLINE'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-neutral-950 text-white border-neutral-950'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {src === 'ONLINE' ? 'Online Booking' : 'Walk-In Client'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Known Drug Allergies (Optional)</label>
                <Input
                  value={patientAllergies}
                  onChange={(e) => setPatientAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa (used for AI Contraindication Guard)"
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Rapid Panel Picker Card */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">Select Rapid Test Panel</h2>
                  <p className="text-xs text-neutral-500">Clean list view by default — switch to grid anytime</p>
                </div>
                <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-start">
                  <button
                    type="button"
                    onClick={() => setPanelViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                      panelViewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                      panelViewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Grid
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={panelSearch}
                  onChange={(e) => setPanelSearch(e.target.value)}
                  placeholder="Search rapid test panels..."
                  className="pl-10 h-10 bg-neutral-50 border-neutral-200 rounded-xl text-sm"
                />
              </div>

              {panelViewMode === 'list' ? (
                <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-[340px] overflow-y-auto">
                  {RAPID_TEST_PANELS.filter((p) =>
                    !panelSearch.trim() ||
                    p.name.toLowerCase().includes(panelSearch.toLowerCase()) ||
                    p.code.toLowerCase().includes(panelSearch.toLowerCase())
                  ).map((panel) => {
                    const active = panel.id === selectedPanelId;
                    return (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => handleSelectPanel(panel)}
                        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                          active ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-white text-neutral-900 hover:bg-neutral-50 font-medium'
                        }`}
                      >
                        <span className="text-sm">{panel.name}</span>
                        {active ? (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto">
                  {RAPID_TEST_PANELS.filter((p) =>
                    !panelSearch.trim() ||
                    p.name.toLowerCase().includes(panelSearch.toLowerCase()) ||
                    p.code.toLowerCase().includes(panelSearch.toLowerCase())
                  ).map((panel) => {
                    const active = panel.id === selectedPanelId;
                    return (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => handleSelectPanel(panel)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-blue-50/70 border-blue-600 text-blue-700 font-bold'
                            : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-400 font-medium'
                        }`}
                      >
                        <span className="text-sm leading-snug">{panel.name}</span>
                        {active && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-4">
              <div className="text-xs text-neutral-500">
                Selected: <span className="font-semibold text-neutral-950">{selectedPanel.name}</span>
              </div>
              <Button
                onClick={handleCompleteRegistration}
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Register &amp; Generate Sample UID
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: QR SPECIMEN TAGGING & CHAIN OF CUSTODY                        */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Printable QR Label Preview */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-950">2. Specimen QR Label</h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                {custodyVerified ? 'Collected & Verified' : 'Registered'}
              </span>
            </div>

            <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-5 bg-neutral-50/70 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    TekiLab ISO Specimen UID
                  </div>
                  <div className="text-xl font-mono font-extrabold text-neutral-950 tracking-tight">
                    {sampleUid}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">{patientName || 'Walk-in Patient'}</div>
                  <div className="text-xs text-neutral-600">{selectedPanel.name}</div>
                </div>
                <div className="w-16 h-16 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                  <QrCode className="w-11 h-11 text-neutral-950" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-200 text-[11px] text-neutral-600">
                <div><span className="font-semibold text-neutral-900">Tube:</span> {tubeColor}</div>
                <div><span className="font-semibold text-neutral-900">Type:</span> {sampleType}</div>
                <div><span className="font-semibold text-neutral-900">Bay:</span> {collectionSite}</div>
                <div><span className="font-semibold text-neutral-900">Time:</span> {new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(sampleUid);
                  setCopiedUid(true);
                  setTimeout(() => setCopiedUid(false), 1800);
                  toast.success(`Copied ${sampleUid}`);
                }}
                className="h-10 rounded-xl border-neutral-200"
              >
                {copiedUid ? <Check className="w-4 h-4 mr-1.5 text-blue-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                Copy UID
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.print();
                  toast.success('Sent specimen label to thermal printer');
                }}
                className="h-10 rounded-xl border-neutral-200"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Label
              </Button>
            </div>
          </div>

          {/* Chain of Custody Form */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950">Chain of Custody &amp; Collection Verification</h2>
                <p className="text-xs text-neutral-500">Timestamped audit trail from specimen collection to rapid analyzer bench</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Specimen Type</label>
                  <Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tube / Container Color</label>
                  <Input value={tubeColor} onChange={(e) => setTubeColor(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Collection Site</label>
                  <Input value={collectionSite} onChange={(e) => setCollectionSite(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Analyzer / Storage Rack</label>
                  <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${custodyVerified ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-700'}`}>
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">
                      {custodyVerified ? 'Specimen Barcode Verified' : 'Scan or Confirm Physical Tube'}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Transitions sample status: Registered → Collected → In Analyzer
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="rounded-xl border-neutral-200">
                    Camera Scan
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCustodyVerified(true);
                      toast.success(`Specimen ${sampleUid} marked Collected`);
                    }}
                    className="rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white"
                  >
                    Confirm Collected
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl text-neutral-600">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setCustodyVerified(true);
                  setStep(3);
                }}
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Proceed to Analyzer Workstation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: RAPID ANALYZER WORKSTATION & AI ANALYSIS                      */}
      {/* ===================================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Diagnostic Instrument Webhook Bridge */}
          {instrumentInbox.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-950">Analyzer Bridge Live Feed</div>
                  <div className="text-[11px] text-neutral-500">Pull automated HL7 / JSON readings directly from connected analyzers</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {instrumentInbox.slice(0, 2).map((pkt) => (
                  <button
                    key={pkt.packetId}
                    type="button"
                    onClick={() => handleLoadInstrumentPacket(pkt)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-950 text-white hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Pull {pkt.instrumentId} ({pkt.patientName || pkt.accessionNumber})
                  </button>
                ))}
                <Button variant="ghost" size="sm" onClick={refreshInstrumentInbox} className="rounded-xl">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* High-Velocity Grid Entry */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-950">3. Rapid Analyzer Workstation — {selectedPanel.name}</h2>
                <p className="text-xs text-neutral-500">
                  Enter numeric measurements or tap quick qualitative buttons; run TekiLab AI for instant validation &amp; prescription suggestion.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setParameters((prev) => [
                    ...prev,
                    { name: 'Additional Parameter', value: '', unit: '', referenceRange: 'Normal', flag: 'Normal' }
                  ])
                }
                className="rounded-xl border-neutral-200"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Parameter
              </Button>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Measured Value / Quick RDT</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4">Flag</th>
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {parameters.map((param, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-4">
                        <Input
                          value={param.name}
                          onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                          className="h-9 rounded-lg border-neutral-200 text-xs font-semibold"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={param.value}
                            onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                            className="h-9 rounded-lg border-neutral-200 text-xs font-mono w-32"
                          />
                          {selectedPanel.isQualitative && (
                            <div className="flex items-center gap-1">
                              {(['Positive', 'Negative', 'Invalid'] as const).map((qVal) => (
                                <button
                                  key={qVal}
                                  type="button"
                                  onClick={() => {
                                    handleParamChange(idx, 'value', qVal);
                                    handleParamChange(
                                      idx,
                                      'flag',
                                      qVal === 'Positive' ? 'Positive' : qVal === 'Negative' ? 'Negative' : 'Critical'
                                    );
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                                    param.value === qVal
                                      ? qVal === 'Positive'
                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                        : 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                  }`}
                                >
                                  {qVal.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Input
                          value={param.unit}
                          onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                          className="h-9 rounded-lg border-neutral-200 text-xs w-24"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <Input
                          value={param.referenceRange}
                          onChange={(e) => handleParamChange(idx, 'referenceRange', e.target.value)}
                          className="h-9 rounded-lg border-neutral-200 text-xs w-28 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={param.flag}
                          onChange={(e) => handleParamChange(idx, 'flag', e.target.value)}
                          className={`h-9 px-2.5 rounded-lg text-xs font-semibold border outline-none ${
                            param.flag === 'Critical'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : param.flag === 'High' || param.flag === 'Low' || param.flag === 'Positive'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-white text-neutral-700 border-neutral-200'
                          }`}
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                          <option value="Critical">Critical (Panic)</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setParameters((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl text-neutral-600">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Sample
              </Button>
              <Button
                onClick={handleRunAIAnalysis}
                disabled={isAnalyzing}
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isAnalyzing ? 'Running TekiLab AI Engine...' : 'Run AI Verification & Outlier Check'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: APPROVAL (AUTO-VERIFICATION OR PATHOLOGIST SIGN-OFF)          */}
      {/* ===================================================================== */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Diagnostic Findings */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  4. TekiLab AI Diagnostic Verification
                </div>
                <h2 className="text-lg font-bold text-neutral-950">
                  {aiReport?.likelyDiagnosis || 'Diagnostic Summary'}
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shrink-0 ${
                  aiReport?.severity === 'critical'
                    ? 'bg-red-600 text-white'
                    : aiReport?.severity === 'attention'
                      ? 'bg-neutral-950 text-white'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {aiReport?.severity === 'critical'
                  ? 'Critical Alert'
                  : aiReport?.severity === 'attention'
                    ? 'Abnormal Flag'
                    : 'Auto-Verified Normal'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="text-xs font-bold text-neutral-700">Patient-Friendly Clinical Summary</div>
              <p className="text-sm text-neutral-800 leading-relaxed">
                {aiReport?.clinicalSummary || 'All parameters evaluated against ISO reference ranges.'}
              </p>
            </div>

            {aiReport?.flaggedParameters && aiReport.flaggedParameters.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-700">Flagged Deviations &amp; Outlier Checks</div>
                <div className="space-y-2">
                  {aiReport.flaggedParameters.map((fp, i) => (
                    <div key={i} className="p-3 rounded-xl border border-neutral-200 bg-white flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-neutral-950">
                          {fp.parameter}: <span className="font-mono text-blue-700">{fp.value}</span>{' '}
                          <span className="text-neutral-400">(Ref: {fp.referenceRange})</span>
                        </div>
                        <div className="text-neutral-600">{fp.clinicalNote}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI-Suggested Prescription Protocol */}
            {aiReport?.aiSuggestedDrug && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <Pill className="w-4 h-4" />
                    AI-Suggested Evidence-Based Prescription
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {isPharmacyActive ? 'Pharmacy POS Active' : 'Backend e-Rx Ready'}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-950">
                  {aiReport.aiSuggestedDrug.drugName} — {aiReport.aiSuggestedDrug.dosage}
                </div>
                <div className="text-xs text-neutral-700">
                  {aiReport.aiSuggestedDrug.frequency} for {aiReport.aiSuggestedDrug.durationDays} days (Qty: {aiReport.aiSuggestedDrug.quantity})
                </div>
                <div className="text-xs text-neutral-600 pt-1 border-t border-blue-200/70">
                  <span className="font-semibold text-neutral-900">Contraindication Guard:</span>{' '}
                  {aiReport.aiSuggestedDrug.contraindicationCheck}
                </div>
              </div>
            )}
          </div>

          {/* Approval / Sign-Off Panel */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
                  {approvalMode === 'AUTO_VERIFIED' ? (
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950">
                    {approvalMode === 'AUTO_VERIFIED'
                      ? 'Autonomous Auto-Verification'
                      : 'Pathologist / Lead Scientist Sign-Off'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {approvalMode === 'AUTO_VERIFIED'
                      ? 'All values within normal range — automatically cleared.'
                      : 'Abnormal or critical markers require explicit sign-off.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Validating Scientist / Pathologist</label>
                <Input
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Clinical Interpretation Note</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(3)} className="rounded-xl text-neutral-600">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Edit Values
              </Button>
              {isApproved ? (
                <Button
                  onClick={() => setStep(5)}
                  className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Continue to Delivery
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSignOff}
                  className="h-11 px-6 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 text-blue-400" />
                  Approve &amp; Sign Result
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 5: INSTANT DELIVERY & PHARMACY HANDOFF                           */}
      {/* ===================================================================== */}
      {step === 5 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>5. Validated &amp; Ready for Instant Delivery</span>
              </div>
              <h2 className="text-xl font-bold text-neutral-950">
                {patientName || 'Walk-in Patient'} — {selectedPanel.name}
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                UID: {sampleUid} · Approved by {approvalMode === 'AUTO_VERIFIED' ? 'TekiLab AI Auto-Verify' : approvedBy}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetWorkflow}
              className="rounded-xl border-neutral-200 text-neutral-900 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Start Next Rapid Sample
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Official PDF Report */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
                  <FileDown className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-950">Official TekiLab PDF Report</h3>
                <p className="text-xs text-neutral-500">
                  Signed laboratory report branded with your official TekiLab logo, reference ranges, and AI summary.
                </p>
              </div>
              <Button onClick={handleDownloadPDF} variant="outline" className="w-full h-10 rounded-xl border-neutral-300 font-semibold">
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
            </div>

            {/* Action 2: WhatsApp / SMS Dispatch */}
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-950">WhatsApp &amp; SMS Instant Dispatch</h3>
                <p className="text-xs text-neutral-600">
                  Log turnaround SLA, archive result to database, and send patient-friendly report via WhatsApp.
                </p>
              </div>
              {dispatchResult ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-blue-700 font-semibold">
                    ✓ {dispatchResult.pdfReportNumber} · TAT {formatElapsedTime(dispatchResult.turnaroundSeconds)}
                  </div>
                  <a
                    href={dispatchResult.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    Open WhatsApp Dispatch
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <Button
                  onClick={handleInstantDispatch}
                  disabled={isDispatching}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isDispatching ? 'Dispatching...' : 'Finalize & Dispatch Now'}
                </Button>
              )}
            </div>

            {/* Action 3: Direct Diagnostic-to-Pharmacy Prescription Handoff */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-950">
                  {isPharmacyActive ? 'Dispatch to Pharmacy POS Queue' : 'Generate Backend e-Prescription'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {aiReport?.aiSuggestedDrug
                    ? `${aiReport.aiSuggestedDrug.drugName} (${aiReport.aiSuggestedDrug.dosage}) — backend hook stays active even when Pharmacy UI is muted.`
                    : 'No drug protocol required for normal baseline result.'}
                </p>
              </div>
              {rxHandoffResult ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-neutral-700 font-semibold">
                    ✓ {rxHandoffResult.handoffId} ({rxHandoffResult.deliveryMode === 'PHARMACY_POS_QUEUE' ? 'Queued in POS' : 'Saved e-Rx'})
                  </div>
                  {isPharmacyActive && (
                    <Button
                      variant="outline"
                      onClick={() => onNavigate?.('pos')}
                      className="w-full h-9 rounded-xl border-neutral-200 text-xs"
                    >
                      Open Pharmacy POS
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handlePharmacyHandoff}
                  disabled={isHandingOffRx || !aiReport?.aiSuggestedDrug}
                  className="w-full h-10 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold disabled:opacity-40"
                >
                  <Pill className="w-4 h-4 mr-2 text-blue-400" />
                  {isHandingOffRx ? 'Sending Script...' : 'Generate Associated Prescription'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Rapid Dispatches Table */}
      {recentDispatches.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-950">Recent Rapid Diagnostic Dispatches</h3>
            <span className="text-xs text-neutral-500">{recentDispatches.length} completed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Sample UID</th>
                  <th className="py-2 pr-4 font-semibold">Patient</th>
                  <th className="py-2 pr-4 font-semibold">Test Panel</th>
                  <th className="py-2 pr-4 font-semibold">TAT</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentDispatches.slice(0, 6).map((rec) => (
                  <tr key={rec.id}>
                    <td className="py-2.5 pr-4 font-mono font-semibold text-neutral-950">{rec.accessionNumber}</td>
                    <td className="py-2.5 pr-4 text-neutral-800">{rec.patientName}</td>
                    <td className="py-2.5 pr-4 text-neutral-600">{rec.testName}</td>
                    <td className="py-2.5 pr-4 font-mono text-neutral-700">
                      {formatElapsedTime(rec.whatsappDispatch?.turnaroundSeconds || 120)}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                        Dispatched
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SampleScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onDecoded={(code) => {
          setSampleUid(code);
          setCustodyVerified(true);
          setIntakeSource('barcode_scan');
          toast.success(`Scanned Specimen Barcode: ${code}`);
        }}
      />
    </div>
  );
}
