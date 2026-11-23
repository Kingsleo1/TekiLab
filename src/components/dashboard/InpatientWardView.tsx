import React, { useState } from 'react';
import { 
  Building2, 
  Bed as BedIcon, 
  UserPlus, 
  Activity, 
  FileText, 
  Pill, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ShieldAlert,
  UserCheck,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Ward, Bed, AdmissionRecord, PatientRecord } from '../../types/pharmacy';
import { generateBrandedPDF } from '../../lib/reporting-utils';
import { toast } from 'sonner';

interface InpatientWardViewProps {
  wards: Ward[];
  beds: Bed[];
  admissions: AdmissionRecord[];
  patients: PatientRecord[];
  onAdmitPatient: (admission: AdmissionRecord) => void;
  onDischargePatient: (admissionId: string) => void;
  currentUser?: any;
}

export function InpatientWardView({
  wards,
  beds,
  admissions,
  patients,
  onAdmitPatient,
  onDischargePatient,
  currentUser
}: InpatientWardViewProps) {
  const [selectedWardId, setSelectedWardId] = useState<string>(wards[0]?.id || '');
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);

  // Admission Form
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedBedId, setSelectedBedId] = useState(beds[0]?.id || '');
  const [admittingDoctor, setAdmittingDoctor] = useState('Dr. Evelyn Vance');
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('Severe Hyperglycemia / Diabetes Care');

  // Nursing Note State
  const [nursingNoteText, setNursingNoteText] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(admissions[0] || null);

  const activeWardBeds = beds.filter(b => !selectedWardId || b.wardId === selectedWardId);

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    const bed = beds.find(b => b.id === selectedBedId);

    if (!patient || !bed) {
      toast.error('Select a valid patient and available bed.');
      return;
    }

    const newAdmission: AdmissionRecord = {
      id: `adm-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      mrn: patient.mrn,
      wardId: bed.wardId,
      wardName: bed.wardName,
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      admittingDoctor,
      diagnosis: admissionDiagnosis,
      status: 'Admitted',
      admittedAt: new Date().toISOString(),
      vitalsLog: [],
      nursingNotes: [
        { id: `nn-${Date.now()}`, note: `Patient admitted to ${bed.wardName} (${bed.bedNumber}) under Dr. ${admittingDoctor}.`, nurseName: currentUser?.displayName || 'Nurse On Duty', timestamp: new Date().toISOString() }
      ],
      medicationAdmins: [],
      totalChargeNaira: bed.dailyRateNaira
    };

    onAdmitPatient(newAdmission);
    setIsAdmitOpen(false);
    toast.success(`Patient ${patient.fullName} admitted to ${bed.bedNumber}`);
  };

  const handleAddNursingNote = () => {
    if (!selectedAdmission || !nursingNoteText) return;

    const newNote = {
      id: `nn-${Date.now()}`,
      note: nursingNoteText,
      nurseName: currentUser?.displayName || 'Nurse On Duty',
      timestamp: new Date().toISOString()
    };

    selectedAdmission.nursingNotes.push(newNote);
    setSelectedAdmission({ ...selectedAdmission });
    setNursingNoteText('');
    toast.success('Nursing shift note logged.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 rounded-2xl text-white shadow-lg border border-emerald-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">Inpatient & Wards</Badge>
            <span className="text-xs text-slate-400">Bed Occupancy & Nursing MAR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" /> Ward & Bed Management
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Visual bed board across Male/Female wards, Pediatrics, ICU, nursing shift handover notes, and medication administration records.
          </p>
        </div>

        <Button onClick={() => setIsAdmitOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow">
          <UserPlus className="w-4 h-4" /> Admit Patient to Ward
        </Button>
      </div>

      {/* Wards Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {wards.map((ward) => (
          <button
            key={ward.id}
            onClick={() => setSelectedWardId(ward.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedWardId === ward.id 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 shadow-sm' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{ward.name}</p>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500">Beds</span>
              <span className="font-semibold text-emerald-600">{ward.occupiedBeds} / {ward.totalBeds} Occupied</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bed Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BedIcon className="w-4 h-4 text-emerald-600" /> Visual Bed Board
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {activeWardBeds.map((bed) => {
                  const isOccupied = bed.status === 'Occupied';
                  return (
                    <div 
                      key={bed.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-28 ${
                        isOccupied 
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900' 
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{bed.bedNumber}</span>
                        <Badge className={`text-[9px] ${isOccupied ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'}`}>
                          {bed.status}
                        </Badge>
                      </div>

                      {isOccupied ? (
                        <div className="text-xs">
                          <p className="font-semibold text-rose-900 dark:text-rose-200 truncate">{bed.patientName}</p>
                          <p className="text-[10px] text-slate-500">Rate: ₦{bed.dailyRateNaira.toLocaleString()}/day</p>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Ready for Admission</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nursing Shift Notes & MAR */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Nursing Notes & Handover Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {selectedAdmission ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{selectedAdmission.patientName} ({selectedAdmission.mrn})</p>
                      <p className="text-slate-500 text-[11px]">{selectedAdmission.wardName} • {selectedAdmission.bedNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => {
                          generateBrandedPDF(
                            `INPATIENT WARD ADMISSION RECORD — ${selectedAdmission.patientName}`,
                            `Ward: ${selectedAdmission.wardName} | Bed: ${selectedAdmission.bedNumber} | Admitted: ${new Date(selectedAdmission.admittedAt).toLocaleDateString()}`,
                            [
                              { label: 'Patient MRN', value: selectedAdmission.mrn },
                              { label: 'Admitting Consultant', value: selectedAdmission.admittingDoctor },
                              { label: 'Admission Diagnosis', value: selectedAdmission.admissionDiagnosis },
                              { label: 'Ward & Bed', value: `${selectedAdmission.wardName} (${selectedAdmission.bedNumber})` }
                            ],
                            ['Timestamp', 'Nurse Name', 'Nursing Handover Observation'],
                            selectedAdmission.nursingNotes.map(n => [
                              new Date(n.timestamp).toLocaleString(),
                              n.nurseName,
                              n.note
                            ]),
                            `Inpatient_Record_${selectedAdmission.mrn}`
                          );
                          toast.success('Downloading Ward Admission Summary PDF with Teki Med logo...');
                        }}
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        PDF Summary
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-rose-600 border-rose-300"
                        onClick={() => onDischargePatient(selectedAdmission.id)}
                      >
                        Discharge Patient
                      </Button>
                    </div>
                  </div>

                  {/* Add Nursing Note */}
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add nursing shift observation..." 
                      className="text-xs"
                      value={nursingNoteText}
                      onChange={(e) => setNursingNoteText(e.target.value)}
                    />
                    <Button size="sm" onClick={handleAddNursingNote} className="bg-emerald-600 text-white">Log Note</Button>
                  </div>

                  {/* Notes Timeline */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedAdmission.nursingNotes.map((note) => (
                      <div key={note.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs">
                        <p className="text-slate-800 dark:text-slate-200">{note.note}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span>By: {note.nurseName}</span>
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Select an active admission record to view nursing observations.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admission Wizard Modal */}
      <Dialog open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedIcon className="w-5 h-5 text-emerald-600" /> Patient Ward Admission
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdmitSubmit} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Select Patient</label>
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
              <label className="font-semibold text-slate-700 dark:text-slate-300">Select Available Bed</label>
              <select 
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
              >
                {beds.filter(b => b.status === 'Available').map(b => (
                  <option key={b.id} value={b.id}>{b.wardName} — {b.bedNumber} (₦{b.dailyRateNaira}/day)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Admitting Doctor</label>
              <Input value={admittingDoctor} onChange={(e) => setAdmittingDoctor(e.target.value)} />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Admission Diagnosis</label>
              <Input value={admissionDiagnosis} onChange={(e) => setAdmissionDiagnosis(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAdmitOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 text-white">Confirm Admission</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
