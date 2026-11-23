import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Database, 
  Copy, 
  Download, 
  FileText, 
  FlaskConical, 
  FileSearch, 
  Stethoscope, 
  RefreshCw,
  Layers,
  Sparkles,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DiagnosisItem, LabTestCatalogItem, ImagingTestCatalogItem } from '../../types/pharmacy';
import { 
  ALPHABET_LETTERS, 
  DIAGNOSIS_CATEGORIES, 
  LAB_CATEGORIES, 
  IMAGING_MODALITIES,
  filterDiagnoses,
  filterLabTests,
  filterImagingTests
} from '../../lib/medical-catalog';
import { toast } from 'sonner';

interface ClinicalCatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'diagnoses' | 'labs' | 'imaging' | 'sql';
  diagnoses: DiagnosisItem[];
  onAddDiagnosis: (item: DiagnosisItem) => void;
  onUpdateDiagnosis: (item: DiagnosisItem) => void;
  onDeleteDiagnosis: (id: string) => void;
  labCatalog: LabTestCatalogItem[];
  onAddLabTest: (item: LabTestCatalogItem) => void;
  onUpdateLabTest: (item: LabTestCatalogItem) => void;
  onDeleteLabTest: (id: string) => void;
  imagingCatalog: ImagingTestCatalogItem[];
  onAddImagingTest: (item: ImagingTestCatalogItem) => void;
  onUpdateImagingTest: (item: ImagingTestCatalogItem) => void;
  onDeleteImagingTest: (id: string) => void;
  onResetDefaults?: (type: 'all' | 'diagnoses' | 'labs' | 'imaging') => void;
  canManage: boolean;
}

export function ClinicalCatalogManagerModal({
  isOpen,
  onClose,
  initialTab = 'diagnoses',
  diagnoses,
  onAddDiagnosis,
  onUpdateDiagnosis,
  onDeleteDiagnosis,
  labCatalog,
  onAddLabTest,
  onUpdateLabTest,
  onDeleteLabTest,
  imagingCatalog,
  onAddImagingTest,
  onUpdateImagingTest,
  onDeleteImagingTest,
  onResetDefaults,
  canManage
}: ClinicalCatalogManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'diagnoses' | 'labs' | 'imaging' | 'sql'>(initialTab);

  // --- DIAGNOSIS TAB STATE ---
  const [dxSearch, setDxSearch] = useState('');
  const [dxLetter, setDxLetter] = useState('ALL');
  const [dxCategory, setDxCategory] = useState('ALL');
  const [isAddingDx, setIsAddingDx] = useState(false);
  const [editingDxId, setEditingDxId] = useState<string | null>(null);

  // Diagnosis Form fields
  const [dxName, setDxName] = useState('');
  const [dxCode, setDxCode] = useState('');
  const [dxCat, setDxCat] = useState('Gastrointestinal');
  const [dxSeverity, setDxSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Moderate');
  const [dxDesc, setDxDesc] = useState('');

  // --- LAB TEST TAB STATE ---
  const [labSearch, setLabSearch] = useState('');
  const [labCatFilter, setLabCatFilter] = useState('ALL');
  const [isAddingLab, setIsAddingLab] = useState(false);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);

  // Lab Form fields
  const [labName, setLabName] = useState('');
  const [labCode, setLabCode] = useState('');
  const [labCat, setLabCat] = useState('Haematology');
  const [labSample, setLabSample] = useState('Whole Blood (EDTA)');
  const [labPrice, setLabPrice] = useState(4500);
  const [labTurnaround, setLabTurnaround] = useState(2);
  const [labRefRange, setLabRefRange] = useState('Normal Adult Range');

  // --- IMAGING TEST TAB STATE ---
  const [imgSearch, setImgSearch] = useState('');
  const [imgModalityFilter, setImgModalityFilter] = useState('ALL');
  const [isAddingImg, setIsAddingImg] = useState(false);
  const [editingImgId, setEditingImgId] = useState<string | null>(null);

  // Imaging Form fields
  const [imgName, setImgName] = useState('');
  const [imgCode, setImgCode] = useState('');
  const [imgModality, setImgModality] = useState('X-Ray');
  const [imgSite, setImgSite] = useState('Chest / Thorax');
  const [imgPrice, setImgPrice] = useState(8000);
  const [imgInstructions, setImgInstructions] = useState('Standard patient preparation protocol.');

  // Delete Confirmation Dialog State
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'diagnosis' | 'lab' | 'imaging';
    id: string;
    name: string;
  } | null>(null);

  // --- FILTERED DATA ---
  const filteredDiagnoses = useMemo(() => {
    return filterDiagnoses(diagnoses, dxSearch, dxLetter, dxCategory);
  }, [diagnoses, dxSearch, dxLetter, dxCategory]);

  const filteredLabs = useMemo(() => {
    return filterLabTests(labCatalog, labSearch, labCatFilter);
  }, [labCatalog, labSearch, labCatFilter]);

  const filteredImaging = useMemo(() => {
    return filterImagingTests(imagingCatalog, imgSearch, imgModalityFilter);
  }, [imagingCatalog, imgSearch, imgModalityFilter]);

  // --- DIAGNOSIS HANDLERS ---
  const handleSaveDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dxName.trim() || !dxCode.trim()) {
      toast.error('Condition name and ICD-10 code are required.');
      return;
    }

    const firstLetter = (dxName.trim()[0] || 'A').toUpperCase();

    if (editingDxId) {
      const existing = diagnoses.find(d => d.id === editingDxId);
      if (existing) {
        const updated: DiagnosisItem = {
          ...existing,
          name: dxName.trim(),
          code: dxCode.trim().toUpperCase(),
          category: dxCat,
          letter: firstLetter,
          severity: dxSeverity,
          description: dxDesc.trim(),
          updatedAt: new Date().toISOString()
        };
        onUpdateDiagnosis(updated);
        toast.success(`Updated diagnosis "${updated.name}" (${updated.code})`);
      }
      setEditingDxId(null);
    } else {
      const newDx: DiagnosisItem = {
        id: `dx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: dxName.trim(),
        code: dxCode.trim().toUpperCase(),
        category: dxCat,
        letter: firstLetter,
        severity: dxSeverity,
        description: dxDesc.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      onAddDiagnosis(newDx);
      toast.success(`Added new diagnosis "${newDx.name}" [${newDx.code}] to master directory.`);
    }

    // Reset Form
    setIsAddingDx(false);
    setDxName('');
    setDxCode('');
    setDxDesc('');
  };

  const handleStartEditDx = (dx: DiagnosisItem) => {
    setEditingDxId(dx.id);
    setDxName(dx.name);
    setDxCode(dx.code);
    setDxCat(dx.category || 'Gastrointestinal');
    setDxSeverity(dx.severity || 'Moderate');
    setDxDesc(dx.description || '');
    setIsAddingDx(true);
  };

  // --- LAB TEST HANDLERS ---
  const handleSaveLabTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim() || !labCode.trim()) {
      toast.error('Test name and code are required.');
      return;
    }

    if (editingLabId) {
      const existing = labCatalog.find(l => l.id === editingLabId);
      if (existing) {
        const updated: LabTestCatalogItem = {
          ...existing,
          name: labName.trim(),
          code: labCode.trim().toUpperCase(),
          category: labCat,
          sampleType: labSample.trim() || 'Whole Blood',
          priceNaira: Number(labPrice) || 2000,
          turnaroundTimeHours: Number(labTurnaround) || 2,
          referenceRange: labRefRange.trim(),
          updatedAt: new Date().toISOString()
        };
        onUpdateLabTest(updated);
        toast.success(`Updated laboratory test "${updated.name}"`);
      }
      setEditingLabId(null);
    } else {
      const newLab: LabTestCatalogItem = {
        id: `lab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: labCode.trim().toUpperCase(),
        name: labName.trim(),
        category: labCat,
        sampleType: labSample.trim() || 'Whole Blood',
        priceNaira: Number(labPrice) || 2000,
        turnaroundTimeHours: Number(labTurnaround) || 2,
        referenceRange: labRefRange.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      onAddLabTest(newLab);
      toast.success(`Added new lab test "${newLab.name}" to pathology catalog.`);
    }

    setIsAddingLab(false);
    setLabName('');
    setLabCode('');
    setLabRefRange('Normal Adult Range');
  };

  const handleStartEditLab = (lab: LabTestCatalogItem) => {
    setEditingLabId(lab.id);
    setLabName(lab.name);
    setLabCode(lab.code);
    setLabCat(lab.category);
    setLabSample(lab.sampleType);
    setLabPrice(lab.priceNaira);
    setLabTurnaround(lab.turnaroundTimeHours);
    setLabRefRange(lab.referenceRange || '');
    setIsAddingLab(true);
  };

  // --- IMAGING TEST HANDLERS ---
  const handleSaveImagingTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgName.trim() || !imgCode.trim()) {
      toast.error('Procedure name and code are required.');
      return;
    }

    if (editingImgId) {
      const existing = imagingCatalog.find(i => i.id === editingImgId);
      if (existing) {
        const updated: ImagingTestCatalogItem = {
          ...existing,
          name: imgName.trim(),
          code: imgCode.trim().toUpperCase(),
          modality: imgModality,
          bodySite: imgSite.trim(),
          priceNaira: Number(imgPrice) || 8000,
          instructions: imgInstructions.trim(),
          updatedAt: new Date().toISOString()
        };
        onUpdateImagingTest(updated);
        toast.success(`Updated diagnostic scan "${updated.name}"`);
      }
      setEditingImgId(null);
    } else {
      const newImg: ImagingTestCatalogItem = {
        id: `rad-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: imgCode.trim().toUpperCase(),
        name: imgName.trim(),
        modality: imgModality,
        bodySite: imgSite.trim(),
        priceNaira: Number(imgPrice) || 8000,
        instructions: imgInstructions.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      onAddImagingTest(newImg);
      toast.success(`Added new imaging scan "${newImg.name}" to radiology catalog.`);
    }

    setIsAddingImg(false);
    setImgName('');
    setImgCode('');
    setImgInstructions('Standard patient preparation protocol.');
  };

  const handleStartEditImg = (img: ImagingTestCatalogItem) => {
    setEditingImgId(img.id);
    setImgName(img.name);
    setImgCode(img.code);
    setImgModality(img.modality);
    setImgSite(img.bodySite);
    setImgPrice(img.priceNaira);
    setImgInstructions(img.instructions || '');
    setIsAddingImg(true);
  };

  // Execute confirmed deletion
  const handleExecuteDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'diagnosis') {
      onDeleteDiagnosis(confirmDelete.id);
      toast.success(`Diagnosis "${confirmDelete.name}" deleted from master directory.`);
    } else if (confirmDelete.type === 'lab') {
      onDeleteLabTest(confirmDelete.id);
      toast.success(`Lab test "${confirmDelete.name}" deleted from pathology catalog.`);
    } else if (confirmDelete.type === 'imaging') {
      onDeleteImagingTest(confirmDelete.id);
      toast.success(`Imaging scan "${confirmDelete.name}" deleted from radiology catalog.`);
    }

    setConfirmDelete(null);
  };

  // SQL schema generator
  const generatedSQL = useMemo(() => {
    return `-- ==============================================================================
-- TEKIMED HEALTHCARE OS — UPDATED SUPABASE / POSTGRESQL CATALOG TABLES & SEEDS
-- Run in Supabase SQL Editor to sync Medical Diagnoses, Lab Tests & Imaging Scans
-- ==============================================================================

-- 1. MEDICAL DIAGNOSES TABLE (ICD-10 CLINICAL DIRECTORY)
CREATE TABLE IF NOT EXISTS public.medical_diagnoses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category TEXT NOT NULL,
    letter TEXT NOT NULL,
    severity TEXT DEFAULT 'Moderate',
    description TEXT,
    common_symptoms JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. LABORATORY INVESTIGATIONS TABLE (PATHOLOGY LIMS)
CREATE TABLE IF NOT EXISTS public.laboratory_tests (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sample_type TEXT NOT NULL,
    container TEXT DEFAULT 'Standard Specimen Container',
    turnaround_time_hours NUMERIC DEFAULT 2,
    price_naira NUMERIC(12, 2) NOT NULL DEFAULT 3500.00,
    reference_range TEXT DEFAULT 'Normal Adult Reference Intervals',
    is_active BOOLEAN DEFAULT true,
    parameters JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. DIAGNOSTIC IMAGING & SCANNINGS TABLE (RADIOLOGY SUITE)
CREATE TABLE IF NOT EXISTS public.imaging_investigations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    modality TEXT NOT NULL,
    body_site TEXT NOT NULL,
    price_naira NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.medical_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_investigations ENABLE ROW LEVEL SECURITY;

-- FULL ACCESS POLICIES FOR REALTIME SYNC
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('medical_diagnoses', 'laboratory_tests', 'imaging_investigations')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access %s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow full public access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow full public access" ON public.%I FOR ALL USING (true)', tbl);
    END LOOP;
END $$;

-- REALTIME REPLICATION PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_diagnoses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.laboratory_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.imaging_investigations;
`;
  }, []);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success('Copied full SQL migration code to clipboard!');
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([generatedSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tekimed_medical_catalogs_schema_${new Date().toISOString().slice(0, 10)}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded SQL schema file.');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 bg-background shadow-2xl">
          {/* Modal Header */}
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                    Admin & Manager Control Console
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    Real-Time Catalog Synchronization
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>Master Medical & Clinical Catalogs</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Add, update, or remove ICD-10 medical diagnoses, laboratory examinations, and diagnostic imaging scans. Any modification instantly reflects across all hospital suites in real time.
                </DialogDescription>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">Real-Time Sync Active</span>
              </div>
            </div>

            {/* Tab Navigation Switcher */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('diagnoses')}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'diagnoses'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>ICD-10 Diagnoses ({diagnoses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('labs')}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'labs'
                    ? 'bg-purple-500 text-white font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Laboratory Tests ({labCatalog.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('imaging')}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'imaging'
                    ? 'bg-sky-500 text-white font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileSearch className="w-4 h-4" />
                <span>Radiology & Scans ({imagingCatalog.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sql')}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'sql'
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>SQL Schema Code</span>
              </button>
            </div>
          </DialogHeader>

          {/* Modal Body / Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!canManage && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                <p>
                  <strong>Read-Only Mode:</strong> Your role allows viewing hospital catalogs. Only Administrators, Store Managers, and Clinical Directors have permission to add, edit, or delete catalog items.
                </p>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 1: MEDICAL DIAGNOSES MANAGEMENT */}
            {/* ============================================================== */}
            {activeTab === 'diagnoses' && (
              <div className="space-y-4">
                {/* Action Bar & Create Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <span>ICD-10 Clinical Conditions & Ailments</span>
                      <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px]">
                        {filteredDiagnoses.length} Displayed
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Master diagnostic database used across doctor consultations, nursing triage, and electronic medical records.
                    </p>
                  </div>

                  {canManage && (
                    <Button
                      onClick={() => {
                        setEditingDxId(null);
                        setDxName('');
                        setDxCode('');
                        setDxDesc('');
                        setIsAddingDx(!isAddingDx);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingDx ? 'Hide Form' : '+ Add Medical Condition'}</span>
                    </Button>
                  )}
                </div>

                {/* Inline Add / Edit Form */}
                {isAddingDx && canManage && (
                  <form onSubmit={handleSaveDiagnosis} className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        {editingDxId ? 'Edit Medical Condition' : 'Add New ICD-10 Medical Condition'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingDx(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Condition / Ailment Name *
                        </label>
                        <Input
                          value={dxName}
                          onChange={(e) => setDxName(e.target.value)}
                          placeholder="e.g. Acute Appendicitis, Glaucoma, Bronchial Asthma..."
                          className="h-9 text-xs bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ICD-10 Code *
                        </label>
                        <Input
                          value={dxCode}
                          onChange={(e) => setDxCode(e.target.value)}
                          placeholder="e.g. K35.80, I10, E11.9"
                          className="h-9 text-xs font-mono uppercase bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Clinical Specialty / Category
                        </label>
                        <select
                          value={dxCat}
                          onChange={(e) => setDxCat(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-900 px-3 text-xs font-medium focus:outline-none"
                        >
                          {DIAGNOSIS_CATEGORIES.filter(c => c !== 'ALL').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Clinical Severity Stratification
                        </label>
                        <select
                          value={dxSeverity}
                          onChange={(e) => setDxSeverity(e.target.value as any)}
                          className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-900 px-3 text-xs font-medium focus:outline-none"
                        >
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Clinical Description & Pathophysiology Notes
                      </label>
                      <Input
                        value={dxDesc}
                        onChange={(e) => setDxDesc(e.target.value)}
                        placeholder="Key diagnostic features, presenting complaints, and diagnostic criteria..."
                        className="h-9 text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingDx(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingDxId ? 'Save Changes' : 'Add to Master Directory'}</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* Search & A-Z Quick Filters */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="relative sm:col-span-8">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={dxSearch}
                        onChange={(e) => setDxSearch(e.target.value)}
                        placeholder="Search conditions by name, ICD code, or category..."
                        className="pl-9 pr-7 h-9 text-xs bg-white dark:bg-zinc-950"
                      />
                      {dxSearch && (
                        <button
                          type="button"
                          onClick={() => setDxSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={dxCategory}
                        onChange={(e) => setDxCategory(e.target.value)}
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

                  {/* Alphabet scrubber */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                    <span className="text-slate-400 text-[10px] uppercase font-bold pr-1 shrink-0">A-Z:</span>
                    {ALPHABET_LETTERS.map(letter => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setDxLetter(letter)}
                        className={`min-w-6 h-6 px-1 rounded-md text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                          dxLetter === letter
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diagnoses List Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredDiagnoses.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No diagnoses found</p>
                        <p className="text-[11px]">No conditions match your search criteria. Click "+ Add Medical Condition" above to add one.</p>
                      </div>
                    ) : (
                      filteredDiagnoses.map((dx) => (
                        <div
                          key={dx.id}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {dx.name}
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                {dx.code}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 dark:border-zinc-700">
                                {dx.category}
                              </Badge>
                              {dx.severity && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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

                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEditDx(dx)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                                title="Edit Condition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDelete({ type: 'diagnosis', id: dx.id, name: dx.name })}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                title="Delete Condition from Hospital Directory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: LABORATORY INVESTIGATIONS MANAGEMENT */}
            {/* ============================================================== */}
            {activeTab === 'labs' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <span>Diagnostic Pathology & Laboratory Catalog</span>
                      <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px]">
                        {filteredLabs.length} Available
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Standard tests, specimen parameters, turnaround times, and billable tariff fees in Naira (₦).
                    </p>
                  </div>

                  {canManage && (
                    <Button
                      onClick={() => {
                        setEditingLabId(null);
                        setLabName('');
                        setLabCode('');
                        setIsAddingLab(!isAddingLab);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingLab ? 'Hide Form' : '+ Add Lab Investigation'}</span>
                    </Button>
                  )}
                </div>

                {/* Inline Add / Edit Form */}
                {isAddingLab && canManage && (
                  <form onSubmit={handleSaveLabTest} className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                        {editingLabId ? 'Edit Laboratory Investigation' : 'Add New Laboratory Investigation'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingLab(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Test Name *
                        </label>
                        <Input
                          value={labName}
                          onChange={(e) => setLabName(e.target.value)}
                          placeholder="e.g. Full Blood Count, HbA1c, Liver Function Panel..."
                          className="h-9 text-xs bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Test Code *
                        </label>
                        <Input
                          value={labCode}
                          onChange={(e) => setLabCode(e.target.value)}
                          placeholder="e.g. LAB-FBC, LAB-A1C"
                          className="h-9 text-xs font-mono uppercase bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Category
                        </label>
                        <select
                          value={labCat}
                          onChange={(e) => setLabCat(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-900 px-3 text-xs font-medium focus:outline-none"
                        >
                          {LAB_CATEGORIES.filter(c => c !== 'ALL').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Specimen / Sample Type
                        </label>
                        <Input
                          value={labSample}
                          onChange={(e) => setLabSample(e.target.value)}
                          placeholder="e.g. Whole Blood (EDTA), Serum, Urine"
                          className="h-9 text-xs bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Tariff Price (₦) *
                        </label>
                        <Input
                          type="number"
                          value={labPrice}
                          onChange={(e) => setLabPrice(Number(e.target.value))}
                          placeholder="4500"
                          className="h-9 text-xs font-mono bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Turnaround (Hours)
                        </label>
                        <Input
                          type="number"
                          value={labTurnaround}
                          onChange={(e) => setLabTurnaround(Number(e.target.value))}
                          placeholder="2"
                          className="h-9 text-xs font-mono bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Standard Reference Range & Biological Intervals
                      </label>
                      <Input
                        value={labRefRange}
                        onChange={(e) => setLabRefRange(e.target.value)}
                        placeholder="e.g. Hb: 12.0-17.5 g/dL, Fasting Sugar: 70-100 mg/dL"
                        className="h-9 text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingLab(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingLabId ? 'Save Changes' : 'Add to Lab Catalog'}</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* Search & Category Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="relative sm:col-span-8">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={labSearch}
                      onChange={(e) => setLabSearch(e.target.value)}
                      placeholder="Search lab tests by name, code, or specimen..."
                      className="pl-9 pr-7 h-9 text-xs bg-white dark:bg-zinc-950"
                    />
                    {labSearch && (
                      <button
                        type="button"
                        onClick={() => setLabSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={labCatFilter}
                      onChange={(e) => setLabCatFilter(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-950 px-3 text-xs font-medium focus:outline-none"
                    >
                      {LAB_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'ALL' ? 'All Lab Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Laboratory Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredLabs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No lab investigations found</p>
                        <p className="text-[11px]">Click "+ Add Lab Investigation" above to add new tests.</p>
                      </div>
                    ) : (
                      filteredLabs.map((lab) => (
                        <div
                          key={lab.id}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {lab.name}
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold">
                                {lab.code}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 dark:border-zinc-700">
                                {lab.category}
                              </Badge>
                              <span className="text-[10px] text-slate-500">
                                Specimen: <strong>{lab.sampleType}</strong>
                              </span>
                              <span className="text-[10px] text-slate-500">
                                TAT: <strong>{lab.turnaroundTimeHours}h</strong>
                              </span>
                            </div>
                            {lab.referenceRange && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                Ref Range: {lab.referenceRange}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-xs">
                              ₦{lab.priceNaira.toLocaleString()}
                            </span>

                            {canManage && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditLab(lab)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg"
                                  title="Edit Test"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDelete({ type: 'lab', id: lab.id, name: lab.name })}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                  title="Delete Test from Lab Catalog"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: DIAGNOSTIC IMAGING & RADIOLOGY MANAGEMENT */}
            {/* ============================================================== */}
            {activeTab === 'imaging' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <span>Diagnostic Imaging, Scans & Radiology Catalog</span>
                      <Badge className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px]">
                        {filteredImaging.length} Available
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Digital X-Rays, Ultrasound & Doppler, CT Scans, MRI Sequences, and Cardiopulmonary Diagnostics.
                    </p>
                  </div>

                  {canManage && (
                    <Button
                      onClick={() => {
                        setEditingImgId(null);
                        setImgName('');
                        setImgCode('');
                        setIsAddingImg(!isAddingImg);
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingImg ? 'Hide Form' : '+ Add Imaging Scan'}</span>
                    </Button>
                  )}
                </div>

                {/* Inline Add / Edit Form */}
                {isAddingImg && canManage && (
                  <form onSubmit={handleSaveImagingTest} className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                        {editingImgId ? 'Edit Diagnostic Scan' : 'Add New Diagnostic Scan'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingImg(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Procedure Name *
                        </label>
                        <Input
                          value={imgName}
                          onChange={(e) => setImgName(e.target.value)}
                          placeholder="e.g. Brain MRI Plain, High Resolution Chest CT, 2D Echo..."
                          className="h-9 text-xs bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Procedure Code *
                        </label>
                        <Input
                          value={imgCode}
                          onChange={(e) => setImgCode(e.target.value)}
                          placeholder="e.g. RAD-MRI-BRN, RAD-CXR"
                          className="h-9 text-xs font-mono uppercase bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Modality
                        </label>
                        <select
                          value={imgModality}
                          onChange={(e) => setImgModality(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-900 px-3 text-xs font-medium focus:outline-none"
                        >
                          {IMAGING_MODALITIES.filter(m => m !== 'ALL').map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Anatomical Body Site
                        </label>
                        <Input
                          value={imgSite}
                          onChange={(e) => setImgSite(e.target.value)}
                          placeholder="e.g. Brain, Chest / Lungs, Abdomen & Pelvis"
                          className="h-9 text-xs bg-white dark:bg-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Tariff Price (₦) *
                        </label>
                        <Input
                          type="number"
                          value={imgPrice}
                          onChange={(e) => setImgPrice(Number(e.target.value))}
                          placeholder="8000"
                          className="h-9 text-xs font-mono bg-white dark:bg-zinc-900"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Patient Preparation Instructions
                      </label>
                      <Input
                        value={imgInstructions}
                        onChange={(e) => setImgInstructions(e.target.value)}
                        placeholder="e.g. 6 hours fasting, drink 1L of water, remove metallic jewellery..."
                        className="h-9 text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingImg(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingImgId ? 'Save Changes' : 'Add to Radiology Catalog'}</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* Search & Modality Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="relative sm:col-span-8">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={imgSearch}
                      onChange={(e) => setImgSearch(e.target.value)}
                      placeholder="Search scans by procedure name, body site, or code..."
                      className="pl-9 pr-7 h-9 text-xs bg-white dark:bg-zinc-950"
                    />
                    {imgSearch && (
                      <button
                        type="button"
                        onClick={() => setImgSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={imgModalityFilter}
                      onChange={(e) => setImgModalityFilter(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-950 px-3 text-xs font-medium focus:outline-none"
                    >
                      {IMAGING_MODALITIES.map(mod => (
                        <option key={mod} value={mod}>
                          {mod === 'ALL' ? 'All Imaging Modalities' : mod}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Imaging Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredImaging.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No imaging scans found</p>
                        <p className="text-[11px]">Click "+ Add Imaging Scan" above to add new procedures.</p>
                      </div>
                    ) : (
                      filteredImaging.map((img) => (
                        <div
                          key={img.id}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {img.name}
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                                {img.code}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 dark:border-zinc-700 text-sky-700 dark:text-sky-400 font-bold">
                                {img.modality}
                              </Badge>
                              <span className="text-[10px] text-slate-500">
                                Site: <strong>{img.bodySite}</strong>
                              </span>
                            </div>
                            {img.instructions && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                Prep: {img.instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-sky-700 dark:text-sky-300 text-xs">
                              ₦{img.priceNaira.toLocaleString()}
                            </span>

                            {canManage && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditImg(img)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg"
                                  title="Edit Scan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDelete({ type: 'imaging', id: img.id, name: img.name })}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                  title="Delete Scan from Radiology Catalog"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: DATABASE SQL SCHEMA & AUTOMATIC SYNC CODE */}
            {/* ============================================================== */}
            {activeTab === 'sql' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Supabase PostgreSQL Schema & Real-Time Sync</span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
                    <strong>Zero-Configuration Browser Real-Time Sync:</strong> The application automatically saves all additions, edits, and deletions in browser persistent storage (<code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">localStorage</code>) and syncs across all suites immediately.
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
                    If you want to sync these tables to your Supabase PostgreSQL cloud database, simply copy the SQL below and run it in your <strong>Supabase Dashboard &gt; SQL Editor</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 font-medium">
                    Schema Script: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">medical_catalogs_schema.sql</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCopySQL}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </Button>
                    <Button
                      onClick={handleDownloadSQL}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .SQL File</span>
                    </Button>
                  </div>
                </div>

                <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-80 shadow-inner">
                  <pre>{generatedSQL}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {onResetDefaults && canManage && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Restore standard WHO/ICD default catalogs? Custom entries may be reset.')) {
                      onResetDefaults('all');
                      toast.success('Restored default standard catalogs.');
                    }
                  }}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore Standard Factory Catalog</span>
                </button>
              )}
            </div>

            <Button onClick={onClose} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs px-6">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      {confirmDelete && (
        <Dialog open={true} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Confirm Permanent Deletion
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 pt-2">
                Are you sure you want to permanently delete <strong>"{confirmDelete.name}"</strong> from the hospital master {confirmDelete.type === 'diagnosis' ? 'diagnoses directory' : confirmDelete.type === 'lab' ? 'laboratory catalog' : 'radiology catalog'}?
                <br /><br />
                This item will no longer appear for ordering or selection in consultations.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExecuteDelete}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Yes, Delete Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
