import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, User, Stethoscope, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HospitalAppointment, PatientRecord } from '../../types/pharmacy';
import { toast } from 'sonner';

interface AppointmentsViewProps {
  appointments: HospitalAppointment[];
  patients: PatientRecord[];
  onBookAppointment: (appointment: HospitalAppointment) => void;
}

export function AppointmentsView({
  appointments,
  patients,
  onBookAppointment
}: AppointmentsViewProps) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [doctorName, setDoctorName] = useState('Dr. Evelyn Vance');
  const [department, setDepartment] = useState('General Outpatient (OPD)');
  const [appointmentDate, setAppointmentDate] = useState('2026-10-05');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [type, setType] = useState<'General Consultation' | 'Specialist Follow-up' | 'Lab Specimen Collection' | 'Radiology Scan' | 'Telemedicine'>('General Consultation');

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const newApt: HospitalAppointment = {
      id: `apt-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      mrn: patient.mrn,
      doctorId: 'doc-101',
      doctorName,
      department,
      appointmentDate,
      timeSlot,
      type,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    };

    onBookAppointment(newApt);
    toast.success(`Appointment booked for ${patient.fullName} on ${appointmentDate} at ${timeSlot}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs mb-1">Appointments & Scheduling</Badge>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-400" /> Doctor Schedules & Patient Appointments
          </h1>
          <p className="text-slate-300 text-xs mt-1">Book consultations, specialist follow-ups, diagnostic scans, and telemedicine slots.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Scheduled Appointments ({appointments.length})</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {appointments.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No upcoming appointments scheduled.</p>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{apt.patientName}</span>
                        <Badge className="bg-sky-100 text-sky-800 font-mono text-[10px]">{apt.mrn}</Badge>
                      </div>
                      <p className="text-slate-500 mt-1">{apt.type} • {apt.doctorName} ({apt.department})</p>
                      <p className="text-[11px] text-sky-600 font-medium mt-0.5">📅 {apt.appointmentDate} at {apt.timeSlot}</p>
                    </div>

                    <Badge className={apt.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                      {apt.status}
                    </Badge>
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
                <Plus className="w-4 h-4 text-sky-600" /> Book New Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <form onSubmit={handleBookSubmit} className="space-y-3">
                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Select Patient</label>
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
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Doctor Name</label>
                  <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Appointment Type</label>
                  <select 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="General Consultation">General Consultation</option>
                    <option value="Specialist Follow-up">Specialist Follow-up</option>
                    <option value="Lab Specimen Collection">Lab Specimen Collection</option>
                    <option value="Radiology Scan">Radiology Scan</option>
                    <option value="Telemedicine">Telemedicine</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                    <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Time Slot</label>
                    <Input value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} placeholder="10:00 AM" />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold">
                  Confirm Booking
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
