import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Apple, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  ExternalLink, 
  X,
  Share,
  PlusSquare,
  ShieldCheck,
  ChevronRight,
  HardDrive,
  Laptop
} from 'lucide-react';
import { DeviceOS } from '../../hooks/usePWA';
import { downloadWindowsBatchLauncher, downloadWindowsShortcut } from '../../lib/pwa-installers';
import { toast } from 'sonner';

interface PWAInstallModalProps {
  open: boolean;
  onClose: () => void;
  deviceOS: DeviceOS;
  isInstallable: boolean;
  isInstalled: boolean;
  onTriggerNativeInstall: () => Promise<boolean>;
  onMarkInstalled?: () => void;
  isAdmin?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  open,
  onClose,
  deviceOS,
  isInstallable,
  isInstalled,
  onTriggerNativeInstall,
  onMarkInstalled,
  isAdmin = false
}) => {
  // Default to the auto-detected OS
  const [selectedOS, setSelectedOS] = useState<DeviceOS>(
    deviceOS === 'ios' ? 'ios' : deviceOS === 'android' ? 'android' : deviceOS === 'mac' ? 'mac' : deviceOS === 'linux' ? 'linux' : 'windows'
  );
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  if (!open) return null;

  const handleDismiss = () => {
    // Record dismissed so it never pesters the user unprompted
    localStorage.setItem('maniso_pwa_dismissed', 'true');
    localStorage.setItem('tekipharm_pwa_dismissed', 'true');
    onClose();
  };

  const handleMarkInstalledAndClose = () => {
    localStorage.setItem('tekipharm_app_installed', 'true');
    localStorage.setItem('tekipharm_pwa_installed_or_downloaded', 'true');
    localStorage.setItem('tekipharm_pwa_dismissed', 'true');
    localStorage.setItem('maniso_app_installed', 'true');
    localStorage.setItem('maniso_pwa_installed_or_downloaded', 'true');
    localStorage.setItem('maniso_pwa_dismissed', 'true');
    if (onMarkInstalled) {
      onMarkInstalled();
    }
    toast.success('Teki Pharm is set up on your device!');
    onClose();
  };

  const handleNativeInstallClick = async () => {
    const success = await onTriggerNativeInstall();
    if (success) {
      handleMarkInstalledAndClose();
    } else {
      // In browsers where the direct trigger is withheld (e.g. Chrome policy), prompt manual step
      if (selectedOS === 'android') {
        toast.info('Tap Chrome menu (⋮) > "Install App" or "Add to Home screen"');
      } else {
        toast.info('Click the Install icon (⊕ / ⬇) in your browser address bar.');
      }
    }
  };

  const handleDownloadBatch = () => {
    downloadWindowsBatchLauncher(isAdmin);
    handleMarkInstalledAndClose();
    toast.success(isAdmin ? 'Downloaded Executive Admin Launcher (.bat)!' : 'Downloaded Windows Launcher (.bat)! Run to start standalone POS.');
  };

  const handleDownloadShortcut = () => {
    downloadWindowsShortcut(isAdmin);
    handleMarkInstalledAndClose();
    toast.success(isAdmin ? 'Downloaded Admin Desktop Shortcut (.url)!' : 'Downloaded Desktop Shortcut (.url)! Placed on your PC.');
  };

  const getDeviceLabel = (os: DeviceOS) => {
    switch (os) {
      case 'ios': return 'iPhone & iPad (iOS)';
      case 'android': return 'Android Phone & Tablet';
      case 'windows': return 'Windows PC';
      case 'mac': return 'Apple Mac';
      case 'linux': return 'Linux Desktop';
      default: return 'Desktop & Mobile';
    }
  };

  const isMobile = deviceOS === 'ios' || deviceOS === 'android';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Top Header */}
        <div className={`px-6 pt-5 pb-4 text-white relative border-b ${isAdmin ? 'bg-slate-950 border-emerald-900/50' : 'bg-[#0F172A] border-slate-800'}`}>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="h-12 w-28 rounded-xl bg-white px-2.5 py-1 flex items-center justify-center shrink-0 shadow-lg ring-2 ring-blue-500/20 overflow-hidden">
              <img src="/logo.png?v=4" alt="Teki Med Logo" className="w-full h-full object-contain scale-105" />
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight truncate">
                  {isAdmin ? 'Install Teki Med Admin App' : 'Install Teki Med'}
                </h2>
                {isAdmin && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {isAdmin ? 'Dedicated Executive Admin Terminal & Kernel Control' : 'Dedicated POS, Fast Offline Checkout & Stock Management'}
              </p>
            </div>
          </div>

          {/* Auto-detected pill */}
          <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span>Detected Device: <strong>{getDeviceLabel(deviceOS)}</strong></span>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAllPlatforms(!showAllPlatforms)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {showAllPlatforms ? 'Hide platforms' : 'Switch platform'}
            </button>
          </div>
        </div>

        {/* Platform Selector (Collapsible for cleaner mobile UX) */}
        {showAllPlatforms && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-4 py-2 gap-1.5 overflow-x-auto">
            {[
              { id: 'ios', label: 'iPhone/iPad', icon: <Apple size={14} /> },
              { id: 'android', label: 'Android', icon: <Smartphone size={14} /> },
              { id: 'windows', label: 'Windows', icon: <Monitor size={14} /> },
              { id: 'mac', label: 'Mac/Linux', icon: <Laptop size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedOS(tab.id as DeviceOS)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedOS === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Body Content - Auto Optimized for the Target Device */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">

          {/* 1. APPLE IPHONE / IPAD (IOS) */}
          {selectedOS === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Install Teki Pharm to your iPhone or iPad home screen for instant full-screen offline cashier checkout.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                    1
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Tap the <strong>Share</strong> button <Share size={15} className="text-blue-600 inline shrink-0" />
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Found in the bottom navigation toolbar in Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                    2
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Select <strong>Add to Home Screen</strong> <PlusSquare size={15} className="text-blue-600 inline shrink-0" />
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Scroll down in the share sheet options and tap <strong>Add</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMarkInstalledAndClose}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
              >
                <CheckCircle2 size={16} className="text-emerald-400" />
                I've Added to Home Screen
              </button>
            </div>
          )}

          {/* 2. ANDROID MOBILE / TABLET */}
          {selectedOS === 'android' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-slate-800">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Install the native WebAPK app on your Android device for instant barcode scanner camera access and complete offline sales.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Direct 1-Tap Installation</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Android APK Ready
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleNativeInstallClick}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Download size={16} />
                  Install Android App Now
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">If install prompt doesn't open:</p>
                <p>Tap the <strong>3-dots menu (⋮)</strong> at top right in Chrome &gt; tap <strong>Install app</strong>.</p>
              </div>
            </div>
          )}

          {/* 3. WINDOWS PC */}
          {selectedOS === 'windows' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Install Teki Pharm as a standalone Windows desktop POS terminal with hardware barcode scanner integration, direct receipt printing, and background offline database sync.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1-Click Native Desktop App */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">Direct Desktop Install</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Installs via Chrome or Edge with start menu shortcut and taskbar pinning.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstallClick}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    {isInstallable ? 'Install Windows App' : 'Prompt Edge/Chrome Install'}
                  </button>
                </div>

                {/* Standalone Launcher (.bat) */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} className="text-slate-700" />
                      <span className="text-xs font-bold text-slate-900">Windows Launcher (.bat)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Standalone executable launcher that opens the POS in fullscreen desktop app mode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBatch}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Download Launcher (.bat)
                  </button>
                </div>
              </div>

              {/* Desktop Shortcut */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="text-slate-600">Want a direct Desktop Icon shortcut?</span>
                <button
                  type="button"
                  onClick={handleDownloadShortcut}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Download .URL <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}

          {/* 4. MAC / LINUX */}
          {(selectedOS === 'mac' || selectedOS === 'linux') && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Install Teki Pharm directly into your Applications or Launchpad on {selectedOS === 'mac' ? 'macOS' : 'Linux'}.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Standalone Desktop Application</span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">Desktop PWA</span>
                </div>
                <button
                  type="button"
                  onClick={handleNativeInstallClick}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={15} />
                  Install Desktop App
                </button>
              </div>
            </div>
          )}

          {/* Offline Capabilities Note */}
          <div className="flex items-center justify-around gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Offline POS Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={13} className="text-blue-600" />
              <span>Auto Database Sync</span>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
          >
            Continue in Web Browser
          </button>
        </div>

      </div>
    </div>
  );
};
