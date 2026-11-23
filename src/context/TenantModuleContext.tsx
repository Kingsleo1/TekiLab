import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TekiLabModuleKey,
  TenantConfiguration,
  TenantFeatureToggles,
  TenantTierPreset
} from '../types/tekilab';
import {
  fromTenantFeatureToggles,
  getGlobalFeatureToggles,
  saveGlobalFeatureToggles,
  toTenantFeatureToggles
} from '../config/featureToggles';

const STORAGE_KEY_PREFIX = 'tekilab_tenant_config_v2_';

export const TIER_PRESETS: Record<
  TenantTierPreset,
  {
    label: string;
    tagline: string;
    monthlyNaira: number;
    modules: TenantFeatureToggles;
  }
> = {
  lims_core: {
    label: 'TekiLab LIMS Core',
    tagline: 'Diagnostic labs focused on 5-minute rapid results, AI validation & WhatsApp PDF delivery.',
    monthlyNaira: 25000,
    modules: {
      lims: true,
      emr: false,
      hospital_management: false,
      pharmacy: false,
      billing: false,
      ai_analytics: true
    }
  },
  lims_pharmacy: {
    label: 'TekiLab LIMS + Pharmacy',
    tagline: 'Diagnostic lab with live cross-module prescription handoff directly into Pharmacy POS.',
    monthlyNaira: 45000,
    modules: {
      lims: true,
      emr: false,
      hospital_management: false,
      pharmacy: true,
      billing: true,
      ai_analytics: true
    }
  },
  lims_emr: {
    label: 'TekiLab Diagnostic Clinic',
    tagline: 'Rapid LIMS paired with outpatient EMR consultations and longitudinal patient charts.',
    monthlyNaira: 55000,
    modules: {
      lims: true,
      emr: true,
      hospital_management: false,
      pharmacy: false,
      billing: true,
      ai_analytics: true
    }
  },
  hospital_full: {
    label: 'Full Hospital Suite',
    tagline: 'All modules unmuted: LIMS, EMR, Inpatient Wards, Radiology, Billing & Pharmacy.',
    monthlyNaira: 95000,
    modules: {
      lims: true,
      emr: true,
      hospital_management: true,
      pharmacy: true,
      billing: true,
      ai_analytics: true
    }
  }
};

export function createDefaultTenantConfig(
  tenantId: string = 'tenant-tekilab-01',
  tenantSlug: string = 'tekilab-diagnostics',
  facilityName: string = 'TekiLab Diagnostics Centre'
): TenantConfiguration {
  return {
    tenantId,
    tenantSlug,
    facilityName,
    // Default to LIMS Core prioritized architecture (EMR, Hospital & Pharmacy muted until enabled)
    subscriptionTier: 'lims_core',
    modules: { ...TIER_PRESETS.lims_core.modules },
    slaConfig: {
      rapidTurnaroundTargetMinutes: 5,
      maxSlaMinutes: 10,
      autoAiAnomalyCheck: true,
      requirePathologistSignoffOnCritical: true
    },
    whatsappDispatch: {
      enabled: true,
      senderName: facilityName,
      includeQrVerification: true,
      autoAttachPdf: true
    },
    instrumentHub: {
      webhookEnabled: true,
      allowedInstruments: ['SYS-XN550-01', 'ROCHE-C311-02', 'MINDRAY-BC5000', 'ABBOTT-I1000SR']
    },
    updatedAt: new Date().toISOString()
  };
}

/**
 * Maps every dashboard route/view in the application to its owning module.
 * Views mapped to 'core' are always visible regardless of subscription tier.
 */
export const VIEW_TO_MODULE_MAP: Record<string, TekiLabModuleKey | 'core'> = {
  // Core TekiLab LIMS & Platform Administration
  rapid_console: 'lims',
  lab: 'lims',
  overview: 'core',
  saas_control: 'core',
  module_config: 'core',
  staff: 'core',
  admin_users: 'core',
  admin_merchants: 'core',
  admin_reports: 'core',
  admin_settings: 'core',
  admin_integrations: 'core',
  patients: 'core', // Shared patient registry needed for lab intake

  // AI & Predictive Maintenance
  ai_assistant: 'ai_analytics',

  // EMR Module
  emr: 'emr',

  // Hospital Management Module
  radiology: 'hospital_management',
  inpatient: 'hospital_management',
  queue: 'hospital_management',
  appointments: 'hospital_management',

  // Pharmacy Module
  pos: 'pharmacy',
  inventory: 'pharmacy',
  admin_products: 'pharmacy',
  warehouse: 'pharmacy',
  transfer: 'pharmacy',
  new_supply: 'pharmacy',
  supply_records: 'pharmacy',
  new_supplier: 'pharmacy',
  list_of_suppliers: 'pharmacy',
  admin_customers: 'pharmacy',
  admin_marketing: 'pharmacy',
  orders: 'pharmacy',

  // Billing & Finance Module
  billing: 'billing',
  admin_orders: 'billing',
  history: 'billing',
  owing_records: 'billing',
  expenses: 'billing',
  sales: 'billing'
};

interface TenantModuleContextValue {
  config: TenantConfiguration;
  isLoading: boolean;
  isSaving: boolean;
  isModuleEnabled: (moduleKey: TekiLabModuleKey) => boolean;
  isViewEnabled: (viewKey: string) => boolean;
  toggleModule: (moduleKey: TekiLabModuleKey, nextValue?: boolean) => Promise<void>;
  applyTierPreset: (tier: TenantTierPreset) => Promise<void>;
  updateConfig: (patch: Partial<TenantConfiguration>) => Promise<void>;
  mutedModulesCount: number;
  enabledModulesList: TekiLabModuleKey[];
}

const TenantModuleContext = createContext<TenantModuleContextValue | undefined>(undefined);

function detectMatchingTier(modules: TenantFeatureToggles): TenantTierPreset {
  if (modules.emr && modules.hospital_management && modules.pharmacy) return 'hospital_full';
  if (modules.pharmacy && !modules.emr && !modules.hospital_management) return 'lims_pharmacy';
  if (modules.emr && !modules.pharmacy && !modules.hospital_management) return 'lims_emr';
  return 'lims_core';
}

export const TenantModuleProvider: React.FC<{
  tenantId?: string;
  tenantSlug?: string;
  facilityName?: string;
  updatedBy?: string;
  children: React.ReactNode;
}> = ({
  tenantId = 'tenant-tekilab-01',
  tenantSlug = 'tekilab-diagnostics',
  facilityName = 'TekiLab Diagnostics Centre',
  updatedBy = 'System Admin',
  children
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${tenantId}`;

  const [config, setConfig] = useState<TenantConfiguration>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as TenantConfiguration;
          return {
            ...createDefaultTenantConfig(tenantId, tenantSlug, facilityName),
            ...parsed,
            modules: {
              ...TIER_PRESETS.lims_core.modules,
              ...(parsed.modules || {}),
              lims: true // Primary LIMS Core is never muted
            }
          };
        }
      } catch {
        // fallback to default
      }
    }
    return {
      ...createDefaultTenantConfig(tenantId, tenantSlug, facilityName),
      modules: toTenantFeatureToggles(getGlobalFeatureToggles())
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hydrate tenant configuration from Express/Astra API when tenant changes
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/lims/tenant-config/${encodeURIComponent(tenantId)}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json?.config) {
            const merged: TenantConfiguration = {
              ...createDefaultTenantConfig(tenantId, tenantSlug, facilityName),
              ...json.config,
              modules: {
                ...TIER_PRESETS.lims_core.modules,
                ...(json.config.modules || {}),
                lims: true
              }
            };
            setConfig(merged);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            }
          }
        }
      } catch {
        // Offline / local fallback remains active
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [tenantId, tenantSlug, facilityName, storageKey]);

  const persistConfiguration = useCallback(
    async (nextConfig: TenantConfiguration) => {
      const normalized: TenantConfiguration = {
        ...nextConfig,
        modules: {
          ...nextConfig.modules,
          lims: true // Enforce LIMS as immutable primary core
        },
        updatedBy,
        updatedAt: new Date().toISOString()
      };

      setConfig(normalized);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(normalized));
        saveGlobalFeatureToggles(fromTenantFeatureToggles(normalized.modules));
        window.dispatchEvent(
          new CustomEvent('tekilab_tenant_config_updated', { detail: normalized })
        );
      }

      setIsSaving(true);
      try {
        await fetch(`/api/lims/tenant-config/${encodeURIComponent(normalized.tenantId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized)
        });
      } catch {
        // Local persistence already succeeded
      } finally {
        setIsSaving(false);
      }
    },
    [storageKey, updatedBy]
  );

  const toggleModule = useCallback(
    async (moduleKey: TekiLabModuleKey, nextValue?: boolean) => {
      if (moduleKey === 'lims') return; // LIMS core cannot be muted
      const updatedModules: TenantFeatureToggles = {
        ...config.modules,
        [moduleKey]: nextValue !== undefined ? nextValue : !config.modules[moduleKey]
      };
      const updatedConfig: TenantConfiguration = {
        ...config,
        modules: updatedModules,
        subscriptionTier: detectMatchingTier(updatedModules)
      };
      await persistConfiguration(updatedConfig);
    },
    [config, persistConfiguration]
  );

  const applyTierPreset = useCallback(
    async (tier: TenantTierPreset) => {
      const preset = TIER_PRESETS[tier];
      if (!preset) return;
      await persistConfiguration({
        ...config,
        subscriptionTier: tier,
        modules: { ...preset.modules }
      });
    },
    [config, persistConfiguration]
  );

  const updateConfig = useCallback(
    async (patch: Partial<TenantConfiguration>) => {
      await persistConfiguration({
        ...config,
        ...patch,
        modules: {
          ...config.modules,
          ...(patch.modules || {}),
          lims: true
        }
      });
    },
    [config, persistConfiguration]
  );

  const isModuleEnabled = useCallback(
    (moduleKey: TekiLabModuleKey): boolean => {
      if (moduleKey === 'lims') return true;
      return Boolean(config.modules[moduleKey]);
    },
    [config.modules]
  );

  const isViewEnabled = useCallback(
    (viewKey: string): boolean => {
      const mapped = VIEW_TO_MODULE_MAP[viewKey];
      if (!mapped || mapped === 'core') return true;
      return isModuleEnabled(mapped);
    },
    [isModuleEnabled]
  );

  const enabledModulesList = useMemo(
    () =>
      (Object.keys(config.modules) as TekiLabModuleKey[]).filter((k) => config.modules[k]),
    [config.modules]
  );

  const mutedModulesCount = useMemo(
    () =>
      (Object.keys(config.modules) as TekiLabModuleKey[]).filter((k) => !config.modules[k])
        .length,
    [config.modules]
  );

  const value = useMemo<TenantModuleContextValue>(
    () => ({
      config,
      isLoading,
      isSaving,
      isModuleEnabled,
      isViewEnabled,
      toggleModule,
      applyTierPreset,
      updateConfig,
      mutedModulesCount,
      enabledModulesList
    }),
    [
      config,
      isLoading,
      isSaving,
      isModuleEnabled,
      isViewEnabled,
      toggleModule,
      applyTierPreset,
      updateConfig,
      mutedModulesCount,
      enabledModulesList
    ]
  );

  return (
    <TenantModuleContext.Provider value={value}>
      {children}
    </TenantModuleContext.Provider>
  );
};

export function useTenantModules(): TenantModuleContextValue {
  const ctx = useContext(TenantModuleContext);
  if (!ctx) {
    throw new Error('useTenantModules must be used within a TenantModuleProvider');
  }
  return ctx;
}

/**
 * Declarative Modular "Mute" Guard Component.
 * Completely unmounts children when the specified module is muted for the active tenant.
 */
export const ModuleGuard: React.FC<{
  module: TekiLabModuleKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ module, fallback = null, children }) => {
  const { isModuleEnabled } = useTenantModules();
  if (!isModuleEnabled(module)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
