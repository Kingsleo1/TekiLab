import { Product } from '../types/pharmacy';

export interface OfflineSale {
  transaction_id: string;
  timestamp: string;
  staff_id: string;
  branch_id: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    unit: string;
    saleType?: 'Retail' | 'Wholesale' | 'Volume Price';
    packageSize?: 'Full Pack' | 'Half Pack' | 'Quarter Pack';
  }[];
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  payment_channels: { [key: string]: number };
  paymentMethod: string;
  customer: { id: string; name: string; phone?: string; dueDate?: string };
  sync_status: 'pending' | 'synced';
}

const LS_INVENTORY_KEY = 'ph_offline_inventory_cache';
const LS_SALES_QUEUE_KEY = 'ph_offline_pending_sales';
const LS_LOOKUPS_KEY = 'ph_offline_lookups_cache';

const memoryFallback = {
  inventory: new Map<string, Product>(),
  salesQueue: new Map<string, OfflineSale>(),
  lookups: new Map<string, any>()
};

function readLocalArray<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, items: T[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore quota or storage restrictions
  }
}

/**
 * Safe storage initializer.
 * Uses resilient localStorage + in-memory cache instead of fragile cross-origin
 * IndexedDB connections that can close unexpectedly inside preview iframes.
 */
export function initDB(): Promise<null> {
  return Promise.resolve(null);
}

// ------------------- CACHED INVENTORY ACCESSORS -------------------

export async function getCachedInventoryFromDB(): Promise<Product[]> {
  try {
    const localItems = readLocalArray<Product>(LS_INVENTORY_KEY);
    if (localItems.length > 0) {
      localItems.forEach((p) => {
        if (p?.id) memoryFallback.inventory.set(p.id, p);
      });
      return localItems;
    }
  } catch {
    // Fallback to memory map
  }
  return Array.from(memoryFallback.inventory.values());
}

export async function saveInventoryToDB(products: Product[]): Promise<void> {
  try {
    const safeList = Array.isArray(products) ? products : [];
    memoryFallback.inventory.clear();
    safeList.forEach((p) => {
      if (p?.id) memoryFallback.inventory.set(p.id, p);
    });
    writeLocalArray(LS_INVENTORY_KEY, safeList);
  } catch {
    // Non-blocking cache write
  }
}

export async function updateLocalProductStock(productId: string, quantityToDeduct: number): Promise<void> {
  try {
    const currentInv = readLocalArray<Product>(LS_INVENTORY_KEY);
    const updatedInv = currentInv.map((p) =>
      p.id === productId ? { ...p, stock: Math.max(0, (p.stock || 0) - quantityToDeduct) } : p
    );
    writeLocalArray(LS_INVENTORY_KEY, updatedInv);

    const memProd = memoryFallback.inventory.get(productId);
    if (memProd) {
      memProd.stock = Math.max(0, (memProd.stock || 0) - quantityToDeduct);
      memoryFallback.inventory.set(productId, memProd);
    }
  } catch {
    // Non-blocking stock update
  }
}

// ------------------- PENDING SALES QUEUE ACCESSORS -------------------

export async function addPendingSale(sale: OfflineSale): Promise<void> {
  if (!sale?.transaction_id) return;
  try {
    memoryFallback.salesQueue.set(sale.transaction_id, sale);
    const existing = readLocalArray<OfflineSale>(LS_SALES_QUEUE_KEY).filter(
      (s) => s.transaction_id !== sale.transaction_id
    );
    existing.push(sale);
    writeLocalArray(LS_SALES_QUEUE_KEY, existing);
  } catch {
    // Non-blocking queue insert
  }
}

export async function getPendingSales(): Promise<OfflineSale[]> {
  try {
    const localSales = readLocalArray<OfflineSale>(LS_SALES_QUEUE_KEY);
    if (localSales.length > 0) {
      localSales.forEach((s) => {
        if (s?.transaction_id) memoryFallback.salesQueue.set(s.transaction_id, s);
      });
      return localSales;
    }
  } catch {
    // Fallback to memory queue
  }
  return Array.from(memoryFallback.salesQueue.values());
}

export async function removePendingSale(transactionId: string): Promise<void> {
  try {
    memoryFallback.salesQueue.delete(transactionId);
    const remaining = readLocalArray<OfflineSale>(LS_SALES_QUEUE_KEY).filter(
      (s) => s.transaction_id !== transactionId
    );
    writeLocalArray(LS_SALES_QUEUE_KEY, remaining);
  } catch {
    // Non-blocking queue removal
  }
}

// ------------------- CACHED LOOKUPS ACCESSORS -------------------

export async function saveLookup(key: string, data: any): Promise<void> {
  try {
    memoryFallback.lookups.set(key, data);
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LS_LOOKUPS_KEY);
      const mapObj = raw ? JSON.parse(raw) : {};
      mapObj[key] = data;
      localStorage.setItem(LS_LOOKUPS_KEY, JSON.stringify(mapObj));
    }
  } catch {
    // Non-blocking lookup write
  }
}

export async function getLookup(key: string): Promise<any> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LS_LOOKUPS_KEY);
      if (raw) {
        const mapObj = JSON.parse(raw);
        if (mapObj && key in mapObj) return mapObj[key];
      }
    }
  } catch {
    // Fallback to memory
  }
  return memoryFallback.lookups.get(key) || null;
}
