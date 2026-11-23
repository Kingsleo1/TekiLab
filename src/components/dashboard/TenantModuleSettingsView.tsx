import React, { useState } from 'react';
import {
  Sliders,
  FlaskConical,
  Stethoscope,
  Building2,
  Pill,
  CreditCard,
  Bot,
  Check,
  Lock,
  Database,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  useTenantModules,
  TIER_PRESETS
} from '../../context/TenantModuleContext';
import { TekiLabModuleKey, TenantTierPreset } from '../../types/tekilab';
import schemaJson from '../../schemas/tekilab-database-schema.json';

interface ModuleDescriptor {
  key: TekiLabModuleKey;
  title: string;
  description: string;
  locked?: boolean;
  icon: React.ReactNode;
  affectedRoutes: string;
}

const MODULE_DESCRIPTORS: ModuleDescriptor[] = [
  {
    key: 'lims',
    title: 'TekiLab LIMS Core',
    description:
      '5-Minute Rapid Result Console, barcode lifecycle tracking, Instrument API Hub, and WhatsApp PDF dispatch.',
    locked: true,
    icon: <FlaskConical className="w-5 h-5 text-green-600" />,
    affectedRoutes: 'Rapid Result Console, Lab Worklist, Patient Registry'
  },
  {
    key: 'ai_analytics',
    title: 'AI Validation & Predictive Analytics',
    description:
      'Gemini AI anomaly detection, technician protocol chatbot, and predictive equipment maintenance forecasting.',
    icon: <Bot className="w-5 h-5 text-neutral-900" />,
    affectedRoutes: 'AI Lab Assistant, Anomaly Engine, Equipment Telemetry'
  },
  {
    key: 'pharmacy',
    title: 'Pharmacy & Cross-Module Prescription Handoff',
    description:
      'Unmutes Pharmacy POS, multi-batch drug inventory, warehouse transfers, and the Lab-to-Pharmacy "Prescribe Action" queue.',
    icon: <Pill className="w-5 h-5 text-neutral-900" />,
    affectedRoutes: 'POS Terminal, Inventory, Drug Catalog, Warehouse, Transfers'
  },
  {
    key: 'emr',
    title: 'Electronic Medical Records (EMR)',
    description:
      'Outpatient doctor consultations, clinical vitals charting, ICD-10 diagnosis coding, and e-prescribing.',
    icon: <Stethoscope className="w-5 h-5 text-neutral-900" />,
    affectedRoutes: 'Doctor EMR & Consultations'
  },
  {
    key: 'hospital_management',
    title: 'Hospital Management Suite',
    description:
      'Radiology imaging orders, inpatient ward & bed management, patient queue engine, and appointment scheduling.',
    icon: <Building2 className="w-5 h-5 text-neutral-900" />,
    affectedRoutes: 'Radiology, Inpatient Wards, Hospital Queue, Appointments'
  },
  {
    key: 'billing',
    title: 'Hospital Billing, HMO & Expense Ledgers',
    description:
      'Unified charge capture, HMO claim adjudication, debtor owing ledgers, and operating expense tracking.',
    icon: <CreditCard className="w-5 h-5 text-neutral-900" />,
    affectedRoutes: 'HMO Billing, Sales Records, Owing Ledger, Expenses'
  }
];

export function TenantModuleSettingsView() {
  const {
    config,
    isSaving,
    toggleModule,
    applyTierPreset,
    mutedModulesCount,
    enabledModulesList
  } = useTenantModules();

  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'tenant_configurations' | 'lab_results'>(
    'tenant_configurations'
  );

  const handleToggle = async (key: TekiLabModuleKey, title: string) => {
    if (key === 'lims') {
      toast.info('TekiLab LIMS Core is the primary platform engine and remains permanently active.');
      return;
    }
    const nextState = !config.modules[key];
    await toggleModule(key, nextState);
    toast.success(`${title} ${nextState ? 'unmuted (ON)' : 'muted (OFF)'} across this facility.`);
  };

  const handlePreset = async (tier: TenantTierPreset) => {
    await applyTierPreset(tier);
    toast.success(`Applied "${TIER_PRESETS[tier].label}" modular configuration.`);
  };

  const displayedSchemaString = JSON.stringify(
    schemaJson.collections[activeSchemaTab],
    null,
    2
  );

  return (
    <div className="space-y-6 font-sans text-neutral-950">
      {/* Header Banner */}
      <div className="bg-neutral-950 text-white rounded-xl border border-neutral-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-green-400 font-semibold">Modular Architecture</span>
            <span aria-hidden="true">·</span>
            <span>{config.facilityName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{config.tenantId}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Tenant Module Control & Mute Settings
          </h1>
          <p className="text-xs text-neutral-400 max-w-2xl">
            Dynamically mute or unmute EMR, Hospital Management, Billing, and Pharmacy modules based on facility subscription tier without changing the core codebase.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5">
            <div className="text-neutral-400 text-[11px]">Active Modules</div>
            <div className="text-xl font-bold text-green-400">{enabledModulesList.length}</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5">
            <div className="text-neutral-400 text-[11px]">Muted Modules</div>
            <div className="text-xl font-bold text-white">{mutedModulesCount}</div>
          </div>
        </div>
      </div>

      {/* Subscription Tier Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-950">
            01. Subscription Tier Presets
          </h2>
          {isSaving && (
            <span className="text-xs font-mono text-green-700">Syncing to Astra DB...</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.keys(TIER_PRESETS) as TenantTierPreset[]).map((tierKey) => {
            const preset = TIER_PRESETS[tierKey];
            const isSelected = config.subscriptionTier === tierKey;
            return (
              <button
                type="button"
                key={tierKey}
                onClick={() => handlePreset(tierKey)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : 'bg-white text-neutral-950 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{preset.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                  </div>
                  <p className={`text-xs leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {preset.tagline}
                  </p>
                </div>
                <div className="pt-2 border-t border-current/10 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className={isSelected ? 'text-green-400 font-semibold' : 'text-neutral-900 font-semibold'}>
                    ₦{preset.monthlyNaira.toLocaleString()}/mo
                  </span>
                  <span className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>
                    {Object.values(preset.modules).filter(Boolean).length} modules
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Granular Module Mute Switches */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-green-600" />
          02. Individual Module Toggles (Live Sidebar & Handoff Gating)
        </h2>

        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
          {MODULE_DESCRIPTORS.map((mod) => {
            const enabled = Boolean(config.modules[mod.key]);
            return (
              <div
                key={mod.key}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-lg bg-neutral-100 shrink-0">{mod.icon}</div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-neutral-950">{mod.title}</h3>
                      {mod.locked ? (
                        <span className="text-[11px] font-mono text-green-700 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Primary Core
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            enabled ? 'text-green-700' : 'text-neutral-400'
                          }`}
                        >
                          {enabled ? 'ACTIVE' : 'MUTED'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">{mod.description}</p>
                    <p className="text-[11px] text-neutral-400">
                      Controlled views: {mod.affectedRoutes}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={mod.locked}
                    onClick={() => handleToggle(mod.key, mod.title)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                      enabled ? 'bg-green-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DataStax Astra DB / Supabase JSON Schema Inspector */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-green-600" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                03. DataStax Astra DB / Supabase Schema Blueprint
              </h2>
              <p className="text-xs text-neutral-500">
                Live JSON schema for <span className="font-mono">tenant_configurations</span> and{' '}
                <span className="font-mono">lab_results</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-neutral-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveSchemaTab('tenant_configurations')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                  activeSchemaTab === 'tenant_configurations'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-600'
                }`}
              >
                tenant_configurations
              </button>
              <button
                type="button"
                onClick={() => setActiveSchemaTab('lab_results')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                  activeSchemaTab === 'lab_results'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-600'
                }`}
              >
                lab_results
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(displayedSchemaString);
                setCopiedSchema(true);
                toast.success(`Copied ${activeSchemaTab} JSON schema.`);
                setTimeout(() => setCopiedSchema(false), 2000);
              }}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSchema ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <pre className="p-5 bg-neutral-950 text-green-400 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
          {displayedSchemaString}
        </pre>
      </div>
    </div>
  );
}
