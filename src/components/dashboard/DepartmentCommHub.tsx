import React, { useState } from 'react';
import {
  BellRing,
  Send,
  Volume2,
  VolumeX,
  CheckCheck,
  Radio,
  ArrowRight,
  Clock
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
import { ALL_DEPARTMENTS, TekiLabDepartment } from '../../config/roles';
import { useNotifications } from '../../context/NotificationContext';

interface DepartmentCommHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment: TekiLabDepartment | string;
  currentUserName: string;
}

const QUICK_BEEPS = [
  'Please confirm sample status & ETA',
  'Patient is waiting at reception — please prioritize',
  'Critical result ready for immediate clinician review',
  'Online paid patient checked in — ready for phlebotomy',
  'Please send updated sample tube (hemolyzed specimen)'
];

export function DepartmentCommHub({
  open,
  onOpenChange,
  currentDepartment,
  currentUserName
}: DepartmentCommHubProps) {
  const {
    alerts,
    soundEnabled,
    setSoundEnabled,
    beepDepartment,
    acknowledgeAlert,
    markAllRead
  } = useNotifications();

  const [targetDept, setTargetDept] = useState<TekiLabDepartment>('Laboratory');
  const [message, setMessage] = useState('');
  const [sampleUid, setSampleUid] = useState('');

  const handleSendBeep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    beepDepartment({
      fromDepartment: currentDepartment,
      toDepartment: targetDept,
      message: message.trim(),
      sampleUid: sampleUid.trim() || undefined
    });
    setMessage('');
    setSampleUid('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border border-neutral-200 p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-neutral-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-neutral-950">
                <Radio className="w-5 h-5 text-blue-600" />
                Department Beep &amp; Live Alerts
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                Beep any department with an audible alert for instant updates, transfers, or online bookings.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="rounded-xl border-neutral-200 text-xs"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Sound On
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                    Muted
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="rounded-xl text-xs text-neutral-600"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Mark Read
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Send Beep Composer */}
          <form onSubmit={handleSendBeep} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Beep Another Department</span>
              <span className="text-[11px] text-neutral-500">From: {currentDepartment}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALL_DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setTargetDept(dept)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    targetDept === dept
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Beep ${targetDept} for an update...`}
                className="sm:col-span-2 h-10 bg-white rounded-xl border-neutral-200 text-sm"
              />
              <Input
                value={sampleUid}
                onChange={(e) => setSampleUid(e.target.value)}
                placeholder="Sample UID (optional)"
                className="h-10 bg-white rounded-xl border-neutral-200 text-xs font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_BEEPS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:border-blue-400 hover:text-blue-700 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!message.trim()}
                className="h-9 px-5 rounded-xl bg-neutral-950 hover:bg-blue-600 text-white text-xs font-semibold"
              >
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                Send Loud Beep to {targetDept}
              </Button>
            </div>
          </form>

          {/* Live Alert Feed */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Recent Transfers, Bookings &amp; Beeps ({alerts.length})
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
                No department alerts yet. Send a beep above or transfer a patient to test the loud chime.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 15).map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      a.read ? 'bg-white border-neutral-100' : 'bg-blue-50/50 border-blue-200'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            a.type === 'ONLINE_BOOKING'
                              ? 'bg-blue-600 text-white'
                              : a.type === 'TRANSFER'
                                ? 'bg-neutral-950 text-white'
                                : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {a.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-neutral-950">{a.title}</span>
                      </div>
                      <p className="text-xs text-neutral-600">{a.message}</p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span>{a.fromDepartment}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-semibold text-neutral-700">{a.toDepartment}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {!a.read ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(a.id, currentUserName)}
                        className="rounded-lg text-[11px] h-7 px-2.5 border-blue-300 text-blue-700 shrink-0"
                      >
                        Acknowledge
                      </Button>
                    ) : (
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        ✓ {a.acknowledgedBy || 'Read'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
