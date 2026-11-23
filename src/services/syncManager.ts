import { apiService } from './api';
import { 
  getPendingSales, 
  removePendingSale, 
  saveInventoryToDB, 
  updateLocalProductStock,
  addPendingSale,
  OfflineSale 
} from './offlineDB';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

let isSyncing = false;
const listeners = new Set<() => void>();

export function registerSyncListener(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

/**
 * Perform bi-directional database synchronization:
 * 1. Push pending offline checkout events to active simulated DB
 * 2. Fetch fresh catalog inventories & cache locally 
 */
export async function syncOfflineCache(selectedBranchId: string = 'pharma-1'): Promise<{ syncedCount: number, errorCount: number }> {
  if (isSyncing) return { syncedCount: 0, errorCount: 0 };
  if (!navigator.onLine) {
    console.log('Skipping sync: Device is offline');
    return { syncedCount: 0, errorCount: 0 };
  }

  isSyncing = true;
  notifyListeners();
  
  let syncedCount = 0;
  let errorCount = 0;

  try {
    // 1. Get ALL pending offline sales regardless of branch
    const pendingSales = await getPendingSales();

    if (pendingSales.length > 0) {
      toast.info(`Synchronizing ${pendingSales.length} queued POS transaction(s)...`, { id: 'sync-progress-toast' });
      
      for (const sale of pendingSales) {
        try {
          // Build valid Order Object
          const orderPayload = {
            id: sale.transaction_id,
            patientId: sale.customer?.id || 'walk-in',
            pharmacyId: sale.branch_id || selectedBranchId || 'pharma-1',
            items: sale.items || [],
            total: Number(sale.total || 0),
            subtotal: Number(sale.subtotal || sale.total || 0),
            tax: Number(sale.tax || 0),
            discount: Number(sale.discount || 0),
            status: 'confirmed' as const,
            paymentMethod: sale.paymentMethod || 'cash',
            processedBy: sale.staff_id || 'Cashier',
            createdAt: sale.timestamp || new Date().toISOString(),
            source: 'POS' as const,
            trackingHistory: [
              { status: 'completed', timestamp: sale.timestamp || new Date().toISOString(), message: 'Transacted via POS (Synced to Database)' }
            ]
          };

          // Commit to server with full resilient two-tier upsert
          await apiService.orders.create(orderPayload as any);

          // If Supabase is configured, log sync event
          if (isSupabaseConfigured()) {
            try {
              await supabase.from('offline_sync_logs').insert([{
                device_os: typeof navigator !== 'undefined' ? navigator.userAgent : 'PWA',
                transaction_id: sale.transaction_id,
                branch_id: sale.branch_id || selectedBranchId || 'pharma-1',
                items_count: (sale.items || []).reduce((s, it) => s + (it.quantity || 0), 0),
                total_amount: Number(sale.total || 0)
              }]);
            } catch (logErr) {
              console.warn('Sync audit log notice:', logErr);
            }
          }

          // Handle owing payments or debits if necessary
          if (sale.paymentMethod === 'owing') {
            const remainingAmount = Math.max(0, sale.total - (sale.payment_channels?.['Cash'] || 0));
            const owingStatus = remainingAmount === 0 ? 'fully-paid' : (sale.payment_channels?.['Cash'] || 0) > 0 ? 'partially-paid' : 'unpaid';

            await apiService.owing.add({
              id: `OW-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              orderId: sale.transaction_id,
              customerName: sale.customer?.name || 'Walk-in Customer',
              customerPhone: sale.customer?.phone || '080-000-0000',
              totalAmount: sale.total,
              amountPaid: sale.payment_channels?.['Cash'] || 0,
              amountOwed: remainingAmount,
              dueDate: sale.customer?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: owingStatus,
              items: (sale.items || []).map(i => ({ name: i.name, quantity: i.quantity })),
              pharmacyId: sale.branch_id || selectedBranchId || 'pharma-1',
              notes: `POS credit sale. Balance outstanding. (Synced from Offline Storage)`,
              createdAt: sale.timestamp || new Date().toISOString(),
              payments: (sale.payment_channels?.['Cash'] || 0) > 0 ? [
                {
                  id: `PAY-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                  amount: sale.payment_channels['Cash'] || 0,
                  paymentMethod: 'cash',
                  createdAt: sale.timestamp || new Date().toISOString()
                }
              ] : []
            });
          }

          // Delete corresponding pending row only after successful create
          await removePendingSale(sale.transaction_id);
          syncedCount++;
        } catch (itemErr) {
          console.warn(`Notice syncing offline checkout ${sale.transaction_id}:`, itemErr);
          errorCount++;
        }
      }
    }

    // 2. Push all local orders stored in app to Cloud DB (back-fill any un-synced sales)
    try {
      await apiService.orders.syncAll();
    } catch (syncOrdersErr) {
      console.warn('Order sync notice:', syncOrdersErr);
    }

    // 3. Bi-directional cross-device synchronization with DataStax Astra DB across all tables
    try {
      await apiService.astra.pullAll();
    } catch (astraPullErr) {
      console.warn('Astra cross-device pull notice:', astraPullErr);
    }

    // 4. Bi-directional update: pull down fresh inventory snapshots to resolve discrepancies
    try {
      const freshProducts = await apiService.products.list(selectedBranchId);
      await saveInventoryToDB(freshProducts);
    } catch (invErr) {
      console.warn('Inventory cache refresh notice:', invErr);
    }

    if (syncedCount > 0) {
      toast.success(`Successfully synchronized ${syncedCount} queued sales to Cloud database!`, { id: 'sync-progress-toast' });
    } else if (pendingSales.length > 0 && errorCount === 0) {
      toast.success('All queues fully synchronized and cleared.', { id: 'sync-progress-toast' });
    }
  } catch (globalErr) {
    console.warn('Background sync notice:', globalErr);
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { syncedCount, errorCount };
}

export function getSyncStatus(): boolean {
  return isSyncing;
}

// ============================================================================
// 10-MINUTE PERIODIC BACKGROUND SYNCHRONIZATION & REALTIME ENGINE
// ============================================================================
const TEN_MINUTES_MS = 10 * 60 * 1000;
let syncIntervalTimer: ReturnType<typeof setInterval> | null = null;
let activeRealtimeChannel: any = null;
let isRealtimeSubscribed = false;
let isInitializingRealtime = false;
let currentActiveBranch = 'pharma-1';

/**
 * Initialize the 10-minute periodic background synchronization system.
 * - Runs an immediate sync on initialization
 * - Automatically executes background sync every 10 minutes
 * - Listens for internet reconnection
 * - Subscribes to Supabase Realtime for instant cross-device updates
 */
export function startPeriodicSync(selectedBranchId?: string): () => void {
  if (typeof window === 'undefined') return () => {};

  if (selectedBranchId && selectedBranchId !== 'all') {
    currentActiveBranch = selectedBranchId;
  }

  // Initial sync upon startup (after slight delay to allow app hydration)
  const initialTimeout = setTimeout(() => {
    console.log('[SyncManager] Triggering startup database synchronization...');
    syncOfflineCache(currentActiveBranch).catch(err => {
      console.warn('[SyncManager] Startup synchronization notice:', err);
    });
  }, 1500);

  // Clear any existing timer to prevent duplicates
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
  }

  // 25-second live cross-device synchronization loop with DataStax Astra DB
  syncIntervalTimer = setInterval(() => {
    if (navigator.onLine) {
      apiService.astra.pullAll().catch(() => {});
      syncOfflineCache(currentActiveBranch).catch(err => {
        console.warn('[SyncManager] Periodic background sync notice:', err);
      });
    }
  }, 25000);

  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      apiService.astra.pullAll().catch(() => {});
    }
  };

  window.addEventListener('focus', handleVisibilityOrFocus);
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);

  // Setup Supabase Realtime for instant live sync across devices
  initRealtimeOrdersSubscription();

  return () => {
    clearTimeout(initialTimeout);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    if (syncIntervalTimer) {
      clearInterval(syncIntervalTimer);
      syncIntervalTimer = null;
    }
  };
}

export function stopPeriodicSync(): void {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }
}

export async function triggerImmediateSync(branchId?: string): Promise<{ syncedCount: number, errorCount: number }> {
  return syncOfflineCache(branchId || currentActiveBranch);
}

/**
 * Subscribes to Supabase Realtime channel for instant cross-device updates.
 * When any cashier or manager records a sale on another phone or computer,
 * this client receives an event and pulls down the fresh data immediately.
 */
export function initRealtimeOrdersSubscription(): void {
  // If already subscribed, currently in progress, or Supabase not configured, exit immediately
  if (isRealtimeSubscribed || isInitializingRealtime || activeRealtimeChannel || !isSupabaseConfigured() || typeof window === 'undefined') {
    return;
  }

  try {
    isInitializingRealtime = true;

    // Clean up any stale channel with this topic if one exists
    try {
      const existingChannels = (supabase as any).getChannels ? (supabase as any).getChannels() : [];
      const stale = existingChannels.find((ch: any) => ch.topic === 'realtime:public:orders_cross_device_sync');
      if (stale) {
        supabase.removeChannel(stale);
      }
    } catch {
      // Ignore channel inspection errors
    }

    const channel = supabase
      .channel('public:orders_cross_device_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Realtime] Live order transaction detected from another device:', payload.eventType);
          apiService.orders.syncAll().then(() => {
            window.dispatchEvent(new CustomEvent('orders_updated'));
            window.dispatchEvent(new CustomEvent('database_synced'));
          }).catch(err => console.warn('[Realtime] Sync error after event:', err));
        }
      );

    activeRealtimeChannel = channel;

    channel.subscribe((status) => {
      isInitializingRealtime = false;
      if (status === 'SUBSCRIBED') {
        isRealtimeSubscribed = true;
        console.log('[Realtime] Connected to live Supabase transaction channel across devices');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isRealtimeSubscribed = false;
        activeRealtimeChannel = null;
      }
    });
  } catch (err) {
    isInitializingRealtime = false;
    activeRealtimeChannel = null;
    console.warn('[Realtime] Failed to initialize live subscription:', err);
  }
}

// Watch network restoration
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncManager] Network internet restoration captured. Executing immediate sync...');
    syncOfflineCache(currentActiveBranch);
  });
}
