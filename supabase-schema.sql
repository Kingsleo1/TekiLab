-- ==============================================================================
-- MANESOL MULTI-BRANCH PHARMACY ERP & POS - COMPREHENSIVE SUPABASE SCHEMA
-- FULL IDEMPOTENT & FAIL-SAFE SQL (Run in Supabase Dashboard -> SQL Editor)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PHARMACIES & BRANCHES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    owner_id TEXT DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'active',
    revenue NUMERIC(15, 2) DEFAULT 0.00,
    type TEXT DEFAULT 'Central Branch',
    phone TEXT,
    manager_name TEXT,
    description TEXT,
    image TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Remove any legacy restrictive check constraints on pharmacies
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_type_check;
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_status_check;

-- Idempotent column additions for existing installations
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS owner_id TEXT DEFAULT 'admin';
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS revenue NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Central Branch';
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backward-compatible branches view/table
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. USER PROFILES & STAFF ACCOUNTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Certified Dispenser',
    level INTEGER NOT NULL DEFAULT 3,
    branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    permissions JSONB DEFAULT '[]'::jsonb,
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Certified Dispenser';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);

-- Automatic Auth Trigger (if Supabase Auth is enabled)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_perms JSONB;
    user_level INT;
BEGIN
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'Store Manager');
    user_level := COALESCE((new.raw_user_meta_data->>'level')::int, 
        CASE 
            WHEN user_role = 'Kernel Admin' THEN 5
            WHEN user_role = 'Store Manager' THEN 4
            WHEN user_role = 'Terminal Manager' THEN 3
            ELSE 2 
        END
    );
    
    -- Pick permissions from metadata or supply default permissions
    IF new.raw_user_meta_data->'permissions' IS NOT NULL THEN
        user_perms := new.raw_user_meta_data->'permissions';
    ELSE
        IF user_role = 'Kernel Admin' THEN
            user_perms := '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canManageBranches", "canManageMarketing", "canManageIntegrations", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb;
        ELSIF user_role = 'Store Manager' THEN
            user_perms := '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb;
        ELSIF user_role = 'Terminal Manager' THEN
            user_perms := '["canAccessPOS", "canManageCustomers", "canManageInventory", "canAccessTransfers", "canAccessSuppliers", "canApplyDiscounts", "canDispenseControlled"]'::jsonb;
        ELSE
            user_perms := '["canAccessPOS"]'::jsonb;
        END IF;
    END IF;

    INSERT INTO public.profiles (id, email, name, role, level, branch_id, status, permissions)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        user_role,
        user_level,
        COALESCE(new.raw_user_meta_data->>'branch_id', 'pharma-1'),
        'active',
        user_perms
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
        permissions = COALESCE(EXCLUDED.permissions, public.profiles.permissions),
        updated_at = now();

    -- Also keep public.staff in sync
    INSERT INTO public.staff (id, name, email, role, level, status, branch_id, permissions)
    VALUES (
        new.id::text,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        user_role,
        user_level,
        'online',
        COALESCE(new.raw_user_meta_data->>'branch_id', 'pharma-1'),
        user_perms
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        permissions = EXCLUDED.permissions,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- ==============================================================================
-- 3. CATEGORIES & ATTRIBUTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS public.attributes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    options JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attributes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.attributes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.attributes ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.attributes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ==============================================================================
-- 4. PRODUCTS & MULTI-BRANCH INVENTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand TEXT,
    category TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'Tablets',
    base_unit TEXT DEFAULT 'tablet',
    conversion_factor INTEGER DEFAULT 1,
    barcode TEXT,
    sku TEXT,
    expiry_date TEXT,
    batch_number TEXT,
    batches JSONB DEFAULT '[]'::jsonb,
    packaging_pricing JSONB DEFAULT '{}'::jsonb,
    requires_prescription BOOLEAN NOT NULL DEFAULT false,
    is_controlled BOOLEAN NOT NULL DEFAULT false,
    is_compound BOOLEAN NOT NULL DEFAULT false,
    compound_items JSONB DEFAULT '[]'::jsonb,
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    pharmacy_id TEXT REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS generic_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Tablets';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'tablet';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS conversion_factor INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expiry_date TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batches JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_pricing JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compound_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pharmacy_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_products_pharmacy_id ON public.products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- ==============================================================================
-- 5. ORDERS & POS SALES RECORDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL DEFAULT 'walk-in',
    pharmacy_id TEXT NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'confirmed',
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    cash_paid NUMERIC(12, 2) DEFAULT 0.00,
    transfer_paid NUMERIC(12, 2) DEFAULT 0.00,
    card_paid NUMERIC(12, 2) DEFAULT 0.00,
    owing_paid NUMERIC(12, 2) DEFAULT 0.00,
    void_reason TEXT,
    processed_by TEXT,
    prescription_url TEXT,
    tracking_history JSONB DEFAULT '[]'::jsonb,
    source TEXT DEFAULT 'POS',
    receipt_pdf_url TEXT,
    receipt_metadata JSONB DEFAULT '{}'::jsonb,
    last_shared_at TIMESTAMPTZ,
    last_shared_platform TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS patient_id TEXT DEFAULT 'walk-in';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pharmacy_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transfer_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS card_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS owing_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processed_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prescription_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'POS';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_shared_platform TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_info JSONB DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Ensure sales transactions are never blocked by rigid foreign keys across different branch IDs or walk-in customers
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pharmacy_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_patient_id_fkey;

CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_id ON public.orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ==============================================================================
-- 6. OWING & DEBTORS LEDGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.owing_records (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_owed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid',
    items JSONB DEFAULT '[]'::jsonb,
    pharmacy_id TEXT NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    notes TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS amount_owed NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid';
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS pharmacy_id TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.owing_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_owing_pharmacy_id ON public.owing_records(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_owing_status ON public.owing_records(status);

-- ==============================================================================
-- 7. EXPENSES LEDGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    pharmacy_id TEXT NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    recorded_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS pharmacy_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_expenses_pharmacy_id ON public.expenses(pharmacy_id);

-- ==============================================================================
-- 8. SUPPLIERS & PURCHASE ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    order_date TEXT,
    expected_delivery_date TEXT,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. INTER-BRANCH STOCK TRANSFERS & REQUISITIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.branch_transfer_requests (
    id TEXT PRIMARY KEY,
    from_branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    from_branch_name TEXT,
    to_branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    to_branch_name TEXT,
    source_branch_id TEXT,
    destination_branch_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending',
    requested_by TEXT,
    requested_date TEXT,
    approved_by TEXT,
    approved_date TEXT,
    dispatched_date TEXT,
    received_date TEXT,
    notes TEXT,
    urgency TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_transfer_requests ADD COLUMN IF NOT EXISTS source_branch_id TEXT;
ALTER TABLE public.branch_transfer_requests ADD COLUMN IF NOT EXISTS destination_branch_id TEXT;
ALTER TABLE public.branch_transfer_requests ADD COLUMN IF NOT EXISTS from_branch_id TEXT;
ALTER TABLE public.branch_transfer_requests ADD COLUMN IF NOT EXISTS to_branch_id TEXT;

-- ==============================================================================
-- 10. SYSTEM ACTIVITY LOGS, MEMOS, CUSTOMERS, STAFF & REFUNDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tier TEXT DEFAULT 'Regular Consumer',
    balance NUMERIC(15, 2) DEFAULT 0.00,
    outstanding_balance NUMERIC(15, 2) DEFAULT 0.00,
    total_spent NUMERIC(15, 2) DEFAULT 0.00,
    orders_count INTEGER DEFAULT 0,
    join_date TEXT,
    status TEXT DEFAULT 'Verified',
    notes TEXT,
    pharmacy_id TEXT,
    branch_id TEXT,
    prescriptions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all customer columns exist on existing databases
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Regular Consumer';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Verified';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pharmacy_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch_id TEXT;

CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Terminal Manager',
    level INTEGER DEFAULT 3,
    status TEXT DEFAULT 'online',
    branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    password TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    join_date TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.staff_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Terminal Manager',
    level INTEGER DEFAULT 3,
    status TEXT DEFAULT 'online',
    branch_id TEXT REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    password TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    join_date TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.refunds (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    pharmacy_id TEXT NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    refund_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    refund_method TEXT NOT NULL DEFAULT 'cash',
    reason TEXT NOT NULL,
    returned_items JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    return_to_inventory BOOLEAN DEFAULT true,
    processed_by TEXT,
    processed_by_id TEXT,
    processed_by_name TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    receipt_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS returned_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS processed_by TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS processed_by_id TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS processed_by_name TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON public.staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_refunds_pharmacy_id ON public.refunds(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    user_name TEXT,
    branch_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id ON public.activity_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS public.broadcast_memos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    target_branch_id TEXT,
    priority TEXT DEFAULT 'normal',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'pharmacies', 'branches', 'profiles', 'categories', 'attributes', 
            'products', 'orders', 'owing_records', 'expenses', 'suppliers', 
            'purchase_orders', 'branch_transfer_requests', 'activity_logs', 'broadcast_memos',
            'customers', 'staff', 'staff_members', 'refunds'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access %s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow full public access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow full public access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- Drop any legacy check constraints on public tables to prevent 23514 type/status check errors
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public' 
          AND tc.constraint_type = 'CHECK'
          AND tc.table_name IN ('pharmacies', 'branches', 'products', 'orders', 'profiles', 'owing_records', 'expenses', 'branch_transfer_requests')
          AND tc.constraint_name NOT LIKE '%_not_null'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- ==============================================================================
-- 12. INITIAL SEED DATA (Default Branches & Foundational Stock)
-- ==============================================================================
INSERT INTO public.pharmacies (id, name, address, owner_id, status, type, phone, manager_name, description, revenue)
VALUES 
    ('pharma-1', 'Central Hub - Main Pharmacy', 'Plot 14, Commercial District, Abuja', 'admin', 'active', 'Central Hub', '+234 803 123 4567', 'Dr. Alabi Vance', 'Headquarters Central Fulfillment & Retail Unit', 4520000.00),
    ('pharma-2', 'Victoria Island Branch', 'Adetokunbo Ademola St, VI, Lagos', 'admin', 'active', 'Standard Branch', '+234 802 987 6543', 'Pharm. Chidinma Okafor', 'Prime Lagos Island Dispensary & Retail Outlet', 2890000.00)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    status = EXCLUDED.status;

-- Ensure categories exist
INSERT INTO public.categories (id, name, description)
VALUES 
    ('cat-1', 'Pain Relief & Analgesics', 'Medicines that relieve pain and reduce fever'),
    ('cat-2', 'Antibiotics', 'Antimicrobial agents for bacterial infections'),
    ('cat-3', 'Antimalarials', 'Standard Artemisinin-based combinations and therapies'),
    ('cat-4', 'Vitamins & Supplements', 'Daily dietary and immune support nutrients'),
    ('cat-5', 'Gastrointestinal', 'Acid reducers, antacids, and digestive aids'),
    ('cat-6', 'Respiratory', 'Allergy relief, cough syrups, and decongestants')
ON CONFLICT (id) DO NOTHING;

-- Seed Personnel Data directly into Supabase
INSERT INTO public.staff (id, name, email, role, level, status, branch_id, password, permissions, join_date)
VALUES
    ('ST-01', 'Dr. Alabi Vance', 'admin@manesol.com', 'Kernel Admin', 5, 'online', 'pharma-1', 'admin123', '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canManageBranches", "canManageMarketing", "canManageIntegrations", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb, '2024-01-15'),
    ('ST-02', 'Pharm. Chidinma Okafor', 'chidinma@manesol.com', 'Store Manager', 4, 'online', 'pharma-1', 'manager123', '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb, '2024-02-01'),
    ('ST-03', 'Tunde Bakare', 'tunde@manesol.com', 'Terminal Manager', 3, 'online', 'pharma-1', 'dispenser123', '["canAccessPOS", "canManageCustomers", "canManageInventory", "canAccessTransfers", "canAccessSuppliers", "canApplyDiscounts", "canDispenseControlled"]'::jsonb, '2024-03-10'),
    ('ST-04', 'Blessing Eze', 'blessing@manesol.com', 'Certified Dispenser', 2, 'online', 'pharma-2', 'dispenser123', '["canAccessPOS", "canManageInventory", "canDispenseControlled"]'::jsonb, '2024-04-05')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    level = EXCLUDED.level,
    permissions = EXCLUDED.permissions;

INSERT INTO public.staff_members (id, name, email, role, level, status, branch_id, password, permissions, join_date)
VALUES
    ('ST-01', 'Dr. Alabi Vance', 'admin@manesol.com', 'Kernel Admin', 5, 'online', 'pharma-1', 'admin123', '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canManageBranches", "canManageMarketing", "canManageIntegrations", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb, '2024-01-15'),
    ('ST-02', 'Pharm. Chidinma Okafor', 'chidinma@manesol.com', 'Store Manager', 4, 'online', 'pharma-1', 'manager123', '["canAccessPOS", "canManageStaff", "canManageCustomers", "canManageInventory", "canAccessSuppliers", "canAccessExpenses", "canAccessTransfers", "canAccessWarehouse", "canViewReports", "canAdjustSettings", "canApplyDiscounts", "canDispenseControlled"]'::jsonb, '2024-02-01')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    level = EXCLUDED.level,
    permissions = EXCLUDED.permissions;

-- ==============================================================================
-- 13. TEKILAB LIMS MODULAR CONFIGURATION, RAPID LAB RESULTS & PHARMACY HANDOFF
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_configurations (
    tenant_id TEXT PRIMARY KEY,
    tenant_slug TEXT NOT NULL UNIQUE,
    facility_name TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'lims_core',
    modules JSONB NOT NULL DEFAULT '{"lims":true,"emr":false,"hospital_management":false,"pharmacy":false,"billing":false,"ai_analytics":true}'::jsonb,
    sla_config JSONB NOT NULL DEFAULT '{"rapidTurnaroundTargetMinutes":5,"maxSlaMinutes":10,"autoAiAnomalyCheck":true,"requirePathologistSignoffOnCritical":true}'::jsonb,
    whatsapp_dispatch JSONB NOT NULL DEFAULT '{"enabled":true,"senderName":"TekiLab Diagnostics","includeQrVerification":true,"autoAttachPdf":true}'::jsonb,
    instrument_hub JSONB NOT NULL DEFAULT '{"webhookEnabled":true,"allowedInstruments":["SYS-XN550-01","ROCHE-C311-02","MINDRAY-BC5000"]}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configurations_modules_gin
    ON public.tenant_configurations USING GIN (modules);

CREATE TABLE IF NOT EXISTS public.lab_results (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenant_configurations(tenant_id) ON DELETE CASCADE,
    accession_number TEXT NOT NULL,
    sample_barcode TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_mrn TEXT,
    patient_phone TEXT,
    test_name TEXT NOT NULL,
    category TEXT DEFAULT 'General Pathology',
    sample_type TEXT DEFAULT 'Venous Blood',
    intake_source TEXT NOT NULL DEFAULT 'barcode_scan',
    instrument_id TEXT,
    status TEXT NOT NULL DEFAULT 'ANALYZING',
    anomaly_severity TEXT DEFAULT 'normal',
    parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_anomaly_report JSONB,
    ai_suggested_drug JSONB,
    whatsapp_dispatch JSONB,
    pharmacy_handoff JSONB,
    turnaround_seconds INTEGER DEFAULT 0,
    validated_by TEXT,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_tenant_accession ON public.lab_results(tenant_id, accession_number);
CREATE INDEX IF NOT EXISTS idx_lab_results_barcode ON public.lab_results(sample_barcode);
CREATE INDEX IF NOT EXISTS idx_lab_results_ai_gin ON public.lab_results USING GIN (ai_anomaly_report);

CREATE TABLE IF NOT EXISTS public.pharmacy_handoff_queue (
    handoff_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenant_configurations(tenant_id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_mrn TEXT,
    patient_phone TEXT,
    lab_result_id TEXT REFERENCES public.lab_results(id) ON DELETE SET NULL,
    accession_number TEXT NOT NULL,
    test_name TEXT NOT NULL,
    test_result_summary TEXT,
    likely_diagnosis TEXT,
    anomaly_severity TEXT DEFAULT 'attention',
    ai_suggested_drug JSONB NOT NULL,
    validated_by TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_handoff_tenant_status ON public.pharmacy_handoff_queue(tenant_id, status);

ALTER TABLE public.tenant_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_handoff_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full public access" ON public.tenant_configurations;
CREATE POLICY "Allow full public access" ON public.tenant_configurations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full public access" ON public.lab_results;
CREATE POLICY "Allow full public access" ON public.lab_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full public access" ON public.pharmacy_handoff_queue;
CREATE POLICY "Allow full public access" ON public.pharmacy_handoff_queue FOR ALL USING (true) WITH CHECK (true);

-- Seed Default TekiLab LIMS-Core Facility
INSERT INTO public.tenant_configurations (tenant_id, tenant_slug, facility_name, subscription_tier)
VALUES ('tenant-tekilab-01', 'tekilab-diagnostics', 'TekiLab Rapid Diagnostics Centre', 'lims_core')
ON CONFLICT (tenant_id) DO NOTHING;

-- Complete!


-- ==============================================================================
-- TEKILAB OFFICIAL BRD EXTENSIONS: SPECIMEN CHAIN OF CUSTODY & RAPID TEST PANELS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.specimens_custody (
    id TEXT PRIMARY KEY,
    sample_uid TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES public.tenant_configurations(tenant_id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    panel_id TEXT,
    panel_name TEXT NOT NULL,
    sample_type TEXT NOT NULL DEFAULT 'Venous Blood',
    tube_color TEXT DEFAULT 'Purple (EDTA)',
    collection_site TEXT DEFAULT 'Express Intake Bay 1',
    storage_location TEXT DEFAULT 'Rapid Bench A',
    collector_id TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'Registered',
    custody_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specimens_custody_tenant_status ON public.specimens_custody(tenant_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_specimens_custody_uid ON public.specimens_custody(sample_uid);

CREATE TABLE IF NOT EXISTS public.rapid_test_panels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenant_configurations(tenant_id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sample_type TEXT NOT NULL,
    tube_color TEXT,
    target_tat_minutes INTEGER NOT NULL DEFAULT 5,
    price_naira NUMERIC(12, 2) DEFAULT 0,
    parameters_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.specimens_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapid_test_panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full public access" ON public.specimens_custody;
CREATE POLICY "Allow full public access" ON public.specimens_custody FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full public access" ON public.rapid_test_panels;
CREATE POLICY "Allow full public access" ON public.rapid_test_panels FOR ALL USING (true) WITH CHECK (true);
