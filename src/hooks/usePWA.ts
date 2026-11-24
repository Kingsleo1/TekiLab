import { useState, useEffect, useCallback } from 'react';
import { getPendingSales } from '../services/offlineDB';
import { syncOfflineCache, registerSyncListener } from '../services/syncManager';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DeviceOS = 'windows' | 'android' | 'ios' | 'mac' | 'linux' | 'other';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deviceOS, setDeviceOS] = useState<DeviceOS>('windows');
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeenSplash = sessionStorage.getItem('tekipharm_welcome_splash_shown') === 'true' || sessionStorage.getItem('maniso_welcome_splash_shown') === 'true';
    return !hasSeenSplash;
  });

  const dismissSplashScreen = useCallback(() => {
    setShowSplashScreen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tekipharm_welcome_splash_shown', 'true');
      sessionStorage.setItem('maniso_welcome_splash_shown', 'true');
    }
  }, []);

  const triggerSplashScreen = useCallback(() => {
    setShowSplashScreen(true);
  }, []);

  // Detect OS & Standalone State
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone (installed PWA) or already marked as installed/downloaded
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneMode);

    const previouslyInstalled = 
      localStorage.getItem('tekipharm_app_installed') === 'true' ||
      localStorage.getItem('tekipharm_pwa_installed_or_downloaded') === 'true' ||
      localStorage.getItem('maniso_app_installed') === 'true' ||
      localStorage.getItem('maniso_pwa_installed_or_downloaded') === 'true';

    setIsInstalled(standaloneMode || previouslyInstalled);

    // Detect Operating System
    const userAgent = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
    
    let detected: DeviceOS = 'windows';
    if (/iphone|ipad|ipod/.test(userAgent)) {
      detected = 'ios';
    } else if (/android/.test(userAgent)) {
      detected = 'android';
    } else if (/win/.test(userAgent)) {
      detected = 'windows';
    } else if (/mac/.test(userAgent)) {
      detected = 'mac';
    } else if (/linux/.test(userAgent)) {
      detected = 'linux';
    } else {
      detected = 'other';
    }
    setDeviceOS(detected);

    // Auto-prompt on first visit if not installed and not dismissed before
    const hasDismissed = localStorage.getItem('maniso_pwa_dismissed') === 'true' ||
      localStorage.getItem('tekipharm_pwa_dismissed') === 'true';

    // Installation is available from Install App without interrupting clinical entry.
  }, []);

  // Listen for beforeinstallprompt event (Chromium, Edge, Chrome on Windows/Android)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('maniso_app_installed', 'true');
      localStorage.setItem('maniso_pwa_installed_or_downloaded', 'true');
      setDeferredPrompt(null);
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Mark as installed/downloaded so modal never pops up unprompted again
  const markAsInstalledOrDownloaded = useCallback(() => {
    setIsInstalled(true);
    localStorage.setItem('maniso_app_installed', 'true');
    localStorage.setItem('maniso_pwa_installed_or_downloaded', 'true');
    setShowInstallModal(false);
  }, []);

  // Online / Offline & Sync Queue Tracking
  const refreshQueueCount = useCallback(async () => {
    try {
      const pending = await getPendingSales();
      setPendingQueueCount(pending.length);
    } catch {
      setPendingQueueCount(0);
    }
  }, []);

  useEffect(() => {
    refreshQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when back online
      handleManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unregisterListener = registerSyncListener(() => {
      refreshQueueCount();
    });

    const interval = setInterval(refreshQueueCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unregisterListener();
      clearInterval(interval);
    };
  }, [refreshQueueCount]);

  // Install trigger
  const triggerNativeInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowInstallModal(false);
        return true;
      }
    } catch (err) {
      console.warn('Native install prompt error:', err);
    }
    return false;
  };

  // Manual Trigger Sync
  const handleManualSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncOfflineCache('pharma-1');
      await refreshQueueCount();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    isOnline,
    deviceOS,
    pendingQueueCount,
    isSyncing,
    showInstallModal,
    setShowInstallModal,
    showSplashScreen,
    setShowSplashScreen,
    dismissSplashScreen,
    triggerSplashScreen,
    triggerNativeInstall,
    markAsInstalledOrDownloaded,
    handleManualSync,
    refreshQueueCount
  };
}
