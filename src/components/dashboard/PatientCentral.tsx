import { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Clock, 
  ShieldAlert, 
  Heart, 
  Activity, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Check, 
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  ChevronRight,
  Download,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientRecord, ClinicalEncounter, LabOrder, ImagingOrder, PatientCharge } from '../../types/pharmacy';
import { generateBrandedPDF, generateClinicalEncounterPDF } from '../../lib/reporting-utils';
import { toast } from 'sonner';

interface PatientCentralProps {
  patients: PatientRecord[];
  onAddPatient: (patient: PatientRecord) => void;
  encounters?: ClinicalEncounter[];
  labOrders?: LabOrder[];
  imagingOrders?: ImagingOrder[];
  charges?: PatientCharge[];
  onSelectPatientForConsultation?: (patient: PatientRecord) => void;
  onTransferPatient?: (patient: PatientRecord, targetDepartment: string, notes?: string) => void;
}

export function PatientCentral({
  patients,
  onAddPatient,
  encounters = [],
  labOrders = [],
  imagingOrders = [],
  charges = [],
  onSelectPatientForConsultation,
  onTransferPatient
}: PatientCentralProps) {
  const [searchTerm, setSearchType] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(patients[0] || null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [possibleDuplicate, setPossibleDuplicate] = useState<PatientRecord | null>(null);

  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    sex: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    email: '',
    address: '',
    bloodGroup: 'O+' as any,
    genotype: 'AA' as any,
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    hmoProvider: '',
    hmoPolicyNumber: '',
    hmoPlanName: ''
  });

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const checkDuplicate = (name: string, phone: string) => {
    if (!name || !phone) return null;
    return patients.find(p => 
      p.fullName.toLowerCase().trim() === name.toLowerCase().trim() ||
      (p.phone && p.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''))
    ) || null;
  };

  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, fullName: val }));
    const match = checkDuplicate(val, formData.phone);
    setPossibleDuplicate(match);
  };

  const handlePhoneChange = (val: string) => {
    setFormData(prev => ({ ...prev, phone: val }));
    const match = checkDuplicate(formData.fullName, val);
    setPossibleDuplicate(match);
  };

  const handleRegisterSubmit = (e: any) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      toast.error('Patient full name and phone number are required.');
      return;
    }

    const newMrn = `TM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient: PatientRecord = {
      id: `pat-${Date.now()}`,
      mrn: newMrn,
      fullName: formData.fullName,
      dob: formData.dob || '1990-01-01',
      sex: formData.sex,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      bloodGroup: formData.bloodGroup,
      genotype: formData.genotype,
      allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
      chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(c => c.trim()) : [],
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactRelation: formData.emergencyContactRelation,
      insurance: formData.hmoProvider ? {
        provider: formData.hmoProvider,
        planName: formData.hmoPlanName || 'Standard Health Coverage',
        policyNumber: formData.hmoPolicyNumber || 'HMO-PENDING',
        status: 'Active'
      } : undefined,
      registeredAt: new Date().toISOString()
    };

    onAddPatient(newPatient);
    setSelectedPatient(newPatient);
    setIsRegisterOpen(false);
    toast.success(`Patient registered successfully! MRN: ${newMrn}`);
    setFormData({
      fullName: '',
      dob: '',
      sex: 'Male',
      phone: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: '',
      chronicConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      hmoProvider: '',
      hmoPolicyNumber: '',
      hmoPlanName: ''
    });
    setPossibleDuplicate(null);
  };

  // Build timeline items for selected patient
  const patientEncounters = encounters.filter(e => e.patientId === selectedPatient?.id);
  const patientLabs = labOrders.filter(l => l.patientId === selectedPatient?.id);
  const patientImages = imagingOrders.filter(i => i.patientId === selectedPatient?.id);
  const patientCharges = charges.filter(c => c.patientId === selectedPatient?.id);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs uppercase tracking-wider">
              Patient Master Index
            </Badge>
            <span className="text-xs text-slate-400">One Patient • One Record</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Central Patient Registry</h1>
          <p className="text-slate-300 text-sm mt-1">
            Unified longitudinal electronic health records across All Clinical, Lab, Radiology, and Pharmacy workflows.
          </p>
        </div>
        <Button 
          onClick={() => setIsRegisterOpen(true)}
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Register New Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Column */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Patients ({patients.length})</span>
                <Users className="w-4 h-4 text-sky-600" />
              </CardTitle>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search by MRN, Name, Phone..." 
                  className="pl-9 bg-slate-50 dark:bg-slate-900 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchType(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <p className="text-xs text-center py-6 text-slate-500">No matching patient records found.</p>
              ) : (
                filteredPatients.map((patient) => {
                  const isSelected = selectedPatient?.id === patient.id;
                  return (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                        isSelected 
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{patient.fullName}</span>
                          <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {patient.sex}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono text-sky-600 dark:text-sky-400 font-medium">{patient.mrn}</span>
                          <span>•</span>
                          <span>{patient.phone}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 ${isSelected ? 'text-sky-600' : ''}`} />
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Detail Column */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {selectedPatient.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPatient.fullName}</h2>
                        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-300 font-mono text-xs">
                          {selectedPatient.mrn}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> DOB: {selectedPatient.dob}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedPatient.phone}</span>
                        {selectedPatient.bloodGroup && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-rose-600">Blood: {selectedPatient.bloodGroup}</span>
                          </>
                        )}
                        {selectedPatient.genotype && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-indigo-600">Genotype: {selectedPatient.genotype}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        generateBrandedPDF(
                          `PATIENT MASTER DOSSIER — ${selectedPatient.fullName}`,
                          `Medical Record Number: ${selectedPatient.mrn} | DOB: ${selectedPatient.dob} | Sex: ${selectedPatient.sex}`,
                          [
                            { label: 'Patient MRN', value: selectedPatient.mrn },
                            { label: 'Blood Group / Genotype', value: `${selectedPatient.bloodGroup || 'N/A'} / ${selectedPatient.genotype || 'N/A'}` },
                            { label: 'Phone Number', value: selectedPatient.phone },
                            { label: 'HMO / Insurance Provider', value: selectedPatient.insuranceProvider || 'Private Out-of-Pocket' },
                            { label: 'Known Allergies', value: selectedPatient.allergies?.join(', ') || 'None Reported' }
                          ],
                          ['Encounter Date', 'Category / Department', 'Primary Diagnosis / Test', 'Attending Clinician'],
                          patientEncounters.map(e => [
                            e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Recent',
                            e.encounterType || 'OPD',
                            e.primaryDiagnosis || 'Consultation',
                            e.doctorName || 'Attending Doctor'
                          ]),
                          `Patient_Dossier_${selectedPatient.mrn}`
                        );
                        toast.success('Downloading Patient Master Dossier PDF report with Teki Med logo...');
                      }}
                      className="gap-2 text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Export Dossier
                    </Button>

                    {onSelectPatientForConsultation && (
                      <Button 
                        onClick={() => onSelectPatientForConsultation(selectedPatient)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium text-xs shadow"
                      >
                        <Stethoscope className="w-4 h-4" />
                        Start Consultation
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 mb-6">
                    <TabsTrigger value="timeline" className="text-xs">Longitudinal Timeline</TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs">Demographics & Insurance</TabsTrigger>
                    <TabsTrigger value="allergies" className="text-xs">Allergies & Medical History</TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs">Billing Ledger</TabsTrigger>
                  </TabsList>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      Chronological Patient Journey
                    </h3>

                    {patientEncounters.length === 0 && patientLabs.length === 0 && patientImages.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No clinical encounters or lab orders logged for this patient yet.</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-sky-200 dark:border-sky-900 space-y-6">
                        {patientEncounters.map((enc) => (
                          <div key={enc.id} className="relative group">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-sky-600 ring-4 ring-sky-100 dark:ring-sky-950 flex items-center justify-center">
                              <Stethoscope className="w-2.5 h-2.5 text-white" />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-sky-600 dark:text-sky-400">{enc.encounterType}</span>
                                <span className="text-[10px] text-slate-400">{new Date(enc.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">Chief Complaint: {enc.chiefComplaint}</p>
                              {enc.primaryDiagnosis && (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-900">
                                  <strong>Diagnosis:</strong> {enc.primaryDiagnosis} ({enc.icdCode || 'N/A'})
                                </div>
                              )}
                              {enc.prescriptions && enc.prescriptions.length > 0 && (
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  <strong>Prescriptions:</strong> {enc.prescriptions.map(p => p.drugName).join(', ')}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                                <span className="text-slate-400">Consultant: {enc.doctorName}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-blue-600 gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                  onClick={() => {
                                    generateClinicalEncounterPDF(enc, selectedPatient);
                                    toast.success('Downloading Consultation Summary PDF with Teki Med logo...');
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  Download PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {patientLabs.map((lab) => (
                          <div key={lab.id} className="relative group">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-purple-100 dark:ring-purple-950 flex items-center justify-center">
                              <FlaskConical className="w-2.5 h-2.5 text-white" />
                            </div>
                            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-purple-700 dark:text-purple-300">Lab Test: {lab.testName}</span>
                                <Badge className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">{lab.orderStatus}</Badge>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                Accession: <span className="font-mono">{lab.accessionNumber}</span>
                              </div>
                              {lab.clinicalInterpretation && (
                                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded">
                                  Interpretation: {lab.clinicalInterpretation}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-800">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-sky-600" /> Personal Information
                        </h4>
                        <div className="space-y-1 text-slate-600 dark:text-slate-400">
                          <p><strong>Full Name:</strong> {selectedPatient.fullName}</p>
                          <p><strong>Gender:</strong> {selectedPatient.sex}</p>
                          <p><strong>Date of Birth:</strong> {selectedPatient.dob}</p>
                          <p><strong>Phone:</strong> {selectedPatient.phone}</p>
                          <p><strong>Email:</strong> {selectedPatient.email || 'N/A'}</p>
                          <p><strong>Address:</strong> {selectedPatient.address || 'N/A'}</p>
                        </div>
                      </Card>

                      <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-800">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-emerald-600" /> HMO & Health Insurance
                        </h4>
                        {selectedPatient.insurance ? (
                          <div className="space-y-1 text-slate-600 dark:text-slate-400">
                            <p><strong>HMO Provider:</strong> {selectedPatient.insurance.provider}</p>
                            <p><strong>Plan Name:</strong> {selectedPatient.insurance.planName}</p>
                            <p><strong>Policy Number:</strong> {selectedPatient.insurance.policyNumber}</p>
                            <p><strong>Status:</strong> <Badge className="bg-emerald-100 text-emerald-800">{selectedPatient.insurance.status}</Badge></p>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">Self-Pay Patient (No active HMO insurance configured).</p>
                        )}
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Allergies Tab */}
                  <TabsContent value="allergies" className="space-y-4 text-xs">
                    <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="font-semibold text-rose-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Drug & Food Allergies
                      </h4>
                      {selectedPatient.allergies.length === 0 ? (
                        <p className="text-slate-400">No known allergies reported.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedPatient.allergies.map((allergy, i) => (
                            <Badge key={i} className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>

                    <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Pre-Existing Chronic Conditions
                      </h4>
                      {selectedPatient.chronicConditions.length === 0 ? (
                        <p className="text-slate-400">No chronic medical conditions recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedPatient.chronicConditions.map((cond, i) => (
                            <Badge key={i} className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">
                              {cond}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  </TabsContent>

                  {/* Billing Ledger Tab */}
                  <TabsContent value="billing" className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Patient Service Ledger
                    </h4>
                    {patientCharges.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No charges billed to this patient yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientCharges.map((chg) => (
                          <div key={chg.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs border border-slate-200 dark:border-slate-800">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{chg.description}</p>
                              <span className="text-[10px] text-slate-400">{chg.category} • {new Date(chg.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-slate-100">₦{chg.totalAmountNaira.toLocaleString()}</p>
                              <Badge className={chg.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                                {chg.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Select a patient from the list to view their complete master health record.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Registration Modal with Duplicate Check */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <UserPlus className="w-5 h-5 text-sky-600" /> Register Patient Master Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a unique Patient MRN. Automated duplicate detection checks existing records.
            </DialogDescription>
          </DialogHeader>

          {possibleDuplicate && (
            <div className="bg-amber-50 border border-amber-300 dark:bg-amber-950/40 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Possible Existing Patient Found!
              </div>
              <p className="text-amber-700 dark:text-amber-400">
                A patient matching <strong>"{possibleDuplicate.fullName}"</strong> or phone <strong>"{possibleDuplicate.phone}"</strong> (MRN: {possibleDuplicate.mrn}) already exists in the central database.
              </p>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                className="bg-white border-amber-400 text-amber-900 text-xs"
                onClick={() => {
                  setSelectedPatient(possibleDuplicate);
                  setIsRegisterOpen(false);
                }}
              >
                Open Existing Patient Record ({possibleDuplicate.mrn})
              </Button>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                <Input 
                  required 
                  placeholder="e.g. Chidi Kenneth Okafor" 
                  value={formData.fullName} 
                  onChange={(e) => handleNameChange(e.target.value)} 
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Phone Number *</label>
                <Input 
                  required 
                  placeholder="e.g. +234 802 334 9811" 
                  value={formData.phone} 
                  onChange={(e) => handlePhoneChange(e.target.value)} 
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                <Input 
                  type="date" 
                  value={formData.dob} 
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))} 
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Sex</label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  value={formData.sex}
                  onChange={(e) => setFormData(prev => ({ ...prev, sex: e.target.value as any }))}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="patient@example.com" 
                  value={formData.email} 
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Residential Address</label>
                <Input 
                  placeholder="City, State" 
                  value={formData.address} 
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} 
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Blood Group</label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value as any }))}
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Genotype</label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  value={formData.genotype}
                  onChange={(e) => setFormData(prev => ({ ...prev, genotype: e.target.value as any }))}
                >
                  <option value="AA">AA</option>
                  <option value="AS">AS</option>
                  <option value="SS">SS</option>
                  <option value="AC">AC</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Clinical History & HMO</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">Known Allergies (Comma-separated)</label>
                  <Input 
                    placeholder="e.g. Penicillin, Sulfa, Peanuts" 
                    value={formData.allergies} 
                    onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))} 
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300">HMO Provider Name</label>
                  <Input 
                    placeholder="e.g. Hygeia HMO, Reliance HMO" 
                    value={formData.hmoProvider} 
                    onChange={(e) => setFormData(prev => ({ ...prev, hmoProvider: e.target.value }))} 
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white gap-2">
                <Check className="w-4 h-4" /> Confirm Patient Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
