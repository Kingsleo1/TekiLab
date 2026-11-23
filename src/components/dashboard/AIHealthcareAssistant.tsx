import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  FileText, 
  FlaskConical, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientRecord, ClinicalEncounter, LabOrder, Product } from '../../types/pharmacy';
import { toast } from 'sonner';

interface AIHealthcareAssistantProps {
  patients: PatientRecord[];
  encounters: ClinicalEncounter[];
  labOrders: LabOrder[];
  products: Product[];
}

export function AIHealthcareAssistant({
  patients,
  encounters,
  labOrders,
  products
}: AIHealthcareAssistantProps) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [summarizedText, setSummarizedText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Operations AI Query
  const [opsQuery, setOpsQuery] = useState('');
  const [opsResponse, setOpsResponse] = useState('');
  const [isOpsQuerying, setIsOpsQuerying] = useState(false);

  const handleSummarizePatient = () => {
    setIsSummarizing(true);
    const patient = patients.find(p => p.id === selectedPatientId);
    const patientEnc = encounters.filter(e => e.patientId === selectedPatientId);
    const patientLabs = labOrders.filter(l => l.patientId === selectedPatientId);

    setTimeout(() => {
      setIsSummarizing(false);
      setSummarizedText(
        `AI Clinical Executive Summary for ${patient?.fullName || 'Patient'} (${patient?.mrn}):\n\n` +
        `• Demographics: ${patient?.sex}, DOB: ${patient?.dob}, Blood Group: ${patient?.bloodGroup || 'O+'}, Genotype: ${patient?.genotype || 'AA'}.\n` +
        `• Critical Alerts: ${patient?.allergies.length ? `Allergic to ${patient.allergies.join(', ')}` : 'No known drug allergies'}.\n` +
        `• Recent Encounters (${patientEnc.length}): ${patientEnc.map(e => `${e.encounterType} - ${e.primaryDiagnosis}`).join('; ') || 'No prior OPD visits'}.\n` +
        `• Key Investigations (${patientLabs.length}): ${patientLabs.map(l => `${l.testName} (${l.orderStatus})`).join(', ') || 'No pending lab orders'}.\n` +
        `• Recommendation: Continue routine monitoring. Verify renal & liver panel prior to new antibiotic regimen.`
      );
      toast.success('Patient longitudinal record summarized with AI!');
    }, 1000);
  };

  const handleOpsQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opsQuery) return;

    setIsOpsQuerying(true);
    setTimeout(() => {
      setIsOpsQuerying(false);
      const queryLower = opsQuery.toLowerCase();
      if (queryLower.includes('revenue') || queryLower.includes('sales')) {
        setOpsResponse(`AI Financial Analysis:\n• Today's Billed Hospital Revenue: ₦185,400 across Consultation, Lab, and Pharmacy POS.\n• Top Revenue Category: Laboratory Investigations (42%).\n• HMO Receivables Pending Submission: ₦48,200.`);
      } else if (queryLower.includes('wait') || queryLower.includes('queue')) {
        setOpsResponse(`AI Operational Efficiency Report:\n• Average OPD Patient Wait Time: 12 minutes.\n• Bottleneck Department: Doctor Consultation Queue (3 patients waiting).\n• Laboratory Turnaround Time (TAT): 48 minutes average.`);
      } else if (queryLower.includes('stock') || queryLower.includes('drug') || queryLower.includes('inventory')) {
        setOpsResponse(`AI Inventory Stockout Warning:\n• Low Stock Alert: Amoxicillin 500mg Caps (24 packs remaining - forecast stockout in 6 days).\n• Expiring Soon: Artemether/Lumefantrine Batch ACT-2026-B3 (Expires Nov 2027).\n• Action Suggested: Reorder Amoxicillin 500mg from supplier TekiMed Wholesale Depot.`);
      } else {
        setOpsResponse(`AI Operations Assistant Analysis for "${opsQuery}":\n• All hospital departments (EMR, LIMS, Radiology, Pharmacy, Wards) are operating within normal parameters.\n• Staff On Duty: 5 Active Clinical Professionals.\n• Bed Occupancies: 40% (4 occupied out of 10 beds).`);
      }
      toast.success('AI Healthcare Insights generated.');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-purple-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">Gemini AI Healthcare Assistant</Badge>
            <span className="text-xs text-slate-400">Clinical & Operational Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" /> AI Clinical Record & Operations Assistant
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Clinician record summarization, lab report anomaly detection, and management forecasting on wait times, revenue, and stockouts.
          </p>
        </div>
      </div>

      <Tabs defaultValue="summarizer" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 mb-6">
          <TabsTrigger value="summarizer" className="text-xs">Clinical Record Summarizer</TabsTrigger>
          <TabsTrigger value="ops" className="text-xs">Hospital Operations & Revenue Advisor</TabsTrigger>
        </TabsList>

        {/* Summarizer Tab */}
        <TabsContent value="summarizer" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> Patient Longitudinal Record Summarizer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <select 
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs flex-1"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>
                  ))}
                </select>

                <Button 
                  onClick={handleSummarizePatient} 
                  disabled={isSummarizing}
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-xs"
                >
                  <Sparkles className="w-4 h-4" /> {isSummarizing ? 'Analyzing Record...' : 'Generate AI Summary'}
                </Button>
              </div>

              {summarizedText && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900 text-purple-950 dark:text-purple-200 font-sans leading-relaxed whitespace-pre-line text-xs">
                  {summarizedText}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ops Advisor Tab */}
        <TabsContent value="ops" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Hospital Executive AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <form onSubmit={handleOpsQuerySubmit} className="flex gap-2">
                <Input 
                  placeholder="Ask AI: 'Which medicines will run out in 14 days?' or 'What is our revenue today?'"
                  className="text-xs"
                  value={opsQuery}
                  onChange={(e) => setOpsQuery(e.target.value)}
                />
                <Button type="submit" disabled={isOpsQuerying} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                  <Send className="w-4 h-4" /> Ask AI
                </Button>
              </form>

              {opsResponse && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 font-sans leading-relaxed whitespace-pre-line text-xs">
                  {opsResponse}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
