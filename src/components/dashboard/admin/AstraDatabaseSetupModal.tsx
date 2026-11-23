import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  Terminal,
  Key,
  RefreshCw,
  ExternalLink,
  Server,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Play,
  Layers,
  X,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAstraConfig,
  saveAstraRuntimeConfig,
  clearAstraRuntimeConfig,
  astraClient,
  isAstraConfigured
} from '../../../lib/astra';
import { apiService } from '../../../services/api';

export const TEKIPHARM_COMPLETE_CQL_SCHEMA = `-- =================================================================================
-- TEKIPHARM MULTI-TENANT PHARMACY SaaS PLATFORM
-- COMPLETE DATASTAX ASTRA DB (CASSANDRA CQL) DATABASE SCHEMA
-- =================================================================================
-- DATABASE NAME: Tekipharm
-- KEYSPACE NAME: default_keyspace
-- =================================================================================
-- HOW TO RUN THIS CODE IN ASTRA DATASTAX (FOR NON-CODERS):
-- 1. Log into https://astra.datastax.com and open your Database: "Tekipharm"
-- 2. Click on the "CQL Console" tab at the top of your Tekipharm database page.
-- 3. Copy and paste ALL the CQL code below into the CQL Console and press Enter!
-- =================================================================================

USE default_keyspace;

-- 1. SAAS TENANTS (SUBSCRIBED COMPANIES / PHARMACY ORGANIZATIONS)
CREATE TABLE IF NOT EXISTS default_keyspace.tenants (
    id TEXT PRIMARY KEY,
    name TEXT,
    slug TEXT,
    owner_name TEXT,
    owner_email TEXT,
    phone TEXT,
    address TEXT,
    logo TEXT,
    plan_id TEXT,
    plan_name TEXT,
    monthly_rate_naira DECIMAL,
    duration_months INT,
    discount_percent DECIMAL,
    total_paid_naira DECIMAL,
    max_branches INT,
    subscription_status TEXT,
    subscription_start TEXT,
    subscription_end TEXT,
    payment_reference TEXT,
    services_enabled_json TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_tenants_slug ON default_keyspace.tenants (slug) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_tenants_owner_email ON default_keyspace.tenants (owner_email) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_tenants_status ON default_keyspace.tenants (subscription_status) USING 'StorageAttachedIndex';

-- 2. SUBSCRIPTION PAYMENTS & BILLING LEDGER (IN NAIRA ₦)
CREATE TABLE IF NOT EXISTS default_keyspace.subscription_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    tenant_name TEXT,
    tenant_slug TEXT,
    plan_id TEXT,
    plan_name TEXT,
    duration_months INT,
    monthly_rate_naira DECIMAL,
    subtotal_naira DECIMAL,
    discount_percent DECIMAL,
    discount_saved_naira DECIMAL,
    amount_paid_naira DECIMAL,
    payment_method TEXT,
    payment_reference TEXT,
    status TEXT,
    services_breakdown_json TEXT,
    period_start TEXT,
    period_end TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_sub_payments_tenant_id ON default_keyspace.subscription_payments (tenant_id) USING 'StorageAttachedIndex';

-- 3. PHARMACIES / BRANCHES (MULTI-BRANCH NODES PER COMPANY)
CREATE TABLE IF NOT EXISTS default_keyspace.pharmacies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    tenant_slug TEXT,
    name TEXT,
    address TEXT,
    owner_id TEXT,
    status TEXT,
    revenue DECIMAL,
    type TEXT,
    phone TEXT,
    manager_name TEXT,
    description TEXT,
    image TEXT,
    permissions_json TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_pharmacies_tenant_id ON default_keyspace.pharmacies (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_pharmacies_tenant_slug ON default_keyspace.pharmacies (tenant_slug) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_pharmacies_status ON default_keyspace.pharmacies (status) USING 'StorageAttachedIndex';

-- 4. STAFF & USER ACCOUNTS (SUPER ADMIN, COMPANY ADMIN, MANAGERS, CASHIERS)
CREATE TABLE IF NOT EXISTS default_keyspace.staff (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    tenant_slug TEXT,
    branch_id TEXT,
    name TEXT,
    email TEXT,
    password TEXT,
    role TEXT,
    phone TEXT,
    status TEXT,
    level INT,
    permissions_json TEXT,
    join_date TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_staff_email ON default_keyspace.staff (email) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_staff_tenant_id ON default_keyspace.staff (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_staff_branch_id ON default_keyspace.staff (branch_id) USING 'StorageAttachedIndex';

-- 5. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS default_keyspace.categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    description TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_categories_tenant_id ON default_keyspace.categories (tenant_id) USING 'StorageAttachedIndex';

-- 6. PRODUCT ATTRIBUTES
CREATE TABLE IF NOT EXISTS default_keyspace.attributes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    type TEXT,
    options_json TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_attributes_tenant_id ON default_keyspace.attributes (tenant_id) USING 'StorageAttachedIndex';

-- 7. PRODUCTS & MULTI-BRANCH INVENTORY
CREATE TABLE IF NOT EXISTS default_keyspace.products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    name TEXT,
    generic_name TEXT,
    barcode TEXT,
    category TEXT,
    price DECIMAL,
    cost_price DECIMAL,
    wholesale_price DECIMAL,
    stock INT,
    min_stock_level INT,
    base_unit TEXT,
    conversion_factor INT,
    expiry_date TEXT,
    requires_prescription BOOLEAN,
    image TEXT,
    batches_json TEXT,
    supplier_id TEXT,
    attributes_json TEXT,
    packaging_pricing_json TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_products_tenant_id ON default_keyspace.products (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_products_pharmacy_id ON default_keyspace.products (pharmacy_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_products_barcode ON default_keyspace.products (barcode) USING 'StorageAttachedIndex';

-- 8. POS ORDERS & SALES TRANSACTIONS
CREATE TABLE IF NOT EXISTS default_keyspace.orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    patient_id TEXT,
    items_json TEXT,
    status TEXT,
    total DECIMAL,
    subtotal DECIMAL,
    tax DECIMAL,
    discount DECIMAL,
    payment_method TEXT,
    cash_paid DECIMAL,
    transfer_paid DECIMAL,
    card_paid DECIMAL,
    owing_paid DECIMAL,
    void_reason TEXT,
    processed_by TEXT,
    prescription_url TEXT,
    tracking_history_json TEXT,
    source TEXT,
    receipt_pdf_url TEXT,
    receipt_metadata_json TEXT,
    last_shared_at TEXT,
    last_shared_platform TEXT,
    refund_info_json TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_orders_tenant_id ON default_keyspace.orders (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_orders_pharmacy_id ON default_keyspace.orders (pharmacy_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_orders_processed_by ON default_keyspace.orders (processed_by) USING 'StorageAttachedIndex';

-- 9. OWING & DEBTORS RECORDS
CREATE TABLE IF NOT EXISTS default_keyspace.owing_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    order_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL,
    amount_paid DECIMAL,
    amount_owed DECIMAL,
    due_date TEXT,
    status TEXT,
    items_json TEXT,
    notes TEXT,
    payments_json TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_owing_tenant_id ON default_keyspace.owing_records (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_owing_pharmacy_id ON default_keyspace.owing_records (pharmacy_id) USING 'StorageAttachedIndex';

-- 10. EXPENSES LEDGER
CREATE TABLE IF NOT EXISTS default_keyspace.expenses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    title TEXT,
    description TEXT,
    vendor_id TEXT,
    date TEXT,
    category TEXT,
    amount DECIMAL,
    status TEXT,
    payment_method TEXT,
    recorded_by TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_expenses_tenant_id ON default_keyspace.expenses (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_expenses_pharmacy_id ON default_keyspace.expenses (pharmacy_id) USING 'StorageAttachedIndex';

-- 11. SUPPLIERS & DISTRIBUTORS
CREATE TABLE IF NOT EXISTS default_keyspace.suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    total_owing DECIMAL,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_suppliers_tenant_id ON default_keyspace.suppliers (tenant_id) USING 'StorageAttachedIndex';

-- 12. SUPPLY RECORDS & PROCUREMENT
CREATE TABLE IF NOT EXISTS default_keyspace.supply_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    vendor_id TEXT,
    product_name TEXT,
    size TEXT,
    category TEXT,
    quantity INT,
    total_cost DECIMAL,
    unit_cost DECIMAL,
    unit_price DECIMAL,
    min_quantity INT,
    destination TEXT,
    expense_id TEXT,
    date TEXT,
    supplier_name TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_supply_tenant_id ON default_keyspace.supply_records (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_supply_pharmacy_id ON default_keyspace.supply_records (pharmacy_id) USING 'StorageAttachedIndex';

-- 13. INTER-BRANCH STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS default_keyspace.transfers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    batch_id TEXT,
    source_pharmacy_id TEXT,
    target_pharmacy_id TEXT,
    product_name TEXT,
    quantity INT,
    status TEXT,
    barcode TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_transfers_tenant_id ON default_keyspace.transfers (tenant_id) USING 'StorageAttachedIndex';

-- 14. CUSTOMERS DIRECTORY
CREATE TABLE IF NOT EXISTS default_keyspace.customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tier TEXT,
    balance DECIMAL,
    total_spent DECIMAL,
    orders_count INT,
    join_date TEXT,
    status TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_customers_tenant_id ON default_keyspace.customers (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_customers_pharmacy_id ON default_keyspace.customers (pharmacy_id) USING 'StorageAttachedIndex';

-- 15. REFUNDS & RETURNS
CREATE TABLE IF NOT EXISTS default_keyspace.refunds (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    order_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    items_json TEXT,
    refund_amount DECIMAL,
    reason TEXT,
    refund_method TEXT,
    processed_by TEXT,
    processed_by_name TEXT,
    receipt_number TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_refunds_tenant_id ON default_keyspace.refunds (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_refunds_pharmacy_id ON default_keyspace.refunds (pharmacy_id) USING 'StorageAttachedIndex';

-- 16. AUDIT & ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS default_keyspace.product_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    pharmacy_id TEXT,
    product_id TEXT,
    product_name TEXT,
    action TEXT,
    activity_type TEXT,
    resource_id TEXT,
    description TEXT,
    created_by_json TEXT,
    metadata_json TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_logs_tenant_id ON default_keyspace.product_logs (tenant_id) USING 'StorageAttachedIndex';

-- =================================================================================
-- INITIAL SEED DATA FOR TEKIPHARM SUPER ADMIN & DEFAULT SUBSCRIBED COMPANY
-- =================================================================================

INSERT INTO default_keyspace.tenants (
    id, name, slug, owner_name, owner_email, phone, address, logo,
    plan_id, plan_name, monthly_rate_naira, duration_months, discount_percent,
    total_paid_naira, max_branches, subscription_status, subscription_start,
    subscription_end, payment_reference, services_enabled_json, created_at, updated_at
) VALUES (
    'tenant-tekipharm',
    'Teki Pharm Ltd',
    'teki-pharm',
    'Dr. Evelyn Vance',
    'evelyn.vance@tekipharm.com',
    '+234 803 123 4567',
    '12 Commercial Avenue, Healthcare District, Abuja',
    '/logo.png',
    'multi_branch',
    'Multi-Branch Network (1-5 Branches)',
    20000,
    12,
    3,
    232800,
    5,
    'active',
    '2026-01-01T00:00:00.000Z',
    '2027-01-01T00:00:00.000Z',
    'TKP-PAY-20260101-001',
    '["POS & Billing Engine","Multi-Batch Inventory","Warehouse & Stock Transfers","Expenses & Debtors Ledger","Granular Staff RBAC","Dedicated Business Portal"]',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
);

INSERT INTO default_keyspace.pharmacies (
    id, tenant_id, tenant_slug, name, address, owner_id, status, revenue,
    type, phone, manager_name, description, image, permissions_json, created_at, updated_at
) VALUES (
    'pharma-1',
    'tenant-tekipharm',
    'teki-pharm',
    'Teki Pharm (Central Branch)',
    '12 Commercial Avenue, Healthcare District, Abuja',
    'USR-001',
    'active',
    0,
    'Central Branch',
    '+234 803 123 4567',
    'Dr. Evelyn Vance',
    'Primary dispensing facility and retail healthcare node.',
    '/logo.png',
    '["can_transfer","can_view_financials","can_approve_supply"]',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
);

INSERT INTO default_keyspace.staff (
    id, tenant_id, tenant_slug, branch_id, name, email, password, role,
    phone, status, level, permissions_json, join_date, created_at, updated_at
) VALUES (
    'superadmin-kingsley-001',
    'platform-super-admin',
    'admin',
    'pharma-1',
    'Kingsley Agu (Super Admin)',
    'kingsleyagu92@gmail.com',
    'TEKI.pharm@1',
    'Kernel Admin',
    '+234 800 835 4742',
    'online',
    5,
    '["canAccessPOS","canManageStaff","canManageCustomers","canManageInventory","canAccessSuppliers","canAccessExpenses","canAccessTransfers","canAccessWarehouse","canViewReports","canManageBranches","canManageMarketing","canManageIntegrations","canAdjustSettings","canApplyDiscounts","canDispenseControlled","canAccessAdminPanel"]',
    '2026-01-01',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
);

INSERT INTO default_keyspace.staff (
    id, tenant_id, tenant_slug, branch_id, name, email, password, role,
    phone, status, level, permissions_json, join_date, created_at, updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'platform-super-admin',
    'admin',
    'all',
    'TekiMed Super Administrator',
    'admin@tekimed.com',
    'Admin@Pharma2025!',
    'Kernel Admin',
    '+234 800 835 4742',
    'online',
    5,
    '["canAccessPOS","canManageStaff","canManageCustomers","canManageInventory","canAccessSuppliers","canAccessExpenses","canAccessTransfers","canAccessWarehouse","canViewReports","canManageBranches","canManageMarketing","canManageIntegrations","canAdjustSettings","canApplyDiscounts","canDispenseControlled","canAccessAdminPanel"]',
    '2026-01-01',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
);

INSERT INTO default_keyspace.staff (
    id, tenant_id, tenant_slug, branch_id, name, email, password, role,
    phone, status, level, permissions_json, join_date, created_at, updated_at
) VALUES (
    'USR-001',
    'tenant-tekipharm',
    'teki-pharm',
    'pharma-1',
    'Dr. Evelyn Vance',
    'evelyn.vance@tekipharm.com',
    'manager123',
    'Company Admin',
    '+234 803 123 4567',
    'online',
    4,
    '["canAccessPOS","canManageStaff","canManageCustomers","canManageInventory","canAccessSuppliers","canAccessExpenses","canAccessTransfers","canAccessWarehouse","canViewReports","canManageBranches","canManageMarketing","canAdjustSettings","canApplyDiscounts","canDispenseControlled"]',
    '2026-01-01',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
);
`;

interface AstraDatabaseSetupModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  defaultTab?: 'guide' | 'cql' | 'env';
}

export const AstraDatabaseSetupModal: React.FC<AstraDatabaseSetupModalProps> = ({
  isOpen = true,
  onClose,
  embedded = false,
  defaultTab = 'env'
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'cql' | 'env'>(defaultTab);
  const [copiedCql, setCopiedCql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const [endpoint, setEndpoint] = useState('');
  const [keyspace, setKeyspace] = useState('default_keyspace');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    configured: boolean;
    connected: boolean;
    keyspace: string;
    tables?: string[];
    message: string;
  }>({
    configured: isAstraConfigured(),
    connected: false,
    keyspace: 'default_keyspace',
    message: 'Checking DataStax Astra DB status...'
  });

  useEffect(() => {
    const cfg = getAstraConfig();
    if (cfg.endpoint) setEndpoint(cfg.endpoint);
    if (cfg.keyspace) setKeyspace(cfg.keyspace);
    if (cfg.token) setToken(cfg.token);

    checkStatus();
  }, []);

  const checkStatus = async () => {
    const res = await astraClient.checkStatus();
    setStatusInfo({
      configured: res.configured,
      connected: res.connected,
      keyspace: res.keyspace || 'default_keyspace',
      tables: res.tables,
      message: res.message
    });
  };

  if (!isOpen && !embedded) return null;

  const envBlockText = `# ==============================================================================
# DATASTAX ASTRA DB (CASSANDRA CQL) ENVIRONMENT VARIABLES FOR TEKIPHARM SaaS
# Database Name: Tekipharm | Keyspace: default_keyspace
# ==============================================================================
ASTRA_DB_API_ENDPOINT="${endpoint || 'https://your-database-id-your-region.apps.astra.datastax.com'}"
ASTRA_DB_APPLICATION_TOKEN="${token || 'AstraCS:your_generated_application_token'}"
ASTRA_DB_KEYSPACE="${keyspace || 'default_keyspace'}"

VITE_ASTRA_DB_API_ENDPOINT="${endpoint || 'https://your-database-id-your-region.apps.astra.datastax.com'}"
VITE_ASTRA_DB_APPLICATION_TOKEN="${token || 'AstraCS:your_generated_application_token'}"
VITE_ASTRA_DB_KEYSPACE="${keyspace || 'default_keyspace'}"`;

  const handleCopyCql = () => {
    navigator.clipboard.writeText(TEKIPHARM_COMPLETE_CQL_SCHEMA);
    setCopiedCql(true);
    toast.success('Complete CQL Database Schema (default_keyspace) copied! Paste it into your Astra CQL Console.');
    setTimeout(() => setCopiedCql(false), 3000);
  };

  const handleDownloadCql = () => {
    const blob = new Blob([TEKIPHARM_COMPLETE_CQL_SCHEMA], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tekipharm-default_keyspace-schema.cql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded tekipharm-default_keyspace-schema.cql');
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envBlockText);
    setCopiedEnv(true);
    toast.success('Environment variables block copied to clipboard!');
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  const handleSaveAndTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim() || !token.trim()) {
      toast.error('Please enter your Astra API Endpoint and Application Token.');
      return;
    }

    setTesting(true);
    saveAstraRuntimeConfig({
      endpoint: endpoint.trim(),
      keyspace: keyspace.trim() || 'default_keyspace',
      token: token.trim()
    });

    try {
      const status = await astraClient.checkStatus();
      setStatusInfo({
        configured: status.configured,
        connected: status.connected,
        keyspace: status.keyspace || 'default_keyspace',
        tables: status.tables,
        message: status.message
      });

      if (status.connected) {
        toast.success(`Connected to DataStax Astra DB (Keyspace: ${status.keyspace})!`);
      } else {
        toast.warning(status.message || 'Credentials saved! Verify your Keyspace and CQL tables in Astra Console.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not reach Astra DB endpoint');
    } finally {
      setTesting(false);
    }
  };

  const handleAutoInitializeSchema = async () => {
    setInitializingSchema(true);
    try {
      const res = await astraClient.initializeSchema();
      if (res.success) {
        toast.success(
          `Successfully created/verified ${res.createdTables?.length || 16} CQL tables in keyspace "${keyspace || 'default_keyspace'}"!`
        );
        await checkStatus();
      } else {
        toast.error(res.error || 'Could not auto-initialize tables. Paste the CQL code in Astra CQL Console.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Schema initialization error');
    } finally {
      setInitializingSchema(false);
    }
  };

  const handleSyncToAstra = async () => {
    setSyncing(true);
    try {
      const res = await apiService.astra.syncAll();
      if (res.success) {
        toast.success(
          `Synced to DataStax Astra DB! (${res.syncedCounts.tenants || 0} Companies, ${res.syncedCounts.pharmacies || 0} Branches, ${res.syncedCounts.products || 0} Products, ${res.syncedCounts.orders || 0} Orders)`
        );
      } else {
        toast.error(res.error || 'Sync requires an active Astra DB connection.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to sync to Astra DB');
    } finally {
      setSyncing(false);
    }
  };

  const content = (
    <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 border-b border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">
                  DataStax Astra DB (`Tekipharm` • `default_keyspace`)
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  Non-Coder Friendly
                </span>
              </div>
              <p className="text-sm text-zinc-300 mt-1">
                Updated CQL database code for Database <strong>Tekipharm</strong> and Keyspace <strong>default_keyspace</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                statusInfo.connected
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : statusInfo.configured
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusInfo.connected
                    ? 'bg-emerald-400 animate-pulse'
                    : statusInfo.configured
                    ? 'bg-amber-400'
                    : 'bg-zinc-400'
                }`}
              />
              {statusInfo.connected
                ? `Astra CQL Live (${statusInfo.keyspace} • ${statusInfo.tables?.length || 0} Tables)`
                : statusInfo.configured
                ? `Credentials Loaded (${statusInfo.keyspace})`
                : 'Ready for Astra Connection'}
            </div>

            {onClose && !embedded && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveTab('cql')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'cql'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <Terminal className="w-4 h-4" />
            1. Updated CQL Code (`default_keyspace`)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            2. Step-by-Step Non-Coder Instructions
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'env'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-white/10 text-zinc-200 hover:bg-white/15'
            }`}
          >
            <Key className="w-4 h-4" />
            3. Environment Variables & Live Connector
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {activeTab === 'cql' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Ready-to-Paste CQL Code for DB: `Tekipharm` | Keyspace: `default_keyspace` (16 Tables)
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                  Configured specifically for <strong>default_keyspace</strong>. Copy and paste directly into your Astra CQL Console, or click <strong>Auto-Create Tables via API</strong>!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyCql}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {copiedCql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCql ? 'Copied All CQL Code!' : 'Copy CQL Code'}
                </button>
                <button
                  onClick={handleAutoInitializeSchema}
                  disabled={initializingSchema}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Wand2 className={`w-4 h-4 ${initializingSchema ? 'animate-spin' : ''}`} />
                  {initializingSchema ? 'Creating Tables...' : 'Auto-Create 16 Tables via API'}
                </button>
                <button
                  onClick={handleDownloadCql}
                  className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download .cql
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-zinc-950 text-emerald-300 font-mono text-xs p-5 rounded-xl overflow-x-auto max-h-[460px] overflow-y-auto border border-zinc-800 leading-relaxed select-all">
                {TEKIPHARM_COMPLETE_CQL_SCHEMA}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                  1
                </div>
                <h4 className="font-bold text-base mb-1">Open Your `Tekipharm` Database in DataStax Astra</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  1. Go to{' '}
                  <a
                    href="https://astra.datastax.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 font-semibold underline inline-flex items-center gap-1"
                  >
                    astra.datastax.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  and open your database named <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">Tekipharm</code>.<br />
                  2. Confirm your Keyspace is <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">default_keyspace</code>.<br />
                  3. Click on the <strong>"CQL Console"</strong> tab at the top of your database screen.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                  2
                </div>
                <h4 className="font-bold text-base mb-1">Paste & Run the Updated `default_keyspace` CQL Code</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  1. Click <strong>"Copy CQL Code"</strong> in Tab 1.<br />
                  2. Click inside the black <strong>CQL Console</strong> window in DataStax Astra.<br />
                  3. Paste the entire CQL script and press <strong>Enter</strong>.<br />
                  4. It will automatically execute <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">USE default_keyspace;</code> and create all 16 tables, indexes, and initial accounts!
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                  3
                </div>
                <h4 className="font-bold text-base mb-1">Or Use the 1-Click Auto-Create Tables Button</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Since you have already entered your API Endpoint, Application Token, and <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">default_keyspace</code>, you can also simply click <strong>"Auto-Create 16 Tables via API"</strong> in Tab 1 or Tab 3 and the server will create all 16 tables in <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">default_keyspace</code> automatically!
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                  4
                </div>
                <h4 className="font-bold text-base mb-1">Sync Your Data to `default_keyspace`</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Once your tables are created, click <strong>"Push All Local Data to Astra DB"</strong> in Tab 3 to immediately sync all companies, branches, products, staff, and subscriptions into <code className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">default_keyspace</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'env' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Form */}
            <form onSubmit={handleSaveAndTestConnection} className="lg:col-span-7 space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    Direct Astra DataStax Credentials Connector (`Tekipharm`)
                  </h3>
                  {statusInfo.configured && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAstraRuntimeConfig();
                        setEndpoint('');
                        setToken('');
                        setKeyspace('default_keyspace');
                        checkStatus();
                        toast.info('Cleared runtime Astra credentials override');
                      }}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Reset Runtime Override
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    1. Astra API Endpoint (`ASTRA_DB_API_ENDPOINT`)
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder="https://<db-id>-<region>.apps.astra.datastax.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    2. Keyspace Name (`ASTRA_DB_KEYSPACE`)
                  </label>
                  <input
                    type="text"
                    value={keyspace}
                    onChange={e => setKeyspace(e.target.value)}
                    placeholder="default_keyspace"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    3. Application Token (`ASTRA_DB_APPLICATION_TOKEN`)
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="AstraCS:..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {testing ? 'Testing Connection...' : 'Save & Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoInitializeSchema}
                    disabled={initializingSchema}
                    className="px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Wand2 className={`w-4 h-4 ${initializingSchema ? 'animate-spin' : ''}`} />
                    {initializingSchema ? 'Creating 16 Tables...' : 'Auto-Create 16 Tables'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToAstra}
                    disabled={syncing}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing All Records...' : 'Push All Local Data to Astra DB'}
                  </button>
                </div>
              </div>
            </form>

            {/* Right Column: Copyable .env block */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-zinc-950 text-zinc-100 p-5 rounded-xl border border-zinc-800">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Copy-Paste `.env` Variables Block
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEnv}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedEnv ? 'Copied!' : 'Copy .env'}
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Configured for Database <code className="text-emerald-300">Tekipharm</code> and Keyspace <code className="text-emerald-300">default_keyspace</code>:
                </p>
                <pre className="bg-zinc-900 text-emerald-300 p-3.5 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed border border-zinc-800 select-all">
                  {envBlockText}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Every new company registration, Naira subscription payment, branch creation, product upload, and POS receipt automatically writes to <code className="text-emerald-300">default_keyspace</code> in your DataStax Astra DB.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl my-8">{content}</div>
    </div>
  );
};
