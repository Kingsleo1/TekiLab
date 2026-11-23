import { TekiLabModuleKey, TenantFeatureToggles } from '../types/tekilab';

/**
 * TekiLab Global Feature Toggling ("Feature Muting") Configuration
 *
 * Controls UI visibility of auxiliary healthcare modules while keeping all
 * underlying backend APIs, schemas, and cross-module data hooks (such as
 * Lab-to-Pharmacy prescription handoffs) 100% functional.
 */
export interface GlobalModuleToggles {
  /** Primary LIMS / LIS Core — always enabled and cannot be muted */
  laboratoryCore: true;
  /** AI Auto-Verification, Outlier/Delta Engine & Protocol Assistant */
  aiAnalyticsModule: boolean;
  /** Legacy / Auxiliary Pharmacy POS, Inventory & Live Rx Queue UI */
  pharmacyModule: boolean;
  /** Legacy / Auxiliary EMR & Outpatient Clinical Charts UI */
  emrModule: boolean;
  /** Legacy / Auxiliary Hospital Management (Radiology, Wards, Queue, Appointments) UI */
  hospitalModule: boolean;
  /** Legacy / Auxiliary Hospital Billing, HMO & Expense Ledgers UI */
  billingModule: boolean;
}

export const GLOBAL_FEATURE_TOGGLE_STORAGE_KEY = 'tekilab_global_module_toggles_v1';

/**
 * Default standalone TekiLab LIMS posture:
 * - Laboratory Core & AI Diagnostics are ACTIVE
 * - Legacy EMR, Hospital Management, Pharmacy & Billing UIs are MUTED by default
 *   (their backend routes & data payloads remain active for silent cross-module hooks).
 */
export const DEFAULT_MODULE_TOGGLES: GlobalModuleToggles = {
  laboratoryCore: true,
  aiAnalyticsModule: true,
  pharmacyModule: false,
  emrModule: false,
  hospitalModule: false,
  billingModule: false,
};

/** Maps GlobalModuleToggles keys <-> TenantFeatureToggles keys */
export function toTenantFeatureToggles(globalToggles: GlobalModuleToggles): TenantFeatureToggles {
  return {
    lims: true,
    ai_analytics: Boolean(globalToggles.aiAnalyticsModule),
    pharmacy: Boolean(globalToggles.pharmacyModule),
    emr: Boolean(globalToggles.emrModule),
    hospital_management: Boolean(globalToggles.hospitalModule),
    billing: Boolean(globalToggles.billingModule),
  };
}

export function fromTenantFeatureToggles(modules: TenantFeatureToggles): GlobalModuleToggles {
  return {
    laboratoryCore: true,
    aiAnalyticsModule: Boolean(modules.ai_analytics),
    pharmacyModule: Boolean(modules.pharmacy),
    emrModule: Boolean(modules.emr),
    hospitalModule: Boolean(modules.hospital_management),
    billingModule: Boolean(modules.billing),
  };
}

export function getGlobalFeatureToggles(): GlobalModuleToggles {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_MODULE_TOGGLES };
  try {
    const raw = localStorage.getItem(GLOBAL_FEATURE_TOGGLE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODULE_TOGGLES };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MODULE_TOGGLES,
      ...parsed,
      laboratoryCore: true,
    };
  } catch {
    return { ...DEFAULT_MODULE_TOGGLES };
  }
}

export function saveGlobalFeatureToggles(toggles: Partial<GlobalModuleToggles>): GlobalModuleToggles {
  const merged: GlobalModuleToggles = {
    ...getGlobalFeatureToggles(),
    ...toggles,
    laboratoryCore: true,
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(GLOBAL_FEATURE_TOGGLE_STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export const MODULE_KEY_TO_GLOBAL_KEY: Record<TekiLabModuleKey, keyof GlobalModuleToggles> = {
  lims: 'laboratoryCore',
  ai_analytics: 'aiAnalyticsModule',
  pharmacy: 'pharmacyModule',
  emr: 'emrModule',
  hospital_management: 'hospitalModule',
  billing: 'billingModule',
};
