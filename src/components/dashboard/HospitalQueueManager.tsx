import React, { useState } from 'react';
import { 
  Clock, 
  Users, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QueueTicket, PatientRecord } from '../../types/pharmacy';
import { toast } from 'sonner';

interface HospitalQueueManagerProps {
  queueTickets: QueueTicket[];
  patients: PatientRecord[];
  onIssueTicket: (ticket: QueueTicket) => void;
  onUpdateTicketStatus: (ticketId: string, status: 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled') => void;
  currentUser?: any;
}

const DEPARTMENTS = [
  'Reception',
  'Triage',
  'Doctor Consultation',
  'Laboratory',
  'Radiology',
  'Pharmacy',
  'Billing'
] as const;

export function HospitalQueueManager({
  queueTickets,
  patients,
  onIssueTicket,
  onUpdateTicketStatus,
  currentUser
}: HospitalQueueManagerProps) {
  const [selectedDept, setSelectedDept] = useState<string>('Doctor Consultation');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'Emergency'>('Normal');

  const activeDeptTickets = queueTickets.filter(q => q.department === selectedDept);

  const handleIssueNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) {
      toast.error('Select a patient.');
      return;
    }

    const nextNum = activeDeptTickets.length + 101;
    const newTicket: QueueTicket = {
      id: `q-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      mrn: patient.mrn,
      ticketNumber: `Q-${nextNum}`,
      department: selectedDept as any,
      priority,
      status: 'Waiting',
      estimatedWaitMins: activeDeptTickets.filter(q => q.status === 'Waiting').length * 10,
      createdAt: new Date().toISOString()
    };

    onIssueTicket(newTicket);
    toast.success(`Issued Ticket ${newTicket.ticketNumber} for ${selectedDept}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs">Hospital Operations</Badge>
            <span className="text-xs text-slate-400">Department Queue Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" /> Multi-Department Patient Queue
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Real-time patient calling, triage priority routing, and estimated wait times across all hospital departments.
          </p>
        </div>
      </div>

      {/* Department Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DEPARTMENTS.map((dept) => {
          const count = queueTickets.filter(q => q.department === dept && q.status === 'Waiting').length;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`p-3 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedDept === dept 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{dept}</span>
              {count > 0 && <Badge className="bg-amber-400 text-slate-950 text-[10px]">{count}</Badge>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Active Queue */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> {selectedDept} Work Queue
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-900 font-mono text-xs">{activeDeptTickets.length} Patients</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {activeDeptTickets.length === 0 ? (
                <p className="text-xs text-center py-10 text-slate-500">No active queue tickets for {selectedDept}.</p>
              ) : (
                activeDeptTickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-mono font-bold text-base flex items-center justify-center shadow-sm">
                        {ticket.ticketNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ticket.patientName}</span>
                          <Badge className={
                            ticket.priority === 'Emergency' ? 'bg-rose-500 text-white' :
                            ticket.priority === 'Urgent' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-800'
                          }>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-slate-500 mt-0.5">MRN: <span className="font-mono text-indigo-600">{ticket.mrn}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ticket.status === 'Waiting' && (
                        <Button 
                          size="sm" 
                          onClick={() => onUpdateTicketStatus(ticket.id, 'Called')} 
                          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Call Patient
                        </Button>
                      )}

                      {ticket.status === 'Called' && (
                        <Button 
                          size="sm" 
                          onClick={() => onUpdateTicketStatus(ticket.id, 'In Progress')} 
                          className="bg-amber-600 hover:bg-amber-500 text-white gap-2 text-xs"
                        >
                          Start Consultation
                        </Button>
                      )}

                      {ticket.status === 'In Progress' && (
                        <Button 
                          size="sm" 
                          onClick={() => onUpdateTicketStatus(ticket.id, 'Completed')} 
                          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Issue Ticket Form */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Issue Queue Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <form onSubmit={handleIssueNewTicket} className="space-y-3">
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
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Department Queue</label>
                  <select 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Priority Level</label>
                  <select 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="Normal">Normal Queue</option>
                    <option value="Urgent">Urgent Priority</option>
                    <option value="Emergency">Emergency Triage (Immediate)</option>
                  </select>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2">
                  Issue Queue Ticket
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
