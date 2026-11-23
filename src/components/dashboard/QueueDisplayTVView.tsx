import { useState, useEffect } from 'react';
import { 
  Volume2, 
  Tv, 
  Users, 
  Clock, 
  Stethoscope, 
  FlaskConical, 
  FileSearch, 
  Pill, 
  CreditCard,
  Building2,
  BellRing
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueueTicket } from '../../types/pharmacy';
import { format } from 'date-fns';

interface QueueDisplayTVViewProps {
  queueTickets: QueueTicket[];
  onClose?: () => void;
}

export function QueueDisplayTVView({ queueTickets = [], onClose }: QueueDisplayTVViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeCall, setActiveCall] = useState<{ ticketNumber: string; department: string; counter: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter currently in-progress tickets per department
  const doctorTickets = queueTickets.filter(q => q.department === 'Doctor Consultation' && (q.status === 'In Progress' || (q.status as string) === 'IN_PROGRESS'));
  const labTickets = queueTickets.filter(q => q.department === 'Laboratory' && (q.status === 'In Progress' || (q.status as string) === 'IN_PROGRESS'));
  const radTickets = queueTickets.filter(q => q.department === 'Radiology' && (q.status === 'In Progress' || (q.status as string) === 'IN_PROGRESS'));
  const pharmaTickets = queueTickets.filter(q => q.department === 'Pharmacy' && (q.status === 'In Progress' || (q.status as string) === 'IN_PROGRESS'));
  const cashierTickets = queueTickets.filter(q => q.department === 'Billing' && (q.status === 'In Progress' || (q.status as string) === 'IN_PROGRESS'));

  const triggerChime = (ticketNumber: string, department: string, counter: string) => {
    setActiveCall({ ticketNumber, department, counter });
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top TV Bar */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-12 w-44 rounded-xl bg-white px-3 py-1 flex items-center justify-center shadow-md overflow-hidden">
            <img src="/logo.png?v=4" alt="Teki Med Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              TEKIMED HEALTHCARE OS
            </h1>
            <p className="text-xs text-sky-400 font-medium">Digital Outpatient Queue & Waiting Room Broadcast</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-black font-mono tracking-wider text-white">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-xs text-slate-400 font-medium">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
          </div>

          {onClose && (
            <Button 
              onClick={onClose}
              variant="outline" 
              className="h-10 px-4 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 text-xs font-semibold"
            >
              Exit Fullscreen TV Mode
            </Button>
          )}
        </div>
      </header>

      {/* Active Call Alert Flasher Banner */}
      {activeCall && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 py-3 px-8 text-center text-white font-bold text-lg flex items-center justify-center gap-4 animate-pulse shadow-md">
          <BellRing className="w-6 h-6" />
          <span>NOW CALLING TICKET: <strong className="font-mono text-2xl bg-white text-emerald-950 px-3 py-0.5 rounded-lg ml-2">{activeCall.ticketNumber}</strong> TO {activeCall.department.toUpperCase()} ({activeCall.counter})</span>
        </div>
      )}

      {/* Main Department Calling Matrix */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-0 overflow-y-auto">
        {/* 1. Doctor Consultation Rooms */}
        <Card className="bg-slate-900 border-sky-900/60 rounded-3xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-sky-950/80 border-b border-sky-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Stethoscope className="w-5 h-5" /> Doctor Consultations
            </div>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs">OPD Clinic</Badge>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Currently Serving</p>
              <div className="mt-2 text-center p-6 bg-slate-950 rounded-2xl border border-sky-900/40">
                <span className="text-5xl font-black font-mono text-sky-400 tracking-wider">
                  {doctorTickets[0]?.ticketNumber || 'A-102'}
                </span>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {doctorTickets[0]?.patientName || 'Consultation Room 01'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Upcoming In Queue</span>
              <div className="flex flex-wrap gap-2">
                {['A-103', 'A-104', 'A-105'].map(tk => (
                  <span key={tk} className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Diagnostic Laboratory LIMS */}
        <Card className="bg-slate-900 border-purple-900/60 rounded-3xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-purple-950/80 border-b border-purple-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <FlaskConical className="w-5 h-5" /> Laboratory & LIMS
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">Specimen Desk</Badge>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Currently Serving</p>
              <div className="mt-2 text-center p-6 bg-slate-950 rounded-2xl border border-purple-900/40">
                <span className="text-5xl font-black font-mono text-purple-400 tracking-wider">
                  {labTickets[0]?.ticketNumber || 'L-204'}
                </span>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {labTickets[0]?.patientName || 'Phlebotomy Desk 02'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Upcoming In Queue</span>
              <div className="flex flex-wrap gap-2">
                {['L-205', 'L-206', 'L-207'].map(tk => (
                  <span key={tk} className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Radiology & Medical Imaging */}
        <Card className="bg-slate-900 border-indigo-900/60 rounded-3xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-indigo-950/80 border-b border-indigo-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <FileSearch className="w-5 h-5" /> Radiology & Scans
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-xs">Imaging Suite</Badge>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Currently Serving</p>
              <div className="mt-2 text-center p-6 bg-slate-950 rounded-2xl border border-indigo-900/40">
                <span className="text-5xl font-black font-mono text-indigo-400 tracking-wider">
                  {radTickets[0]?.ticketNumber || 'R-301'}
                </span>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {radTickets[0]?.patientName || 'Ultrasound & X-Ray Room'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Upcoming In Queue</span>
              <div className="flex flex-wrap gap-2">
                {['R-302', 'R-303'].map(tk => (
                  <span key={tk} className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Hospital Pharmacy & Dispensary */}
        <Card className="bg-slate-900 border-emerald-900/60 rounded-3xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-emerald-950/80 border-b border-emerald-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Pill className="w-5 h-5" /> Hospital Dispensary
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">Counter 01-03</Badge>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Currently Serving</p>
              <div className="mt-2 text-center p-6 bg-slate-950 rounded-2xl border border-emerald-900/40">
                <span className="text-5xl font-black font-mono text-emerald-400 tracking-wider">
                  {pharmaTickets[0]?.ticketNumber || 'P-508'}
                </span>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {pharmaTickets[0]?.patientName || 'Medication Dispense Desk'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Upcoming In Queue</span>
              <div className="flex flex-wrap gap-2">
                {['P-509', 'P-510', 'P-511'].map(tk => (
                  <span key={tk} className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom News & Information Ticker */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-white uppercase tracking-wider">Hospital Notice:</span>
          <span>Please proceed to the designated station when your token number is displayed and called.</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <span>NHIS & Private HMO Enrollees report at Desk 2</span>
          <span>•</span>
          <span className="text-sky-400 font-semibold">Teki Med Health OS Broadcast</span>
        </div>
      </footer>
    </div>
  );
}
