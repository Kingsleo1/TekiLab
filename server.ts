import {createSiteSettingsRouter} from './src/server/site-settings-router';
import {createAstraManagementRouter} from './src/server/astra-management';
import {createClinicalStateRouter} from './src/server/clinical-state';
import { createQRRouter } from './src/server/qr-router';
import express from 'express';
import { createTestCatalogueRouter } from './src/server/test-catalog-router';
import { createHash } from 'node:crypto';
import { buildMeasuredReview, validateDispatch } from './src/lib/rapid-review';
const previewMode = process.env.TEKILAB_PREVIEW_MODE !== 'false';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server. Configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// In-memory resilient runtime mirrors synced with DataStax Astra DB when credentials are active
const tenantConfigStore = new Map<string, any>();
const labResultsStore = new Map<string, any>();
const pharmacyHandoffQueueStore: any[] = [];
const instrumentWebhookInbox: any[] = [];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  },
  {
    name: 'tenant_configurations',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'tenant_slug', typeDefinition: 'text' },
      { name: 'facility_name', typeDefinition: 'text' },
      { name: 'subscription_tier', typeDefinition: 'text' },
      { name: 'modules_json', typeDefinition: 'text' },
      { name: 'sla_config_json', typeDefinition: 'text' },
      { name: 'whatsapp_dispatch_json', typeDefinition: 'text' },
      { name: 'instrument_hub_json', typeDefinition: 'text' },
      { name: 'updated_by', typeDefinition: 'text' },
      { name: 'updated_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'lab_results',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'accession_number', typeDefinition: 'text' },
      { name: 'sample_barcode', typeDefinition: 'text' },
      { name: 'patient_id', typeDefinition: 'text' },
      { name: 'patient_name', typeDefinition: 'text' },
      { name: 'patient_mrn', typeDefinition: 'text' },
      { name: 'patient_phone', typeDefinition: 'text' },
      { name: 'test_name', typeDefinition: 'text' },
      { name: 'category', typeDefinition: 'text' },
      { name: 'sample_type', typeDefinition: 'text' },
      { name: 'intake_source', typeDefinition: 'text' },
      { name: 'instrument_id', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
      { name: 'anomaly_severity', typeDefinition: 'text' },
      { name: 'parameters_json', typeDefinition: 'text' },
      { name: 'ai_anomaly_report_json', typeDefinition: 'text' },
      { name: 'ai_suggested_drug_json', typeDefinition: 'text' },
      { name: 'whatsapp_dispatch_json', typeDefinition: 'text' },
      { name: 'pharmacy_handoff_json', typeDefinition: 'text' },
      { name: 'turnaround_seconds', typeDefinition: 'int' },
      { name: 'validated_by', typeDefinition: 'text' },
      { name: 'validated_at', typeDefinition: 'text' },
      { name: 'created_at', typeDefinition: 'text' }
    ],
    primaryKey: { partitionKey: ['id'] }
  },
  {
    name: 'pharmacy_handoff_queue',
    columnDefinitions: [
      { name: 'id', typeDefinition: 'text' },
      { name: 'handoff_id', typeDefinition: 'text' },
      { name: 'tenant_id', typeDefinition: 'text' },
      { name: 'patient_id', typeDefinition: 'text' },
      { name: 'patient_name', typeDefinition: 'text' },
      { name: 'patient_mrn', typeDefinition: 'text' },
      { name: 'patient_phone', typeDefinition: 'text' },
      { name: 'lab_result_id', typeDefinition: 'text' },
      { name: 'accession_number', typeDefinition: 'text' },
      { name: 'test_name', typeDefinition: 'text' },
      { name: 'test_result_summary', typeDefinition: 'text' },
      { name: 'likely_diagnosis', typeDefinition: 'text' },
      { name: 'anomaly_severity', typeDefinition: 'text' },
      { name: 'ai_suggested_drug_json', typeDefinition: 'text' },
      { name: 'validated_by', typeDefinition: 'text' },
      { name: 'status', typeDefinition: 'text' },
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

function resolveAstraCredentials(req: express.Request) {
  const rawEndpoint =
    (req.headers['x-astra-endpoint'] as string) ||
    process.env.ASTRA_DB_API_ENDPOINT ||
    process.env.VITE_ASTRA_DB_API_ENDPOINT ||
    process.env.ASTRA_DB_ENDPOINT ||
    process.env.VITE_ASTRA_DB_ENDPOINT ||
    'https://dd0b5ae4-d60e-47ea-ba03-1360309991ec-us-east-2.apps.astra.datastax.com';
  const rawToken =
    (req.headers['x-astra-token'] as string) ||
    process.env.ASTRA_DB_APPLICATION_TOKEN ||
    process.env.VITE_ASTRA_DB_APPLICATION_TOKEN ||
    process.env.ASTRA_DB_TOKEN ||
    process.env.VITE_ASTRA_DB_TOKEN ||
    '';
  const rawKeyspace =
    (req.headers['x-astra-keyspace'] as string) ||
    process.env.ASTRA_DB_KEYSPACE ||
    process.env.VITE_ASTRA_DB_KEYSPACE ||
    'default_keyspace';

  const endpoint = extractEndpoint(rawEndpoint);
  const token = extractAstraToken(rawToken);
  const keyspace = rawKeyspace.trim().replace(/^["']|["']$/g, '') || 'default_keyspace';

  const isConfigured =
    Boolean(endpoint && token) &&
    endpoint.startsWith('https://') &&
    !endpoint.includes('your-database-id') &&
    !token.includes('your_generated_application_token');

  return { endpoint, token, keyspace, isConfigured };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if(!previewMode&&req.path.startsWith('/api/lims/')&&!req.path.startsWith('/api/lims/admin/astra/')&&!(req.method==='GET'&&/^\/api\/lims\/qr\/(results|booking)\/[A-Za-z0-9_-]{43}$/.test(req.path)))return res.status(503).json({error:'Trusted hosted clinical authentication and persistence are required before enabling this operation.'});
    if(req.path==='/api/astra'||req.path.startsWith('/api/astra/'))return res.status(423).json({error:'Legacy Astra proxy disabled. Use authenticated laboratory database management.'});
    if (previewMode) {
      res.setHeader('X-TekiLab-Mode', 'local-preview');
      res.setHeader('Content-Security-Policy', "connect-src 'self' ws://localhost:* ws://127.0.0.1:*; frame-ancestors 'none'; base-uri 'self'");
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (!/^(localhost|127\.0\.0\.1)(:3000)?$/.test(req.headers.host || '')) return res.status(403).json({ error: 'Local preview accepts localhost requests only.' });
      const origin = req.headers.origin;
      if (origin && !['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin)) return res.status(403).json({ error: 'Cross-origin preview access denied.' });
      if (req.path.startsWith('/api/astra/')) return res.status(423).json({ error: 'Astra operations are held pending explicit approval.' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  const catalogueRouter=await createTestCatalogueRouter(__dirname,previewMode);
  app.use('/api/lims/test-catalog',catalogueRouter);
  app.use('/api/lims/qr',createQRRouter(__dirname,previewMode,(catalogueRouter as any).catalogueStore));
  app.use('/api/lims/admin/astra',createAstraManagementRouter(__dirname,previewMode));
  app.use('/api/site-settings',createSiteSettingsRouter(__dirname,previewMode));
  app.use('/api/lims/clinical-state',createClinicalStateRouter(__dirname,previewMode));
  app.get('/api/preview/status', (_req, res) => res.json({ previewMode, databaseWrites: !previewMode || process.env.TEKILAB_ENABLE_ASTRA_WRITES==='true', externalAI: !previewMode }));

  // 1. Check Astra DB Connection Status
  app.get('/api/astra/status', async (req, res) => {
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured) {
      return res.json({
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
        return res.json({
          configured: true,
          connected: true,
          keyspace: creds.keyspace,
          endpoint: creds.endpoint,
          tables
        });
      } else {
        const errText = await response.text();
        return res.json({
          configured: true,
          connected: false,
          keyspace: creds.keyspace,
          endpoint: creds.endpoint,
          error: `Astra API responded with ${response.status}: ${errText.slice(0, 200)}`
        });
      }
    } catch (err: any) {
      return res.json({
        configured: true,
        connected: false,
        keyspace: creds.keyspace,
        error: err?.message || 'Failed to connect to DataStax Astra DB'
      });
    }
  });

  // 2. Auto-Initialize All 16 CQL Tables in DataStax Astra DB via Stargate Schema API
  app.post('/api/astra/init-schema', async (req, res) => {
    const creds = resolveAstraCredentials(req);
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

    return res.json({
      success: errors.length === 0 || createdTables.length > 0,
      createdTables,
      errors
    });
  });

  // 3. Universal Table CRUD Proxy for DataStax Astra CQL REST API v2
  // GET all rows or query rows from a table
  app.get('/api/astra/table/:table', async (req, res) => {
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured) {
      return res.status(400).json({ error: 'Astra DB not configured' });
    }
    const { table } = req.params;
    const whereParam = req.query.where ? String(req.query.where) : '';
    const pageSize = req.query.pageSize ? String(req.query.pageSize) : '1000';

    try {
      const url = `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/rows?page-size=${pageSize}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Cassandra-Token': creds.token,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: text });
      }

      const json: any = await response.json();
      let rows: any[] = Array.isArray(json?.data) ? json.data : [];

      if (whereParam) {
        try {
          const filterObj = JSON.parse(whereParam);
          if (filterObj && typeof filterObj === 'object') {
            rows = rows.filter(row =>
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

      return res.json({ data: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Astra GET failed' });
    }
  });

  // POST / Upsert row(s) into an Astra CQL table
  app.post('/api/astra/table/:table', async (req, res) => {
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured) {
      return res.status(400).json({ error: 'Astra DB not configured' });
    }
    const { table } = req.params;
    const body = req.body;
    const rows = Array.isArray(body) ? body : [body];

    try {
      let inserted = 0;
      for (const row of rows) {
        if (!row || !row.id) continue;
        // In Cassandra CQL, PUT on Primary Key is an idempotent upsert
        const pk = encodeURIComponent(String(row.id));
        const copy = { ...row };
        delete copy.id;

        const putRes = await fetch(
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

        if (putRes.ok) {
          inserted++;
        } else {
          // Fallback to POST on table root
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

      return res.json({ success: true, count: inserted });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Astra upsert failed' });
    }
  });

  // PATCH / Update row by primary key id
  app.patch('/api/astra/table/:table/:id', async (req, res) => {
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured) {
      return res.status(400).json({ error: 'Astra DB not configured' });
    }
    const { table, id } = req.params;
    const payload = { ...req.body };
    delete payload.id;

    try {
      const response = await fetch(
        `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
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
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Astra PATCH failed' });
    }
  });

  // DELETE row by primary key id
  app.delete('/api/astra/table/:table/:id', async (req, res) => {
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured) {
      return res.status(400).json({ error: 'Astra DB not configured' });
    }
    const { table, id } = req.params;

    try {
      const response = await fetch(
        `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
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
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Astra DELETE failed' });
    }
  });

  // ============================================================================
  // TEKILAB LIMS MODULAR SAAS, 5-MINUTE RAPID WORKFLOW & AI ANOMALY ROUTES
  // ============================================================================

  // Helper to optionally mirror a row into DataStax Astra DB when configured
  async function mirrorRowToAstra(req: express.Request, table: string, row: Record<string, any>) {
    if (previewMode) return false;
    const creds = resolveAstraCredentials(req);
    if (!creds.isConfigured || !row.id) return false;
    try {
      const pk = encodeURIComponent(String(row.id));
      const copy = { ...row };
      delete copy.id;
      const putRes = await fetch(
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
      return putRes.ok;
    } catch {
      return false;
    }
  }

  // A. Tenant Modular Feature Configuration ("Mute" Architecture API)
  app.get('/api/lims/tenant-config/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId || '').trim().slice(0, 80);
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const existing = tenantConfigStore.get(tenantId);
    if (existing) {
      return res.json({ config: existing });
    }

    // Attempt read from Astra DB if configured
    const creds = resolveAstraCredentials(req);
    if (creds.isConfigured) {
      try {
        const astraRes = await fetch(
          `${creds.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(creds.keyspace)}/tenant_configurations/${encodeURIComponent(tenantId)}`,
          {
            method: 'GET',
            headers: { 'X-Cassandra-Token': creds.token, Accept: 'application/json' }
          }
        );
        if (astraRes.ok) {
          const json: any = await astraRes.json();
          const row = Array.isArray(json?.data) ? json.data[0] : null;
          if (row) {
            const hydrated = {
              tenantId: row.tenant_id || tenantId,
              tenantSlug: row.tenant_slug || 'tekilab-diagnostics',
              facilityName: row.facility_name || 'TekiLab Diagnostics Centre',
              subscriptionTier: row.subscription_tier || 'lims_core',
              modules: row.modules_json ? JSON.parse(row.modules_json) : { lims: true, emr: false, hospital_management: false, pharmacy: false, billing: false, ai_analytics: true },
              slaConfig: row.sla_config_json ? JSON.parse(row.sla_config_json) : { rapidTurnaroundTargetMinutes: 5, maxSlaMinutes: 10, autoAiAnomalyCheck: true, requirePathologistSignoffOnCritical: true },
              whatsappDispatch: row.whatsapp_dispatch_json ? JSON.parse(row.whatsapp_dispatch_json) : { enabled: true, senderName: 'TekiLab Diagnostics', includeQrVerification: true, autoAttachPdf: true },
              instrumentHub: row.instrument_hub_json ? JSON.parse(row.instrument_hub_json) : { webhookEnabled: true, allowedInstruments: ['SYS-XN550-01', 'ROCHE-C311-02'] },
              updatedBy: row.updated_by,
              updatedAt: row.updated_at || new Date().toISOString()
            };
            tenantConfigStore.set(tenantId, hydrated);
            return res.json({ config: hydrated });
          }
        }
      } catch {
        // Fall through to null so client uses its LIMS-core default
      }
    }

    return res.json({ config: null });
  });

  app.put('/api/lims/tenant-config/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId || '').trim().slice(0, 80);
    const body = req.body || {};
    if (!tenantId || typeof body !== 'object') {
      return res.status(400).json({ error: 'Valid tenantId and configuration payload are required.' });
    }

    const rawModules = body.modules || {};
    const sanitizedConfig = {
      tenantId,
      tenantSlug: String(body.tenantSlug || 'tekilab-diagnostics').slice(0, 80),
      facilityName: String(body.facilityName || 'TekiLab Diagnostics Centre').slice(0, 140),
      subscriptionTier: ['lims_core', 'lims_pharmacy', 'lims_emr', 'hospital_full'].includes(body.subscriptionTier)
        ? body.subscriptionTier
        : 'lims_core',
      modules: {
        lims: true, // Primary LIMS Core is never muted
        emr: Boolean(rawModules.emr),
        hospital_management: Boolean(rawModules.hospital_management),
        pharmacy: Boolean(rawModules.pharmacy),
        billing: Boolean(rawModules.billing),
        ai_analytics: rawModules.ai_analytics !== undefined ? Boolean(rawModules.ai_analytics) : true
      },
      slaConfig: {
        rapidTurnaroundTargetMinutes: Math.max(1, Math.min(60, Number(body.slaConfig?.rapidTurnaroundTargetMinutes) || 5)),
        maxSlaMinutes: Math.max(5, Math.min(120, Number(body.slaConfig?.maxSlaMinutes) || 10)),
        autoAiAnomalyCheck: body.slaConfig?.autoAiAnomalyCheck !== false,
        requirePathologistSignoffOnCritical: body.slaConfig?.requirePathologistSignoffOnCritical !== false
      },
      whatsappDispatch: {
        enabled: body.whatsappDispatch?.enabled !== false,
        senderName: String(body.whatsappDispatch?.senderName || 'TekiLab Diagnostics').slice(0, 100),
        includeQrVerification: body.whatsappDispatch?.includeQrVerification !== false,
        autoAttachPdf: body.whatsappDispatch?.autoAttachPdf !== false
      },
      instrumentHub: {
        webhookEnabled: body.instrumentHub?.webhookEnabled !== false,
        allowedInstruments: Array.isArray(body.instrumentHub?.allowedInstruments)
          ? body.instrumentHub.allowedInstruments.slice(0, 30).map((s: any) => String(s).slice(0, 60))
          : ['SYS-XN550-01', 'ROCHE-C311-02', 'MINDRAY-BC5000']
      },
      updatedBy: String(body.updatedBy || 'Facility Admin').slice(0, 80),
      updatedAt: new Date().toISOString()
    };

    tenantConfigStore.set(tenantId, sanitizedConfig);

    await mirrorRowToAstra(req, 'tenant_configurations', {
      id: tenantId,
      tenant_id: tenantId,
      tenant_slug: sanitizedConfig.tenantSlug,
      facility_name: sanitizedConfig.facilityName,
      subscription_tier: sanitizedConfig.subscriptionTier,
      modules_json: JSON.stringify(sanitizedConfig.modules),
      sla_config_json: JSON.stringify(sanitizedConfig.slaConfig),
      whatsapp_dispatch_json: JSON.stringify(sanitizedConfig.whatsappDispatch),
      instrument_hub_json: JSON.stringify(sanitizedConfig.instrumentHub),
      updated_by: sanitizedConfig.updatedBy,
      updated_at: sanitizedConfig.updatedAt
    });

    return res.json({ success: true, config: sanitizedConfig });
  });

  // B. 5-Minute Rapid Result Console: Server-Side Gemini AI Anomaly Check & Drug Suggestion
  app.post('/api/lims/rapid-result/analyze', async (req, res) => {
    try {
      const { accessionNumber, testName, sampleType, patient, parameters } = req.body || {};

      if (!testName || typeof testName !== 'string') {
        return res.status(400).json({ error: 'testName is required.' });
      }
      if (!Array.isArray(parameters) || parameters.length === 0 || parameters.length > 40) {
        return res.status(400).json({ error: 'parameters must be a non-empty array (max 40 entries).' });
      }

      const cleanParams = parameters.map((p: any) => ({
        name: String(p?.name || '').slice(0, 100),
        value: String(p?.value || '').slice(0, 80),
        unit: String(p?.unit || '').slice(0, 40),
        referenceRange: String(p?.referenceRange || '').slice(0, 80),
        flag: String(p?.flag || 'Normal').slice(0, 30)
      }));

      const patientContext = {
        ageYears: patient?.ageYears ?? 'Unknown',
        sex: String(patient?.sex || 'Unknown').slice(0, 20),
        allergies: Array.isArray(patient?.allergies) ? patient.allergies.slice(0, 15).map(String) : [],
        chronicConditions: Array.isArray(patient?.chronicConditions) ? patient.chronicConditions.slice(0, 15).map(String) : []
      };

      const hasGeminiKey = !previewMode && Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

      if (cleanParams.some((p: any) => !p.name.trim() || !p.value.trim())) return res.status(400).json({ error: 'Every measured parameter is required.' });
      if (!hasGeminiKey) return res.json({ success: true, analysis: buildMeasuredReview(cleanParams) });

      const ai = getGeminiClient();
      const prompt = [
        'You are a clinical pathology AI validation engine inside TekiLab LIMS.',
        'Evaluate the laboratory test measurements against the biological reference intervals and patient baseline.',
        '1. Identify any abnormal, critical, or anomalous results.',
        '2. Provide a concise diagnostic impression and pathologist-ready clinical summary.',
        '3. Recommend a first-line evidence-based medication option for Pharmacy review (respecting listed patient allergies), or set drugName to "None Required" if results are completely normal.',
        '',
        `Accession Number: ${String(accessionNumber || 'N/A').slice(0, 50)}`,
        `Test Panel: ${testName.slice(0, 140)}`,
        `Sample Type: ${String(sampleType || 'Venous Blood').slice(0, 60)}`,
        `Patient Profile: ${JSON.stringify(patientContext)}`,
        `Measured Parameters: ${JSON.stringify(cleanParams)}`
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an ISO-15189 clinical pathology validation assistant. Return strictly valid JSON matching the schema. Keep notes crisp, objective, and clinically precise.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              anomalyDetected: { type: Type.BOOLEAN },
              severity: { type: Type.STRING, description: 'One of: normal, attention, critical' },
              likelyDiagnosis: { type: Type.STRING },
              clinicalSummary: { type: Type.STRING },
              flaggedParameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    parameter: { type: Type.STRING },
                    value: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    deviation: { type: Type.STRING },
                    clinicalNote: { type: Type.STRING }
                  },
                  required: ['parameter', 'value', 'referenceRange', 'deviation', 'clinicalNote']
                }
              },
              aiSuggestedDrug: {
                type: Type.OBJECT,
                properties: {
                  drugName: { type: Type.STRING },
                  genericName: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  durationDays: { type: Type.INTEGER },
                  quantity: { type: Type.INTEGER },
                  rationale: { type: Type.STRING },
                  contraindicationCheck: { type: Type.STRING }
                },
                required: [
                  'drugName',
                  'genericName',
                  'dosage',
                  'frequency',
                  'durationDays',
                  'quantity',
                  'rationale',
                  'contraindicationCheck'
                ]
              }
            },
            required: [
              'anomalyDetected',
              'severity',
              'likelyDiagnosis',
              'clinicalSummary',
              'flaggedParameters',
              'aiSuggestedDrug'
            ]
          }
        }
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Gemini AI returned an empty response.' });
      }

      const parsed = JSON.parse(rawText);
      const normalizedSeverity = ['normal', 'attention', 'critical'].includes(
        String(parsed.severity || '').toLowerCase()
      )
        ? String(parsed.severity).toLowerCase()
        : parsed.anomalyDetected
          ? 'attention'
          : 'normal';

      const suggestedDrug =
        parsed.aiSuggestedDrug &&
        parsed.aiSuggestedDrug.drugName &&
        parsed.aiSuggestedDrug.drugName.toLowerCase() !== 'none required'
          ? parsed.aiSuggestedDrug
          : null;

      return res.json({
        success: true,
        analysis: {
          anomalyDetected: Boolean(parsed.anomalyDetected),
          severity: normalizedSeverity,
          likelyDiagnosis: String(parsed.likelyDiagnosis || 'Unremarkable Diagnostic Panel'),
          clinicalSummary: String(parsed.clinicalSummary || 'All parameters evaluated against reference intervals.'),
          flaggedParameters: Array.isArray(parsed.flaggedParameters) ? parsed.flaggedParameters : [],
          aiSuggestedDrug: suggestedDrug,
          checkedAt: new Date().toISOString(),
          model: 'gemini-4-hydrogen'
        }
      });
    } catch (err: any) {
      console.error('[TekiLab AI Anomaly Check Error]:', err?.message || err);
      const status = String(err?.message || '').includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: err?.message || 'Failed to run Gemini AI anomaly check.'
      });
    }
  });

  // C. 5-Minute Rapid Result Console: Instant Validate, Persist & WhatsApp PDF Dispatch
  app.post('/api/lims/rapid-result/dispatch', async (req, res) => {
    if(!previewMode)return res.status(503).json({error:'Configure trusted clinical authentication before releasing results.'});
    try {
      const body = req.body || {};
      const invalid = validateDispatch(body);
      if (invalid) return res.status(400).json({ error: invalid });
      let reviewed: any;
      try { reviewed = JSON.parse(body.reportApproval.reportSnapshot); } catch { return res.status(400).json({ error: 'Invalid approval snapshot.' }); }
      if (createHash('sha256').update(body.reportApproval.reportSnapshot).digest('hex') !== body.reportApproval.reportDigest ||
          reviewed.sampleUid !== body.accessionNumber || reviewed.selectedPatientId !== body.patientId || reviewed.patientName !== body.patientName ||
          reviewed.patientPhone !== body.patientPhone || JSON.stringify(reviewed.parameters) !== JSON.stringify(body.parameters) ||
          reviewed.approvalNotes !== body.clinicalInterpretation || reviewed.custodyVerified !== true ||
          JSON.stringify(reviewed.aiReport) !== JSON.stringify(body.aiAnomalyReport)) return res.status(409).json({ error: 'Report changed after approval. Review and sign again.' });
      const duplicate = Array.from(labResultsStore.values()).find((r: any) => r.tenantId === body.tenantId && r.accessionNumber === body.accessionNumber);
      if (duplicate) return res.json({ success: true, record: duplicate, pdfReportNumber: duplicate.whatsappDispatch.pdfReportNumber, whatsappUrl: duplicate.whatsappDispatch.whatsappUrl, slaMet: duplicate.whatsappDispatch.slaMet });
      const {
        tenantId = 'tenant-tekilab-01',
        accessionNumber,
        sampleBarcode,
        patientId,
        patientName,
        patientMrn,
        patientPhone,
        testName,
        category = 'Clinical Diagnostics',
        sampleType = 'Venous Blood',
        intakeSource = 'barcode_scan',
        instrumentId,
        parameters = [],
        aiAnomalyReport,
        validatedBy,
        turnaroundSeconds = 180
      } = body;

      if (!accessionNumber || !patientName || !testName) {
        return res.status(400).json({ error: 'accessionNumber, patientName, and testName are required.' });
      }

      // Normalize & auto-qualify Nigerian +234 WhatsApp phone numbers
      let digits = String(patientPhone || '').replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 11) {
        digits = '234' + digits.slice(1);
      } else if (digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
        digits = '234' + digits;
      }

      const isNigerian234 = digits.startsWith('234') && digits.length === 13;
      const isValidNigerianMobile = isNigerian234 && /^234(70|80|81|90|91)\d{8}$/.test(digits);
      // Flag obviously unregistered / landline / test non-WA numbers (e.g. ending in 0000 or non-mobile)
      const isWhatsAppRegistered =
        isValidNigerianMobile && !digits.endsWith('000000');
      const whatsappWarning = isValidNigerianMobile
        ? null
        : 'A valid mobile number is required to prepare a WhatsApp link. Delivery and account registration have not been checked.';


      const pdfReportNumber = `TLAB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const safeTurnaround = Math.max(1, Math.min(36000, Number(turnaroundSeconds) || 180));
      const slaMet = safeTurnaround <= 600; // Sub-10-minute SLA
      const dispatchedAt = new Date().toISOString();

      const summaryLines = (Array.isArray(parameters) ? parameters : [])
        .slice(0, 8)
        .map((p: any) => `• ${p.name}: ${p.value} ${p.unit || ''} (${p.flag || 'Normal'})`)
        .join('\n');

      const waMessage = 'Your laboratory report is ready. Please contact your diagnostic centre to receive it securely.';
      const whatsappUrl = isValidNigerianMobile ? `https://wa.me/${digits}?text=${encodeURIComponent(waMessage)}` : '';

      const recordId = `lres-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const record = {
        id: recordId,
        tenantId: String(tenantId),
        accessionNumber: String(accessionNumber),
        sampleBarcode: String(sampleBarcode || accessionNumber),
        patientId: String(patientId || 'walk-in'),
        patientName: String(patientName),
        patientMrn: String(patientMrn || 'N/A'),
        patientPhone: `+${digits}`,
        testName: String(testName),
        category: String(category),
        sampleType: String(sampleType),
        intakeSource,
        instrumentId: instrumentId ? String(instrumentId) : undefined,
        status: 'READY_FOR_DELIVERY',
        reportApproval: body.reportApproval,
        clinicalInterpretation: body.clinicalInterpretation,
        parameters,
        aiAnomalyReport,
        whatsappDispatch: {
          dispatched: false,
          recipientPhone: `+${digits}`,
          pdfReportNumber,
          dispatchedAt,
          whatsappUrl,
          turnaroundSeconds: safeTurnaround,
          slaMet
        },
        validatedBy: String(validatedBy),
        validatedAt: dispatchedAt,
        createdAt: dispatchedAt
      };

      labResultsStore.set(recordId, record);

      await mirrorRowToAstra(req, 'lab_results', {
        id: recordId,
        tenant_id: record.tenantId,
        accession_number: record.accessionNumber,
        sample_barcode: record.sampleBarcode,
        patient_id: record.patientId,
        patient_name: record.patientName,
        patient_mrn: record.patientMrn,
        patient_phone: record.patientPhone,
        test_name: record.testName,
        category: record.category,
        sample_type: record.sampleType,
        intake_source: record.intakeSource,
        instrument_id: record.instrumentId || '',
        status: record.status,
        anomaly_severity: aiAnomalyReport?.severity || 'normal',
        parameters_json: JSON.stringify(parameters),
        ai_anomaly_report_json: JSON.stringify(aiAnomalyReport || null),
        ai_suggested_drug_json: JSON.stringify(aiAnomalyReport?.aiSuggestedDrug || null),
        whatsapp_dispatch_json: JSON.stringify(record.whatsappDispatch),
        pharmacy_handoff_json: JSON.stringify(null),
        turnaround_seconds: safeTurnaround,
        validated_by: record.validatedBy,
        validated_at: dispatchedAt,
        created_at: dispatchedAt
      });

      return res.json({
        success: true,
        record,
        pdfReportNumber,
        whatsappUrl,
        whatsappQualified: isNigerian234,
        whatsappRegistered: null,
        whatsappWarning,
        slaMet
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Rapid result dispatch failed.' });
    }
  });

  // D. Diagnostic Instrument API Hub (Webhook Intake & Pull Inbox)
  app.post('/api/lims/instruments/webhook', (req, res) => {
    const configuredSecret = process.env.TEKILAB_INSTRUMENT_WEBHOOK_SECRET;
    if (!previewMode && !configuredSecret) return res.status(503).json({ error: 'Instrument webhook authentication is not configured.' });
    if (configuredSecret) {
      const provided = String(req.headers['x-tekilab-webhook-secret'] || '');
      if (provided !== configuredSecret) {
        return res.status(401).json({ error: 'Invalid instrument webhook secret.' });
      }
    }

    const { instrumentId, instrumentModel, accessionNumber, sampleBarcode, patientName, testName, parameters } =
      req.body || {};

    if (!instrumentId || !accessionNumber || !testName || !Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        error: 'instrumentId, accessionNumber, testName, and non-empty parameters[] are required.'
      });
    }

    const packet = {
      packetId: `INST-PKT-${Date.now().toString(36).toUpperCase()}`,
      instrumentId: String(instrumentId).slice(0, 60),
      instrumentModel: String(instrumentModel || 'Automated Diagnostic Analyzer').slice(0, 100),
      accessionNumber: String(accessionNumber).slice(0, 60),
      sampleBarcode: String(sampleBarcode || accessionNumber).slice(0, 60),
      patientName: patientName ? String(patientName).slice(0, 120) : undefined,
      testName: String(testName).slice(0, 140),
      parameters: parameters.slice(0, 40).map((p: any) => ({
        name: String(p?.name || 'Analyte').slice(0, 100),
        value: String(p?.value ?? '').slice(0, 80),
        unit: String(p?.unit || '').slice(0, 40),
        referenceRange: String(p?.referenceRange || 'N/A').slice(0, 80),
        flag: ['Normal', 'High', 'Low', 'Critical', 'Positive', 'Negative'].includes(p?.flag)
          ? p.flag
          : 'Normal'
      })),
      receivedAt: new Date().toISOString(),
      consumed: false
    };

    instrumentWebhookInbox.unshift(packet);
    if (instrumentWebhookInbox.length > 50) instrumentWebhookInbox.pop();

    return res.status(201).json({ success: true, packet });
  });

  app.get('/api/lims/instruments/inbox', (_req, res) => {
    return res.json({ packets: instrumentWebhookInbox });
  });

  // E. Cross-Module Handoff: Validated Lab Result -> Pharmacy Prescription Queue
  app.post('/api/lims/handoff/pharmacy', async (req, res) => {
    const { payload, pharmacyEnabled } = req.body || {};
    if (!payload || !payload.patientId || !payload.aiSuggestedDrug?.drugName) {
      return res.status(400).json({ error: 'Valid handoff payload with patientId and aiSuggestedDrug is required.' });
    }

    if (payload.source !== 'CLINICIAN_PRESCRIPTION' || !payload.prescriberId || !payload.prescriberName || !payload.prescribedAt) return res.status(400).json({ error: 'A clinician-approved prescription is required. AI suggestions cannot be dispensed.' });
    const tenantId = String(payload.tenantId || '');
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required.' });
    const existing = pharmacyHandoffQueueStore.find(i => i.handoffId === payload.handoffId && i.tenantId === tenantId);
    if (existing) return res.json({ success: true, item: existing });
    const storedConfig = tenantConfigStore.get(tenantId);
    const isPharmacyActive = storedConfig ? Boolean(storedConfig.modules?.pharmacy) : Boolean(pharmacyEnabled);

    // Per TekiLab BRD Section 2 & Module 5:
    // Even when Pharmacy UI is muted, the backend hook remains 100% functional
    // and stores a structured e-Prescription / background handoff record.
    const deliveryMode = isPharmacyActive ? 'PHARMACY_POS_QUEUE' : 'BACKGROUND_E_PRESCRIPTION';

    const item = {
      ...payload,
      handoffId: String(payload.handoffId || `RX-LAB-${Date.now().toString(36).toUpperCase()}`),
      deliveryMode,
      status: 'QUEUED',
      createdAt: payload.createdAt || new Date().toISOString()
    };

    pharmacyHandoffQueueStore.unshift(item);

    await mirrorRowToAstra(req, 'pharmacy_handoff_queue', {
      id: item.handoffId,
      handoff_id: item.handoffId,
      tenant_id: tenantId,
      patient_id: String(item.patientId),
      patient_name: String(item.patientName || ''),
      patient_mrn: String(item.patientMrn || ''),
      patient_phone: String(item.patientPhone || ''),
      lab_result_id: String(item.labResultId || ''),
      accession_number: String(item.accessionNumber || ''),
      test_name: String(item.testName || ''),
      test_result_summary: String(item.testResultSummary || ''),
      likely_diagnosis: String(item.likelyDiagnosis || ''),
      anomaly_severity: String(item.anomalySeverity || 'attention'),
      ai_suggested_drug_json: JSON.stringify(item.aiSuggestedDrug),
      validated_by: String(item.validatedBy || ''),
      status: item.status,
      created_at: item.createdAt
    });

    return res.status(201).json({
      success: true,
      item,
      deliveryMode,
      pharmacyUiMuted: !isPharmacyActive
    });
  });

  app.get('/api/lims/handoff/pharmacy', (req, res) => {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : '';
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required.' });
    const filtered = tenantId
      ? pharmacyHandoffQueueStore.filter((i) => i.tenantId === tenantId)
      : pharmacyHandoffQueueStore;
    return res.json({ queue: filtered });
  });

  app.patch('/api/lims/handoff/pharmacy/:handoffId', (req, res) => {
    const handoffId = String(req.params.handoffId || '');
    const status = String(req.body?.status || '');
    if (!['QUEUED', 'LOADED_IN_POS', 'DISPENSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
      const tenantId = String(req.body?.tenantId || '');
      if (!tenantId) return res.status(400).json({ error: 'tenantId is required.' });
      const target = pharmacyHandoffQueueStore.find((i) => i.handoffId === handoffId && i.tenantId === tenantId);
      if (!target) return res.status(404).json({ error: 'Handoff not found for this tenant.' });
      const allowed: Record<string, string[]> = { QUEUED: ['LOADED_IN_POS'], LOADED_IN_POS: ['DISPENSED'], DISPENSED: [] };
      if (target.status !== status && !allowed[target.status]?.includes(status)) return res.status(409).json({ error: 'Invalid pharmacy transition.' });
    if (target) {
      target.status = status;
    }
    return res.json({ success: true, handoffId, status });
  });

  // F. TekiLab Conversational AI Assistant (Protocols & Patient History Lookup)
  app.post('/api/lims/ai-assistant', async (req, res) => {
    if (previewMode) return res.json({ answer: 'Local preview: external AI is disabled. Use measured-result review and obtain professional clinical review.', source: 'local-preview' });
    try {
      const { mode = 'protocol', query, patientContext, labHistory } = req.body || {};
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter a clinical or protocol query.' });
      }

      const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
      if (!hasGeminiKey) {
        return res.json({
          success: true,
          answer: `**TekiLab SOP Protocol Guidance (${String(mode)})**\n\nQuery: "${query.trim()}"\n\n- **Specimen Handling:** Verify sample UID (\`TK-YYYY-XXXXX\`) and tube integrity before loading onto analyzer.\n- **Rapid TAT Target:** Complete accessioning, analysis, and AI verification within 5–10 minutes.\n- **Critical Values:** Any Panic High/Low reading requires immediate Pathologist sign-off and clinician notification.\n\n*(Tip: Add \`GEMINI_API_KEY\` to \`.env\` for full conversational Gemini AI responses.)*`,
          model: 'tekilab-protocol-offline-v1',
          timestamp: new Date().toISOString()
        });
      }

      const ai = getGeminiClient();
      const contents = [
        `Mode: ${String(mode).slice(0, 40)}`,
        `Query: ${query.trim().slice(0, 1200)}`,
        patientContext ? `Patient Context: ${JSON.stringify(patientContext).slice(0, 2500)}` : '',
        labHistory ? `Recent Lab History: ${JSON.stringify(labHistory).slice(0, 2500)}` : ''
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction:
            'You are the TekiLab LIMS Clinical & Protocol Assistant. Help medical laboratory scientists look up SOP test protocols, sample collection requirements, reference intervals, analyzer troubleshooting, and patient longitudinal diagnostic summaries. Keep answers structured, concise, and clinically accurate.'
        }
      });

      return res.json({
        success: true,
        answer: response.text || 'No response generated.',
        model: 'gemini-4-hydrogen',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      const status = String(err?.message || '').includes('GEMINI_API_KEY') ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: err?.message || 'TekiLab AI Assistant request failed.'
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configLoader: 'native',
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, previewMode ? '127.0.0.1' : '0.0.0.0', () => {
    console.log(`[TekiLab LIMS Server] Listening on http://${previewMode ? 'localhost' : '0.0.0.0'}:${PORT} (${previewMode ? 'local preview; Astra and external AI disabled' : 'server mode'})`);
  });
}

startServer();
