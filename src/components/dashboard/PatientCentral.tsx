import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Phone,
  Calendar,
  Activity,
  FlaskConical,
  Stethoscope,
  Send,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileText,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  PatientRecord,
  ClinicalEncounter,
  LabOrder,
  ImagingOrder,
  PatientCharge
} from '../../types/pharmacy';
import {
  ALL_DEPARTMENTS,
  TekiLabDepartment,
  normalizeNigerianWhatsAppPhone
} from '../../config/roles';
import { useNotifications } from '../../context/NotificationContext';
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
  onStartRapidTest?: (patient: PatientRecord) => void;
}

export function PatientCentral({
  patients,
  onAddPatient,
  encounters = [],
  labOrders = [],
  imagingOrders = [],
  charges = [],
  onSelectPatientForConsultation,
  onTransferPatient,
  onStartRapidTest
}: PatientCentralProps) {
  const { notifyTransfer } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'logs' | 'transfer'>('overview');

  // Register New Patient Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('1992-05-14');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [address, setAddress] = useState('');

  // Transfer Department form inside Detail Modal
  const [transferDept, setTransferDept] = useState<TekiLabDepartment>('Laboratory');
  const [transferNotes, setTransferNotes] = useState('');

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(q) ||
        p.mrn?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
    );
  }, [patients, searchTerm]);

  const phonePreview = useMemo(() => normalizeNigerianWhatsAppPhone(phone), [phone]);

  // Build chronological medical & lab history logs for the selected patient
  const patientActivityLogs = useMemo(() => {
    if (!selectedPatient) return [];
    const logs: {
      id: string;
      date: string;
      category: 'Lab Result' | 'Consultation' | 'Imaging' | 'Billing';
      title: string;
      detail: string;
      status: string;
    }[] = [];

    labOrders
      .filter((l) => l.patientId === selectedPatient.id || l.patientName === selectedPatient.fullName)
      .forEach((l) => {
        logs.push({
          id: l.id,
          date: l.validatedAt || l.createdAt || new Date().toISOString(),
          category: 'Lab Result',
          title: `${l.testName} (${l.accessionNumber})`,
          detail: l.likelyIssue || l.clinicalInterpretation || `Sample: ${l.sampleType}`,
          status: l.orderStatus
        });
      });

    encounters
      .filter((e) => e.patientId === selectedPatient.id)
      .forEach((e) => {
        logs.push({
          id: e.id,
          date: (e as any).createdAt || (e as any).visitDate || new Date().toISOString(),
          category: 'Consultation',
          title: (e as any).diagnosis || (e as any).chiefComplaint || 'Clinical Consultation',
          detail: (e as any).clinicalNotes || (e as any).doctorNotes || 'Outpatient clinical visit logged.',
          status: (e as any).status || 'Completed'
        });
      });

    imagingOrders
      .filter((im) => im.patientId === selectedPatient.id)
      .forEach((im) => {
        logs.push({
          id: im.id,
          date: im.createdAt || new Date().toISOString(),
          category: 'Imaging',
          title: `${im.testName} (${im.modality})`,
          detail: im.bodySite || 'Radiology scan order',
          status: im.orderStatus
        });
      });

    charges
      .filter((c) => c.patientId === selectedPatient.id)
      .forEach((c) => {
        logs.push({
          id: c.id,
          date: (c as any).createdAt || new Date().toISOString(),
          category: 'Billing',
          title: (c as any).description || 'Laboratory / Service Charge',
          detail: `₦${Number((c as any).amountNaira || (c as any).amount || 0).toLocaleString()}`,
          status: (c as any).paymentStatus || 'Paid'
        });
      });

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPatient, labOrders, encounters, imagingOrders, charges]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please enter the patient full name.');
      return;
    }

    const norm = normalizeNigerianWhatsAppPhone(phone);
    const newPatient: PatientRecord = {
      id: `pat-${Date.now()}`,
      mrn: `TK-PAT-${Math.floor(10000 + Math.random() * 89999)}`,
      fullName: fullName.trim(),
      phone: norm.e164 || phone.trim() || '+2348030000000',
      gender,
      dob,
      bloodGroup,
      address: address.trim() || 'Lagos, Nigeria',
      allergies: allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      chronicConditions: chronicText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString()
    } as any;

    onAddPatient(newPatient);
    setIsRegisterOpen(false);
    setFullName('');
    setPhone('');
    setAllergiesText('');
    setChronicText('');
    setAddress('');
    toast.success(`Registered ${newPatient.fullName}`, {
      description: norm.isWhatsAppQualified
        ? `WhatsApp Auto-Qualified (${norm.display})`
        : `MRN: ${newPatient.mrn}`
    });
  };

  const handleExecuteTransfer = () => {
    if (!selectedPatient) return;
    onTransferPatient?.(selectedPatient, transferDept, transferNotes);
    notifyTransfer({
      fromDepartment: 'Patient Registry',
      toDepartment: transferDept,
      patientName: selectedPatient.fullName,
      notes: transferNotes || 'Routed from Registered Patients directory'
    });
    setTransferNotes('');
  };

  const selectedPhoneMeta = selectedPatient
    ? normalizeNigerianWhatsAppPhone(selectedPatient.phone)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 font-sans text-neutral-950">
      {/* Clean Minimalist Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Registered Patients
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {patients.length} registered patients · Click any name to inspect full profile &amp; medical history logs.
          </p>
        </div>
        <Button
          onClick={() => setIsRegisterOpen(true)}
          className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      {/* Search Bar & List/Grid Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search registered patients by name, MRN, or phone..."
            className="pl-10 h-11 bg-white border-neutral-200 rounded-xl text-sm"
          />
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
        </div>
      </div>

      {/* Clean List View (Default: Just Name) OR Optional Grid View */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-200 rounded-2xl py-16 text-center text-sm text-neutral-400">
          No patients matched "{searchTerm}".
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-xs">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => {
                setSelectedPatient(patient);
                setDetailTab('overview');
              }}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors cursor-pointer group"
            >
              <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700 transition-colors">
                {patient.fullName}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => {
                setSelectedPatient(patient);
                setDetailTab('overview');
              }}
              className="p-4 bg-white border border-neutral-200 rounded-2xl text-left hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700 truncate">
                {patient.fullName}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* FULL PATIENT DETAIL PAGE MODAL (PROFILE + MEDICAL HISTORY LOGS)     */}
      {/* =================================================================== */}
      <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-3xl bg-white border border-neutral-200 p-0 overflow-hidden rounded-2xl">
          {selectedPatient && (
            <>
              <div className="px-6 py-5 border-b border-neutral-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-blue-600 font-semibold">
                    <span>{selectedPatient.mrn}</span>
                    {selectedPhoneMeta?.isWhatsAppQualified && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-sans text-[11px]">
                        +234 WhatsApp Qualified
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-neutral-950 mt-0.5">
                    {selectedPatient.fullName}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onStartRapidTest && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onStartRapidTest(selectedPatient);
                        setSelectedPatient(null);
                      }}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                      5-Min Rapid Test
                    </Button>
                  )}
                  {onSelectPatientForConsultation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectPatientForConsultation(selectedPatient);
                        setSelectedPatient(null);
                      }}
                      className="rounded-xl border-neutral-200 text-xs font-semibold"
                    >
                      <Stethoscope className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      Consult
                    </Button>
                  )}
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="px-6 pt-3 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50/50">
                {[
                  { id: 'overview', label: 'Patient Details' },
                  { id: 'logs', label: `Medical & Lab Logs (${patientActivityLogs.length})` },
                  { id: 'transfer', label: 'Transfer Department' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetailTab(t.id as any)}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      detailTab === t.id
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
                {detailTab === 'overview' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-neutral-400">Phone / WhatsApp</div>
                      <div className="font-semibold text-neutral-950 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        {selectedPhoneMeta?.display || selectedPatient.phone || 'Not provided'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-neutral-400">Gender &amp; DOB</div>
                      <div className="font-semibold text-neutral-950 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {(selectedPatient as any).gender || (selectedPatient as any).sex || 'N/A'} · {(selectedPatient as any).dob || 'N/A'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-neutral-400">Blood Group</div>
                      <div className="font-semibold text-neutral-950">
                        {(selectedPatient as any).bloodGroup || 'Not recorded'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                      <div className="text-[11px] font-semibold uppercase text-neutral-400">Address</div>
                      <div className="font-semibold text-neutral-950">
                        {(selectedPatient as any).address || 'Lagos, Nigeria'}
                      </div>
                    </div>
                    <div className="sm:col-span-2 p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase text-neutral-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                        Allergies &amp; Chronic Conditions
                      </div>
                      <div className="text-xs text-neutral-700">
                        <strong>Allergies:</strong>{' '}
                        {selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'None recorded'}
                      </div>
                      <div className="text-xs text-neutral-700">
                        <strong>Chronic Conditions:</strong>{' '}
                        {selectedPatient.chronicConditions?.length ? selectedPatient.chronicConditions.join(', ') : 'None recorded'}
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'logs' && (
                  <div className="space-y-3">
                    {patientActivityLogs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                        No laboratory or medical history logs recorded for this patient yet.
                      </div>
                    ) : (
                      patientActivityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 rounded-xl border border-neutral-200 bg-white flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                                {log.category}
                              </span>
                              <span className="text-xs font-bold text-neutral-950">{log.title}</span>
                            </div>
                            <p className="text-xs text-neutral-600">{log.detail}</p>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {new Date(log.date).toLocaleString()}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-semibold shrink-0">
                            {log.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {detailTab === 'transfer' && (
                  <div className="space-y-4">
                    <p className="text-xs text-neutral-500">
                      Transferring a patient fires a <strong>loud audible notification</strong> on the receiving department&apos;s dashboard and adds them to the live queue.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DEPARTMENTS.map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setTransferDept(dept)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                            transferDept === dept
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder={`Optional handover note for ${transferDept}...`}
                      className="h-10 rounded-xl border-neutral-200 text-sm"
                    />
                    <Button
                      onClick={handleExecuteTransfer}
                      className="h-10 px-5 rounded-xl bg-neutral-950 hover:bg-blue-600 text-white font-semibold"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Transfer &amp; Ring {transferDept}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* REGISTER NEW PATIENT MODAL                                          */}
      {/* =================================================================== */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-neutral-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-950">Register New Patient</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Nigerian +234 numbers automatically qualify for instant WhatsApp result delivery.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amina Bello"
                className="h-10 rounded-xl border-neutral-200"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">Phone Number (+234 WhatsApp)</label>
                {phone.trim().length > 6 && (
                  <span
                    className={`text-[11px] font-semibold ${
                      phonePreview.isWhatsAppQualified ? 'text-blue-600' : 'text-amber-600'
                    }`}
                  >
                    {phonePreview.isWhatsAppQualified
                      ? `✓ WhatsApp Qualified (${phonePreview.display})`
                      : 'Enter valid +234 mobile for WhatsApp'}
                  </span>
                )}
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 123 4567 or 08031234567"
                className="h-10 rounded-xl border-neutral-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-sm bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Date of Birth</label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-sm bg-white"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Allergies</label>
                <Input
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="Penicillin, Sulfa..."
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Chronic Conditions</label>
                <Input
                  value={chronicText}
                  onChange={(e) => setChronicText(e.target.value)}
                  placeholder="Hypertension, Diabetes..."
                  className="h-10 rounded-xl border-neutral-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
                Save Patient
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
