import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Eye, Pencil, Trash2, Users,
  Search,
  Phone,
  Calendar,
  Clock,
  FlaskConical,
  Stethoscope,
  Send,
  ShieldAlert,
  FileText
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
  onUpdatePatient?: (patient: PatientRecord) => void;
  onDeletePatient?: (patient: PatientRecord) => boolean;
  canManage?: boolean;
  queueTickets?: {patientId?: string}[];
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
  onUpdatePatient, onDeletePatient, canManage = false, queueTickets = [],
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
  const [page, setPage] = useState(1);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [deletePatient, setDeletePatient] = useState<PatientRecord | null>(null);
  const hasHistory = (patient: PatientRecord) => [...encounters, ...labOrders, ...imagingOrders, ...charges, ...queueTickets].some(record => record.patientId === patient.id || (!record.patientId && 'patientName' in record && record.patientName === patient.fullName));
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'logs' | 'transfer'>('overview');

  // Register New Patient Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<PatientRecord['sex']>('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const openEditor = (patient: PatientRecord | null) => {
    setEditingPatient(patient); setFullName(patient?.fullName || ''); setPhone(patient?.phone || '');
    setGender(patient?.sex || (patient as any)?.gender || 'Male'); setDob(patient?.dob || '');
    setBloodGroup(patient?.bloodGroup || ''); setAddress(patient?.address || ''); setEmail(patient?.email || '');
    setAllergiesText(patient?.allergies?.join(', ') || ''); setChronicText(patient?.chronicConditions?.join(', ') || '');
    setIsRegisterOpen(true);
  };

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
        p.phone?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
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
      .filter((l) => l.patientId === selectedPatient.id || (!l.patientId && l.patientName === selectedPatient.fullName))
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

    if (!canManage) return;
    if (dob && dob > new Date().toISOString().slice(0, 10)) { toast.error("Date of birth cannot be in the future."); return; }
    const norm = normalizeNigerianWhatsAppPhone(phone);
    const newPatient: PatientRecord = {
      ...editingPatient,
      id: editingPatient?.id || `pat-${crypto.randomUUID()}`,
      mrn: editingPatient?.mrn || `TK-PAT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      fullName: fullName.trim(),
      phone: norm.e164 || phone.trim(),
      sex: gender,
      gender,
      dob,
      bloodGroup,
      address: address.trim(),
      email: email.trim(),
      allergies: allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      chronicConditions: chronicText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      registeredAt: editingPatient?.registeredAt || (editingPatient as any)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;

    if (editingPatient) onUpdatePatient?.(newPatient); else onAddPatient(newPatient);
    setIsRegisterOpen(false);
    setFullName('');
    setPhone('');
    setAllergiesText('');
    setChronicText('');
    setAddress('');
    toast.success(`${editingPatient ? 'Updated' : 'Registered'} ${newPatient.fullName}`, {
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
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-10 font-sans text-neutral-950">
      {/* Clean Minimalist Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
            Registered Patients
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Manage patient profiles, contact details and clinical history in one place.
          </p>
        </div>
        {canManage && <Button
          onClick={() => openEditor(null)}
          className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Patient registry summary">
        {[['Registered patients', patients.length, 'bg-blue-50 text-blue-700'], ['With contact details', patients.filter(p => p.phone || p.email).length, 'bg-emerald-50 text-emerald-700'], ['Matching your search', filteredPatients.length, 'bg-violet-50 text-violet-700']].map(([label,count,color]) => <div key={String(label)} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3"><div className={String(color)+' rounded-xl p-3'}><Users className="w-5 h-5" /></div><div><p className="text-xs text-neutral-500">{label}</p><p className="text-2xl font-bold">{count}</p></div></div>)}
      </div>
      <section className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden" aria-label="Patient directory">
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div><h2 className="font-semibold">Patient directory</h2><p className="text-xs text-neutral-500">View a profile or update registration details.</p></div>
          <div className="relative sm:w-96"><Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" /><Input aria-label="Search patients" value={searchTerm} onChange={e => {setSearchTerm(e.target.value);setPage(1);}} placeholder="Search name, patient ID, phone or email" className="pl-9" /></div>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable patient table">
          <table className="w-full min-w-[850px] text-sm text-left">
            <caption className="sr-only">Registered patients and profile actions</caption>
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr>{['Patient / ID','Contact','Sex / Date of birth','Registered','Actions'].map(title => <th key={title} scope="col" className="px-5 py-3 font-semibold">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-100">{filteredPatients.slice((Math.min(page, Math.max(1,Math.ceil(filteredPatients.length/20)))-1)*20,Math.min(page, Math.max(1,Math.ceil(filteredPatients.length/20)))*20).map(patient => <tr key={patient.id} className="hover:bg-blue-50/30">
              <td className="px-5 py-4"><button type="button" onClick={() => {setSelectedPatient(patient);setDetailTab('overview');}} className="font-semibold text-neutral-900 hover:text-blue-700 text-left">{patient.fullName}</button><p className="text-xs font-mono text-neutral-500 mt-1">{patient.mrn}</p></td>
              <td className="px-5 py-4"><p>{patient.phone || 'No phone recorded'}</p><p className="text-xs text-neutral-500 mt-1">{patient.email || 'No email recorded'}</p></td>
              <td className="px-5 py-4"><p>{patient.sex || (patient as any).gender || 'Not recorded'}</p><p className="text-xs text-neutral-500 mt-1">{patient.dob || 'Date not recorded'}</p></td>
              <td className="px-5 py-4 text-xs text-neutral-600">{(patient.registeredAt || (patient as any).createdAt || '').slice(0,10) || 'Not recorded'}</td>
              <td className="px-5 py-4"><div className="flex gap-1.5">
                <Button size="sm" variant="outline" aria-label={'View '+patient.fullName} onClick={() => {setSelectedPatient(patient);setDetailTab('overview');}}><Eye className="w-3.5 h-3.5 mr-1" />View</Button>
                {canManage && <><Button size="sm" variant="outline" aria-label={'Edit '+patient.fullName} onClick={() => openEditor(patient)}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button><Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" aria-label={'Delete '+patient.fullName} onClick={() => setDeletePatient(patient)}><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button></>}
              </div></td>
            </tr>)}{!filteredPatients.length && <tr><td colSpan={5} className="text-center py-14 text-neutral-500">{searchTerm ? 'No patients match your search. Try a name, ID or contact detail.' : 'No registered patients yet. Register a patient to get started.'}</td></tr>}</tbody>
          </table>
        </div>
        <div className="p-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500"><span>{filteredPatients.length} patients · Up to 20 per page</span><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p=>p-1)}>Previous</Button><span>Page {Math.min(page,Math.max(1,Math.ceil(filteredPatients.length/20)))} of {Math.max(1,Math.ceil(filteredPatients.length/20))}</span><Button size="sm" variant="outline" disabled={page >= Math.ceil(filteredPatients.length/20)} onClick={() => setPage(p=>p+1)}>Next</Button></div></div>
      </section>
      <Dialog open={Boolean(deletePatient)} onOpenChange={open=>!open&&setDeletePatient(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete patient?</DialogTitle><DialogDescription>{deletePatient && hasHistory(deletePatient) ? 'This patient has clinical, queue or billing records and cannot be deleted. Their history and verified results must remain available.' : 'This removes the patient registration. This action cannot be undone.'}</DialogDescription></DialogHeader><p className="font-semibold">{deletePatient?.fullName} · {deletePatient?.mrn}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeletePatient(null)}>Cancel</Button><Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!canManage || !deletePatient || hasHistory(deletePatient)} onClick={()=>{if(deletePatient && !hasHistory(deletePatient) && onDeletePatient?.(deletePatient)){toast.success('Patient registration deleted');setDeletePatient(null);setPage(1);}}}>Delete patient</Button></div></DialogContent></Dialog>

      {/* =================================================================== */}
      {/* FULL PATIENT DETAIL PAGE MODAL (PROFILE + MEDICAL HISTORY LOGS)     */}
      {/* =================================================================== */}
      <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-3xl bg-white border border-neutral-200 p-0 overflow-hidden rounded-2xl">
          {selectedPatient && (
            <>
              <DialogHeader className="sr-only"><DialogTitle>Patient profile</DialogTitle><DialogDescription>Patient demographics and clinical history</DialogDescription></DialogHeader>
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
                        {(selectedPatient as any).address || 'Not recorded'}
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
            <DialogTitle className="text-lg font-bold text-neutral-950">{editingPatient ? 'Edit Patient' : 'Register New Patient'}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Keep patient details accurate. Result delivery requires a configured provider and patient consent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name *</label>
              <Input
                aria-label="Full name"
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
                aria-label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 123 4567 or 08031234567"
                className="h-10 rounded-xl border-neutral-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Gender</label>
                <select
                  aria-label="Sex"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-sm bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Date of Birth</label>
                <Input aria-label="Date of birth" max={new Date().toISOString().slice(0,10)} type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-10 rounded-xl border-neutral-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Blood Group</label>
                <select
                  aria-label="Blood group"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-sm bg-white"
                >
                  <option value="">Not recorded</option>
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

            <div><label className="block text-xs font-semibold mb-1" htmlFor="patient-email">Email</label><Input id="patient-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold mb-1" htmlFor="patient-address">Address</label><Input id="patient-address" value={address} onChange={e=>setAddress(e.target.value)} /></div>
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
