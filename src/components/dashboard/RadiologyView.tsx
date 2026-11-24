import { useState } from 'react';
import { FindingsEditor } from './FindingsEditor';
import { ReportSignature } from './ReportSignature';
import { ReportApproval, approvalMatches, canApproveReport } from '../../lib/report-approval';
import { textToFindings } from '../../lib/findings';

import { 
  FileSearch, 
  Search, 
  CheckCircle2, 
  Printer, 
  Download,
  QrCode, 
  User, 
  ShieldCheck, 
  Clock, 
  FileText 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ImagingOrder, ImagingTestCatalogItem, PatientRecord } from '../../types/pharmacy';
import { generateRadiologyReportPDF } from '../../lib/reporting-utils';
import { toast } from 'sonner';

interface RadiologyViewProps {
  imagingOrders: ImagingOrder[];
  imagingCatalog: ImagingTestCatalogItem[];
  patients: PatientRecord[];
  onUpdateImagingOrder: (order: ImagingOrder) => void;
  currentUser?: any;
}

export function RadiologyView({
  imagingOrders,
  imagingCatalog,
  patients,
  onUpdateImagingOrder,
  currentUser
}: RadiologyViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);

  const [clinicalIndication, setClinicalIndication] = useState('');
  const [techniqueNotes, setTechniqueNotes] = useState('');
  const [findingsNotes, setFindingsNotes] = useState('');
  const [impressionNotes, setImpressionNotes] = useState('');
  const [recommendationsNotes, setRecommendationsNotes] = useState('');
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false);
  const [findingsHtml, setFindingsHtml] = useState('');
  const [reportApproval, setReportApproval] = useState<ReportApproval | null>(null);
  const reportSnapshot = JSON.stringify({ id: selectedOrder?.id, patientId: selectedOrder?.patientId, clinicalIndication, techniqueNotes, findingsNotes, impressionNotes, recommendationsNotes, findingsHtml });

  const filteredOrders = imagingOrders.filter(o => 
    o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.testName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectOrder = (order: ImagingOrder) => {
    setSelectedOrder(order);
    setReportApproval(null);
    setFindingsHtml(order.findingsHtml || textToFindings(order.findingsNotes || ''));
    setClinicalIndication(order.clinicalIndication || '');
    setTechniqueNotes(order.techniqueNotes || '');
    setFindingsNotes(order.findingsNotes || '');
    setImpressionNotes(order.impressionNotes || '');
    setRecommendationsNotes(order.recommendationsNotes || '');
  };

  const handleApproveAndRelease = () => {
    if (!selectedOrder) return;
    if (selectedOrder.orderStatus === 'Released' || !canApproveReport(currentUser, false, true) || !approvalMatches(reportApproval, reportSnapshot, currentUser)) { toast.error('An authorized reviewer must sign this specific report before release.'); return; }

    if (!findingsNotes.trim() || !impressionNotes.trim() || !(currentUser?.displayName || currentUser?.name)) {
      toast.error('Enter findings and conclusion and sign in before approving.');
      return;
    }
    const reportNum = `TM-RAD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const updated: ImagingOrder = {
      ...selectedOrder,
      orderStatus: 'Released',
      findingsHtml,
      reportApproval: reportApproval!,
      clinicalIndication,
      techniqueNotes,
      findingsNotes,
      impressionNotes,
      recommendationsNotes,
      radiologistName: currentUser?.displayName || currentUser?.name,
      approvedAt: new Date().toISOString(),
      reportNumber: reportNum
    };

    onUpdateImagingOrder(updated);
    setSelectedOrder(updated);
    toast.success(`Diagnostic report approved and officially released! Report #: ${reportNum}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Radiology</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage scans and reports.</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {imagingOrders.filter(order => order.orderStatus !== 'Released').length} pending scans
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Worklist */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scan Queue</CardTitle>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search patient, ID or scan" 
                  className="pl-9 bg-slate-50 dark:bg-slate-900 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <p className="text-xs text-center py-8 text-slate-500">No diagnostic imaging orders found.</p>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      role="button" tabIndex={0} aria-pressed={isSelected} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSelectOrder(order); } }} onClick={() => handleSelectOrder(order)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-800 shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{order.testName}</span>
                        <Badge className="text-[10px] bg-sky-100 text-sky-800">{order.orderStatus}</Badge>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
                        <span>Patient: <strong>{order.patientName}</strong></span>
                        <span className="font-mono text-sky-600 font-medium">{order.modality}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Report Editor */}
        <div className="lg:col-span-8">
          {selectedOrder ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedOrder.testName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient: <strong>{selectedOrder.patientName}</strong> ({selectedOrder.mrn}) • Modality: {selectedOrder.modality}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setIsPreviewPdfOpen(true)} variant="outline" className="gap-2 text-xs">
                      <Printer className="w-3.5 h-3.5 text-sky-600" /> Preview PDF Report
                    </Button>
                    <Button size="sm" onClick={handleApproveAndRelease} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-2">
                      <ShieldCheck className="w-4 h-4" /> Approve Report
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Reason for Scan</label>
                  <Input value={clinicalIndication} onChange={(e) => setClinicalIndication(e.target.value)} placeholder="Reason for imaging examination..." />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Technique Notes</label>
                  <Input value={techniqueNotes} onChange={(e) => setTechniqueNotes(e.target.value)} placeholder="Radiographic projection or ultrasound probe parameters..." />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Findings *</label>
                  <FindingsEditor label="Radiology findings" value={findingsHtml} readOnly={selectedOrder.orderStatus === 'Released'} onChange={(html, text) => { setFindingsHtml(html); setFindingsNotes(text); }} />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Impression / Conclusion *</label>
                  <textarea 
                    className="w-full min-h-[60px] p-3 rounded-lg border border-input bg-background text-xs font-semibold"
                    placeholder="Final radiological diagnostic summary..."
                    value={impressionNotes}
                    onChange={(e) => setImpressionNotes(e.target.value)}
                  />
                </div>
                {selectedOrder.orderStatus !== 'Released' && <ReportSignature snapshot={reportSnapshot} user={currentUser} enabled={canApproveReport(currentUser, false, true) && Boolean(findingsNotes.trim() && impressionNotes.trim())} onApprove={setReportApproval} />}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <FileSearch className="w-12 h-12 text-sky-300 mx-auto mb-3" />
              <p>Select a scan order from the worklist to record findings or issue radiologist reports.</p>
            </Card>
          )}
        </div>
      </div>

      {/* PDF Modal */}
      <Dialog open={isPreviewPdfOpen} onOpenChange={setIsPreviewPdfOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-sky-600" /> Diagnostic Imaging Report
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">TEKILAB DIAGNOSTIC IMAGING CENTER</h3>
                <p className="text-[10px] text-slate-500">Official Radiologist Consultation Report</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded text-xs">
                <p><strong>Patient:</strong> {selectedOrder.patientName} ({selectedOrder.mrn})</p>
                <p><strong>Scan:</strong> {selectedOrder.testName} ({selectedOrder.modality})</p>
                <p><strong>Report #:</strong> {selectedOrder.reportNumber || 'PENDING'}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>

              <div>
                <strong>FINDINGS:</strong>
                <p className="mt-1 text-slate-700 leading-relaxed">{findingsNotes || 'Findings not entered.'}</p>
              </div>

              <div>
                <strong>IMPRESSION:</strong>
                <p className="mt-1 font-semibold text-slate-900 bg-sky-50 p-2 rounded border border-sky-200">{impressionNotes || 'Conclusion not entered.'}</p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                <span>TekiLab Imaging</span>
                <span className="font-bold text-slate-900">{selectedOrder.radiologistName || 'Not signed'}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewPdfOpen(false)}>Close</Button>
            <Button 
              disabled={selectedOrder?.orderStatus !== 'Released' || !selectedOrder?.reportApproval}
              onClick={() => {
                if (selectedOrder?.orderStatus === 'Released' && selectedOrder.reportApproval) {
                  const pat = patients.find(p => p.id === selectedOrder.patientId || p.mrn === selectedOrder.mrn);
                  generateRadiologyReportPDF({
                    ...selectedOrder,
                    findings: selectedOrder.findingsNotes,
                    impression: selectedOrder.impressionNotes
                  }, pat);
                  toast.success('Downloading official radiology diagnostic PDF report with Teki Med logo...');
                }
              }} 
              className="bg-sky-600 hover:bg-sky-500 text-white gap-2 font-medium"
            >
              <Download className="w-4 h-4" /> Download Official PDF Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
