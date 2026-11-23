-- =================================================================================
-- TEKIMED UNIFIED HEALTHCARE MANAGEMENT PLATFORM
-- COMPLETE DATASTAX ASTRA DB (CASSANDRA CQL) DATABASE SCHEMA
-- =================================================================================
-- DATABASE NAME: Tekimed
-- KEYSPACE NAME: default_keyspace
-- =================================================================================
-- HOW TO RUN THIS IN ASTRA DATASTAX (NON-CODER STEP-BY-STEP):
-- 1. Log into https://astra.datastax.com and open your Database: "Tekimed".
-- 2. Click on the "CQL Console" tab inside your "Tekimed" Database dashboard.
-- 3. Copy and paste ALL of the CQL code below into the CQL Console and press Enter!
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
    'tenant-manesol',
    'Manesol Pharmacy Ltd',
    'manesol-pharmacy',
    'Dr. Evelyn Vance',
    'evelyn.vance@manesol.com',
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
    'tenant-manesol',
    'manesol-pharmacy',
    'Manesol Pharmacy (Central Branch)',
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
    'TekiPharm Super Administrator',
    'admin@tekipharm.com',
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
    'tenant-manesol',
    'manesol-pharmacy',
    'pharma-1',
    'Dr. Evelyn Vance',
    'evelyn.vance@manesol.com',
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

-- =================================================================================
-- 15. HEALTHCARE MODULES — ASTRA DATASTAX ADDITIVE TABLES
-- =================================================================================

-- PATIENT MASTER INDEX
CREATE TABLE IF NOT EXISTS default_keyspace.patient_records (
    id TEXT PRIMARY KEY,
    mrn TEXT,
    tenant_id TEXT,
    facility_id TEXT,
    full_name TEXT,
    dob TEXT,
    sex TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    blood_group TEXT,
    genotype TEXT,
    allergies_json TEXT,
    chronic_conditions_json TEXT,
    emergency_contact_json TEXT,
    insurance_json TEXT,
    medical_notes TEXT,
    registered_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_patients_mrn ON default_keyspace.patient_records (mrn) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_patients_phone ON default_keyspace.patient_records (phone) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_patients_tenant ON default_keyspace.patient_records (tenant_id) USING 'StorageAttachedIndex';

-- CLINICAL CONSULTATION ENCOUNTERS / EMR
CREATE TABLE IF NOT EXISTS default_keyspace.clinical_encounters (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    tenant_id TEXT,
    facility_id TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    department TEXT,
    encounter_type TEXT,
    chief_complaint TEXT,
    hpi TEXT,
    vitals_json TEXT,
    physical_exam_notes TEXT,
    primary_diagnosis TEXT,
    secondary_diagnosis TEXT,
    icd_code TEXT,
    treatment_plan TEXT,
    prescriptions_json TEXT,
    requested_lab_tests_json TEXT,
    requested_imaging_scans_json TEXT,
    status TEXT,
    created_at TEXT,
    completed_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_encounters_patient_id ON default_keyspace.clinical_encounters (patient_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_encounters_tenant ON default_keyspace.clinical_encounters (tenant_id) USING 'StorageAttachedIndex';

-- LABORATORY ORDERS & LIMS WORKLIST
CREATE TABLE IF NOT EXISTS default_keyspace.lab_orders (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    encounter_id TEXT,
    tenant_id TEXT,
    facility_id TEXT,
    test_id TEXT,
    test_name TEXT,
    category TEXT,
    accession_number TEXT,
    sample_type TEXT,
    sample_status TEXT,
    order_status TEXT,
    rejection_reason TEXT,
    sample_collector_name TEXT,
    sample_collected_at TEXT,
    results_json TEXT,
    clinical_interpretation TEXT,
    entered_by_name TEXT,
    entered_at TEXT,
    validated_by_name TEXT,
    validated_at TEXT,
    released_at TEXT,
    report_number TEXT,
    price_naira DECIMAL,
    billing_status TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_orders_patient ON default_keyspace.lab_orders (patient_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_orders_accession ON default_keyspace.lab_orders (accession_number) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_orders_status ON default_keyspace.lab_orders (order_status) USING 'StorageAttachedIndex';

-- RADIOLOGY & DIAGNOSTIC IMAGING ORDERS
CREATE TABLE IF NOT EXISTS default_keyspace.imaging_orders (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    encounter_id TEXT,
    tenant_id TEXT,
    test_id TEXT,
    test_name TEXT,
    modality TEXT,
    body_site TEXT,
    order_status TEXT,
    clinical_indication TEXT,
    technique_notes TEXT,
    findings_notes TEXT,
    impression_notes TEXT,
    recommendations_notes TEXT,
    radiologist_name TEXT,
    approved_at TEXT,
    report_number TEXT,
    price_naira DECIMAL,
    billing_status TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_imaging_patient ON default_keyspace.imaging_orders (patient_id) USING 'StorageAttachedIndex';

-- WARD & BED ADMISSIONS
CREATE TABLE IF NOT EXISTS default_keyspace.admission_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    ward_id TEXT,
    ward_name TEXT,
    bed_id TEXT,
    bed_number TEXT,
    admitting_doctor TEXT,
    diagnosis TEXT,
    status TEXT,
    admitted_at TEXT,
    discharged_at TEXT,
    vitals_log_json TEXT,
    nursing_notes_json TEXT,
    medication_admins_json TEXT,
    total_charge_naira DECIMAL
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_admissions_patient ON default_keyspace.admission_records (patient_id) USING 'StorageAttachedIndex';

-- HOSPITAL QUEUE TICKETS
CREATE TABLE IF NOT EXISTS default_keyspace.queue_tickets (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    ticket_number TEXT,
    department TEXT,
    priority TEXT,
    status TEXT,
    called_by TEXT,
    estimated_wait_mins INT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_queue_dept ON default_keyspace.queue_tickets (department) USING 'StorageAttachedIndex';

-- HOSPITAL APPOINTMENTS
CREATE TABLE IF NOT EXISTS default_keyspace.hospital_appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    department TEXT,
    appointment_date TEXT,
    time_slot TEXT,
    type TEXT,
    status TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_appointments_date ON default_keyspace.hospital_appointments (appointment_date) USING 'StorageAttachedIndex';

-- PATIENT CHARGES & HMO CLAIMS
CREATE TABLE IF NOT EXISTS default_keyspace.patient_charges (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT,
    mrn TEXT,
    category TEXT,
    description TEXT,
    total_amount_naira DECIMAL,
    hmo_covered_naira DECIMAL,
    patient_payable_naira DECIMAL,
    payment_status TEXT,
    encounter_id TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_charges_patient ON default_keyspace.patient_charges (patient_id) USING 'StorageAttachedIndex';

-- =================================================================================
-- 16. TEKILAB LIMS MODULAR SAAS TABLES (tenant_configurations, lab_results, pharmacy_handoff_queue)
-- =================================================================================

-- TENANT MODULAR FEATURE TOGGLES ("MUTE" ARCHITECTURE)
CREATE TABLE IF NOT EXISTS default_keyspace.tenant_configurations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    tenant_slug TEXT,
    facility_name TEXT,
    subscription_tier TEXT,
    modules_json TEXT,
    sla_config_json TEXT,
    whatsapp_dispatch_json TEXT,
    instrument_hub_json TEXT,
    updated_by TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_tenant_cfg_slug ON default_keyspace.tenant_configurations (tenant_slug) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_tenant_cfg_tier ON default_keyspace.tenant_configurations (subscription_tier) USING 'StorageAttachedIndex';

-- RAPID-RESPONSE LAB RESULTS WITH AI ANOMALY CHECK & WHATSAPP DISPATCH AUDIT
CREATE TABLE IF NOT EXISTS default_keyspace.lab_results (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    accession_number TEXT,
    sample_barcode TEXT,
    patient_id TEXT,
    patient_name TEXT,
    patient_mrn TEXT,
    patient_phone TEXT,
    test_name TEXT,
    category TEXT,
    sample_type TEXT,
    intake_source TEXT,
    instrument_id TEXT,
    status TEXT,
    anomaly_severity TEXT,
    parameters_json TEXT,
    ai_anomaly_report_json TEXT,
    ai_suggested_drug_json TEXT,
    whatsapp_dispatch_json TEXT,
    pharmacy_handoff_json TEXT,
    turnaround_seconds INT,
    validated_by TEXT,
    validated_at TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_results_tenant ON default_keyspace.lab_results (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_results_accession ON default_keyspace.lab_results (accession_number) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_results_barcode ON default_keyspace.lab_results (sample_barcode) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_lab_results_patient ON default_keyspace.lab_results (patient_id) USING 'StorageAttachedIndex';

-- CROSS-MODULE LAB-TO-PHARMACY PRESCRIPTION HANDOFF QUEUE
CREATE TABLE IF NOT EXISTS default_keyspace.pharmacy_handoff_queue (
    id TEXT PRIMARY KEY,
    handoff_id TEXT,
    tenant_id TEXT,
    patient_id TEXT,
    patient_name TEXT,
    patient_mrn TEXT,
    patient_phone TEXT,
    lab_result_id TEXT,
    accession_number TEXT,
    test_name TEXT,
    test_result_summary TEXT,
    likely_diagnosis TEXT,
    anomaly_severity TEXT,
    ai_suggested_drug_json TEXT,
    validated_by TEXT,
    status TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_handoff_tenant ON default_keyspace.pharmacy_handoff_queue (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_handoff_status ON default_keyspace.pharmacy_handoff_queue (status) USING 'StorageAttachedIndex';

-- SEED DEFAULT TEKILAB LIMS-CORE TENANT CONFIGURATION (EMR & PHARMACY MUTED BY DEFAULT)
INSERT INTO default_keyspace.tenant_configurations (
    id, tenant_id, tenant_slug, facility_name, subscription_tier,
    modules_json, sla_config_json, whatsapp_dispatch_json, instrument_hub_json,
    updated_by, updated_at
) VALUES (
    'tenant-tekilab-01',
    'tenant-tekilab-01',
    'tekilab-diagnostics',
    'TekiLab Rapid Diagnostics Centre',
    'lims_core',
    '{"lims":true,"emr":false,"hospital_management":false,"pharmacy":false,"billing":false,"ai_analytics":true}',
    '{"rapidTurnaroundTargetMinutes":5,"maxSlaMinutes":10,"autoAiAnomalyCheck":true,"requirePathologistSignoffOnCritical":true}',
    '{"enabled":true,"senderName":"TekiLab Diagnostics","includeQrVerification":true,"autoAttachPdf":true}',
    '{"webhookEnabled":true,"allowedInstruments":["SYS-XN550-01","ROCHE-C311-02","MINDRAY-BC5000"]}',
    'system-bootstrap',
    '2026-11-23T06:00:00.000Z'
);


-- =================================================================================
-- TEKILAB OFFICIAL BRD EXTENSIONS: SPECIMEN CHAIN OF CUSTODY & RAPID TEST PANELS
-- =================================================================================

-- SPECIMEN ACCESSIONING & CHAIN OF CUSTODY (ISO UID TK-YYYY-XXXXX)
CREATE TABLE IF NOT EXISTS default_keyspace.specimens_custody (
    id TEXT PRIMARY KEY,
    sample_uid TEXT,
    tenant_id TEXT,
    patient_id TEXT,
    patient_name TEXT,
    patient_phone TEXT,
    panel_id TEXT,
    panel_name TEXT,
    sample_type TEXT,
    tube_color TEXT,
    collection_site TEXT,
    storage_location TEXT,
    collector_id TEXT,
    lifecycle_status TEXT,
    custody_trail_json TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_specimens_uid ON default_keyspace.specimens_custody (sample_uid) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_specimens_tenant ON default_keyspace.specimens_custody (tenant_id) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX IF NOT EXISTS idx_specimens_status ON default_keyspace.specimens_custody (lifecycle_status) USING 'StorageAttachedIndex';

-- PRE-CONFIGURED RAPID TEST MASTER PANELS & REFERENCE RANGES
CREATE TABLE IF NOT EXISTS default_keyspace.rapid_test_panels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    code TEXT,
    name TEXT,
    category TEXT,
    sample_type TEXT,
    tube_color TEXT,
    target_tat_minutes INT,
    price_naira DECIMAL,
    parameters_schema_json TEXT,
    created_at TEXT
);

CREATE CUSTOM INDEX IF NOT EXISTS idx_rapid_panels_tenant ON default_keyspace.rapid_test_panels (tenant_id) USING 'StorageAttachedIndex';
