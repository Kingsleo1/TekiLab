import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldCheck, Zap, Activity } from 'lucide-react';
import { DeviceOS } from '../../hooks/usePWA';

interface SplashScreenProps {
  show: boolean;
  onFinish: () => void;
  deviceOS: DeviceOS;
  isStandalone?: boolean;
  logoUrl?: string;
  companyName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  show,
  onFinish,
  deviceOS,
  isStandalone = false,
  logoUrl,
  companyName
}) => {
  const [progress, setProgress] = useState(15);
  const displayBrand = companyName || 'Teki Pharm';
  const [statusText, setStatusText] = useState('Initializing Pharmacy Kernel...');

  useEffect(() => {
    if (!show) return;

    const timer1 = setTimeout(() => {
      setProgress(55);
      setStatusText('Connecting Offline POS Database & Storage...');
    }, 450);

    const timer2 = setTimeout(() => {
      setProgress(88);
      setStatusText('Verifying Security Credentials & Sync Cache...');
    }, 1050);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText(`Ready. Welcome to ${displayBrand}.`);
    }, 1700);

    const timerFinish = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerFinish);
    };
  }, [show, onFinish, displayBrand]);

  if (!show) return null;

  const getPlatformLabel = () => {
    switch (deviceOS) {
      case 'ios': return 'iOS Application';
      case 'android': return 'Android App';
      case 'windows': return 'Windows POS Terminal';
      case 'mac': return 'macOS Application';
      case 'linux': return 'Linux Desktop Terminal';
      default: return 'Installed Application';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="tekipharm-splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        onClick={onFinish}
        className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none cursor-pointer"
        role="dialog"
        aria-label={`Welcome to ${displayBrand}`}
      >
        {/* Top Status Bar indicator */}
        <div className="w-full max-w-md flex items-center justify-between text-xs text-slate-400 font-medium pt-2">
          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span>{getPlatformLabel()}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Encrypted POS Kernel</span>
          </div>
        </div>

        {/* Center: The Uploaded Landscape Logo */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full flex items-center justify-center relative"
          >
            <img
              src={logoUrl || '/logo.png?v=4'}
              alt={displayBrand}
              className="w-72 h-40 sm:w-96 sm:h-52 object-contain drop-shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png?v=4';
              }}
            />
          </motion.div>

          {/* Progress Bar & Status Text */}
          <div className="w-full max-w-xs mt-6 space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="truncate pr-2">{statusText}</span>
              <span className="font-semibold text-slate-500">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Footer Badges */}
        <div className="w-full max-w-md flex flex-col items-center gap-2 pb-2 text-center">
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Activity size={12} className="text-blue-500" /> Offline Capable
            </span>
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-amber-500" /> Instant Checkout
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" /> Auto-Sync
            </span>
          </div>
          
          <p className="text-[10px] text-slate-400 tracking-wider">
            Tap anywhere to proceed • v2.4 Enterprise POS
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
