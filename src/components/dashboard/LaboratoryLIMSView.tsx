import React, { useState } from 'react';
import { FindingsEditor } from './FindingsEditor';
import { ReportSignature } from './ReportSignature';
import { ReportApproval, approvalMatches, canApproveReport } from '../../lib/report-approval';
import { textToFindings } from '../../lib/findings';

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
  if (!cleaned) return '';
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
  const [selectedOrder, setSelectedPatientOrder] = useState<LabOrder | null>(null);

  // Result Entry Form State
  const [resultValues, setResultValues] = useState<Record<string, { value: string; flag: 'Normal' | 'High' | 'Low' | 'Critical' | 'Positive' | 'Negative' }>>({});
  const [likelyIssue, setLikelyIssue] = useState<string>('');
  const [isCustomIssueMode, setIsCustomIssueMode] = useState(false);
  const [customIssueText, setCustomIssueText] = useState('');
  const [clinicalInterpretation, setClinicalInterpretation] = useState('');
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false);
  const [findingsHtml, setFindingsHtml] = useState('');
  const [reportApproval, setReportApproval] = useState<ReportApproval | null>(null);
  const reportSnapshot = JSON.stringify({ id: selectedOrder?.id, patientId: selectedOrder?.patientId, resultValues, template: labCatalog.find(c => c.id === selectedOrder?.testId)?.parameters, clinicalInterpretation, findingsHtml, likelyIssue, customIssueText, isCustomIssueMode });
  const critical = Object.values(resultValues).some((v: any) => v.flag === 'Critical');

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
    setReportApproval(null);
    setFindingsHtml(order.findingsHtml || textToFindings(order.clinicalInterpretation || ''));
    if (order.results) {
      const initial: any = {};
      Object.entries(order.results).forEach(([k, v]) => {
        initial[k] = { value: String(v.value ?? ''), flag: v.flag || 'Normal' };
      });
      setResultValues(initial);
    } else {
      setResultValues({});
    }
    setLikelyIssue(order.likelyIssue || '');
    setIsCustomIssueMode(false);
    setCustomIssueText('');
    setClinicalInterpretation(order.clinicalInterpretation || '');
  };

  const handleCollectSample = (order: LabOrder) => {
    const updated: LabOrder = {
      ...order,
      sampleStatus: 'Sample Collected',
      orderStatus: 'PROCESSING',
      sampleCollectorName: currentUser?.displayName || currentUser?.name || '',
      sampleCollectedAt: new Date().toISOString()
    };
    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Specimen collected for Accession ${order.accessionNumber}`);
  };

  const handleSaveResult = () => {
    if (!selectedOrder) return;
    if (selectedOrder.orderStatus === 'RELEASED' || selectedOrder.sampleStatus !== 'Sample Collected') {
      toast.error('Collect the sample first. Released reports cannot be overwritten.');
      return;
    }

    const updatedResults: any = {};
    Object.entries(resultValues).forEach(([paramName, data]: [string, any]) => {
      const parameter = labCatalog.find(c => c.id === selectedOrder.testId)?.parameters?.find(p => p.name === paramName);
      updatedResults[paramName] = {
        value: data.value,
        flag: data.flag,
        unit: parameter?.unit,
        referenceRange: parameter?.referenceRange
      };
    });

    const finalIssue = isCustomIssueMode ? customIssueText.trim() : likelyIssue;

    const updated: LabOrder = {
      ...selectedOrder,
      orderStatus: 'RESULT_ENTERED',
      findingsHtml,
      results: updatedResults,
      likelyIssue: finalIssue,
      clinicalInterpretation,
      enteredByName: currentUser?.displayName || currentUser?.name || '',
      enteredAt: new Date().toISOString()
    };

    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Lab result recorded for ${selectedOrder.testName}`);
  };

  const handleValidateAndRelease = () => {
    if (!selectedOrder) return;

    if (selectedOrder.orderStatus === 'RELEASED' || selectedOrder.sampleStatus !== 'Sample Collected') {
      toast.error('Collect the sample before approving a result. Released reports cannot be overwritten.');
      return;
    }
    if (!canApproveReport(currentUser, critical) || !approvalMatches(reportApproval, reportSnapshot, currentUser)) { toast.error('An authorized reviewer must sign this specific report.'); return; }
    const template = labCatalog.find(c => c.id === selectedOrder.testId);
    if (!template?.parameters?.length || template.parameters.some(p => !resultValues[p.name]?.value?.trim())) {
      toast.error('Enter all measured results using the correct test template before approval.');
      return;
    }
    if (!(currentUser?.displayName || currentUser?.name)) {
      toast.error('Sign in before approving a result.');
      return;
    }
    const reportNum = selectedOrder.reportNumber || `TM-LAB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalIssue = isCustomIssueMode ? customIssueText.trim() : likelyIssue;

    const updatedResults: any = {};
    Object.entries(resultValues).forEach(([paramName, data]: [string, any]) => {
      const parameter = labCatalog.find(c => c.id === selectedOrder.testId)?.parameters?.find(p => p.name === paramName);
      updatedResults[paramName] = {
        value: data.value,
        flag: data.flag,
        unit: parameter?.unit,
        referenceRange: parameter?.referenceRange
      };
    });

    const updated: LabOrder = {
      ...selectedOrder,
      orderStatus: 'RELEASED',
      findingsHtml,
      reportApproval: reportApproval!,
      results: Object.keys(updatedResults).length > 0 ? updatedResults : selectedOrder.results,
      likelyIssue: finalIssue,
      clinicalInterpretation,
      enteredByName: selectedOrder.enteredByName || currentUser?.displayName || currentUser?.name || 'Lab Scientist',
      validatedByName: currentUser?.displayName || currentUser?.name || '',
      validatedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      reportNumber: reportNum,
      qrCodeUrl: `${getProductionDeployedUrl()}/verify?report=${reportNum}`
    };

    onUpdateLabOrder(updated);
    setSelectedPatientOrder(updated);
    toast.success(`Lab result validated & released! Report #: ${reportNum}`);
  };

  // WhatsApp Direct Share with PDF Download
  const handleSendWhatsAppResult = (order: LabOrder) => {
    const pat = patients.find(p => p.id === order.patientId);
    const rawPhone = pat?.whatsapp || pat?.phone || order.patientPhone || '';
    const cleanWhatsApp = formatWhatsAppPhone(rawPhone);
    if (order.orderStatus !== 'RELEASED' || !/^234[0-9]{10}$/.test(cleanWhatsApp)) {
      toast.error('Release the report and confirm the patient’s WhatsApp number first.');
      return;
    }

    // 1. Trigger PDF download with logo
    generateLabReportPDF(order, pat, companyLogo);

    // 2. Format professional WhatsApp message
    const msg = 'Your laboratory report is ready. Please contact your diagnostic centre to receive it securely.';

    const waUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    toast.success(`Result PDF downloaded & WhatsApp opened for ${order.patientName} (${rawPhone})!`);
  };

  const handlePrintPDF = () => {
    setIsPreviewPdfOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Laboratory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Collect samples, run tests and review results.</p>
        </div>
        {onOpenCatalogManager && <Button variant="outline" onClick={onOpenCatalogManager}>Tests &amp; Prices</Button>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Worklist Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Test Queue</CardTitle>
                <Badge variant="outline" className="text-xs">{filteredOrders.length} Orders</Badge>
              </div>

              {/* Status Filters */}
              <div className="flex gap-1 overflow-x-auto pt-2 pb-1">
                {(['ALL', 'PROCESSING', 'RESULT_ENTERED', 'RELEASED'] as const).map((st) => (
                  <Button
                    key={{ALL: 'All', PROCESSING: 'Run Tests', RESULT_ENTERED: 'Review Results', RELEASED: 'Completed'}[st]}
                    size="sm"
                    variant={activeFilter === st ? 'default' : 'outline'}
                    className={`text-[10px] h-7 ${activeFilter === st ? 'bg-purple-600 text-white' : ''}`}
                    onClick={() => setActiveFilter(st)}
                  >
                    {{ALL: 'All', PROCESSING: 'Run tests', RESULT_ENTERED: 'Review results', RELEASED: 'Completed'}[st]}
                  </Button>
                ))}
              </div>

              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search patient, sample ID or test" 
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
                  const phone = pat?.phone || order.patientPhone || 'Not provided';

                  return (
                    <div
                      key={order.id}
                      role="button" tabIndex={0} aria-pressed={isSelected} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSelectOrder(order); } }} onClick={() => handleSelectOrder(order)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-800 shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{order.testName}</span>
                        <Badge className={`text-[10px] ${
                          order.orderStatus === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' :
                          order.orderStatus === 'RESULT_ENTERED' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {({PROCESSING: 'In progress', RESULT_ENTERED: 'Review result', VALIDATED: 'Approved', RELEASED: 'Completed'} as Record<string, string>)[order.orderStatus] || order.orderStatus}
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
                        Collect Sample
                      </Button>
                    )}

                    {/* 1-CLICK WHATSAPP SHARE BUTTON */}
                    <Button 
                      size="sm" 
                      disabled={selectedOrder.orderStatus !== 'RELEASED'}
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

              <CardContent className="p-3 sm:p-6 space-y-4">
                {/* LIKELY ISSUE / DIAGNOSIS SELECTION PANEL */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      Clinical Finding (optional)
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
                      <option value="">Select a finding (optional)</option>
                      {COMMON_LAB_FINDINGS.map(finding => (
                        <option key={finding} value={finding}>{finding}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Result Parameters Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Test Results
                  </h3>

                  {(() => {
                    const catalogItem = labCatalog.find(c => c.id === selectedOrder.testId) ;
                    const params = catalogItem?.parameters || [
                      { id: 'g1', name: 'Primary Finding', referenceRange: 'Normal', fieldType: 'text' }
                    ];

                    return (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto text-sm">
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
                  <FindingsEditor label="Laboratory findings" value={findingsHtml} readOnly={selectedOrder.orderStatus === 'RELEASED'} onChange={(html, text) => { setFindingsHtml(html); setClinicalInterpretation(text); }} />
                </div>

                {selectedOrder.orderStatus !== 'RELEASED' && <ReportSignature snapshot={reportSnapshot} user={currentUser} enabled={canApproveReport(currentUser, critical) && selectedOrder.sampleStatus === 'Sample Collected'} onApprove={setReportApproval} />}
                {/* Scientist Sign-Off Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Entered By: <strong>{selectedOrder.enteredByName || 'Pending'}</strong>
                    {selectedOrder.validatedByName && <> • Validated By: <strong>{selectedOrder.validatedByName}</strong></>}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleSaveResult} size="sm" variant="outline" className="text-xs">
                      Save Result
                    </Button>

                    <Button onClick={handleValidateAndRelease} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4" /> Approve Result
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
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">TEKILAB DIAGNOSTICS</h2>
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
                  <p className="font-bold text-slate-900">{selectedOrder.validatedByName || 'Not signed'}</p>
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
                <MessageCircle className="w-4 h-4" /> Open WhatsApp
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
