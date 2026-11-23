import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { TekiLabDepartment } from '../config/roles';

export interface DepartmentAlertItem {
  id: string;
  type: 'TRANSFER' | 'BEEP' | 'ONLINE_BOOKING' | 'WALK_IN_ORDER' | 'CRITICAL_RESULT';
  fromDepartment: TekiLabDepartment | string;
  toDepartment: TekiLabDepartment | 'ALL';
  title: string;
  message: string;
  patientName?: string;
  sampleUid?: string;
  orderSource?: 'ONLINE' | 'WALK_IN';
  createdAt: string;
  read: boolean;
  acknowledgedBy?: string;
}

const STORAGE_KEY = 'tekilab_department_alerts_v1';

/**
 * Plays a crisp, loud multi-tone clinical alert chime using Web Audio API.
 * Works offline without external audio files.
 */
export function playLoudDepartmentChime(
  kind: 'transfer' | 'beep' | 'booking' | 'critical' = 'beep'
) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const patterns: Record<string, { freq: number; start: number; dur: number; gain: number }[]> = {
      transfer: [
        { freq: 880, start: 0, dur: 0.16, gain: 0.28 },
        { freq: 1174.66, start: 0.18, dur: 0.22, gain: 0.3 },
        { freq: 1318.5, start: 0.42, dur: 0.28, gain: 0.28 },
      ],
      beep: [
        { freq: 1046.5, start: 0, dur: 0.14, gain: 0.3 },
        { freq: 1046.5, start: 0.2, dur: 0.14, gain: 0.3 },
        { freq: 1396.9, start: 0.4, dur: 0.25, gain: 0.32 },
      ],
      booking: [
        { freq: 784, start: 0, dur: 0.15, gain: 0.28 },
        { freq: 987.77, start: 0.17, dur: 0.15, gain: 0.28 },
        { freq: 1567.98, start: 0.34, dur: 0.3, gain: 0.3 },
      ],
      critical: [
        { freq: 1200, start: 0, dur: 0.15, gain: 0.35 },
        { freq: 900, start: 0.17, dur: 0.15, gain: 0.35 },
        { freq: 1200, start: 0.34, dur: 0.15, gain: 0.35 },
        { freq: 900, start: 0.51, dur: 0.22, gain: 0.35 },
      ],
    };

    const notes = patterns[kind] || patterns.beep;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = kind === 'critical' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);
      g.gain.setValueAtTime(n.gain, ctx.currentTime + n.start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.start + n.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur + 0.02);
    });
  } catch {
    // Browser autoplay policy fallback — visual banner still renders loudly
  }
}

interface NotificationContextValue {
  alerts: DepartmentAlertItem[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  pushAlert: (
    alert: Omit<DepartmentAlertItem, 'id' | 'createdAt' | 'read'>,
    soundKind?: 'transfer' | 'beep' | 'booking' | 'critical'
  ) => void;
  notifyTransfer: (params: {
    fromDepartment: TekiLabDepartment | string;
    toDepartment: TekiLabDepartment;
    patientName: string;
    notes?: string;
    sampleUid?: string;
  }) => void;
  beepDepartment: (params: {
    fromDepartment: TekiLabDepartment | string;
    toDepartment: TekiLabDepartment;
    message: string;
    sampleUid?: string;
  }) => void;
  notifyOrderArrival: (params: {
    orderSource: 'ONLINE' | 'WALK_IN';
    patientName: string;
    testSummary: string;
    branchName?: string;
  }) => void;
  acknowledgeAlert: (id: string, byName?: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<DepartmentAlertItem[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Sync across tabs so Patient Portal online booking immediately rings Receptionist/Lab tab!
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const next: DepartmentAlertItem[] = JSON.parse(e.newValue);
          setAlerts((prev) => {
            if (next.length > prev.length && soundEnabled) {
              playLoudDepartmentChime('booking');
            }
            return next;
          });
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [soundEnabled]);

  const persist = useCallback((next: DepartmentAlertItem[]) => {
    setAlerts(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
    }
  }, []);

  const pushAlert = useCallback(
    (
      alert: Omit<DepartmentAlertItem, 'id' | 'createdAt' | 'read'>,
      soundKind: 'transfer' | 'beep' | 'booking' | 'critical' = 'beep'
    ) => {
      const item: DepartmentAlertItem = {
        ...alert,
        id: `alrt-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setAlerts((prev) => {
        const next = [item, ...prev].slice(0, 50);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
      if (soundEnabled) {
        playLoudDepartmentChime(soundKind);
      }
      toast.info(item.title, {
        description: item.message,
        duration: 6000,
      });
    },
    [soundEnabled]
  );

  const notifyTransfer = useCallback(
    ({
      fromDepartment,
      toDepartment,
      patientName,
      notes,
      sampleUid,
    }: {
      fromDepartment: TekiLabDepartment | string;
      toDepartment: TekiLabDepartment;
      patientName: string;
      notes?: string;
      sampleUid?: string;
    }) => {
      pushAlert(
        {
          type: 'TRANSFER',
          fromDepartment,
          toDepartment,
          patientName,
          sampleUid,
          title: `Transfer Alert → ${toDepartment}`,
          message: `${patientName} transferred from ${fromDepartment}${notes ? ` — ${notes}` : ''}`,
        },
        'transfer'
      );
    },
    [pushAlert]
  );

  const beepDepartment = useCallback(
    ({
      fromDepartment,
      toDepartment,
      message,
      sampleUid,
    }: {
      fromDepartment: TekiLabDepartment | string;
      toDepartment: TekiLabDepartment;
      message: string;
      sampleUid?: string;
    }) => {
      pushAlert(
        {
          type: 'BEEP',
          fromDepartment,
          toDepartment,
          sampleUid,
          title: `Department Beep: ${fromDepartment} → ${toDepartment}`,
          message,
        },
        'beep'
      );
    },
    [pushAlert]
  );

  const notifyOrderArrival = useCallback(
    ({
      orderSource,
      patientName,
      testSummary,
      branchName,
    }: {
      orderSource: 'ONLINE' | 'WALK_IN';
      patientName: string;
      testSummary: string;
      branchName?: string;
    }) => {
      pushAlert(
        {
          type: orderSource === 'ONLINE' ? 'ONLINE_BOOKING' : 'WALK_IN_ORDER',
          fromDepartment: orderSource === 'ONLINE' ? 'Patient Portal (Online)' : 'Front Desk (Walk-In)',
          toDepartment: 'Reception',
          patientName,
          orderSource,
          title:
            orderSource === 'ONLINE'
              ? `New Online Lab Booking — ${patientName}`
              : `New Walk-In Client Order — ${patientName}`,
          message: `${testSummary}${branchName ? ` · Branch: ${branchName}` : ''}`,
        },
        'booking'
      );
    },
    [pushAlert]
  );

  const acknowledgeAlert = useCallback(
    (id: string, byName = 'Staff') => {
      const next = alerts.map((a) =>
        a.id === id ? { ...a, read: true, acknowledgedBy: byName } : a
      );
      persist(next);
    },
    [alerts, persist]
  );

  const markAllRead = useCallback(() => {
    persist(alerts.map((a) => ({ ...a, read: true })));
  }, [alerts, persist]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <NotificationContext.Provider
      value={{
        alerts,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        pushAlert,
        notifyTransfer,
        beepDepartment,
        notifyOrderArrival,
        acknowledgeAlert,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
