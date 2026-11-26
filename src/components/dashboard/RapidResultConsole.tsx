import {PatientPortalLink} from './PatientPortalLink';
import { qrRequest, ensureResultVerification } from '../../services/qr';
import { ReportVerificationControls } from './ReportVerificationControls';
import { TestOrderPicker } from './TestOrderPicker';
import { TestCatalogueManager } from './TestCatalogueManager';
import { catalogueCapabilities, catalogueToRapidPanel, displayedPrice, isRapidReady } from '../../lib/test-catalog';
import { createCatalogueOrder, saveCatalogueRecord } from '../../services/test-catalog';
import type { CatalogueSnapshot, CatalogueScope } from '../../types/test-catalog';
import { RAPID_TEST_PANELS, type RapidPanelPreset } from '../../lib/rapid-panels';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SpecimenCode, downloadSpecimenLabel } from './SpecimenCode';
import { FindingsEditor } from './FindingsEditor';
import { ReportSignature } from './ReportSignature';
import { ReportApproval, approvalMatches, canApproveReport } from '../../lib/report-approval';
import { textToFindings } from '../../lib/findings';

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
import { generateLabReportPDF, generateAIReviewPDF } from '../../lib/reporting-utils';

interface RapidResultConsoleProps {
  catalogueSnapshot: CatalogueSnapshot | null; catalogueScope: CatalogueScope; catalogueError?: string; onRefreshCatalogue: () => void; onCatalogueOrders: (bundle:any)=>void;
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

const STEPS: { num: WorkflowStep; label: string; sub: string }[] = [
  { num: 1, label: 'Patient', sub: '30–60s' },
  { num: 2, label: 'Sample', sub: '30s' },
  { num: 3, label: 'Run Test', sub: '2–5m' },
  { num: 4, label: 'Review', sub: '15–30s' },
  { num: 5, label: 'Send Result', sub: '30s' }
];

function generateSampleUid(): string {
  const yr = new Date().getFullYear();
  const num = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
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
  catalogueSnapshot, catalogueScope, catalogueError, onRefreshCatalogue, onCatalogueOrders,
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
  const [workflowStartedAt, setWorkflowStartedAt] = useState(() => Date.now());
  const [quotedFee, setQuotedFee] = useState('');
  const [timerActive, setTimerActive] = useState<boolean>(true);
  const [selectedIds,setSelectedIds]=useState<string[]>([RAPID_TEST_PANELS[0].id]);
  const [managerOpen,setManagerOpen]=useState(false);
  const [ordering,setOrdering]=useState(false);
  const orderRequest=useRef(crypto.randomUUID());
  const caps=catalogueCapabilities(currentUser);
  const [orderSource, setOrderSource] = useState<'WALK_IN' | 'ONLINE'>('WALK_IN');
  const [whatsappWarningMsg, setWhatsappWarningMsg] = useState<string | null>(null);

  // Step 1: Registration
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female'>('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail,setPatientEmail]=useState('');
  const [sendEmail,setSendEmail]=useState(false),[sendWhatsApp,setSendWhatsApp]=useState(false),[consultationRequested,setConsultationRequested]=useState(false);
  const [releaseError,setReleaseError]=useState('');
  const [savedReport,setSavedReport]=useState<any>(null);
  const [patientAllergies, setPatientAllergies] = useState('');
  const [panelLabel,setPanelLabel]=useState(RAPID_TEST_PANELS[0].name);
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
    RAPID_TEST_PANELS[0].parameters.map((p) => ({ ...p, value: '' }))
  );
  const [intakeSource, setIntakeSource] = useState<'manual_entry' | 'barcode_scan' | 'instrument_webhook'>('manual_entry');
  const [instrumentId, setInstrumentId] = useState<string>('');
  const [instrumentInbox, setInstrumentInbox] = useState<InstrumentWebhookPacket[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AIAnomalyCheckResult | null>(null);

  // Step 4: Approval
  const [approvedBy, setApprovedBy] = useState<string>(
    currentUser?.name || currentUser?.displayName || ''
  );
  useEffect(()=>setApprovedBy(currentUser?.name||currentUser?.displayName||''),[currentUser?.id,currentUser?.name,currentUser?.displayName]);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [findingsHtml, setFindingsHtml] = useState('');
  const [reportApproval, setReportApproval] = useState<ReportApproval | null>(null);
  const reportSnapshot = JSON.stringify({ sampleUid, selectedPatientId, patientName, patientPhone, patientEmail,sendEmail,sendWhatsApp,consultationRequested,workflowStartedAt,patientMrn:patients.find(p=>p.id===selectedPatientId)?.mrn||selectedPatientId, selectedPanelId, testId:selectedPanelId, testName:panelLabel, parameters, custodyVerified, approvalNotes, findingsHtml, aiReport, quotedFee });
  const critical = parameters.some(p => p.flag === 'Critical');
  useEffect(() => { setIsApproved(false); setApprovalMode(null); }, [reportSnapshot]);
  const [approvalMode, setApprovalMode] = useState<'AUTO_VERIFIED' | 'PATHOLOGIST_SIGNED' | null>(null);

  // Step 5: Delivery
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    pdfReportNumber: string;
    whatsappUrl: string;
    slaMet: boolean;
    turnaroundSeconds: number;
    verification?:any; delivery?:any[]; deliveryWarning?:string;
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

  const [frozenPanel,setFrozenPanel]=useState<RapidPanelPreset|null>(null);
  const selectedItem=catalogueSnapshot?.items.find(item=>item.id===selectedIds[0]);
  const rapidSelection=selectedIds.length===1 && Boolean(selectedItem && isRapidReady(selectedItem));
  const selectedPanel=frozenPanel || (selectedItem&&isRapidReady(selectedItem)?catalogueToRapidPanel(selectedItem):RAPID_TEST_PANELS.find(p=>p.id===selectedPanelId)||RAPID_TEST_PANELS[0]);
  const selectTests=(ids:string[])=>{
    setSelectedIds(ids);setFrozenPanel(null);orderRequest.current=crypto.randomUUID();
    const item=catalogueSnapshot?.items.find(test=>test.id===ids[0]);
    if(item){setQuotedFee(displayedPrice(item)===null?'':String(displayedPrice(item)));if(isRapidReady(item))handleSelectPanel(catalogueToRapidPanel(item));}
  };

  // Live SLA elapsed timer
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - workflowStartedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [timerActive, workflowStartedAt]);

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
    if (!q) return patients;
    return patients
      .filter(
        (p) =>
          p.fullName?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q)
      )
      ;
  }, [patients, patientSearch]);

  const handleSelectExistingPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
    setPatientName(p.fullName);
    setPatientPhone(p.phone || '');setPatientEmail((p as any).email||'');
    setPatientAge(p.dob ? String(Math.max(0, Math.floor((Date.now() - Date.parse(p.dob)) / 31557600000))) : '');
    const g = (p as any).gender || (p as any).sex;
    setPatientGender(g === 'Female' ? 'Female' : 'Male');
    setPatientAllergies((p.allergies || []).join(', '));
    toast.success(`Selected ${p.fullName} (${p.mrn})`);
  };

  const handleSelectPanel = (panel: RapidPanelPreset) => {
    setSelectedPanelId(panel.id);setPanelLabel(panel.name);
    setSampleType(panel.sampleType);
    setTubeColor(panel.tubeColor);
    setParameters(panel.parameters.map((p) => ({ ...p, value: '' })));
    setAiReport(null);
    setIsApproved(false);
    setApprovalMode(null);
  };

  // Step 1 -> Step 2
  const handleCompleteRegistration = async () => {
    if(ordering)return;
    if(!catalogueSnapshot || !selectedIds.length){toast.error("Load the catalogue and select a test first.");return;}
    if (!patientName.trim()) {
      toast.error('Enter patient full name or select an existing patient.');
      return;
    }

    if (quotedFee.trim() && (!Number.isFinite(Number(quotedFee)) || Number(quotedFee) < 0)) { toast.error('Enter a valid quoted test fee or leave it unquoted.'); return; }
    const uid = generateSampleUid();
    setWorkflowStartedAt(Date.now());
    setSampleUid(uid);
    setElapsedSeconds(0);
    setTimerActive(true);
    setCustodyVerified(false);
    setAiReport(null);
    setIsApproved(false);
    setApprovalMode(null);
    setDispatchResult(null);setSavedReport(null);setReleaseError('');
    setRxHandoffResult(null);

    let pid = selectedPatientId;
    if (!pid) {
      pid = `pat-${crypto.randomUUID()}`;
      setSelectedPatientId(pid);
      onRegisterPatient?.({
        id: pid,
        mrn: `MRN-${Math.floor(10000 + Math.random() * 89999)}`,
        fullName: patientName.trim(),
        phone: patientPhone.trim(),email:patientEmail.trim(),
        gender: patientGender,
        dob: patientAge.trim() ? `${new Date().getFullYear() - Number(patientAge)}-01-01` : undefined,
        allergies: patientAllergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        chronicConditions: [],
        createdAt: new Date().toISOString()
      } as any);
    }

    if(!rapidSelection){
      setOrdering(true);
      try{const bundle=await createCatalogueOrder(catalogueScope,currentUser,catalogueSnapshot.revision,selectedIds,{id:pid,fullName:patientName.trim(),phone:patientPhone,mrn:patients.find(p=>p.id===pid)?.mrn||pid},orderRequest.current);
        onCatalogueOrders(bundle);toast.success(bundle.orders.length+' tests ordered');orderRequest.current=crypto.randomUUID();onNavigate?.(bundle.orders.every((o:any)=>o.department==='Radiology')?'radiology':'lab');
      }catch(error:any){toast.error(error.message);onRefreshCatalogue();}finally{setOrdering(false);}return;
    }
    setPatientName(patientName.trim());setPatientPhone(patientPhone.trim());setPatientEmail(patientEmail.trim());
    setSelectedPanelId(selectedPanel.id);setPanelLabel(selectedPanel.name);setSavedReport(null);setReleaseError('');
    setFrozenPanel(selectedPanel);
    toast.success(`Express Accession Created: ${uid}`, {
      description: `${patientName.trim()} — ${selectedPanel.name}`
    });
    setStep(2);
  };

  // Pull automated analyzer packet into Step 3
  const handleLoadInstrumentPacket = (pkt: InstrumentWebhookPacket) => {
    if (!pkt.accessionNumber || pkt.accessionNumber !== sampleUid) {
      toast.error('Instrument readings do not match this sample.');
      return;
    }
    setIsApproved(false);
    setApprovalMode(null);
    setParameters(pkt.parameters.map((p) => ({ ...p })));
    setIntakeSource('instrument_webhook');
    setInstrumentId(pkt.instrumentId);
    setAiReport(null);
    toast.success(`Synced live readings from ${pkt.instrumentModel}`);
  };

  // Update individual parameter
  const handleParamChange = (idx: number, field: keyof RapidLabParameter, val: string) => {
    setIsApproved(false);
    setApprovalMode(null);
    setAiReport(null);
    setParameters((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [field]: val };
        if (field === 'value') {
          const lower = val.toLowerCase();
          if (lower.includes('neg') || /non[- ]?react/.test(lower)) next.flag = 'Negative';
          else if (lower.includes('pos') || lower.includes('react')) next.flag = 'Positive';
        }
        return next;
      })
    );
  };

  // Step 3: Run TekiLab AI Analysis
  const handleRunAIAnalysis = async () => {
    if (!custodyVerified || !parameters.length || parameters.some(p => !p.value.trim()) || selectedPanel.parameters.some(required => !parameters.some(p => p.name === required.name && p.value.trim()))) {
      toast.error('Confirm the sample and enter every required measured result first.');
      return;
    }
    setIsApproved(false);
    setApprovalMode(null);
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
      setFindingsHtml(textToFindings(analysis.clinicalSummary));

      setIsApproved(false);
      setApprovalMode(null);
      toast.info(analysis.severity === 'critical' ? 'Critical result: urgent professional review required.' : 'AI check complete. A professional must review and approve the result.');
      setStep(4);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to run AI verification.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 4: Pathologist Sign-off
  const handleSignOff = () => {
    if (!canApproveReport(currentUser, critical) || !approvalMatches(reportApproval, reportSnapshot, currentUser)) { toast.error('Sign this specific report as an authorized reviewer first.'); return; }
    if (!custodyVerified || !parameters.length || parameters.some(p => !p.value.trim())) {
      toast.error('Complete the sample and result review first.');
      return;
    }
    if (!approvedBy.trim() || approvedBy !== (currentUser?.name || currentUser?.displayName)) {
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
    if (dispatchResult) return;
    if (!approvalMatches(reportApproval, reportSnapshot, currentUser) || !isApproved || approvalMode !== 'PATHOLOGIST_SIGNED' || !custodyVerified || parameters.some(p => !p.value.trim())) {
      toast.error('An approved, complete result is required.');
      return;
    }
    setIsDispatching(true);setReleaseError('');
    try{
      const json=await qrRequest('/rapid-release',{approval:reportApproval},catalogueScope,currentUser);
      onCatalogueOrders(json);setSavedReport(json.order);setTimerActive(false);
      setDispatchResult({pdfReportNumber:json.pdfReportNumber,whatsappUrl:json.whatsappUrl||'',slaMet:elapsedSeconds<=600,turnaroundSeconds:Math.max(elapsedSeconds,1),verification:json.verification,delivery:json.delivery,deliveryWarning:json.deliveryWarning});
      const record:any={...json.order,parameters,pdfReportNumber:json.pdfReportNumber,whatsappDispatch:{pdfReportNumber:json.pdfReportNumber,slaMet:elapsedSeconds<=600,turnaroundSeconds:Math.max(elapsedSeconds,1),dispatched:false}};
      const history=[record,...recentDispatches.filter((item:any)=>item.id!==record.id)].slice(0,12);setRecentDispatches(history);localStorage.setItem('tekilab_rapid_dispatches_v2',JSON.stringify(history));
      toast.success('Approved result saved with its verification QR.');
      if(json.deliveryWarning)toast.warning(json.deliveryWarning);
    }catch(error:any){setReleaseError(error.message||'The result was not confirmed saved. Retry without repeating the test.');toast.error(error.message||'Could not save the approved result.');}
    finally{setIsDispatching(false);}
  };

  // Download branded PDF
  const handleDownloadPDF = () => {
    if (!approvalMatches(reportApproval, reportSnapshot, currentUser) || !isApproved || approvalMode !== 'PATHOLOGIST_SIGNED') { toast.error('Approve the result first.'); return; }
    const mappedResults: Record<string, { value: string; unit?: string; referenceRange?: string; flag: string }> = {};
    parameters.forEach((p) => {
      mappedResults[p.name] = { value: p.value, unit: p.unit, referenceRange: p.referenceRange, flag: p.flag };
    });

    const saved=savedReport||labOrders.find(order=>order.accessionNumber===sampleUid&&order.orderStatus==='RELEASED');
    if(!saved){toast.error('Save the approved report before downloading it.');return;}
    generateLabReportPDF(saved,patients.find(p=>p.id===saved.patientId),companyLogo).then(()=>toast.success('Official TekiLab PDF report downloaded')).catch(error=>toast.error(error.message));

  };

  // Direct Diagnostic-to-Pharmacy Handoff (works even when Pharmacy UI is muted!)
  // Start Next Rapid Sample
  const handleResetWorkflow = () => {
    setStep(1);setFrozenPanel(null);orderRequest.current=crypto.randomUUID();
    setWorkflowStartedAt(Date.now()); setQuotedFee('');
    setFindingsHtml(''); setApprovalNotes(''); setReportApproval(null);
    setSelectedPatientId('');
    setPatientName('');
    setPatientPhone('');
    setPatientAllergies('');
    setSampleUid(generateSampleUid());
    setParameters(selectedPanel.parameters.map((p) => ({ ...p, value: '' })));
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
      <div className="sticky top-0 z-20 bg-white/95 border-b py-3"><h1 className="text-4xl font-black tracking-tight">New Test</h1></div>
      {/* Minimalist White / Blue / Black Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>TekiLab Rapid LIMS Engine</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-500 font-mono">{sampleUid}</span>
          </div>
          <h2 className="font-bold text-xl">Test order and rapid workflow</h2><button type="button" onClick={()=>onNavigate?.('radiology')} className="font-bold text-blue-700 underline">Open Radiology / Scans</button>
          <p className="text-sm text-neutral-500">
            Register a patient, collect a sample, enter results and send the approved report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Live SLA Stopwatch */}
          <div className={rapidSelection || step>1 ? "px-4 py-2.5 rounded-xl bg-neutral-950 text-white flex items-center gap-3":"hidden"}>
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
      <div className={rapidSelection || step>1 ? "bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs":"hidden"}>
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < step && !dispatchResult) {
                    setIsApproved(false);
                    setApprovalMode(null);
                    setStep(s.num);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-3 p-1 sm:p-3 rounded-xl text-left transition-all border cursor-pointer ${
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
                <div className="min-w-0 w-full text-center sm:text-left">
                  <div className="text-[10px] sm:text-xs font-semibold break-words">{s.label}</div>
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
                  <h2 className="text-base font-bold text-neutral-950">1. Patient Details</h2>
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

            <div className="space-y-1.5">
              <label htmlFor="rapid-patient-select" className="block text-xs font-semibold text-neutral-700">Select existing patient</label>
              <select id="rapid-patient-select" value={filteredPatients.some(p => p.id === selectedPatientId) ? selectedPatientId : ''} onChange={(e) => { const patient = filteredPatients.find(p => p.id === e.target.value); if (patient) handleSelectExistingPatient(patient); }} className="w-full h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-blue-500">
                <option value="" disabled>{filteredPatients.length ? 'Choose a patient' : 'No matching patients'}</option>
                {filteredPatients.map((p, index) => (
                  <option key={p.id} value={p.id}>{index + 1}. {p.fullName} — {p.mrn || 'No MRN'}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500">Search above to narrow the list, then select a patient by name and record number.</p>
            </div>
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

          <div className="lg:col-span-7 bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
            <TestOrderPicker items={catalogueSnapshot?.items||[]} selectedIds={selectedIds} onChange={selectTests} onManage={()=>setManagerOpen(true)} canManage={caps.manageTests||caps.managePrices} error={catalogueError} onRetry={onRefreshCatalogue}/>
            {rapidSelection && <div><label className="text-xs font-semibold">Quoted test fee (NGN, optional)</label><Input aria-label="Quoted test fee" type="number" min="0" step="0.01" disabled={!caps.managePrices} value={quotedFee} onChange={e=>setQuotedFee(e.target.value)}/></div>}
            <p className="text-xs text-slate-500">Published fees are reference prices. Confirm availability, method and facility fee before collection. Only reviewed rapid templates use the rapid result steps; other tests go to the laboratory worklist.</p>
            <Button disabled={ordering||!catalogueSnapshot||!selectedIds.length} onClick={handleCompleteRegistration}>{ordering?'Saving…':rapidSelection?'Register & Generate Sample UID':'Place test order'}</Button>
          </div>
          {catalogueSnapshot && <TestCatalogueManager open={managerOpen} onClose={()=>setManagerOpen(false)} snapshot={catalogueSnapshot} scope={catalogueScope} actor={currentUser} onRefresh={onRefreshCatalogue}/>}

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
                    TekiLab Specimen UID
                  </div>
                  <div className="text-xl font-mono font-extrabold text-neutral-950 tracking-tight">
                    {sampleUid}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">{patientName || 'Walk-in Patient'}</div>
                  <div className="text-xs text-neutral-600">{selectedPanel.name}</div>
                </div>
                <div className="w-24 h-24 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                  <SpecimenCode value={sampleUid} />
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
                  downloadSpecimenLabel(sampleUid, patientName, selectedPanel.name).catch(() => toast.error('Could not generate the specimen label.'));
                }}
                className="h-10 rounded-xl border-neutral-200"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Download Label
              </Button>
            </div>
          </div>

          {/* Chain of Custody Form */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950">Confirm Sample Collection</h2>
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
                  if (!custodyVerified) { toast.error('Confirm sample collection first.'); return; }
                  setStep(3);
                }}
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Enter Results
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
                <h2 className="text-base font-bold text-neutral-950">3. Enter Results — {selectedPanel.name}</h2>
                <p className="text-xs text-neutral-500">
                  Enter measured results, then review manually or request an advisory check. Human approval is always required.
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

            <div className="pt-3 border-t border-neutral-100 flex flex-wrap gap-2 items-center justify-between">
              <Button variant="outline" onClick={() => { if (!custodyVerified || !parameters.length || parameters.some(p => !p.value.trim())) { toast.error('Enter every measured result and verify sample custody first.'); return; } setStep(4); }}>Review without AI</Button>
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
                {isAnalyzing ? 'Running TekiLab AI Engine...' : 'Check Results'}
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
                  4. Review Results
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
                    : 'No AI flags — review required'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="text-xs font-bold text-neutral-700">Patient-Friendly Clinical Summary</div>
              <p className="text-sm text-neutral-800 leading-relaxed">
                {aiReport?.clinicalSummary || 'No AI summary available.'}
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

            <Button variant="outline" onClick={() => generateAIReviewPDF({ accessionNumber: sampleUid, testName: selectedPanel.name, parameters, analysis: aiReport, notes: approvalNotes })}>Download detailed review worksheet</Button>
            <p className="text-xs text-amber-800">AI output is advisory. It cannot approve reports or prescribe medication. Review every observation independently.</p>
            {/* AI-Suggested Prescription Protocol */}
            {aiReport?.aiSuggestedDrug && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <Pill className="w-4 h-4" />
                    AI medication suggestion — requires clinician review
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
                      : 'All results require professional approval.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Validating Scientist / Pathologist</label>
                <Input
                  value={approvedBy}
                  readOnly
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Clinical Interpretation Note</label>
                <FindingsEditor label="Rapid test findings" value={findingsHtml || textToFindings(approvalNotes)} onChange={(html, text) => { setFindingsHtml(html); setApprovalNotes(text); }} />
                <div className="space-y-2 border rounded-xl p-3">
                  <label className="block text-sm">Patient email<Input aria-label="Result delivery email" type="email" value={patientEmail} onChange={e=>setPatientEmail(e.target.value)}/></label>
                  <label className="block text-sm">Patient mobile<Input aria-label="Result delivery phone" value={patientPhone} onChange={e=>setPatientPhone(e.target.value)}/></label>
                  <p className="text-xs">Confirm the patient's choices before signing. Each link opens the full approved result.</p>
                  <label className="flex gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={e=>setSendEmail(e.target.checked)}/>Patient requests result by email</label>
                  <label className="flex gap-2 text-sm"><input type="checkbox" checked={sendWhatsApp} onChange={e=>setSendWhatsApp(e.target.checked)}/>Patient requests result by WhatsApp</label>
                  <label className="flex gap-2 text-sm"><input type="checkbox" checked={consultationRequested} onChange={e=>setConsultationRequested(e.target.checked)}/>Patient requests doctor consultation after this result</label>
                </div>
                <ReportSignature snapshot={reportSnapshot} user={currentUser} enabled={canApproveReport(currentUser, critical) && custodyVerified && parameters.every(p => p.value.trim())} onApprove={setReportApproval} />
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
                <h3 className="text-sm font-bold text-neutral-950">Save Report &amp; Prepare Notification</h3>
                <p className="text-xs text-neutral-600">
                  Save the approved report, patient result and verification QR. Requested notifications are queued separately; delivery is shown only when confirmed.
                </p>
              </div>
              {dispatchResult ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-blue-700 font-semibold">
                    ✓ {dispatchResult.pdfReportNumber} · TAT {formatElapsedTime(dispatchResult.turnaroundSeconds)}
                  </div>
                  <a
                    hidden={!dispatchResult.whatsappUrl}
                    href={dispatchResult.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    Open WhatsApp Notification
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
                  {isDispatching ? 'Saving…' : 'Save Approved Report'}
                </Button>
              )}
            </div>

<div className="p-5 rounded-2xl border border-neutral-200 space-y-3">
  <h3 className="font-semibold text-sm">Clinician follow-up</h3>
  <p className="text-xs text-neutral-600">When the patient requests consultation before signing, saving routes this report to Doctor Consultation. Medication requires an independent consultation and prescription.</p>
</div>
          </div>
        </div>
      )}

      {releaseError&&<p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">{releaseError} Your entered measurements remain available.</p>}
      {dispatchResult?.verification&&<section aria-label="Saved verified rapid result" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
        <h3 className="font-bold">Result saved and ready</h3><PatientPortalLink patientId={selectedPatientId}/>
        <p>Saved for this patient. The verified, linked portal account can view the result. {consultationRequested?'Added to Doctor Consultation.':'No consultation was requested.'}</p>
        <a href={dispatchResult.verification.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">Open verified result</a>
        <SpecimenCode value={dispatchResult.verification.url} label="Result authenticity QR code"/>
        {dispatchResult.verification.localOnly&&<p className="text-sm text-amber-800">This verification link is local. Public verification needs the hosted backend and a public HTTPS address.</p>}
        {dispatchResult.delivery?.map((job:any)=><p key={job.id} className="text-sm">{job.channel==='email'?'Email':'WhatsApp'}: {job.status==='accepted'?'Accepted by provider; delivery receipt pending':job.status==='pending_configuration'?'Awaiting configured message service':job.status==='unknown'?'Delivery attempt uncertain; check provider before retrying':job.status}</p>)}
        {dispatchResult.deliveryWarning&&<p role="alert">{dispatchResult.deliveryWarning}</p>}
      </section>}
      {/* Recent Rapid Dispatches Table */}
      {recentDispatches.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-950">Recent Results</h3>
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
          if (code !== sampleUid) { toast.error('Barcode does not match the current sample.'); return; }
          setCustodyVerified(true);
          setIntakeSource('barcode_scan');
          toast.success(`Scanned Specimen Barcode: ${code}`);
        }}
      />
    </div>
  );
}
