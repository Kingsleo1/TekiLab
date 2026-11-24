import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, 
  Activity, 
  FileText, 
  Pill, 
  FlaskConical, 
  FileSearch, 
  Plus, 
  Check, 
  Trash2, 
  Search, 
  User, 
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Download,
  Database,
  ArrowRight,
  Share2,
  Bookmark,
  CheckCircle2,
  Calendar,
  Building2,
  Bed,
  CreditCard,
  History,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  X,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  PatientRecord, 
  Product, 
  ClinicalEncounter, 
  PrescribedMedication, 
  LabTestCatalogItem, 
  ImagingTestCatalogItem,
  DiagnosisItem
} from '../../types/pharmacy';
import { 
  COMPREHENSIVE_DIAGNOSES, 
  ALPHABET_LETTERS, 
  DIAGNOSIS_CATEGORIES, 
  LAB_CATEGORIES, 
  IMAGING_MODALITIES, 
  filterDiagnoses, 
  filterLabTests, 
  filterImagingTests 
} from '../../lib/medical-catalog';
import { generateClinicalEncounterPDF } from '../../lib/reporting-utils';
import { AstraDatabaseSetupModal } from './admin/AstraDatabaseSetupModal';
import { isAstraConfigured } from '../../lib/astra';
import { toast } from 'sonner';

interface ClinicalEMRViewProps {
  patients: PatientRecord[];
  products: Product[];
  labCatalog: LabTestCatalogItem[];
  imagingCatalog: ImagingTestCatalogItem[];
  encounters?: ClinicalEncounter[];
  initialPatientId?: string;
  onSaveEncounter: (encounter: ClinicalEncounter) => void;
  onRequestLabTest: (testId: string, patient: PatientRecord, encounterId: string, customItem?: LabTestCatalogItem) => void;
  onRequestImagingScan: (testId: string, patient: PatientRecord, encounterId: string, customItem?: ImagingTestCatalogItem) => void;
  onTransferPatient?: (patient: PatientRecord, targetDepartment: string, notes?: string) => void;
  currentUser?: any;
}

const DEPARTMENTS = [
  { id: 'Pharmacy', name: 'Hospital Pharmacy & Dispensary', icon: Pill, color: 'text-emerald-500', desc: 'Direct electronic prescription queue & medication dispense' },
  { id: 'Laboratory', name: 'Diagnostic Laboratory (LIMS)', icon: FlaskConical, color: 'text-purple-500', desc: 'Blood, urine & specimen collection accessioning' },
  { id: 'Radiology', name: 'Radiology & Imaging Suite', icon: FileSearch, color: 'text-sky-500', desc: 'X-Ray, Ultrasound, CT & MRI modality queue' },
  { id: 'Inpatient Ward', name: 'Inpatient Wards & Admission', icon: Bed, color: 'text-amber-500', desc: 'Bed grid assignment, nurse triage & ADT workflow' },
  { id: 'Billing', name: 'Cashier & HMO Insurance Billing', icon: CreditCard, color: 'text-blue-500', desc: 'Patient invoice reconciliation and claims adjudication' }
];

export function ClinicalEMRView({
  patients,
  products,
  labCatalog,
  imagingCatalog,
  encounters = [],
  initialPatientId,
  onSaveEncounter,
  onRequestLabTest,
  onRequestImagingScan,
  onTransferPatient,
  currentUser
}: ClinicalEMRViewProps) {
  // Selected Patient State
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(() => {
    if (initialPatientId) {
      const found = patients.find(p => p.id === initialPatientId);
      if (found) return found;
    }
    return patients[0] || null;
  });

  // Active Left Sidebar Tab (Triage Vitals vs Past Medical History)
  const [activeSideTab, setActiveSideTab] = useState<'vitals' | 'history'>('vitals');

  // Consultation SOAP Form State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  
  // A-Z Primary Diagnosis State & Search
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<{
    id?: string;
    name: string;
    code: string;
    category?: string;
    letter?: string;
    severity?: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
    description?: string;
    isCustom?: boolean;
  } | null>(COMPREHENSIVE_DIAGNOSES[0]);
  
  const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState('');
  const [selectedAlphabetLetter, setSelectedAlphabetLetter] = useState('ALL');
  const [selectedDiagnosisCategory, setSelectedDiagnosisCategory] = useState('ALL');
  const [isDiagnosisPickerOpen, setIsDiagnosisPickerOpen] = useState(false);
  
  // Custom Condition Mode
  const [isCustomDiagnosisMode, setIsCustomDiagnosisMode] = useState(false);
  const [customDiagnosisName, setCustomDiagnosisName] = useState('');
  const [customDiagnosisCode, setCustomDiagnosisCode] = useState('');
  const [customDiagnosisCategory, setCustomDiagnosisCategory] = useState('Clinical Observation');
  const [customDiagnosisSeverity, setCustomDiagnosisSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Moderate');
  const [customDiagnosisDesc, setCustomDiagnosisDesc] = useState('');

  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Vitals State
  const [vitals, setVitals] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    pulseRate: 78,
    temperatureCelsius: 36.8,
    respiratoryRate: 18,
    spO2: 99,
    weightKg: 70,
    heightCm: 175,
    bloodGlucoseMgDl: 95
  });

  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<PrescribedMedication[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Product | null>(products[0] || null);
  const [dosage, setDosage] = useState('1 tablet');
  const [frequency, setFrequency] = useState('TDS (3x daily)');
  const [durationDays, setDurationDays] = useState(3);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('Take after food.');

  // Lab & Imaging Order selections
  const [selectedLabTestIds, setSelectedLabTestIds] = useState<string[]>([]);
  const [selectedImagingTestIds, setSelectedImagingTestIds] = useState<string[]>([]);

  // Laboratory Search & Custom Test State
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [selectedLabCategory, setSelectedLabCategory] = useState('ALL');
  const [customLabList, setCustomLabList] = useState<LabTestCatalogItem[]>([]);
  const [isCustomLabModalOpen, setIsCustomLabModalOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabCategory, setNewLabCategory] = useState('Chemical Pathology');
  const [newLabSample, setNewLabSample] = useState('Venous Blood');
  const [newLabPrice, setNewLabPrice] = useState(3500);

  // Diagnostic Imaging Search & Custom Scan State
  const [imagingSearchQuery, setImagingSearchQuery] = useState('');
  const [selectedImagingModality, setSelectedImagingModality] = useState('ALL');
  const [customImagingList, setCustomImagingList] = useState<ImagingTestCatalogItem[]>([]);
  const [isCustomImagingModalOpen, setIsCustomImagingModalOpen] = useState(false);
  const [newImgName, setNewImgName] = useState('');
  const [newImgModality, setNewImgModality] = useState('Ultrasound');
  const [newImgSite, setNewImgSite] = useState('Abdomen');
  const [newImgPrice, setNewImgPrice] = useState(12000);

  // Department Transfer & Routing State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTargetDept, setSelectedTargetDept] = useState<string>('Pharmacy');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Past Encounter Preview Modal
  const [previewPastEncounter, setPreviewPastEncounter] = useState<ClinicalEncounter | null>(null);

  // Astra DB Setup Modal State
  const [showAstraModal, setShowAstraModal] = useState(false);
  const [isAstraReady, setIsAstraReady] = useState(isAstraConfigured());

  // Update selected patient if initialPatientId changes
  useEffect(() => {
    if (initialPatientId) {
      const match = patients.find(p => p.id === initialPatientId);
      if (match) setSelectedPatient(match);
    }
  }, [initialPatientId, patients]);

  // Retrieve patient longitudinal history
  const patientHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return encounters
      .filter(e => e.patientId === selectedPatient.id || e.mrn === selectedPatient.mrn)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedPatient, encounters]);

  const handleAddMedication = () => {
    if (!selectedDrug) {
      toast.error('Select a drug from the pharmacy inventory catalog.');
      return;
    }

    const newRx: PrescribedMedication = {
      id: `rx-${Date.now()}`,
      productId: selectedDrug.id,
      drugName: selectedDrug.name,
      genericName: selectedDrug.genericName || selectedDrug.name,
      dosage,
      frequency,
      durationDays,
      quantity,
      unitPrice: selectedDrug.price,
      instructions,
      status: 'Pending Dispense'
    };

    setPrescriptions(prev => [...prev, newRx]);
    toast.success(`Prescribed: ${selectedDrug.name}`);
  };

  const handleRemoveMedication = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };

  // 1. Filtered Diagnoses List based on Search Query, Alphabet Letter, and Category
  const filteredDiagnosesList = useMemo(() => {
    return filterDiagnoses(
      COMPREHENSIVE_DIAGNOSES,
      diagnosisSearchQuery,
      selectedAlphabetLetter,
      selectedDiagnosisCategory
    );
  }, [diagnosisSearchQuery, selectedAlphabetLetter, selectedDiagnosisCategory]);

  // 2. All Available Lab Tests (combining labCatalog and custom session labs)
  const allAvailableLabs = useMemo(() => {
    const customIds = new Set(customLabList.map(c => c.id));
    return [...customLabList, ...labCatalog.filter(l => !customIds.has(l.id))];
  }, [labCatalog, customLabList]);

  const filteredLabTestsList = useMemo(() => {
    return filterLabTests(allAvailableLabs, labSearchQuery, selectedLabCategory);
  }, [allAvailableLabs, labSearchQuery, selectedLabCategory]);

  // 3. All Available Imaging & Scans (combining imagingCatalog and custom session scans)
  const allAvailableImaging = useMemo(() => {
    const customIds = new Set(customImagingList.map(c => c.id));
    return [...customImagingList, ...imagingCatalog.filter(i => !customIds.has(i.id))];
  }, [imagingCatalog, customImagingList]);

  const filteredImagingTestsList = useMemo(() => {
    return filterImagingTests(allAvailableImaging, imagingSearchQuery, selectedImagingModality);
  }, [allAvailableImaging, imagingSearchQuery, selectedImagingModality]);

  // 4. Total Price Calculations
  const totalLabEstimatedPrice = useMemo(() => {
    return selectedLabTestIds.reduce((sum, testId) => {
      const found = allAvailableLabs.find(l => l.id === testId);
      return sum + (found?.priceNaira || 0);
    }, 0);
  }, [selectedLabTestIds, allAvailableLabs]);

  const totalImagingEstimatedPrice = useMemo(() => {
    return selectedImagingTestIds.reduce((sum, testId) => {
      const found = allAvailableImaging.find(i => i.id === testId);
      return sum + (found?.priceNaira || 0);
    }, 0);
  }, [selectedImagingTestIds, allAvailableImaging]);

  // Handler for custom diagnosis apply
  const handleApplyCustomDiagnosis = () => {
    if (!customDiagnosisName.trim()) {
      toast.error('Please enter the health condition or ailment name.');
      return;
    }
    const customDx = {
      id: `custom-dx-${Date.now()}`,
      name: customDiagnosisName.trim(),
      code: customDiagnosisCode.trim().toUpperCase() || 'R69 (Unspecified)',
      category: customDiagnosisCategory || 'Clinical Observation',
      letter: (customDiagnosisName.trim()[0] || 'C').toUpperCase(),
      severity: customDiagnosisSeverity,
      description: customDiagnosisDesc.trim() || 'Clinician documented custom diagnostic observation.',
      isCustom: true
    };
    setSelectedDiagnosis(customDx);
    setIsCustomDiagnosisMode(false);
    setCustomDiagnosisName('');
    setCustomDiagnosisCode('');
    setCustomDiagnosisDesc('');
    setIsDiagnosisPickerOpen(false);
    toast.success(`Custom diagnosis "${customDx.name}" assigned as Primary Diagnosis.`);
  };

  // Handler for creating a custom lab test
  const handleCreateCustomLab = () => {
    if (!newLabName.trim()) {
      toast.error('Please enter the lab examination name.');
      return;
    }
    const newLab: LabTestCatalogItem = {
      id: `cust-lab-${Date.now()}`,
      code: `LAB-CUST-${Math.floor(100 + Math.random() * 900)}`,
      name: newLabName.trim(),
      category: newLabCategory,
      sampleType: newLabSample || 'Specimen',
      turnaroundTimeHours: 2,
      priceNaira: Number(newLabPrice) || 3000,
      isActive: true
    };
    setCustomLabList(prev => [newLab, ...prev]);
    setSelectedLabTestIds(prev => [...prev, newLab.id]);
    setIsCustomLabModalOpen(false);
    setNewLabName('');
    toast.success(`Custom lab examination "${newLab.name}" added to order.`);
  };

  // Handler for creating a custom imaging test
  const handleCreateCustomImaging = () => {
    if (!newImgName.trim()) {
      toast.error('Please enter the scan or diagnostic examination name.');
      return;
    }
    const newImg: ImagingTestCatalogItem = {
      id: `cust-img-${Date.now()}`,
      code: `RAD-CUST-${Math.floor(100 + Math.random() * 900)}`,
      name: newImgName.trim(),
      modality: newImgModality,
      bodySite: newImgSite || 'General',
      priceNaira: Number(newImgPrice) || 12000,
      instructions: 'Standard clinical preparation.'
    };
    setCustomImagingList(prev => [newImg, ...prev]);
    setSelectedImagingTestIds(prev => [...prev, newImg.id]);
    setIsCustomImagingModalOpen(false);
    setNewImgName('');
    toast.success(`Custom diagnostic scan "${newImg.name}" added to order.`);
  };

  const handleToggleLab = (id: string) => {
    setSelectedLabTestIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleImaging = (id: string) => {
    setSelectedImagingTestIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRepeatPastPrescriptions = (pastRx: PrescribedMedication[]) => {
    if (!pastRx || pastRx.length === 0) {
      toast.info('No medications listed in this previous visit.');
      return;
    }
    setPrescriptions(prev => [...prev, ...pastRx.map(p => ({ ...p, id: `rx-${Date.now()}-${Math.random()}` }))]);
    toast.success(`Added ${pastRx.length} medications from past consultation to current prescription.`);
  };

  // 1. SAVE AS IN-PROGRESS DRAFT (So clinician can pause and resume later)
  const handleSaveDraft = () => {
    if (!selectedPatient) {
      toast.error('Please select a patient.');
      return;
    }

    const encounterId = `enc-${Date.now()}`;
    const encounter: ClinicalEncounter = {
      id: encounterId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      mrn: selectedPatient.mrn,
      doctorId: currentUser?.uid || 'doc-101',
      doctorName: currentUser?.displayName || 'Dr. Evelyn Vance (Chief Clinician)',
      department: 'General Outpatient (OPD)',
      encounterType: 'OPD Consultation',
      chiefComplaint: chiefComplaint || 'Consultation in progress (Draft)',
      historyPresentingIllness: hpi,
      vitals: {
        ...vitals,
        bmi: parseFloat((vitals.weightKg / Math.pow(vitals.heightCm / 100, 2)).toFixed(1)),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.displayName || 'Consulting Clinician'
      },
      physicalExamNotes: physicalExam,
      primaryDiagnosis: selectedDiagnosis ? selectedDiagnosis.name : 'Clinical Evaluation in Progress',
      icdCode: selectedDiagnosis ? selectedDiagnosis.code : 'Z00.00',
      treatmentPlan,
      prescriptions,
      requestedLabTests: selectedLabTestIds,
      requestedImagingScans: selectedImagingTestIds,
      status: 'In Progress',
      createdAt: new Date().toISOString()
    };

    onSaveEncounter(encounter);
    toast.success(`Consultation saved as in-progress draft for ${selectedPatient.fullName}.`);
    toast.info('Record charted into longitudinal medical history.');
  };

  // 2. COMPLETE & SIGN CONSULTATION (Finalized + PDF)
  const handleCompleteEncounter = () => {
    if (!selectedPatient) {
      toast.error('Select a patient to record consultation.');
      return;
    }
    if (!chiefComplaint.trim() || !selectedDiagnosis) {
      toast.error('Chief complaint and primary diagnosis are required.');
      return;
    }

    const encounterId = `enc-${Date.now()}`;
    const encounter: ClinicalEncounter = {
      id: encounterId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      mrn: selectedPatient.mrn,
      doctorId: currentUser?.uid || 'doc-101',
      doctorName: currentUser?.displayName || 'Dr. Evelyn Vance (Chief Clinician)',
      department: 'General Outpatient (OPD)',
      encounterType: 'OPD Consultation',
      chiefComplaint,
      historyPresentingIllness: hpi,
      vitals: {
        ...vitals,
        bmi: parseFloat((vitals.weightKg / Math.pow(vitals.heightCm / 100, 2)).toFixed(1)),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.displayName || 'Consulting Clinician'
      },
      physicalExamNotes: physicalExam,
      primaryDiagnosis: selectedDiagnosis.name,
      icdCode: selectedDiagnosis.code,
      treatmentPlan,
      prescriptions,
      requestedLabTests: selectedLabTestIds,
      requestedImagingScans: selectedImagingTestIds,
      status: 'Completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    onSaveEncounter(encounter);

    // Trigger lab order creation
    selectedLabTestIds.forEach(testId => {
      const customItem = customLabList.find(c => c.id === testId);
      onRequestLabTest(testId, selectedPatient, encounterId, customItem);
    });

    // Trigger imaging order creation
    selectedImagingTestIds.forEach(testId => {
      const customItem = customImagingList.find(c => c.id === testId);
      onRequestImagingScan(testId, selectedPatient, encounterId, customItem);
    });

    toast.success(`Encounter finalized! Record saved to patient medical history.`);
    generateClinicalEncounterPDF(encounter, selectedPatient);
    toast.info('Downloading official EMR Consultation Summary PDF with Teki Med logo...');

    // Reset Form
    resetForm();
  };

  // 3. COMPLETE & TRANSFER TO NEXT DEPARTMENT (Pharmacy, Lab, Radiology, Ward, Billing)
  const handleExecuteTransfer = () => {
    if (!selectedPatient) {
      toast.error('Select a patient.');
      return;
    }
    if (!chiefComplaint.trim()) {
      toast.error('Please enter the chief complaint before transferring.');
      return;
    }

    setIsSubmittingTransfer(true);
    const encounterId = `enc-${Date.now()}`;
    const encounter: ClinicalEncounter = {
      id: encounterId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      mrn: selectedPatient.mrn,
      doctorId: currentUser?.uid || 'doc-101',
      doctorName: currentUser?.displayName || 'Dr. Evelyn Vance (Chief Clinician)',
      department: 'General Outpatient (OPD)',
      encounterType: 'OPD Consultation',
      chiefComplaint,
      historyPresentingIllness: hpi,
      vitals: {
        ...vitals,
        bmi: parseFloat((vitals.weightKg / Math.pow(vitals.heightCm / 100, 2)).toFixed(1)),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.displayName || 'Consulting Clinician'
      },
      physicalExamNotes: physicalExam,
      primaryDiagnosis: selectedDiagnosis?.name || 'Referred for Investigation / Treatment',
      icdCode: selectedDiagnosis?.code || 'Z76.89',
      treatmentPlan: treatmentPlan || `Patient transferred to ${selectedTargetDept}. Notes: ${transferNotes || 'Standard referral'}`,
      prescriptions,
      requestedLabTests: selectedLabTestIds,
      requestedImagingScans: selectedImagingTestIds,
      status: 'Completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    onSaveEncounter(encounter);

    // Trigger lab orders if any
    selectedLabTestIds.forEach(testId => {
      const customItem = customLabList.find(c => c.id === testId);
      onRequestLabTest(testId, selectedPatient, encounterId, customItem);
    });

    // Trigger imaging orders if any
    selectedImagingTestIds.forEach(testId => {
      const customItem = customImagingList.find(c => c.id === testId);
      onRequestImagingScan(testId, selectedPatient, encounterId, customItem);
    });

    // Execute transfer callback
    if (onTransferPatient) {
      onTransferPatient(selectedPatient, selectedTargetDept, transferNotes || `Referred from OPD: ${encounter.primaryDiagnosis}`);
    }

    toast.success(`Patient ${selectedPatient.fullName} successfully transferred to ${selectedTargetDept}!`);
    generateClinicalEncounterPDF(encounter, selectedPatient);

    setIsSubmittingTransfer(false);
    setShowTransferModal(false);
    setTransferNotes('');
    resetForm();
  };

  const resetForm = () => {
    setChiefComplaint('');
    setHpi('');
    setPhysicalExam('');
    setSelectedDiagnosis(COMPREHENSIVE_DIAGNOSES[0]);
    setDiagnosisSearchQuery('');
    setSelectedAlphabetLetter('ALL');
    setSelectedDiagnosisCategory('ALL');
    setIsCustomDiagnosisMode(false);
    setTreatmentPlan('');
    setPrescriptions([]);
    setSelectedLabTestIds([]);
    setSelectedImagingTestIds([]);
    setLabSearchQuery('');
    setImagingSearchQuery('');
  };

  return (
    <div className="space-y-4 font-sans w-full max-w-7xl mx-auto pb-16">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 text-white p-4 sm:p-6 rounded-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              Doctor EMR Suite • Clinical Consultation
            </Badge>
            <span className="text-xs text-slate-400">
              Longitudinal Health Records & Inter-Department Routing
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2.5">
            <Stethoscope className="w-6 h-6 text-emerald-400" /> 
            Clinician Consultation & Patient EMR
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            Record SOAP progress notes, capture triage vital signs, issue prescriptions linked to live pharmacy stock, order laboratory investigations, and transfer patients seamlessly across departments.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* DataStax Astra DB Credentials Trigger Button */}
          <button
            onClick={() => setShowAstraModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-500/30 shadow-xs transition-all cursor-pointer"
            title="Configure DataStax Astra DB Cassandra CQL Credentials"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Astra DB Sync</span>
            <span className={`w-2 h-2 rounded-full ${isAstraReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <Button 
            onClick={() => setShowTransferModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 shadow-md"
          >
            <Share2 className="w-4 h-4" /> Transfer Department
          </Button>

          <Button 
            onClick={handleCompleteEncounter}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-md"
          >
            <Send className="w-4 h-4" /> Sign & Complete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Active Patient Information, Triage Vitals, & Prior Medical History */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Patient Selector & Demographics Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Consultation Patient
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {patients.length} Total Patients
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <select 
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const p = patients.find(item => item.id === e.target.value);
                  if (p) setSelectedPatient(p);
                }}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>
                ))}
              </select>

              {selectedPatient && (
                <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-2.5 border border-slate-200/80 dark:border-zinc-800 text-xs">
                  <div className="flex justify-between items-start font-bold text-slate-900 dark:text-slate-100">
                    <div>
                      <span className="text-sm block">{selectedPatient.fullName}</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {selectedPatient.sex} • DOB: {selectedPatient.dob}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {selectedPatient.mrn}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 block text-[10px]">Blood Group / Genotype</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedPatient.bloodGroup || 'O+'} / {selectedPatient.genotype || 'AA'}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 block text-[10px]">Previous Visits</span>
                      <span className="font-bold text-emerald-600">
                        {patientHistory.length} Logged Encounters
                      </span>
                    </div>
                  </div>

                  {selectedPatient.allergies.length > 0 ? (
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <div>
                        <strong>Allergies:</strong> {selectedPatient.allergies.join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No drug allergies reported.</div>
                  )}

                  {selectedPatient.insurance && (
                    <div className="text-[11px] bg-emerald-50/70 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>HMO: <strong>{selectedPatient.insurance.provider}</strong></span>
                      <span className="font-mono font-semibold">{selectedPatient.insurance.policyNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Side Tabs: Triage Vitals vs Patient Prior Medical History */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/60 p-1">
              <button
                type="button"
                onClick={() => setActiveSideTab('vitals')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === 'vitals'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                Triage Vitals
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab('history')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === 'history'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5 text-blue-500" />
                Medical History ({patientHistory.length})
              </button>
            </div>

            <CardContent className="p-4">
              {/* TAB A: Triage Vitals */}
              {activeSideTab === 'vitals' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">BP Systolic</label>
                      <Input type="number" value={vitals.bpSystolic} onChange={(e) => setVitals(prev => ({ ...prev, bpSystolic: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">BP Diastolic</label>
                      <Input type="number" value={vitals.bpDiastolic} onChange={(e) => setVitals(prev => ({ ...prev, bpDiastolic: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Pulse (bpm)</label>
                      <Input type="number" value={vitals.pulseRate} onChange={(e) => setVitals(prev => ({ ...prev, pulseRate: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Temp (°C)</label>
                      <Input type="number" step="0.1" value={vitals.temperatureCelsius} onChange={(e) => setVitals(prev => ({ ...prev, temperatureCelsius: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">SpO2 (%)</label>
                      <Input type="number" value={vitals.spO2} onChange={(e) => setVitals(prev => ({ ...prev, spO2: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Blood Glucose (mg/dL)</label>
                      <Input type="number" value={vitals.bloodGlucoseMgDl} onChange={(e) => setVitals(prev => ({ ...prev, bloodGlucoseMgDl: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Weight (kg)</label>
                      <Input type="number" value={vitals.weightKg} onChange={(e) => setVitals(prev => ({ ...prev, weightKg: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">Height (cm)</label>
                      <Input type="number" value={vitals.heightCm} onChange={(e) => setVitals(prev => ({ ...prev, heightCm: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB B: Longitudinal Medical History (Prior Consultations) */}
              {activeSideTab === 'history' && (
                <div className="space-y-3">
                  {patientHistory.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">First Consultation</p>
                      <p className="text-[11px]">No previous visits logged for {selectedPatient?.fullName}. Any encounter saved today will automatically build their permanent longitudinal record.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {patientHistory.map((enc) => (
                        <div
                          key={enc.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {enc.primaryDiagnosis}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(enc.createdAt).toLocaleDateString()} · {enc.doctorName}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {enc.status}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">
                            <strong>Complaint:</strong> {enc.chiefComplaint}
                          </p>

                          {enc.prescriptions && enc.prescriptions.length > 0 && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded">
                              <strong>Medications:</strong> {enc.prescriptions.map(p => p.drugName).join(', ')}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px]">
                            <button
                              onClick={() => setPreviewPastEncounter(enc)}
                              className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> View Summary
                            </button>

                            {enc.prescriptions && enc.prescriptions.length > 0 && (
                              <button
                                onClick={() => handleRepeatPastPrescriptions(enc.prescriptions || [])}
                                className="text-emerald-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                title="Add these past prescriptions to today's order"
                              >
                                <Copy className="w-3 h-3" /> Re-prescribe
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (selectedPatient) generateClinicalEncounterPDF(enc, selectedPatient);
                              }}
                              className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Clinical SOAP, Prescriptions, Lab Orders & Disposition Transfer Console */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Clinical SOAP Notes */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" /> Subjective & Objective Examination (SOAP)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Chief Complaint *
                </label>
                <Input 
                  placeholder="e.g. High grade fever, rigors, joint weakness and headache x 3 days."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  History of Presenting Illness (HPI)
                </label>
                <textarea 
                  className="w-full min-h-[70px] p-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Onset, duration, severity, modifying factors, associated symptoms, appetite..."
                  value={hpi}
                  onChange={(e) => setHpi(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Physical Examination Findings
                </label>
                <textarea 
                  className="w-full min-h-[60px] p-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="General appearance, chest auscultation, cardiovascular, abdomen, neurological signs..."
                  value={physicalExam}
                  onChange={(e) => setPhysicalExam(e.target.value)}
                />
              </div>

              {/* PRIMARY DIAGNOSIS (ICD-10 CLINICAL CODING & AILMENTS A-Z) */}
              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
                      <span>Primary Diagnosis (ICD-10 Clinical Coding) *</span>
                      <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] px-2 py-0.5">
                        {COMPREHENSIVE_DIAGNOSES.length}+ Conditions (A - Z)
                      </Badge>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Search global ICD-10 medical terminology, jump alphabetically, or enter a custom diagnosis.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCustomDiagnosisMode(!isCustomDiagnosisMode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isCustomDiagnosisMode
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCustomDiagnosisMode ? 'Hide Custom Input' : '+ Type Custom Condition'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Diagnosis Form Mode */}
                {isCustomDiagnosisMode && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Enter Custom or Rare Health Condition
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomDiagnosisMode(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Condition / Ailment Name *
                        </label>
                        <Input
                          value={customDiagnosisName}
                          onChange={(e) => setCustomDiagnosisName(e.target.value)}
                          placeholder="e.g. Tropical Pulmonary Eosinophilia, Idiopathic Intracranial Hypertension..."
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ICD-10 Code (Optional)
                        </label>
                        <Input
                          value={customDiagnosisCode}
                          onChange={(e) => setCustomDiagnosisCode(e.target.value)}
                          placeholder="e.g. J82.83 or R69"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Clinical Category
                        </label>
                        <select
                          value={customDiagnosisCategory}
                          onChange={(e) => setCustomDiagnosisCategory(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs font-medium focus:outline-none"
                        >
                          {DIAGNOSIS_CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Clinical Severity
                        </label>
                        <select
                          value={customDiagnosisSeverity}
                          onChange={(e) => setCustomDiagnosisSeverity(e.target.value as any)}
                          className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs font-medium focus:outline-none"
                        >
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleApplyCustomDiagnosis}
                          className="w-full h-9 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Set as Primary Diagnosis
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CURRENTLY SELECTED DIAGNOSIS DISPLAY BANNER */}
                {selectedDiagnosis && (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {selectedDiagnosis.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-bold text-[11px]">
                          {selectedDiagnosis.code}
                        </span>
                        {selectedDiagnosis.category && (
                          <Badge variant="outline" className="text-[10px] bg-white/70 dark:bg-zinc-900/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300">
                            {selectedDiagnosis.category}
                          </Badge>
                        )}
                        {selectedDiagnosis.severity && (
                          <Badge className={`text-[10px] ${
                            selectedDiagnosis.severity === 'Critical' ? 'bg-rose-600 text-white' :
                            selectedDiagnosis.severity === 'Severe' ? 'bg-amber-600 text-white' :
                            selectedDiagnosis.severity === 'Moderate' ? 'bg-blue-600 text-white' :
                            'bg-slate-600 text-white'
                          }`}>
                            {selectedDiagnosis.severity}
                          </Badge>
                        )}
                      </div>
                      {selectedDiagnosis.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {selectedDiagnosis.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDiagnosisPickerOpen(!isDiagnosisPickerOpen)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isDiagnosisPickerOpen ? 'Collapse Browser' : 'Browse / Change (A - Z)'}</span>
                    </button>
                  </div>
                )}

                {/* SEARCH, CATEGORY FILTER & ALPHABET JUMPER DIRECTORY */}
                <div className="space-y-2.5 bg-slate-50/80 dark:bg-zinc-900/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {/* Search Bar & Category Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="relative sm:col-span-8">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={diagnosisSearchQuery}
                        onChange={(e) => {
                          setDiagnosisSearchQuery(e.target.value);
                          if (!isDiagnosisPickerOpen) setIsDiagnosisPickerOpen(true);
                        }}
                        placeholder="Search by ailment name, ICD-10 code (e.g. K35, E11, B50), or keyword..."
                        className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-zinc-950"
                      />
                      {diagnosisSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDiagnosisSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={selectedDiagnosisCategory}
                        onChange={(e) => {
                          setSelectedDiagnosisCategory(e.target.value);
                          if (!isDiagnosisPickerOpen) setIsDiagnosisPickerOpen(true);
                        }}
                        className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-950 px-3 text-xs font-medium focus:outline-none"
                      >
                        {DIAGNOSIS_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'ALL' ? 'All Clinical Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Alphabet Quick Scrubber (A - Z) */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                    <span className="text-slate-400 text-[10px] uppercase font-bold pr-1 shrink-0">A-Z Jump:</span>
                    {ALPHABET_LETTERS.map(letter => {
                      const isActive = selectedAlphabetLetter === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => {
                            setSelectedAlphabetLetter(letter);
                            if (!isDiagnosisPickerOpen) setIsDiagnosisPickerOpen(true);
                          }}
                          className={`min-w-6 h-6 px-1 rounded-md text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  {/* Matching Diagnoses List / Selection Dropdown Panel */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                      <span>Found <strong>{filteredDiagnosesList.length}</strong> diagnoses matching criteria</span>
                      <button
                        type="button"
                        onClick={() => setIsDiagnosisPickerOpen(!isDiagnosisPickerOpen)}
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        {isDiagnosisPickerOpen ? 'Collapse List' : 'Expand Directory'}
                      </button>
                    </div>

                    {isDiagnosisPickerOpen && (
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 shadow-inner">
                        {filteredDiagnosesList.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 space-y-2">
                            <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                            <p className="text-xs font-semibold">No standard diagnoses matching "{diagnosisSearchQuery}"</p>
                            <p className="text-[11px]">Use the "+ Type Custom Condition" button above to document a rare or specialized condition.</p>
                          </div>
                        ) : (
                          filteredDiagnosesList.map((dx) => {
                            const isSelected = selectedDiagnosis?.code === dx.code && selectedDiagnosis?.name === dx.name;
                            return (
                              <button
                                key={dx.id || `${dx.code}-${dx.name}`}
                                type="button"
                                onClick={() => {
                                  setSelectedDiagnosis(dx);
                                  setIsDiagnosisPickerOpen(false);
                                  toast.success(`Selected primary diagnosis: ${dx.name} (${dx.code})`);
                                }}
                                className={`w-full text-left p-2.5 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                                    : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs truncate">
                                      {dx.name}
                                    </span>
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold">
                                      {dx.code}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-200 dark:border-zinc-700">
                                      {dx.category}
                                    </Badge>
                                    {dx.severity && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        dx.severity === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                        dx.severity === 'Severe' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                        dx.severity === 'Moderate' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300'
                                      }`}>
                                        {dx.severity}
                                      </span>
                                    )}
                                  </div>
                                  {dx.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                      {dx.description}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 self-center">
                                  {isSelected ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                      <Check className="w-3 h-3" />
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100">
                                      Select
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Clinical Treatment Plan & Patient Advice
                </label>
                <textarea 
                  className="w-full min-h-[60px] p-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Lifestyle advice, fluid intake, follow-up date, return precautions..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Integrated Prescription Generator */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" /> Prescribe Medications (Hospital Drug Inventory)
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                  {products.length} Drugs Available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Drug</label>
                  <select 
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none"
                    value={selectedDrug?.id || ''}
                    onChange={(e) => {
                      const p = products.find(item => item.id === e.target.value);
                      if (p) setSelectedDrug(p);
                    }}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.genericName}) — Stock: {p.stock} — ₦{p.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Dosage</label>
                  <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 tablet" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Frequency</label>
                  <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. TDS (3x daily)" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Duration (Days)</label>
                  <Input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAddMedication} type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold">
                    <Plus className="w-4 h-4" /> Add to Rx
                  </Button>
                </div>
              </div>

              {/* Prescribed Medications Table */}
              {prescriptions.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Drug Name</th>
                        <th className="p-2.5">Dosage / Freq</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Est. Price</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {prescriptions.map((rx) => (
                        <tr key={rx.id}>
                          <td className="p-2.5 font-bold">{rx.drugName}</td>
                          <td className="p-2.5">{rx.dosage} • {rx.frequency}</td>
                          <td className="p-2.5">{rx.durationDays} Days</td>
                          <td className="p-2.5 font-semibold font-mono">₦{rx.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-rose-600" onClick={() => handleRemoveMedication(rx.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. LABORATORY & RADIOLOGY INVESTIGATION ORDERING SUITE */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* --- CARD A: LABORATORY INVESTIGATIONS --- */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      <span>Order Laboratory Investigations</span>
                      <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px]">
                        {allAvailableLabs.length}+ Tests
                      </Badge>
                    </CardTitle>

                    <button
                      type="button"
                      onClick={() => setIsCustomLabModalOpen(!isCustomLabModalOpen)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCustomLabModalOpen ? 'Hide' : '+ Custom Test'}</span>
                    </button>
                  </div>

                  {/* Custom Lab Test Creation Form */}
                  {isCustomLabModalOpen && (
                    <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                          Create Custom / Unlisted Lab Test
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomLabModalOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Test Name *</label>
                          <Input
                            value={newLabName}
                            onChange={(e) => setNewLabName(e.target.value)}
                            placeholder="e.g. Arterial Blood Gas (ABG)"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Sample / Specimen</label>
                          <Input
                            value={newLabSample}
                            onChange={(e) => setNewLabSample(e.target.value)}
                            placeholder="e.g. Heparinized Arterial Blood"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Lab Category</label>
                          <select
                            value={newLabCategory}
                            onChange={(e) => setNewLabCategory(e.target.value)}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-none"
                          >
                            {LAB_CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Price (₦)</label>
                          <Input
                            type="number"
                            value={newLabPrice}
                            onChange={(e) => setNewLabPrice(Number(e.target.value))}
                            placeholder="3500"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleCreateCustomLab}
                        size="sm"
                        className="w-full h-7 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add & Select Laboratory Test
                      </Button>
                    </div>
                  )}

                  {/* Search and Category Filter */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-2">
                    <div className="relative sm:col-span-7">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={labSearchQuery}
                        onChange={(e) => setLabSearchQuery(e.target.value)}
                        placeholder="Search 53+ tests (FBC, LFT, EUC, HbA1c)..."
                        className="pl-8 pr-7 h-8 text-[11px] bg-slate-50 dark:bg-zinc-900"
                      />
                      {labSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLabSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={selectedLabCategory}
                        onChange={(e) => setSelectedLabCategory(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-slate-50 dark:bg-zinc-900 px-2 text-[11px] font-medium focus:outline-none"
                      >
                        {LAB_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'ALL' ? 'All Lab Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>

                {/* Laboratory Tests Selection List */}
                <CardContent className="p-3 space-y-1 text-xs max-h-60 overflow-y-auto flex-1">
                  {filteredLabTestsList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 space-y-1 text-[11px]">
                      <p className="font-semibold">No lab test found for "{labSearchQuery}"</p>
                      <p>Click "+ Custom Test" above to order an unlisted examination.</p>
                    </div>
                  ) : (
                    filteredLabTestsList.map(lab => {
                      const isChecked = selectedLabTestIds.includes(lab.id);
                      return (
                        <label
                          key={lab.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-900 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleLab(lab.id)}
                            className="rounded text-purple-600 w-4 h-4 mt-0.5 accent-purple-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {lab.name}
                              </span>
                              <span className="text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shrink-0">
                                ₦{lab.priceNaira.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-300">
                                {lab.code}
                              </span>
                              <span>•</span>
                              <span>{lab.sampleType}</span>
                              {lab.category && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{lab.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </CardContent>

                {/* Selected Lab Investigations Tray */}
                {selectedLabTestIds.length > 0 && (
                  <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border-t border-purple-100 dark:border-purple-900/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-purple-900 dark:text-purple-300">
                        {selectedLabTestIds.length} Test(s) Selected:
                      </span>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        Est. ₦{totalLabEstimatedPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {selectedLabTestIds.map(testId => {
                        const testItem = allAvailableLabs.find(l => l.id === testId);
                        return (
                          <span
                            key={testId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-[10px] font-medium"
                          >
                            <span>{testItem?.name || testId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleLab(testId)}
                              className="text-purple-700 hover:text-rose-600 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* --- CARD B: DIAGNOSTIC IMAGING & SCANNINGS --- */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-sky-600" />
                      <span>Order Diagnostic Imaging & Scans</span>
                      <Badge className="bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px]">
                        {allAvailableImaging.length}+ Scans
                      </Badge>
                    </CardTitle>

                    <button
                      type="button"
                      onClick={() => setIsCustomImagingModalOpen(!isCustomImagingModalOpen)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCustomImagingModalOpen ? 'Hide' : '+ Custom Scan'}</span>
                    </button>
                  </div>

                  {/* Custom Diagnostic Scan Creation Form */}
                  {isCustomImagingModalOpen && (
                    <div className="mt-3 p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-900 dark:text-sky-300">
                          Create Custom / Specialized Scan
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomImagingModalOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Procedure Name *</label>
                          <Input
                            value={newImgName}
                            onChange={(e) => setNewImgName(e.target.value)}
                            placeholder="e.g. PET-CT Whole Body Scan"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Body Site</label>
                          <Input
                            value={newImgSite}
                            onChange={(e) => setNewImgSite(e.target.value)}
                            placeholder="e.g. Whole Body / Thorax"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Modality</label>
                          <select
                            value={newImgModality}
                            onChange={(e) => setNewImgModality(e.target.value)}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-none"
                          >
                            {IMAGING_MODALITIES.filter(m => m !== 'ALL').map(mod => (
                              <option key={mod} value={mod}>{mod}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Price (₦)</label>
                          <Input
                            type="number"
                            value={newImgPrice}
                            onChange={(e) => setNewImgPrice(Number(e.target.value))}
                            placeholder="15000"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleCreateCustomImaging}
                        size="sm"
                        className="w-full h-7 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add & Select Imaging Scan
                      </Button>
                    </div>
                  )}

                  {/* Search and Modality Filter */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-2">
                    <div className="relative sm:col-span-7">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={imagingSearchQuery}
                        onChange={(e) => setImagingSearchQuery(e.target.value)}
                        placeholder="Search 44+ scans (X-Ray, MRI, CT, Echo)..."
                        className="pl-8 pr-7 h-8 text-[11px] bg-slate-50 dark:bg-zinc-900"
                      />
                      {imagingSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setImagingSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={selectedImagingModality}
                        onChange={(e) => setSelectedImagingModality(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-slate-50 dark:bg-zinc-900 px-2 text-[11px] font-medium focus:outline-none"
                      >
                        {IMAGING_MODALITIES.map(mod => (
                          <option key={mod} value={mod}>
                            {mod === 'ALL' ? 'All Imaging Modalities' : mod}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>

                {/* Imaging Scans Selection List */}
                <CardContent className="p-3 space-y-1 text-xs max-h-60 overflow-y-auto flex-1">
                  {filteredImagingTestsList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 space-y-1 text-[11px]">
                      <p className="font-semibold">No imaging scan found for "{imagingSearchQuery}"</p>
                      <p>Click "+ Custom Scan" above to order an unlisted procedure.</p>
                    </div>
                  ) : (
                    filteredImagingTestsList.map(img => {
                      const isChecked = selectedImagingTestIds.includes(img.id);
                      return (
                        <label
                          key={img.id}
                          className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800'
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-900 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleImaging(img.id)}
                            className="rounded text-sky-600 w-4 h-4 mt-0.5 accent-sky-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {img.name}
                              </span>
                              <span className="text-sky-700 dark:text-sky-300 font-mono font-bold text-xs shrink-0">
                                ₦{img.priceNaira.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-300">
                                {img.code}
                              </span>
                              <span>•</span>
                              <span className="font-bold text-sky-700 dark:text-sky-400">{img.modality}</span>
                              {img.bodySite && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{img.bodySite}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </CardContent>

                {/* Selected Imaging Scans Tray */}
                {selectedImagingTestIds.length > 0 && (
                  <div className="p-3 bg-sky-50/40 dark:bg-sky-950/20 border-t border-sky-100 dark:border-sky-900/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-sky-900 dark:text-sky-300">
                        {selectedImagingTestIds.length} Scan(s) Selected:
                      </span>
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                        Est. ₦{totalImagingEstimatedPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {selectedImagingTestIds.map(testId => {
                        const imgItem = allAvailableImaging.find(i => i.id === testId);
                        return (
                          <span
                            key={testId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 text-[10px] font-medium"
                          >
                            <span>{imgItem?.name || testId}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleImaging(testId)}
                              className="text-sky-700 hover:text-rose-600 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Combined Diagnostic Investigation Subtotal Summary */}
            {(selectedLabTestIds.length > 0 || selectedImagingTestIds.length > 0) && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-sky-950/40 border border-indigo-200 dark:border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    Clinical Investigations Breakdown:
                  </span>
                  {selectedLabTestIds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
                      {selectedLabTestIds.length} Lab Test(s) • ₦{totalLabEstimatedPrice.toLocaleString()}
                    </span>
                  )}
                  {selectedImagingTestIds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-semibold text-[11px]">
                      {selectedImagingTestIds.length} Diagnostic Scan(s) • ₦{totalImagingEstimatedPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-2">Total Diagnostics Bill:</span>
                  <strong className="font-mono text-sm text-slate-900 dark:text-white font-bold">
                    ₦{(totalLabEstimatedPrice + totalImagingEstimatedPrice).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* 4. DEDICATED CONSULTATION DISPOSITION & DEPARTMENT TRANSFER CONSOLE */}
          <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                  Encounter Disposition & Transfer Flow
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" /> Complete, Save or Route Patient
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Save consultation progress as draft to resume later, finalize medical record, or transfer patient directly to another hospital department.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Save record so it can be resumed later"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Transfer Patient...
                </button>

                <button
                  type="button"
                  onClick={handleCompleteEncounter}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Sign & Finalize (PDF)
                </button>
              </div>
            </div>

            {/* Quick-Transfer Direct Actions Bar */}
            <div className="pt-4 space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                1-Click Department Quick Route:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {DEPARTMENTS.map((dept) => {
                  const Icon = dept.icon;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => {
                        setSelectedTargetDept(dept.id);
                        setShowTransferModal(true);
                      }}
                      className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all group cursor-pointer"
                    >
                      <Icon className={`w-4 h-4 ${dept.color} mb-1.5 group-hover:scale-110 transition-transform`} />
                      <span className="font-bold text-xs text-white block">{dept.id}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{dept.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL 1: DEPARTMENT TRANSFER MODAL */}
      {showTransferModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-base font-bold">Transfer {selectedPatient.fullName}</h2>
                  <p className="text-[11px] text-slate-400">MRN: {selectedPatient.mrn}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Destination Department *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DEPARTMENTS.map((dept) => {
                    const Icon = dept.icon;
                    const isSelected = selectedTargetDept === dept.id;
                    return (
                      <div
                        key={dept.id}
                        onClick={() => setSelectedTargetDept(dept.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border flex items-center justify-center ${dept.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block">{dept.name}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{dept.desc}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Handover Notes & Clinical Instructions (Optional)
                </label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Stat malaria test before antibiotics, patient requires wheelchair assistance, priority bed assignment..."
                  className="w-full min-h-[70px] p-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-[11px] space-y-1">
                <span className="font-bold block">Automatic Hospital Operating System Dispatch:</span>
                <p>
                  • Charts consultation notes to {selectedPatient.fullName}'s longitudinal record.<br />
                  • Creates routing ticket in {selectedTargetDept} queue.<br />
                  • Downloads official consultation summary PDF with Teki Med logo.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecuteTransfer}
                  disabled={isSubmittingTransfer}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1.5"
                >
                  <Send className="w-4 h-4" /> 
                  {isSubmittingTransfer ? 'Dispatching...' : `Transfer to ${selectedTargetDept}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAST ENCOUNTER SUMMARY MODAL */}
      {previewPastEncounter && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  Historical Consultation Record
                </span>
                <h2 className="text-base font-bold">{selectedPatient.fullName} ({selectedPatient.mrn})</h2>
                <p className="text-xs text-slate-400">
                  {new Date(previewPastEncounter.createdAt).toLocaleString()} · {previewPastEncounter.doctorName}
                </p>
              </div>
              <button 
                onClick={() => setPreviewPastEncounter(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">Primary Diagnosis</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {previewPastEncounter.primaryDiagnosis} ({previewPastEncounter.icdCode})
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Chief Complaint:</span>
                <p className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl text-slate-800 dark:text-slate-200">
                  {previewPastEncounter.chiefComplaint}
                </p>
              </div>

              {previewPastEncounter.historyPresentingIllness && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">History of Presenting Illness (HPI):</span>
                  <p className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl text-slate-800 dark:text-slate-200">
                    {previewPastEncounter.historyPresentingIllness}
                  </p>
                </div>
              )}

              {previewPastEncounter.vitals && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Vitals Snapshot at Visit:</span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                      BP: <strong>{previewPastEncounter.vitals.bpSystolic}/{previewPastEncounter.vitals.bpDiastolic}</strong> mmHg
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                      Pulse: <strong>{previewPastEncounter.vitals.pulseRate}</strong> bpm
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                      Temp: <strong>{previewPastEncounter.vitals.temperatureCelsius}</strong> °C
                    </div>
                  </div>
                </div>
              )}

              {previewPastEncounter.prescriptions && previewPastEncounter.prescriptions.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Prescribed Medications:</span>
                  <ul className="space-y-1">
                    {previewPastEncounter.prescriptions.map((p, i) => (
                      <li key={i} className="p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg flex justify-between">
                        <span className="font-semibold">{p.drugName} ({p.dosage} - {p.frequency})</span>
                        <span className="font-mono">₦{p.unitPrice?.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-zinc-800">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleRepeatPastPrescriptions(previewPastEncounter.prescriptions || []);
                    setPreviewPastEncounter(null);
                  }}
                  className="gap-1.5 text-xs text-emerald-600"
                >
                  <Copy className="w-3.5 h-3.5" /> Re-prescribe Medications
                </Button>

                <Button 
                  onClick={() => {
                    generateClinicalEncounterPDF(previewPastEncounter, selectedPatient);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Branded PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DATASTAX ASTRA DB CREDENTIALS POP-UP */}
      <AstraDatabaseSetupModal 
        isOpen={showAstraModal} 
        onClose={() => {
          setShowAstraModal(false);
          setIsAstraReady(isAstraConfigured());
        }}
        defaultTab="env"
      />
    </div>
  );
}
