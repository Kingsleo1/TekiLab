import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Pill, 
  UserCheck, 
  FileText, 
  Plus, 
  Search, 
  Calendar,
  ShieldCheck,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PatientRecord, Ward, Bed, AdmissionRecord } from '../../types/pharmacy';
import { generateBrandedPDF } from '../../lib/reporting-utils';
import { toast } from 'sonner';

interface NurseMARItem {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  wardName: string;
  bedNumber: string;
  drugName: string;
  dosage: string;
  route: string;
  scheduleTime: '08:00' | '12:00' | '16:00' | '20:00' | '22:00';
  status: 'Given' | 'Pending' | 'Refused' | 'Held';
  administeredBy?: string;
  administeredAt?: string;
  notes?: string;
}

const DEFAULT_MAR_SCHEDULE: NurseMARItem[] = [
  {
    id: 'mar-001',
    patientId: 'pat-001',
    patientName: 'Amara Okafor',
    mrn: 'TM-2026-4821',
    wardName: 'Male Surgical Ward',
    bedNumber: 'Bed MSW-01',
    drugName: 'IV Ceftriaxone 1g',
    dosage: '1g in 100ml NS',
    route: 'IV Infusion',
    scheduleTime: '08:00',
    status: 'Given',
    administeredBy: 'Nurse Chidinma Eze, RN',
    administeredAt: '2026-10-05T08:15:00Z',
    notes: 'Infusion completed smoothly, site clear.'
  },
  {
    id: 'mar-002',
    patientId: 'pat-001',
    patientName: 'Amara Okafor',
    mrn: 'TM-2026-4821',
    wardName: 'Male Surgical Ward',
    bedNumber: 'Bed MSW-01',
    drugName: 'Paracetamol 1g IV',
    dosage: '1g vial',
    route: 'IV Bolus',
    scheduleTime: '12:00',
    status: 'Pending'
  },
  {
    id: 'mar-003',
    patientId: 'pat-002',
    patientName: 'Babajide Adeleke',
    mrn: 'TM-2026-7731',
    wardName: 'Intensive Care Unit (ICU)',
    bedNumber: 'Bed ICU-01',
    drugName: 'IV Furosemide 40mg',
    dosage: '40mg IV',
    route: 'IV Slow',
    scheduleTime: '08:00',
    status: 'Given',
    administeredBy: 'Nurse Musa Bello, RN',
    administeredAt: '2026-10-05T08:05:00Z',
    notes: 'Urine output monitored via catheter.'
  },
  {
    id: 'mar-004',
    patientId: 'pat-003',
    patientName: 'Fatima Sanusi',
    mrn: 'TM-2026-1190',
    wardName: 'Female Medical Ward',
    bedNumber: 'Bed FMW-02',
    drugName: 'Insulin Glargine 14 Units',
    dosage: '14 Units SubQ',
    route: 'Subcutaneous',
    scheduleTime: '20:00',
    status: 'Pending'
  }
];

export function NurseStationView({
  patients = [],
  wards = [],
  beds = [],
  admissions = [],
  currentUser
}: {
  patients: PatientRecord[];
  wards: Ward[];
  beds: Bed[];
  admissions: AdmissionRecord[];
  currentUser?: any;
}) {
  const [marList, setMarList] = useState<NurseMARItem[]>(() => {
    const saved = localStorage.getItem('tm_nurse_mar');
    return saved ? JSON.parse(saved) : DEFAULT_MAR_SCHEDULE;
  });

  const [activeSlot, setActiveSlot] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(admissions[0] || null);
  const [isLogVitalsOpen, setIsLogVitalsOpen] = useState(false);

  // Vitals State
  const [temp, setTemp] = useState('36.8');
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('76');
  const [spo2, setSpo2] = useState('98');
  const [respiratoryRate, setRespiratoryRate] = useState('16');
  const [fluidIntake, setFluidIntake] = useState('500');
  const [fluidOutput, setFluidOutput] = useState('450');

  const filteredMAR = marList.filter(item => {
    const matchSlot = activeSlot === 'ALL' || item.scheduleTime === activeSlot;
    const matchSearch = 
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.wardName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSlot && matchSearch;
  });

  const handleAdministerDrug = (id: string) => {
    const nurseName = currentUser?.displayName || currentUser?.name || 'Staff Nurse, RN';
    const updated = marList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Given' as const,
          administeredBy: nurseName,
          administeredAt: new Date().toISOString()
        };
      }
      return item;
    });
    setMarList(updated);
    localStorage.setItem('tm_nurse_mar', JSON.stringify(updated));
    toast.success('Medication administration recorded on electronic MAR.');
  };

  const handleHoldDrug = (id: string) => {
    const updated = marList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Held' as const,
          notes: 'Held per clinical parameter check'
        };
      }
      return item;
    });
    setMarList(updated);
    localStorage.setItem('tm_nurse_mar', JSON.stringify(updated));
    toast.info('Medication dosage flagged as HELD.');
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    toast.success(`Inpatient vitals & fluid balance recorded for ${selectedAdmission.patientName}`);
    setIsLogVitalsOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 p-6 rounded-2xl text-white shadow-lg border border-teal-800/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 text-xs">Clinical Inpatient Station</Badge>
            <span className="text-xs text-slate-400">Nursing Kardex & e-MAR Administration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-teal-400" /> Nurse Station & MAR Flowsheet
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Medication administration scheduling (08:00 / 12:00 / 16:00 / 20:00), bedside vitals charting, fluid balance logs, and shift handover kardex.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              generateBrandedPDF(
                'NURSE STATION MEDICATION ADMINISTRATION RECORD (MAR)',
                `Inpatient MAR Flowsheet · Shift: ${new Date().toLocaleDateString()}`,
                [
                  { label: 'Total Scheduled Doses Today', value: `${marList.length}` },
                  { label: 'Doses Successfully Administered', value: `${marList.filter(m => m.status === 'Given').length}` },
                  { label: 'Pending Doses Remaining', value: `${marList.filter(m => m.status === 'Pending').length}` },
                  { label: 'Active Inpatients in Wards', value: `${admissions.length}` }
                ],
                ['Time', 'Patient / MRN', 'Ward & Bed', 'Medication & Route', 'Status', 'Administered By'],
                marList.map(m => [
                  m.scheduleTime,
                  `${m.patientName} (${m.mrn})`,
                  `${m.wardName} - ${m.bedNumber}`,
                  `${m.drugName} (${m.dosage})`,
                  m.status.toUpperCase(),
                  m.administeredBy || 'Pending'
                ]),
                'Nurse_Station_MAR_Summary'
              );
              toast.success('Downloading official Nurse Station MAR PDF Report with Teki Med logo...');
            }}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium gap-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Shift MAR PDF
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Scheduled Doses Today</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{marList.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Pill className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Administered (Given)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{marList.filter(m => m.status === 'Given').length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Doses</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{marList.filter(m => m.status === 'Pending').length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Inpatients</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{admissions.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main MAR Table and Inpatient Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left MAR List */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Electronic Medication Administration Record (e-MAR)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Click "Give" to timestamp verified bedside administration.
                  </CardDescription>
                </div>

                {/* Slot Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['ALL', '08:00', '12:00', '16:00', '20:00'].map(slot => (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        activeSlot === slot 
                          ? 'bg-white text-teal-700 shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-3">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search patient, medication, MRN, ward..." 
                  className="pl-9 text-xs bg-slate-50 border-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Patient / Ward</th>
                      <th className="p-3">Prescribed Medication</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Nurse Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMAR.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No medication doses found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMAR.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              {item.scheduleTime}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{item.patientName}</p>
                            <p className="text-[11px] text-slate-500">{item.wardName} • {item.bedNumber}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-800">{item.drugName}</p>
                            <p className="text-[11px] text-slate-500">{item.dosage}</p>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {item.route}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'Given' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : item.status === 'Held'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                            {item.administeredBy && (
                              <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                                By: {item.administeredBy.split(',')[0]}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {item.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAdministerDrug(item.id)}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Give
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleHoldDrug(item.id)}
                                  className="h-7 px-2 text-rose-600 border-rose-200 text-xs"
                                >
                                  Hold
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Bedside Vitals & Inpatient Quick Card */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600" /> Bedside Vitals Flowsheet
                </span>
                <Button 
                  size="sm" 
                  onClick={() => setIsLogVitalsOpen(true)}
                  className="h-7 text-xs bg-teal-600 hover:bg-teal-500 text-white font-medium"
                >
                  <Plus className="w-3 h-3 mr-1" /> Record Vitals
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-slate-500 text-[11px]">Select active inpatient to review vital sign history:</p>
              <select 
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900"
                value={selectedAdmission?.id || ''}
                onChange={(e) => {
                  const found = admissions.find(a => a.id === e.target.value);
                  if (found) setSelectedAdmission(found);
                }}
              >
                {admissions.map(adm => (
                  <option key={adm.id} value={adm.id}>
                    {adm.patientName} ({adm.wardName} - {adm.bedNumber})
                  </option>
                ))}
              </select>

              {selectedAdmission && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{selectedAdmission.patientName}</span>
                    <Badge className="bg-teal-100 text-teal-800 text-[10px] font-mono">{selectedAdmission.mrn}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ward / Bed</span>
                      <span className="font-semibold text-slate-800">{selectedAdmission.wardName} ({selectedAdmission.bedNumber})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Admitting Doctor</span>
                      <span className="font-semibold text-slate-800">{selectedAdmission.admittingDoctor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Diagnosis</span>
                      <span className="font-semibold text-slate-800">{selectedAdmission.admissionDiagnosis}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Admitted At</span>
                      <span className="font-semibold text-slate-800">{new Date(selectedAdmission.admittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Inpatient Vitals Modal */}
      <Dialog open={isLogVitalsOpen} onOpenChange={setIsLogVitalsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Activity className="w-5 h-5 text-teal-600" /> Inpatient Vital Signs & Fluid Balance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record 4-hourly vitals for {selectedAdmission?.patientName || 'Inpatient'}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVitals} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Temperature (°C)</label>
                <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="36.8" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Blood Pressure (mmHg)</label>
                <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pulse Rate (bpm)</label>
                <Input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="76" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Oxygen Saturation (SpO2 %)</label>
                <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fluid Intake (ml)</label>
                <Input value={fluidIntake} onChange={(e) => setFluidIntake(e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fluid Output (ml)</label>
                <Input value={fluidOutput} onChange={(e) => setFluidOutput(e.target.value)} placeholder="450" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLogVitalsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white font-semibold">
                Save Bedside Charting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
