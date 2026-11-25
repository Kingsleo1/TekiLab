import { BookingScanner } from './BookingScanner';
import type { CatalogueScope } from '../../types/test-catalog';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Plus,
  BellRing,
  CheckCircle2,
  Clock,
  ArrowRight,
  Globe,
  Footprints,
  FlaskConical,
  Syringe,
  Stethoscope,
  ClipboardCheck
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
import { PatientRecord } from '../../types/pharmacy';
import { ALL_DEPARTMENTS, TekiLabDepartment } from '../../config/roles';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';

interface HospitalQueueManagerProps {
  catalogueScope: CatalogueScope; onBookingCheckedIn:(bundle:any)=>void;
  queueTickets: any[];
  patients: PatientRecord[];
  onIssueTicket: (ticket: any) => void;
  onTransferTicket: (ticketId: string, department: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: string) => void;
  currentUser?: any;
}

const FLOW_STAGES = [
  {
    id: 'Reception',
    label: '1. Check-In',
    desc: 'Online / Walk-In Intake',
    icon: ClipboardCheck
  },
  {
    id: 'Phlebotomy',
    label: '2. Sample',
    desc: 'QR Tag & Collection',
    icon: Syringe
  },
  {
    id: 'Laboratory',
    label: '3. Lab Analysis',
    desc: '5–10m Rapid Test',
    icon: FlaskConical
  },
  {
    id: 'Doctor Consultation',
    label: '4. Consult / Ready',
    desc: 'Review & Delivery',
    icon: Stethoscope
  }
];

export function HospitalQueueManager({
  catalogueScope, onBookingCheckedIn, currentUser,
  queueTickets,
  patients,
  onIssueTicket,
  onTransferTicket,
  onUpdateTicketStatus
}: HospitalQueueManagerProps) {
  const { notifyTransfer, notifyOrderArrival } = useNotifications();

  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ONLINE' | 'WALK_IN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  // New Ticket Form
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [orderSource, setOrderSource] = useState<'WALK_IN' | 'ONLINE'>('WALK_IN');
  const [department, setDepartment] = useState<TekiLabDepartment>('Laboratory');
  const [notes, setNotes] = useState('');

  // Transfer state inside detail modal
  const [transferTarget, setTransferTarget] = useState<TekiLabDepartment>('Laboratory');

  const filteredTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return queueTickets.filter((t) => {
      const src = t.orderSource === 'ONLINE' ? 'ONLINE' : 'WALK_IN';
      if (sourceFilter !== 'ALL' && src !== sourceFilter) return false;
      if (!q) return true;
      return (
        t.patientName?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.department?.toLowerCase().includes(q)
      );
    });
  }, [queueTickets, sourceFilter, searchTerm]);

  const counts = useMemo(() => {
    const online = queueTickets.filter((t) => t.orderSource === 'ONLINE').length;
    const walkIn = queueTickets.length - online;
    const active = queueTickets.filter((t) => t.status !== 'Completed').length;
    return { online, walkIn, active };
  }, [queueTickets]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPatient = patients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast.error('Select a registered patient before checking in.');
      return;
    }

    if (queueTickets.some(t => t.patientId === selectedPatient!.id && t.department === department && !['Completed','Cancelled'].includes(t.status))) { toast.info('This patient is already active in that department queue.'); return; }
    const prefix = orderSource === 'ONLINE' ? 'ONL' : 'WLK';
    const ticket = {
      id: `q-${Date.now()}`,
      ticketNumber: `${prefix}-${Math.floor(100 + Math.random() * 899)}`,
      patientId: selectedPatient!.id,
      patientName: selectedPatient!.fullName,
      mrn: selectedPatient!.mrn,
      department,
      orderSource,
      status: 'Waiting',
      priority: orderSource === 'ONLINE' ? 'Priority' : 'Normal',
      issuedAt: new Date().toISOString(),
      notes: notes.trim() || `${orderSource === 'ONLINE' ? 'Online booking' : 'Walk-in client'} check-in`
    };

    onIssueTicket(ticket);
    notifyOrderArrival({
      orderSource,
      patientName: ticket.patientName,
      testSummary: `${ticket.department} Queue (${ticket.ticketNumber})`
    });
    setIsIssueOpen(false);
    setPatientName(''); setPatientId('');
    setNotes('');
  };

  const handleTransferTicket = () => {
    if (!selectedTicket) return;
    onTransferTicket(selectedTicket.id, transferTarget);
    notifyTransfer({
      fromDepartment: selectedTicket.department || 'Reception',
      toDepartment: transferTarget,
      patientName: selectedTicket.patientName,
      notes: `Queue Ticket ${selectedTicket.ticketNumber}`
    });
    setSelectedTicket(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-10 font-sans text-neutral-950">
      <BookingScanner scope={catalogueScope} actor={currentUser} onCheckedIn={onBookingCheckedIn}/>
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
            Live Queue &amp; Patient Flow
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {counts.active} active · {counts.online} online bookings · {counts.walkIn} walk-in clients
          </p>
        </div>
        <Button
          onClick={() => setIsIssueOpen(true)}
          className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Check In Patient
        </Button>
      </div>

      {/* Animated Step-by-Step Visual Flow Diagram */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
          Live Laboratory Patient Journey
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
          {FLOW_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const stageCount = queueTickets.filter(
              (t) =>
                t.status !== 'Completed' &&
                (t.department?.toLowerCase().includes(stage.id.toLowerCase().split(' ')[0]) ||
                  (stage.id === 'Reception' && t.status === 'Waiting'))
            ).length;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-mono font-bold text-neutral-950">{stageCount}</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-950">{stage.label}</div>
                  <div className="text-xs text-neutral-500">{stage.desc}</div>
                </div>
                {idx < FLOW_STAGES.length - 1 && (
                  <div className="hidden sm:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white border border-neutral-200 items-center justify-center text-blue-600">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Online vs Walk-In Filter + Search + List/Grid Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-start">
          {[
            { id: 'ALL', label: `All (${queueTickets.length})` },
            { id: 'ONLINE', label: `Online (${counts.online})` },
            { id: 'WALK_IN', label: `Walk-In (${counts.walkIn})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                sourceFilter === tab.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queue by patient name or ticket..."
            className="pl-10 h-10 bg-white border-neutral-200 rounded-xl text-sm"
          />
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
        </div>
      </div>

      {/* Clean List View (Default: Just Name) or Grid View */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-200 rounded-2xl py-16 text-center text-sm text-neutral-400">
          Queue is clear. Check in a walk-in client or wait for an online booking.
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto shadow-xs">
          <div className="min-w-[760px] divide-y divide-neutral-100">
            <div className="grid grid-cols-[40px_110px_minmax(180px,1fr)_130px_100px_100px_24px] items-center gap-3 px-4 py-3 bg-neutral-50 text-xs font-semibold text-neutral-500 whitespace-nowrap">
              <span>No.</span><span>Queue ID</span><span>Patient</span><span>Department</span><span>Source</span><span>Status</span><span />
            </div>
            <AnimatePresence>
              {filteredTickets.map((ticket, index) => (
                <motion.button key={ticket.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} type="button" onClick={() => setSelectedTicket(ticket)} className="w-full grid grid-cols-[40px_110px_minmax(180px,1fr)_130px_100px_100px_24px] items-center gap-3 px-4 py-3 text-left text-sm whitespace-nowrap hover:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
                  <span className="text-neutral-500 tabular-nums">{index + 1}</span><span className="font-mono text-xs text-blue-700 truncate">{ticket.ticketNumber}</span><span className="font-semibold text-neutral-950 truncate" title={ticket.patientName}>{ticket.patientName}</span><span className="text-neutral-600 truncate" title={ticket.department}>{ticket.department || '—'}</span><span className="text-neutral-600">{ticket.orderSource === 'ONLINE' ? 'Online' : 'Walk-in'}</span><span className="text-neutral-700 truncate" title={ticket.status}>{ticket.status || '—'}</span><ChevronRight className="w-4 h-4 text-neutral-400" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => setSelectedTicket(ticket)}
              className="p-4 bg-white border border-neutral-200 rounded-2xl text-left hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700 truncate">
                {ticket.patientName}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Queue Ticket Detail Modal */}
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg bg-white border border-neutral-200 rounded-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-blue-600">{selectedTicket.ticketNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedTicket.orderSource === 'ONLINE'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-950 text-white'
                    }`}
                  >
                    {selectedTicket.orderSource === 'ONLINE' ? 'Online Booking' : 'Walk-In Client'}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-neutral-950">
                  {selectedTicket.patientName}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Department: {selectedTicket.department} · Status: {selectedTicket.status}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {selectedTicket.notes && (
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
                    {selectedTicket.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateTicketStatus(selectedTicket.id, 'In Progress');
                      toast.success(`Called ${selectedTicket.patientName} (${selectedTicket.ticketNumber})`);
                      setSelectedTicket({ ...selectedTicket, status: 'In Progress' });
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Call Patient
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateTicketStatus(selectedTicket.id, 'Completed');
                      toast.success(`Completed ticket ${selectedTicket.ticketNumber}`);
                      setSelectedTicket(null);
                    }}
                    className="rounded-xl border-neutral-200 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Mark Completed
                  </Button>
                </div>

                <div className="border-t border-neutral-100 pt-4 space-y-2.5">
                  <div className="text-xs font-bold text-neutral-700">Transfer to Another Department (Loud Alert)</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value as any)}
                      className="flex-1 h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                    >
                      {ALL_DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleTransferTicket}
                      className="h-10 px-4 rounded-xl bg-neutral-950 hover:bg-blue-600 text-white text-xs font-semibold"
                    >
                      <BellRing className="w-3.5 h-3.5 mr-1.5" />
                      Transfer
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-In Patient Modal */}
      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-neutral-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-950">Check In Patient to Queue</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Distinguish Online Bookings from Walk-In clients and notify the target department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Client Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSource('WALK_IN')}
                  className={`h-10 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderSource === 'WALK_IN' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white text-neutral-700 border-neutral-200'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  Walk-In Client
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSource('ONLINE')}
                  className={`h-10 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderSource === 'ONLINE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-neutral-700 border-neutral-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Online Booking
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Patient Full Name *</label>
              <select aria-label="Registered patient" value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full h-10 rounded-xl border px-2" required>
                <option value="">Select a registered patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} — {p.mrn}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Register new patients in Patient Central first.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
              >
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Test / Visit Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Malaria RDT + CBC Rapid"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsIssueOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
                Issue Ticket &amp; Notify
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
