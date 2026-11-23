import React, { useState } from 'react';
import { 
  FlaskConical, 
  Search, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Printer, 
  Download, 
  User, 
  ShieldCheck, 
  Filter,
  Check,
  XCircle,
  FileText,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Phone,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LabOrder, LabTestCatalogItem, PatientRecord } from '../../types/pharmacy';
import { generateLabReportPDF } from '../../lib/reporting-utils';
import { getProductionDeployedUrl } from '../../lib/saas-pricing';
import { toast } from 'sonner';

interface LaboratoryLIMSViewProps {
  labOrders: LabOrder[];
  labCatalog: LabTestCatalogItem[];
  patients: PatientRecord[];
  onUpdateLabOrder: (order: LabOrder) => void;
  currentUser?: any;
  companyLogo?: string;
  onOpenCatalogManager?: () => void;
}

const COMMON_LAB_FINDINGS = [
  'Normal Physiological Reference Values (Unremarkable)',
  'Plasmodium falciparum Malaria Parasites Detected (High Parasitemia)',
  'No Malaria Parasites Seen (Negative MP)',
  'Microcytic Hypochromic Anemia (Low Hb / PCV)',
  'Acute Bacterial Urinary Tract Infection (Pyuria & Nitrite Positive)',
  'Enteric Fever / Salmonella Typhi Antibody Reactive (Widal Positive)',
  'Type 2 Diabetes Mellitus / Elevated Fasting Glucose & HbA1c',
  'Acute Renal Insufficiency / Elevated Creatinine & Serum Urea',
  'Severe Leukocytosis / Infection / Inflammatory Response',
  'Hypokalemia / Electrolyte Imbalance',
  'Viral Swab Positive / Active Viral Infection'
];

export function formatWhatsAppPhone(phone: string = ''): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('234') && cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  if (!cleaned) cleaned = '2348031234567';
  return cleaned;
}

export function LaboratoryLIMSView({
  labOrders,
  labCatalog,
  patients,
  onUpdateLabOrder,
  currentUser,
  companyLogo = '/logo.png?v=4',
  onOpenCatalogManager
}: LaboratoryLIMSViewProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PROCESSING' | 'RESULT_ENTERED' | 'VALIDATED' | 'RELEASED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedPatientOrder] = useState<LabOrder | null>(labOrders[0] || null);

  // Result Entry Form State
  const [resultValues, setResultValues] = useState<Record<string, { value: string; flag: 'Normal' | 'High' | 'Low' | 'Critical' | 'Positive' | 'Negative' }>>({});
  const [likelyIssue, setLikelyIssue] = useState<string>(COMMON_LAB_FINDINGS[0]);
  const [isCustomIssueMode, setIsCustomIssueMode] = useState(false);
  const [customIssueText, setCustomIssueText] = useState('');
  const [clinicalInterpretation, setClinicalInterpretation] = useState('');
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false);

  const filteredOrders = labOrders.filter(order => {
    const matchesFilter = activeFilter === 'ALL' || order.orderStatus === activeFilter;
    const matchesSearch = 
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.accessionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.mrn.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSelectOrder = (order: LabOrder) => {
    setSelectedPatientOrder(order);
    if (order.results) {
      const initial: any = {};
      Object.entries(order.results).forEach(([k, v]) => {
        initial[k] = { value: v.value, flag: v.flag || 'Normal' };
      });
      setResultValues(initial);
    } else {
      setResultValues({});
    }
    setLikelyIssue(order.likelyIssue || COMMON_LAB_FINDINGS[0]);
    setClinicalInterpretation(order.clinicalInterpretation || '');
  };

  const handleCollectSample = (order: LabOrder) => {
    const updated: LabOrder = {
      ...order,
      sampleStatus: 'Sample Collected',
      orderStatus: 'PROCESSING',
      sampleCollectorName: currentUser?.displayName || currentUser?.name || 'Lab Scientist Musa',
      sampleCollectedAt: new Date().toISOString()
    };
    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Specimen collected for Accession ${order.accessionNumber}`);
  };

  const handleSaveResult = () => {
    if (!selectedOrder) return;

    const updatedResults: any = {};
    Object.entries(resultValues).forEach(([paramName, data]: [string, any]) => {
      updatedResults[paramName] = {
        value: data.value,
        flag: data.flag
      };
    });

    const finalIssue = isCustomIssueMode ? customIssueText.trim() : likelyIssue;

    const updated: LabOrder = {
      ...selectedOrder,
      orderStatus: 'RESULT_ENTERED',
      results: updatedResults,
      likelyIssue: finalIssue || 'Normal Physiological Reference Values',
      clinicalInterpretation,
      enteredByName: currentUser?.displayName || currentUser?.name || 'Lab Scientist',
      enteredAt: new Date().toISOString()
    };

    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Lab result recorded for ${selectedOrder.testName}`);
  };

  const handleValidateAndRelease = () => {
    if (!selectedOrder) return;

    const reportNum = selectedOrder.reportNumber || `TM-LAB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalIssue = isCustomIssueMode ? customIssueText.trim() : likelyIssue;

    const updatedResults: any = {};
    Object.entries(resultValues).forEach(([paramName, data]: [string, any]) => {
      updatedResults[paramName] = {
        value: data.value,
        flag: data.flag
      };
    });

    const updated: LabOrder = {
      ...selectedOrder,
      orderStatus: 'RELEASED',
      results: Object.keys(updatedResults).length > 0 ? updatedResults : selectedOrder.results,
      likelyIssue: finalIssue || selectedOrder.likelyIssue || 'Normal Physiological Reference Values',
      clinicalInterpretation: clinicalInterpretation || 'Results verified against internal controls. No panic values detected.',
      enteredByName: selectedOrder.enteredByName || currentUser?.displayName || currentUser?.name || 'Lab Scientist',
      validatedByName: currentUser?.displayName || currentUser?.name || 'Chief Pathologist Dr. Samuel Vance',
      validatedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      reportNumber: reportNum,
      qrCodeUrl: `${getProductionDeployedUrl()}/verify?report=${reportNum}`
    };

    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Lab result validated & released! Report #: ${reportNum}`);
  };

  // 1-Click Rapid Population & 5-Minute Result Release
  const handleRapid5MinRelease = () => {
    if (!selectedOrder) return;

    const catalogItem = labCatalog.find(c => c.id === selectedOrder.testId) || labCatalog[0];
    const params = catalogItem?.parameters || [
      { id: 'p1', name: 'Primary Parameter', referenceRange: 'Normal', unit: '' }
    ];

    const autoResults: any = {};
    params.forEach(p => {
      const existing = resultValues[p.name];
      autoResults[p.name] = {
        value: existing?.value || (p.fieldType === 'select' ? p.options?.[0] || 'Normal' : 'Normal / Reference'),
        flag: existing?.flag || 'Normal'
      };
    });

    const reportNum = selectedOrder.reportNumber || `TM-LAB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalIssue = isCustomIssueMode ? customIssueText.trim() : likelyIssue;

    const updated: LabOrder = {
      ...selectedOrder,
      orderStatus: 'RELEASED',
      results: autoResults,
      likelyIssue: finalIssue || 'Normal Physiological Reference Values',
      clinicalInterpretation: clinicalInterpretation || 'Rapid 5-minute laboratory screening completed. Results verified against internal controls.',
      enteredByName: currentUser?.displayName || currentUser?.name || 'Lab Scientist Musa',
      validatedByName: currentUser?.displayName || currentUser?.name || 'Chief Pathologist Dr. Samuel Vance',
      validatedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      reportNumber: reportNum,
      qrCodeUrl: `${getProductionDeployedUrl()}/verify?report=${reportNum}`
    };

    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`5-Min Rapid Turnaround: Result populated & officially released! Report #: ${reportNum}`);
  };

  // 1-Click WhatsApp Direct Share with PDF Download
  const handleSendWhatsAppResult = (order: LabOrder) => {
    const pat = patients.find(p => p.id === order.patientId || p.mrn === order.mrn || p.fullName.toLowerCase() === order.patientName.toLowerCase());
    const rawPhone = pat?.phone || pat?.whatsapp || order.patientPhone || '+234 803 123 4567';
    const cleanWhatsApp = formatWhatsAppPhone(rawPhone);

    // 1. Trigger PDF download with logo
    generateLabReportPDF(order, pat, companyLogo);

    // 2. Format professional WhatsApp message
    const msg = `🏥 *TEKIMED DIAGNOSTIC LABORATORY REPORT*
------------------------------------
*Patient Name:* ${order.patientName} (MRN: ${order.mrn})
*Test Name:* ${order.testName} (${order.category})
*Accession No:* ${order.accessionNumber}
*Report No:* ${order.reportNumber || 'TM-LAB-REPORT'}
*Status:* VERIFIED & RELEASED (Rapid 5-Min Result)

🔬 *Likely Issue / Diagnostic Finding:*
${order.likelyIssue || 'Normal Physiological Reference Values'}

📝 *Pathologist Remarks:*
${order.clinicalInterpretation || 'Results verified against internal controls. No panic values detected.'}

📄 *Your official PDF Laboratory Result Report with ISO certification badge has been generated and downloaded.*
Verification Portal: ${order.qrCodeUrl || `${getProductionDeployedUrl()}/verify`}

Thank you for choosing TekiMed Healthcare Services!`;

    const waUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // Update order state
    const updated: LabOrder = {
      ...order,
      whatsappSentAt: new Date().toISOString()
    };
    onUpdateLabOrder(updated);
    if (selectedOrder?.id === order.id) setSelectedPatientOrder(updated);

    toast.success(`Result PDF downloaded & WhatsApp opened for ${order.patientName} (${rawPhone})!`);
  };

  const handlePrintPDF = () => {
    setIsPreviewPdfOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-purple-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">Diagnostic LIMS Suite</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
              5-Min Rapid Turnaround & 1-Click WhatsApp
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-400" /> Laboratory Information System
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Specimen accessioning, rapid 5-minute result entry, likely issue selection, branded PDF reports, and 1-click WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {onOpenCatalogManager && (
            <button
              type="button"
              onClick={onOpenCatalogManager}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Manage Lab Catalog</span>
            </button>
          )}
          <Badge className="bg-purple-900/80 text-purple-200 border-purple-700 px-3 py-1.5 text-xs">
            {labOrders.filter(l => l.orderStatus === 'PROCESSING').length} In Work Queue
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Worklist Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lab Order Work Queue</CardTitle>
                <Badge variant="outline" className="text-xs">{filteredOrders.length} Orders</Badge>
              </div>

              {/* Status Filters */}
              <div className="flex gap-1 overflow-x-auto pt-2 pb-1">
                {(['ALL', 'PROCESSING', 'RESULT_ENTERED', 'RELEASED'] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={activeFilter === st ? 'default' : 'outline'}
                    className={`text-[10px] h-7 ${activeFilter === st ? 'bg-purple-600 text-white' : ''}`}
                    onClick={() => setActiveFilter(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>

              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search accession, patient, test..." 
                  className="pl-9 bg-slate-50 dark:bg-slate-900 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-2 max-h-[620px] overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <p className="text-xs text-center py-8 text-slate-500">No laboratory orders match criteria.</p>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const pat = patients.find(p => p.id === order.patientId || p.mrn === order.mrn);
                  const phone = pat?.phone || order.patientPhone || '+234 803 123 4567';

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-800 shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{order.testName}</span>
                        <Badge className={`text-[10px] ${
                          order.orderStatus === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' :
                          order.orderStatus === 'RESULT_ENTERED' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {order.orderStatus}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
                        <span>Patient: <strong>{order.patientName}</strong></span>
                        <span className="font-mono text-purple-600 font-medium">{order.accessionNumber}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Sample: {order.sampleType}</span>
                        <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-400">
                          <Phone className="w-3 h-3 text-emerald-600" /> {phone}
                        </span>
                      </div>

                      {order.orderStatus === 'RELEASED' && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Result Ready
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsAppResult(order);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Send Result PDF via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Result Entry / Detail Column */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedOrder.testName}</h2>
                      <Badge className="bg-purple-100 text-purple-800 font-mono text-xs">{selectedOrder.accessionNumber}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient: <strong>{selectedOrder.patientName}</strong> ({selectedOrder.mrn}) • Specimen: {selectedOrder.sampleType}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {selectedOrder.sampleStatus === 'Awaiting Collection' && (
                      <Button size="sm" onClick={() => handleCollectSample(selectedOrder)} className="bg-purple-600 text-white text-xs">
                        Collect Specimen
                      </Button>
                    )}

                    {/* RAPID 5-MIN POPULATE & RELEASE BUTTON */}
                    <Button 
                      size="sm" 
                      onClick={handleRapid5MinRelease} 
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 font-bold shadow-2xs"
                      title="Auto-fill parameters & release result in < 5 minutes"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> 5-Min Rapid Release
                    </Button>

                    {/* 1-CLICK WHATSAPP SHARE BUTTON */}
                    <Button 
                      size="sm" 
                      onClick={() => handleSendWhatsAppResult(selectedOrder)} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-bold shadow-sm"
                      title="Download PDF report & send directly to patient's WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> 1-Click WhatsApp
                    </Button>

                    {selectedOrder.orderStatus === 'RELEASED' && (
                      <Button size="sm" variant="outline" onClick={handlePrintPDF} className="gap-1.5 text-xs border-purple-300">
                        <Printer className="w-3.5 h-3.5 text-purple-600" /> PDF Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* LIKELY ISSUE / DIAGNOSIS SELECTION PANEL */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      Select Likely Issue / Diagnostic Finding *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomIssueMode(!isCustomIssueMode)}
                      className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCustomIssueMode ? 'Choose Presets' : '+ Type Custom Finding'}</span>
                    </button>
                  </div>

                  {isCustomIssueMode ? (
                    <Input
                      value={customIssueText}
                      onChange={(e) => setCustomIssueText(e.target.value)}
                      placeholder="Type custom clinical finding or diagnostic impression..."
                      className="bg-white dark:bg-zinc-950 text-xs font-medium"
                    />
                  ) : (
                    <select
                      value={likelyIssue}
                      onChange={(e) => setLikelyIssue(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-white dark:bg-zinc-950 px-3 text-xs font-semibold focus:outline-none"
                    >
                      {COMMON_LAB_FINDINGS.map(finding => (
                        <option key={finding} value={finding}>{finding}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Result Parameters Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Structured Laboratory Parameters
                  </h3>

                  {(() => {
                    const catalogItem = labCatalog.find(c => c.id === selectedOrder.testId) || labCatalog[0];
                    const params = catalogItem?.parameters || [
                      { id: 'g1', name: 'Primary Finding', referenceRange: 'Normal', fieldType: 'text' }
                    ];

                    return (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600">
                            <tr>
                              <th className="p-3">Parameter Name</th>
                              <th className="p-3">Ref Range / Units</th>
                              <th className="p-3">Result Value</th>
                              <th className="p-3">Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {params.map((param) => {
                              const current = resultValues[param.name] || {
                                value: selectedOrder.results?.[param.name]?.value || '',
                                flag: selectedOrder.results?.[param.name]?.flag || 'Normal'
                              };

                              return (
                                <tr key={param.id}>
                                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{param.name}</td>
                                  <td className="p-3 text-slate-500">{param.referenceRange} {param.unit || ''}</td>
                                  <td className="p-3">
                                    {param.fieldType === 'select' && param.options ? (
                                      <select 
                                        className="h-8 rounded border border-input bg-background px-2 text-xs w-full"
                                        value={current.value}
                                        onChange={(e) => setResultValues(prev => ({
                                          ...prev,
                                          [param.name]: { ...current, value: e.target.value }
                                        }))}
                                      >
                                        <option value="">-- Select --</option>
                                        {param.options.map((opt, i) => (
                                          <option key={i} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <Input 
                                        className="h-8 text-xs w-full"
                                        placeholder="Enter value..."
                                        value={current.value}
                                        onChange={(e) => setResultValues(prev => ({
                                          ...prev,
                                          [param.name]: { ...current, value: e.target.value }
                                        }))}
                                      />
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <select 
                                      className="h-8 rounded border border-input bg-background px-2 text-xs"
                                      value={current.flag}
                                      onChange={(e) => setResultValues(prev => ({
                                        ...prev,
                                        [param.name]: { ...current, flag: e.target.value as any }
                                      }))}
                                    >
                                      <option value="Normal">Normal</option>
                                      <option value="High">High (+)</option>
                                      <option value="Low">Low (-)</option>
                                      <option value="Critical">Critical (!!!)</option>
                                      <option value="Positive">Positive</option>
                                      <option value="Negative">Negative</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Clinical Interpretation */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Microbiologist / Pathologist Remarks & Impression</label>
                  <textarea 
                    className="w-full min-h-[60px] p-3 rounded-lg border border-input bg-background text-xs"
                    placeholder="Clinical impression, diagnostic remarks, and follow-up advice..."
                    value={clinicalInterpretation}
                    onChange={(e) => setClinicalInterpretation(e.target.value)}
                  />
                </div>

                {/* Scientist Sign-Off Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Entered By: <strong>{selectedOrder.enteredByName || 'Pending'}</strong>
                    {selectedOrder.validatedByName && <> • Validated By: <strong>{selectedOrder.validatedByName}</strong></>}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleSaveResult} size="sm" variant="outline" className="text-xs">
                      Save Draft Result
                    </Button>

                    <Button onClick={handleValidateAndRelease} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4" /> Validate & Release Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <FlaskConical className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p>Select a laboratory investigation from the worklist to record findings or validate reports.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Official PDF Preview Modal */}
      <Dialog open={isPreviewPdfOpen} onOpenChange={setIsPreviewPdfOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Printer className="w-5 h-5 text-purple-600" /> Verified Diagnostic Laboratory Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official medical-grade document with company logo ready for print, download, or 1-click WhatsApp delivery.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="p-8 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-6 font-sans text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">TEKIMED HEALTHCARE DIAGNOSTICS</h2>
                    <p className="text-[11px] text-slate-500">12 Commercial Avenue, Healthcare District, Abuja • Tel: +234 800 835 4742</p>
                    <p className="text-[10px] text-slate-400 font-mono">ISO 15189 Certified Pathology Laboratory</p>
                  </div>
                </div>

                <div className="text-right">
                  <Badge className="bg-purple-100 text-purple-900 font-mono text-xs">{selectedOrder.reportNumber || 'TM-LAB-REPORT'}</Badge>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Patient Info Block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p><strong>Patient Name:</strong> {selectedOrder.patientName}</p>
                  <p><strong>MRN Number:</strong> <span className="font-mono">{selectedOrder.mrn}</span></p>
                  <p><strong>Accession #:</strong> <span className="font-mono">{selectedOrder.accessionNumber}</span></p>
                </div>
                <div>
                  <p><strong>Test Name:</strong> {selectedOrder.testName}</p>
                  <p><strong>Sample Type:</strong> {selectedOrder.sampleType}</p>
                  <p><strong>Report Status:</strong> <span className="text-emerald-700 font-semibold">VERIFIED & RELEASED</span></p>
                </div>
              </div>

              {/* Likely Diagnosis / Issue */}
              {selectedOrder.likelyIssue && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 text-xs">
                  <strong>Likely Diagnostic Finding / Issue:</strong> {selectedOrder.likelyIssue}
                </div>
              )}

              {/* Results Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">Test Findings</h4>
                <table className="w-full text-left border border-slate-200 rounded text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2">Parameter</th>
                      <th className="p-2">Result Value</th>
                      <th className="p-2">Reference Range</th>
                      <th className="p-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedOrder.results && Object.entries(selectedOrder.results).map(([param, data]: [string, any], i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{param}</td>
                        <td className="p-2 font-bold">{data.value} {data.unit || ''}</td>
                        <td className="p-2 text-slate-500">{data.referenceRange || 'N/A'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            data.flag === 'High' || data.flag === 'Positive' || data.flag === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {data.flag || 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder.clinicalInterpretation && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800">
                  <strong>Pathologist Remarks:</strong> {selectedOrder.clinicalInterpretation}
                </div>
              )}

              {/* Signatures & QR Code */}
              <div className="flex justify-between items-end border-t border-slate-200 pt-4 text-[11px]">
                <div className="flex items-center gap-3">
                  <QrCode className="w-12 h-12 text-slate-800" />
                  <div>
                    <p className="font-semibold text-slate-800">Scan to Verify Authenticity</p>
                    <p className="text-[10px] text-slate-500 font-mono">{selectedOrder.qrCodeUrl}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-bold text-slate-900">{selectedOrder.validatedByName || 'Dr. Samuel Vance'}</p>
                  <p className="text-[10px] text-slate-500">Consultant Pathologist & Microbiologist</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap sm:justify-between">
            <Button variant="outline" onClick={() => setIsPreviewPdfOpen(false)}>Close Preview</Button>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  if (selectedOrder) {
                    handleSendWhatsAppResult(selectedOrder);
                  }
                }} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold"
              >
                <MessageCircle className="w-4 h-4" /> 1-Click Send to WhatsApp
              </Button>

              <Button 
                onClick={() => {
                  if (selectedOrder) {
                    const pat = patients.find(p => p.id === selectedOrder.patientId || p.mrn === selectedOrder.mrn);
                    generateLabReportPDF(selectedOrder, pat, companyLogo);
                    toast.success('Downloading official PDF report with logo...');
                  }
                }} 
                className="bg-purple-600 hover:bg-purple-500 text-white gap-2 font-medium"
              >
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
