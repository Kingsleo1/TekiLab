// ============================================================================
// VERCEL SERVERLESS FUNCTION FOR DATASTAX ASTRA DB (STARGATE REST API v2)
// Handles all /api/astra/* routes in production on Vercel
// ============================================================================

const ASTRA_TABLES_SCHEMA = [
  {
    name: 'tenants',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'slug', typeDefinition: 'text' },
      { name: 'owner_name', typeDefinition: 'text' },
      { name: 'owner_email', typeDefinition: 'text' },
      { name: 'phone', typeDefinition: 'text' },
      { name: 'address', typeDefinition: 'text' },
      { name: 'logo', typeDefinition: 'text' },
      { name: 'plan_id', typeDefinition: 'text' },
      { name: 'plan_name', typeDefinition: 'text' },
      { name: 'monthly_rate_naira', typeDefinition: 'decimal' },
      { name: 'duration_months', typeDefinition: 'int' },
      { name: 'discount_percent', typeDefinition: 'decimal' },
      { name: 'total_paid_naira', typeDefinition: 'decimal' },
      { name: 'max_branches', typeDefinition: 'int' },
      { name: 'subscription_status', typeDefinition: 'text' },
      { name: 'subscription_start', typeDefinition: 'text' },
      { name: 'subscription_end', typeDefinition: 'text' },
      { name: 'payment_reference', typeDefinition: 'text' },
      { name: 'services_enabled_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'subscription_payments',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'tenant_name', typeDefinition: 'text' },
      { name: 'tenant_slug', typeDefinition: 'text' },
      { name: 'plan_id', typeDefinition: 'text' },
      { name: 'plan_name', typeDefinition: 'text' },
      { name: 'duration_months', typeDefinition: 'int' },
      { name: 'monthly_rate_naira', typeDefinition: 'decimal' },
      { name: 'subtotal_naira', typeDefinition: 'decimal' },
      { name: 'discount_percent', typeDefinition: 'decimal' },
      { name: 'discount_saved_naira', typeDefinition: 'decimal' },
      { name: 'amount_paid_naira', typeDefinition: 'decimal' },
      { name: 'payment_method', typeDefinition: 'text' },
      { name: 'payment_reference', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'services_breakdown_json', typeDefinition: 'text' },
      { name: 'period_start', typeDefinition: 'text' },
      { name: 'period_end', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'pharmacies',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'tenant_slug', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'address', typeDefinition: 'text' },
      { name: 'owner_id', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'revenue', typeDefinition: 'decimal' },
      { name: 'type', typeDefinition: 'text' },
      { name: 'phone', typeDefinition: 'text' },
      { name: 'manager_name', typeDefinition: 'text' },
      { name: 'description', typeDefinition: 'text' },
      { name: 'image', typeDefinition: 'text' },
      { name: 'permissions_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'staff',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'tenant_slug', typeDefinition: 'text' },
      { name: 'branch_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'email', typeDefinition: 'text' },
      { name: 'password', typeDefinition: 'text' },
      { name: 'role', typeDefinition: 'text' },
      { name: 'phone', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'level', typeDefinition: 'int' },
      { name: 'permissions_json', typeDefinition: 'text' },
      { name: 'join_date', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'categories',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'description', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'attributes',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'type', typeDefinition: 'text' },
      { name: 'options_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'products',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'generic_name', typeDefinition: 'text' },
      { name: 'barcode', typeDefinition: 'text' },
      { name: 'category', typeDefinition: 'text' },
      { name: 'price', typeDefinition: 'decimal' },
      { name: 'cost_price', typeDefinition: 'decimal' },
      { name: 'wholesale_price', typeDefinition: 'decimal' },
      { name: 'stock', typeDefinition: 'int' },
      { name: 'min_stock_level', typeDefinition: 'int' },
      { name: 'base_unit', typeDefinition: 'text' },
      { name: 'conversion_factor', typeDefinition: 'int' },
      { name: 'expiry_date', typeDefinition: 'text' },
      { name: 'requires_prescription', typeDefinition: 'boolean' },
      { name: 'image', typeDefinition: 'text' },
      { name: 'batches_json', typeDefinition: 'text' },
      { name: 'supplier_id', typeDefinition: 'text' },
      { name: 'attributes_json', typeDefinition: 'text' },
      { name: 'packaging_pricing_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'orders',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'patient_id', typeDefinition: 'text' },
      { name: 'items_json', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'total', typeDefinition: 'decimal' },
      { name: 'subtotal', typeDefinition: 'decimal' },
      { name: 'tax', typeDefinition: 'decimal' },
      { name: 'discount', typeDefinition: 'decimal' },
      { name: 'payment_method', typeDefinition: 'text' },
      { name: 'cash_paid', typeDefinition: 'decimal' },
      { name: 'transfer_paid', typeDefinition: 'decimal' },
      { name: 'card_paid', typeDefinition: 'decimal' },
      { name: 'owing_paid', typeDefinition: 'decimal' },
      { name: 'void_reason', typeDefinition: 'text' },
      { name: 'processed_by', typeDefinition: 'text' },
      { name: 'prescription_url', typeDefinition: 'text' },
      { name: 'tracking_history_json', typeDefinition: 'text' },
      { name: 'source', typeDefinition: 'text' },
      { name: 'receipt_pdf_url', typeDefinition: 'text' },
      { name: 'receipt_metadata_json', typeDefinition: 'text' },
      { name: 'last_shared_at', typeDefinition: 'text' },
      { name: 'last_shared_platform', typeDefinition: 'text' },
      { name: 'refund_info_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'owing_records',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'order_id', typeDefinition: 'text' },
      { name: 'customer_name', typeDefinition: 'text' },
      { name: 'customer_phone', typeDefinition: 'text' },
      { name: 'total_amount', typeDefinition: 'decimal' },
      { name: 'amount_paid', typeDefinition: 'decimal' },
      { name: 'amount_owed', typeDefinition: 'decimal' },
      { name: 'due_date', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'items_json', typeDefinition: 'text' },
      { name: 'notes', typeDefinition: 'text' },
      { name: 'payments_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'expenses',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'title', typeDefinition: 'text' },
      { name: 'description', typeDefinition: 'text' },
      { name: 'vendor_id', typeDefinition: 'text' },
      { name: 'date', typeDefinition: 'text' },
      { name: 'category', typeDefinition: 'text' },
      { name: 'amount', typeDefinition: 'decimal' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'payment_method', typeDefinition: 'text' },
      { name: 'recorded_by', typeDefinition: 'text' },
      { name: 'notes', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'suppliers',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'contact_name', typeDefinition: 'text' },
      { name: 'email', typeDefinition: 'text' },
      { name: 'phone', typeDefinition: 'text' },
      { name: 'address', typeDefinition: 'text' },
      { name: 'total_owing', typeDefinition: 'decimal' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'supply_records',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'vendor_id', typeDefinition: 'text' },
      { name: 'product_name', typeDefinition: 'text' },
      { name: 'size', typeDefinition: 'text' },
      { name: 'category', typeDefinition: 'text' },
      { name: 'quantity', typeDefinition: 'int' },
      { name: 'total_cost', typeDefinition: 'decimal' },
      { name: 'unit_cost', typeDefinition: 'decimal' },
      { name: 'unit_price', typeDefinition: 'decimal' },
      { name: 'min_quantity', typeDefinition: 'int' },
      { name: 'destination', typeDefinition: 'text' },
      { name: 'expense_id', typeDefinition: 'text' },
      { name: 'date', typeDefinition: 'text' },
      { name: 'supplier_name', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'transfers',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'batch_id', typeDefinition: 'text' },
      { name: 'source_pharmacy_id', typeDefinition: 'text' },
      { name: 'target_pharmacy_id', typeDefinition: 'text' },
      { name: 'product_name', typeDefinition: 'text' },
      { name: 'quantity', typeDefinition: 'int' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'barcode', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'customers',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'name', typeDefinition: 'text' },
      { name: 'phone', typeDefinition: 'text' },
      { name: 'email', typeDefinition: 'text' },
      { name: 'address', typeDefinition: 'text' },
      { name: 'tier', typeDefinition: 'text' },
      { name: 'balance', typeDefinition: 'decimal' },
      { name: 'total_spent', typeDefinition: 'decimal' },
      { name: 'orders_count', typeDefinition: 'int' },
      { name: 'join_date', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'notes', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'refunds',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'order_id', typeDefinition: 'text' },
      { name: 'customer_name', typeDefinition: 'text' },
      { name: 'customer_phone', typeDefinition: 'text' },
      { name: 'items_json', typeDefinition: 'text' },
      { name: 'refund_amount', typeDefinition: 'decimal' },
      { name: 'reason', typeDefinition: 'text' },
      { name: 'refund_method', typeDefinition: 'text' },
      { name: 'processed_by', typeDefinition: 'text' },
      { name: 'processed_by_name', typeDefinition: 'text' },
      { name: 'receipt_number', typeDefinition: 'text' },
      { name: 'notes', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'product_logs',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'pharmacy_id', typeDefinition: 'text' },
      { name: 'product_id', typeDefinition: 'text' },
      { name: 'product_name', typeDefinition: 'text' },
      { name: 'action', typeDefinition: 'text' },
      { name: 'activity_type', typeDefinition: 'text' },
      { name: 'resource_id', typeDefinition: 'text' },
      { name: 'description', typeDefinition: 'text' },
      { name: 'created_by_json', typeDefinition: 'text' },
      { name: 'metadata_json', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  }
];

function extractAstraToken(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const match = trimmed.match(/AstraCS:[A-Za-z0-9:_+-]+/);
  if (match) return match[0];
  return trimmed.replace(/^["']|["']$/g, '').trim();
}

function extractEndpoint(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const match = trimmed.match(/https:\/\/[a-zA-Z0-9-]+\.apps\.astra\.datastax\.com/);
  if (match) return match[0];
  return trimmed.replace(/^["']|["']$/g, '').replace(/\/+$/, '');
}

function resolveAstraCredentials(req: any) {
  const headers = req.headers || {};
  const rawEndpoint =
    (headers['x-astra-endpoint'] as string) ||
    process.env.ASTRA_DB_API_ENDPOINT ||
    process.env.VITE_ASTRA_DB_API_ENDPOINT ||
    process.env.ASTRA_DB_ENDPOINT ||
    process.env.VITE_ASTRA_DB_ENDPOINT ||
    process.env.NEXT_PUBLIC_ASTRA_DB_API_ENDPOINT ||
    'https://dd0b5ae4-d60e-47ea-ba03-1360309991ec-us-east-2.apps.astra.datastax.com';

  const rawToken =
    (headers['x-astra-token'] as string) ||
    process.env.ASTRA_DB_APPLICATION_TOKEN ||
    process.env.VITE_ASTRA_DB_APPLICATION_TOKEN ||
    process.env.ASTRA_DB_TOKEN ||
    process.env.VITE_ASTRA_DB_TOKEN ||
    process.env.NEXT_PUBLIC_ASTRA_DB_APPLICATION_TOKEN ||
    '';

  const rawKeyspace =
    (headers['x-astra-keyspace'] as string) ||
    process.env.ASTRA_DB_KEYSPACE ||
    process.env.VITE_ASTRA_DB_KEYSPACE ||
    process.env.NEXT_PUBLIC_ASTRA_DB_KEYSPACE ||
    'default_keyspace';

  const endpoint = extractEndpoint(rawEndpoint);
  const token = extractAstraToken(rawToken);
  const keyspace =
    String(rawKeyspace || 'default_keyspace')
      .trim()
      .replace(/^["']|["']$/g, '') || 'default_keyspace';

  const isConfigured =
    Boolean(endpoint && token) &&
    endpoint.startsWith('https://') &&
    !endpoint.includes('your-database-id') &&
    !token.includes('your_generated_application_token');

  return { endpoint, token, keyspace, isConfigured };
}

async function ensureTableExists(creds: { endpoint: string; token: string; keyspace: string }, tableName: string) {
  const tableDef = ASTRA_TABLES_SCHEMA.find((t) => t.name === tableName);
  if (!tableDef) return;
  try {
    await fetch(
      `${creds.endpoint}/api/rest/v2/schemas/keyspaces/${encodeURIComponent(creds.keyspace)}/tables`,
      {
        method: 'POST',
        headers: {
          'X-Cassandra-Token': creds.token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: tableDef.name,
          ifNotExists: true,
          columnDefinitions: tableDef.columnDefinitions,
          primaryKey: tableDef.primaryKey
        })
      }
    );
  } catch {
    // Non-fatal
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS headers for Vercel preview / custom domains
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, x-astra-endpoint, x-astra-token, x-astra-keyspace'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const creds = resolveAstraCredentials(req);

  // Extract route path after /api/astra/
  const urlObj = new URL(req.url || '/api/astra', 'http://localhost');
  const queryPath = req.query?.__path || urlObj.searchParams.get('__path') || '';
  const rawPathname = urlObj.pathname.replace(/^\/api\/astra\/?/, '');
  const subPath = String(queryPath || rawPathname).replace(/^\/+|\/+$/g, '');
  const segments = subPath.split('/').filter(Boolean);

  // 1. GET /api/astra/status
  if (segments[0] === 'status' || segments.length === 0) {
    if (!creds.isConfigured) {
      return res.status(200).json({
        configured: false,
        connected: false,
        keyspace: creds.keyspace,
        message: 'Astra DB credentials not configured yet.'
      });
    }

    try {
      const response = await fetch(
        `${creds.endpoint}/api/rest/v2/schemas/keyspaces/${encodeURIComponent(creds.keyspace)}/tables`,
        {
          method: 'GET',
          headers: {
            'X-Cassandra-Token': creds.token,
            Accept: 'application/json'
          }
        }
      );

      if (response.ok) {
        const json: any = await response.json();
        const tables = Array.isArray(json?.data) ? json.data.map((t: any) => t.name) : [];
        return res.status(200).json({
          configured: true,
          connected: true,
          keyspace: creds.keyspace,
          endpoint: creds.endpoint,
          tables
        });
      } else {
        const errText = await response.text();
        return res.status(200).json({
          configured: true,
          connected: false,
          keyspace: creds.keyspace,
          endpoint: creds.endpoint,
          error: `Astra API responded with ${response.status}: ${errText.slice(0, 200)}`
        });
      }
    } catch (err: any) {
      return res.status(200).json({
        configured: true,
        connected: false,
        keyspace: creds.keyspace,
        error: err?.message || 'Failed to connect to DataStax Astra DB'
      });
    }
  }

  // 2. POST /api/astra/init-schema
  if (segments[0] === 'init-schema' && req.method === 'POST') {
    if (!creds.isConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Astra DataStax API Endpoint and Application Token are required.'
      });
    }

    const createdTables: string[] = [];
    const errors: string[] = [];

    for (const tableDef of ASTRA_TABLES_SCHEMA) {
      try {
        const response = await fetch(
          `${creds.endpoint}/api/rest/v2/schemas/keyspaces/${encodeURIComponent(creds.keyspace)}/tables`,
          {
            method: 'POST',
            headers: {
              'X-Cassandra-Token': creds.token,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              name: tableDef.name,
              ifNotExists: true,
              columnDefinitions: tableDef.columnDefinitions,
              primaryKey: tableDef.primaryKey
            })
          }
        );

        if (response.ok || response.status === 409) {
          createdTables.push(tableDef.name);
        } else {
          const text = await response.text();
          errors.push(`${tableDef.name}: ${response.status} ${text.slice(0, 120)}`);
        }
      } catch (err: any) {
        errors.push(`${tableDef.name}: ${err?.message}`);
      }
    }

    return res.status(200).json({
      success: errors.length === 0 || createdTables.length > 0,
      createdTables,
      errors
    });
  }

  // 3. Universal Table CRUD Proxy (/api/astra/table/:table and /api/astra/table/:table/:id)
  if (segments[0] === 'table' && segments[1]) {
    if (!creds.isConfigured) {
      return res.status(400).json({ error: 'Astra DB not configured' });
    }

    const table = segments[1];
    const rowId = segments[2] ? decodeURIComponent(segments[2]) : undefined;

    // GET rows from table
    if (req.method === 'GET') {
      const whereParam = req.query?.where || urlObj.searchParams.get('where') || '';
      const pageSize = req.query?.pageSize || urlObj.searchParams.get('pageSize') || '1000';

      try {
        const url = `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/rows?page-size=${pageSize}`;
        let response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Cassandra-Token': creds.token,
            Accept: 'application/json'
          }
        });

        if (response.status === 404 || response.status === 400) {
          await ensureTableExists(creds, table);
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Cassandra-Token': creds.token,
              Accept: 'application/json'
            }
          });
        }

        if (!response.ok) {
          const text = await response.text();
          return res.status(response.status).json({ error: text });
        }

        const json: any = await response.json();
        let rows: any[] = Array.isArray(json?.data) ? json.data : [];

        if (whereParam) {
          try {
            const filterObj = JSON.parse(String(whereParam));
            if (filterObj && typeof filterObj === 'object') {
              rows = rows.filter((row) =>
                Object.entries(filterObj).every(([k, v]) => {
                  if (v === undefined || v === null) return true;
                  const rowVal = row?.[k];
                  if (typeof v === 'string' && typeof rowVal === 'string') {
                    return rowVal.toLowerCase().trim() === v.toLowerCase().trim();
                  }
                  return rowVal === v;
                })
              );
            }
          } catch {
            // Ignore malformed where filter
          }
        }

        return res.status(200).json({ data: rows });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Astra GET failed' });
      }
    }

    // POST / Upsert row(s)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const rows = Array.isArray(body) ? body : [body];

      try {
        let inserted = 0;
        let tableChecked = false;

        for (const row of rows) {
          if (!row || !row.id) continue;
          const pk = encodeURIComponent(String(row.id));
          const copy = { ...row };
          delete copy.id;

          let putRes = await fetch(
            `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${pk}`,
            {
              method: 'PUT',
              headers: {
                'X-Cassandra-Token': creds.token,
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify(copy)
            }
          );

          if (!putRes.ok && !tableChecked && (putRes.status === 404 || putRes.status === 400)) {
            tableChecked = true;
            await ensureTableExists(creds, table);
            putRes = await fetch(
              `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${pk}`,
              {
                method: 'PUT',
                headers: {
                  'X-Cassandra-Token': creds.token,
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                body: JSON.stringify(copy)
              }
            );
          }

          if (putRes.ok) {
            inserted++;
          } else {
            const postRes = await fetch(
              `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}`,
              {
                method: 'POST',
                headers: {
                  'X-Cassandra-Token': creds.token,
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                body: JSON.stringify(row)
              }
            );
            if (postRes.ok) inserted++;
          }
        }

        return res.status(200).json({ success: true, count: inserted });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Astra upsert failed' });
      }
    }

    // PATCH / Update row by primary key
    if (req.method === 'PATCH' && rowId) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const payload = { ...body };
      delete payload.id;

      try {
        const response = await fetch(
          `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${encodeURIComponent(rowId)}`,
          {
            method: 'PATCH',
            headers: {
              'X-Cassandra-Token': creds.token,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) {
          const text = await response.text();
          return res.status(response.status).json({ error: text });
        }
        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Astra PATCH failed' });
      }
    }

    // DELETE row by primary key
    if (req.method === 'DELETE' && rowId) {
      try {
        const response = await fetch(
          `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${encodeURIComponent(rowId)}`,
          {
            method: 'DELETE',
            headers: {
              'X-Cassandra-Token': creds.token,
              Accept: 'application/json'
            }
          }
        );

        if (!response.ok && response.status !== 204) {
          const text = await response.text();
          return res.status(response.status).json({ error: text });
        }
        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Astra DELETE failed' });
      }
    }
  }

  return res.status(404).json({ error: 'Unknown Astra API route' });
}
