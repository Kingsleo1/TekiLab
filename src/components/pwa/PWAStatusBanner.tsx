import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, HardDrive, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface PWAStatusBannerProps {
  onOpenInstallModal: () => void;
}

export const PWAStatusBanner: React.FC<PWAStatusBannerProps> = ({ onOpenInstallModal }) => {
  const { isOnline, pendingQueueCount, isSyncing, handleManualSync, isInstalled } = usePWA();

  if (isOnline && pendingQueueCount === 0 && !isSyncing) {
    // Normal connected state - show nothing or subtle indicator
    return null;
  }

  return (
    <div className={`w-full px-4 py-2 text-xs font-medium border-b flex flex-wrap items-center justify-between gap-3 transition-colors ${
      !isOnline 
        ? 'bg-amber-500 text-white border-amber-600' 
        : pendingQueueCount > 0 
          ? 'bg-blue-600 text-white border-blue-700' 
          : 'bg-emerald-600 text-white border-emerald-700'
    }`}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff size={16} className="animate-pulse" />
            <span>
              <strong>Offline Mode Active</strong> — All POS sales and inventory transactions are stored safely on your local device.
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>
              <strong>Synchronizing with Cloud Database...</strong> Pushing queued offline sales to Supabase.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            <span>
              <strong>Connected to Cloud</strong> — {pendingQueueCount} pending transaction{pendingQueueCount > 1 ? 's' : ''} ready to sync.
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pendingQueueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] font-semibold">
            {pendingQueueCount} Queued
          </span>
        )}

        {isOnline && pendingQueueCount > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded bg-white text-slate-900 text-[11px] font-medium hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}

        {!isInstalled && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <HardDrive size={12} />
            Install App
          </button>
        )}
      </div>
    </div>
  );
};
