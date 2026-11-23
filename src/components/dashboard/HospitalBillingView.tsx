import React, { useState } from 'react';
import { 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Search, 
  Printer, 
  Download,
  Building2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PatientCharge, HMOClaim, PatientRecord } from '../../types/pharmacy';
import { generateBillingInvoicePDF } from '../../lib/reporting-utils';
import { toast } from 'sonner';

interface HospitalBillingViewProps {
  charges: PatientCharge[];
  hmoClaims: HMOClaim[];
  patients: PatientRecord[];
  onAddCharge: (charge: PatientCharge) => void;
  onPayCharge: (chargeId: string, paymentMethod: string) => void;
}

export function HospitalBillingView({
  charges,
  hmoClaims,
  patients,
  onAddCharge,
  onPayCharge
}: HospitalBillingViewProps) {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'HMO_CLAIMS'>('LEDGER');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Charge Form
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [category, setCategory] = useState<'Consultation Fee' | 'Lab Investigation' | 'Radiology Scan' | 'Pharmacy Prescription' | 'Ward Accommodation' | 'Procedure'>('Consultation Fee');
  const [description, setDescription] = useState('Outpatient Medical Consultation');
  const [totalAmountNaira, setTotalAmountNaira] = useState(5000);

  const filteredCharges = charges.filter(c => 
    c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const newCharge: PatientCharge = {
      id: `chg-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      mrn: patient.mrn,
      category,
      description,
      totalAmountNaira,
      hmoCoveredNaira: patient.insurance ? totalAmountNaira : 0,
      patientPayableNaira: patient.insurance ? 0 : totalAmountNaira,
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString()
    };

    onAddCharge(newCharge);
    toast.success(`Charge logged for ${patient.fullName}: ₦${totalAmountNaira.toLocaleString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs mb-1">Financial Suite</Badge>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Revenue Leakage Prevention & Billing Engine
          </h1>
          <p className="text-slate-300 text-xs mt-1">Automatic charge capture for consultations, lab tests, scans, pharmacy prescriptions, bed fees, and HMO claims.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setActiveTab('LEDGER')} variant={activeTab === 'LEDGER' ? 'default' : 'outline'} className="text-xs">
            Patient Ledger
          </Button>
          <Button onClick={() => setActiveTab('HMO_CLAIMS')} variant={activeTab === 'HMO_CLAIMS' ? 'default' : 'outline'} className="text-xs">
            HMO Insurance Claims ({hmoClaims.length})
          </Button>
        </div>
      </div>

      {activeTab === 'LEDGER' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patient Charges Ledger</CardTitle>
                <div className="w-48">
                  <Input placeholder="Search charges..." className="h-8 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {filteredCharges.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No charges recorded in ledger.</p>
                ) : (
                  filteredCharges.map((chg) => (
                    <div key={chg.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{chg.patientName}</span>
                          <Badge className="bg-slate-200 text-slate-800 font-mono text-[10px]">{chg.mrn}</Badge>
                          <Badge variant="outline" className="text-[10px]">{chg.category}</Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">{chg.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(chg.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">₦{chg.totalAmountNaira.toLocaleString()}</p>
                        {chg.paymentStatus === 'Paid' ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Paid</Badge>
                        ) : (
                          <Button size="sm" onClick={() => onPayCharge(chg.id, 'Cash')} className="bg-emerald-600 text-white text-[10px] h-7">
                            Collect Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" /> Capture Service Charge
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <form onSubmit={handleCreateCharge} className="space-y-3">
                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Patient</label>
                    <select 
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Service Category</label>
                    <select 
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="Consultation Fee">Consultation Fee</option>
                      <option value="Lab Investigation">Lab Investigation</option>
                      <option value="Radiology Scan">Radiology Scan</option>
                      <option value="Pharmacy Prescription">Pharmacy Prescription</option>
                      <option value="Ward Accommodation">Ward Accommodation</option>
                      <option value="Procedure">Procedure</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Description</label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Amount (₦)</label>
                    <Input type="number" value={totalAmountNaira} onChange={(e) => setTotalAmountNaira(Number(e.target.value))} />
                  </div>

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    Post Charge to Patient Ledger
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active HMO Insurance Claims
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {hmoClaims.map((claim) => (
              <div key={claim.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{claim.hmoProvider}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[10px]">{claim.claimNumber}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Patient: <strong>{claim.patientName}</strong> (Policy: {claim.policyNumber})</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-base text-slate-900 dark:text-slate-100">₦{claim.totalClaimNaira.toLocaleString()}</p>
                  <Badge className="bg-sky-100 text-sky-800">{claim.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
