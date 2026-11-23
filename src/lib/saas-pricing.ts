import { SubscriptionPlanId, SubscriptionDurationMonths, ServiceBreakdownItem } from '../types/pharmacy';

export interface SaaSPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  audience: string;
  monthlyRateNaira: number;
  maxBranches: number;
  branchRangeLabel: string;
  popular?: boolean;
  features: string[];
  servicesBreakdown: ServiceBreakdownItem[];
}

export interface DurationConfig {
  months: SubscriptionDurationMonths;
  label: string;
  shortLabel: string;
  discountPercent: number;
  discountPercentage: number;
  badgeText: string;
}

export const TEKIMED_DURATIONS: DurationConfig[] = [
  {
    months: 1,
    label: '1 Month (Includes 30-Day Free Trial)',
    shortLabel: '1 Month (30-Day Trial)',
    discountPercent: 0,
    discountPercentage: 0,
    badgeText: '30-Day Free Trial'
  },
  {
    months: 6,
    label: '6 Months Commitment',
    shortLabel: '6 Months',
    discountPercent: 3,
    discountPercentage: 3,
    badgeText: '3% Discount'
  },
  {
    months: 12,
    label: '1 Year (12 Months Annual)',
    shortLabel: '1 Year',
    discountPercent: 5,
    discountPercentage: 5,
    badgeText: '5% Annual Savings'
  },
  {
    months: 24,
    label: '2 Years (24 Months Biennial)',
    shortLabel: '2 Years',
    discountPercent: 8,
    discountPercentage: 8,
    badgeText: '8% Biennial Savings'
  },
  {
    months: 36,
    label: '3 Years (36 Months Enterprise)',
    shortLabel: '3 Years',
    discountPercent: 10,
    discountPercentage: 10,
    badgeText: '10% Max Savings'
  }
];

export const TEKIPHARM_DURATIONS = TEKIMED_DURATIONS;
export const SUBSCRIPTION_DURATIONS = TEKIMED_DURATIONS;

export const TEKIMED_PLANS: SaaSPlanConfig[] = [
  {
    id: 'pharmacy_solo',
    name: 'TekiMed Pharmacy Solo',
    tagline: 'Autonomous POS, Inventory & Prescription Receiving for Standalone Pharmacies',
    audience: 'For retail pharmacies, community chemists & dispensaries',
    monthlyRateNaira: 10000,
    maxBranches: 1,
    branchRangeLabel: '1 Pharmacy Terminal + Central Store',
    features: [
      '30-Day Free Trial (Zero Setup Fee)',
      'Autonomous Offline-First POS & High-Speed Checkout',
      'Multi-Batch Inventory, Barcode Scanner & FEFO Expiry Alerts',
      'Doctor Electronic Prescription (e-Rx) Receiving Queue',
      'Customer Credit (Debtors Ledger) & Installment Recovery',
      'Daily Operational Expense & Profit Margin Reports',
      'Wholesale Supplier Orders & Goods Intake Ledger',
      'Dedicated Web Portal (tekimed.com/your-pharmacy)'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Core POS & Autonomous Offline Terminal Engine',
        monthlyAllocationNaira: 3500,
        allocatedAmountNaira: 3500,
        allocationPercent: 35,
        description: 'High-speed point-of-sale checkout, split payments, branded PDF receipts, and offline sales queue sync.'
      },
      {
        serviceName: 'Multi-Batch Pharmaceutical Inventory & Expiry Control',
        monthlyAllocationNaira: 2500,
        allocatedAmountNaira: 2500,
        allocationPercent: 25,
        description: 'Batch tracking, pack/sachet/tablet unit conversion, barcode scanning, and automated reorder alerts.'
      },
      {
        serviceName: 'Financials, Expenses, Suppliers & Debtors (Owing) Ledger',
        monthlyAllocationNaira: 2000,
        allocatedAmountNaira: 2000,
        allocationPercent: 20,
        description: 'Credit sales tracking, installment debt recovery, supplier procurement, and daily expense logs.'
      },
      {
        serviceName: 'e-Rx Queue Receiving & Cloud Sync',
        monthlyAllocationNaira: 2000,
        allocatedAmountNaira: 2000,
        allocationPercent: 20,
        description: 'Receive direct e-prescriptions from doctor encounters with DataStax Astra cloud backup.'
      }
    ]
  },
  {
    id: 'diagnostics_suite',
    name: 'TekiMed Diagnostics & Lab Suite',
    tagline: 'Complete LIMS, Sample Accessioning, Radiology Reports & Diagnostic Billing',
    audience: 'For independent medical diagnostic labs, pathology & imaging centres',
    monthlyRateNaira: 20000,
    maxBranches: 2,
    branchRangeLabel: 'Up to 2 Diagnostic Hubs / Collection Centres',
    popular: true,
    features: [
      '30-Day Free Trial (Zero Setup Fee)',
      'Laboratory LIMS with Sample Accessioning & Barcoding',
      'Auto-Flagging Biological Reference Ranges (Low/Normal/Critical)',
      'Scientist Validation Workflow & QR-Verified PDF Lab Reports',
      'Radiology & Medical Imaging Module (X-Ray, Ultrasound, CT, MRI)',
      'Structured Radiologist Impression & Findings Generator',
      'Integrated Diagnostic Charge Capture & HMO Co-Pay Billing',
      'Reagent Inventory & Pharmacy Dispensary Link'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Laboratory LIMS & Specimen Accessioning Engine',
        monthlyAllocationNaira: 8000,
        allocatedAmountNaira: 8000,
        allocationPercent: 40,
        description: 'Barcode accessioning, sample lifecycle (collected, processing, validated), and reference interval auto-flags.'
      },
      {
        serviceName: 'Radiology & Medical Diagnostic Imaging Reporting',
        monthlyAllocationNaira: 5000,
        allocatedAmountNaira: 5000,
        allocationPercent: 25,
        description: 'Modality worklists, radiologist findings & impressions, DICOM-ready PACS records, and branded PDF exports.'
      },
      {
        serviceName: 'Diagnostic Revenue Cycle, HMO Billing & Reagents',
        monthlyAllocationNaira: 4000,
        allocatedAmountNaira: 4000,
        allocationPercent: 20,
        description: 'Patient test charge capture, insurance pre-authorization, lab cashier receipts, and reagent stock audits.'
      },
      {
        serviceName: 'QR Verification Digital Portal & Cloud Sync',
        monthlyAllocationNaira: 3000,
        allocatedAmountNaira: 3000,
        allocationPercent: 15,
        description: 'Instant tamper-proof online report validation via QR codes and DataStax Astra DB storage.'
      }
    ]
  },
  {
    id: 'clinic_opd',
    name: 'TekiMed Clinic & Specialist Practice',
    tagline: 'Longitudinal Patient EMR, Doctor Consultation, Triage & HMO Claims',
    audience: 'For outpatient clinics, specialist practices, maternity & dental centres',
    monthlyRateNaira: 30000,
    maxBranches: 3,
    branchRangeLabel: 'Up to 3 Consultation Suites / Clinic Locations',
    features: [
      '30-Day Free Trial (Zero Setup Fee)',
      'Patient Master Index (MRN, Demographics, Vitals Timeline)',
      'Doctor Consultation Room with ICD-10 Diagnosis Selector',
      'Direct Doctor e-Prescriptions linked to Live Pharmacy Stock',
      '1-Click Investigation Orders (Lab Tests & Radiology Scans)',
      'Appointment Scheduling & Doctor Availability Roster',
      'NHIS / Private HMO Insurance Claims & Co-Pay Calculator',
      'AI Clinical Assistant for Medical Record Summaries'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Electronic Medical Record (EMR) & Patient Dossier',
        monthlyAllocationNaira: 10000,
        allocatedAmountNaira: 10000,
        allocationPercent: 33.3,
        description: 'Comprehensive longitudinal health records, allergy flags, vitals trending, and clinical history.'
      },
      {
        serviceName: 'Doctor Consultation Suite & e-Prescription Engine',
        monthlyAllocationNaira: 9000,
        allocatedAmountNaira: 9000,
        allocationPercent: 30,
        description: 'SOAP clinical notes, ICD-10 diagnosis picker, live pharmacy stock check, and instant lab orders.'
      },
      {
        serviceName: 'Appointments, Triage Station & Queue Engine',
        monthlyAllocationNaira: 6000,
        allocatedAmountNaira: 6000,
        allocationPercent: 20,
        description: 'Doctor slot calendar, nurse triage vitals station, and patient waiting room routing.'
      },
      {
        serviceName: 'HMO Insurance Claims Adjudication & AI Co-Pilot',
        monthlyAllocationNaira: 5000,
        allocatedAmountNaira: 5000,
        allocationPercent: 16.7,
        description: 'HMO tariff sheets, automated claim submission, and AI-assisted clinical summarization.'
      }
    ]
  },
  {
    id: 'hospital_ultimate',
    name: 'TekiMed Hospital OS Ultimate',
    tagline: 'Complete Integrated Hospital Health Operating System (All Modules Included)',
    audience: 'For general hospitals, surgical centres, multi-specialty medical complexes',
    monthlyRateNaira: 50000,
    maxBranches: 10,
    branchRangeLabel: 'Full Hospital Complex (Up to 10 Departments & Branches)',
    popular: true,
    features: [
      '30-Day Free Trial (Zero Setup Fee)',
      'ALL MODULES INCLUDED: Clinical EMR, LIMS, Radiology, Pharmacy & Wards',
      'Inpatient Ward & Bed Occupancy Board with Admission / Discharge / Transfer (ADT)',
      'Nurse Station Kardex & Medication Administration Record (MAR)',
      'Live Hospital Waiting Room TV Display Mode & Calling Chime Engine',
      'Full Pharmacy Inventory, Batch Tracking & Central Warehouse Depot',
      'Unified Charge Capture across OPD, IPD, Lab, Rad, Theatre & Pharmacy',
      'Universal HMO Claims Adjudication, NHIS Tariff Matrix & Debtor Ledgers',
      'AI Healthcare Co-Pilot for Clinical Notes, Interactions & Differential Diagnosis',
      'Multi-Department Audit Trails & NDPA Healthcare Data Compliance'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Inpatient Ward Management, Bed Grid & Nurse MAR Station',
        monthlyAllocationNaira: 15000,
        allocatedAmountNaira: 15000,
        allocationPercent: 30,
        description: 'Ward bed availability visualizer, ADT workflows, nursing shift handovers, and medication administration tracking.'
      },
      {
        serviceName: 'Full Clinical EMR, OPD Consultation & Specialty Departments',
        monthlyAllocationNaira: 13000,
        allocatedAmountNaira: 13000,
        allocationPercent: 26,
        description: 'Doctor consultation suites, clinical decision support, e-Prescriptions, and patient master records.'
      },
      {
        serviceName: 'Diagnostic LIMS Laboratory & Radiology PACS Workflow',
        monthlyAllocationNaira: 11000,
        allocatedAmountNaira: 11000,
        allocationPercent: 22,
        description: 'Full laboratory specimen lifecycle, modality worklists, and branded PDF diagnostic reports.'
      },
      {
        serviceName: 'Hospital Pharmacy, Revenue Cycle Management & TV Display',
        monthlyAllocationNaira: 11000,
        allocatedAmountNaira: 11000,
        allocationPercent: 22,
        description: 'Central dispensary POS, warehouse logistics, HMO claims adjudication, and waiting room digital display.'
      }
    ]
  },
  {
    id: 'enterprise',
    name: 'TekiMed Enterprise Health Network',
    tagline: 'Multi-Hospital Chains, State Health Networks & Regional Medical Consortiums',
    audience: 'For hospital groups, teaching hospitals, state healthcare boards & HMOs',
    monthlyRateNaira: 150000,
    maxBranches: 999,
    branchRangeLabel: 'Unlimited Facilities, Regional Hubs & Warehouse Depots',
    features: [
      'Custom SLA & 30-Day Pilot Deployment',
      'Unlimited Hospital Facilities, Satellite Clinics & Regional Warehouses',
      'Multi-Hospital Consolidated Business Intelligence & Executive Dashboard',
      'Legacy Hospital EHR / HMIS Database Migration & Custom API Integrations',
      'Dedicated Isolated DataStax Astra DB / Cloud SQL High-Throughput Cluster',
      'Dedicated Account Engineer, On-Site Staff Training & 24/7 SLA Hotline'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Multi-Hospital Enterprise Licensing & Unlimited Terminals',
        monthlyAllocationNaira: 60000,
        allocatedAmountNaira: 60000,
        allocationPercent: 40,
        description: 'Unrestricted facility instances across all clinical, diagnostic, pharmacy, and surgical wards.'
      },
      {
        serviceName: 'Central Regional Supply Chain & B2B Distribution Logistics',
        monthlyAllocationNaira: 35000,
        allocatedAmountNaira: 35000,
        allocationPercent: 23.3,
        description: 'Automated inter-facility replenishment, wholesale vendor purchase orders, and batch tracking.'
      },
      {
        serviceName: 'Executive Business Intelligence, Compliance & FHIR Interoperability',
        monthlyAllocationNaira: 30000,
        allocatedAmountNaira: 30000,
        allocationPercent: 20,
        description: 'Cross-facility analytics, NDPA audit trails, health data exchange APIs, and custom reporting.'
      },
      {
        serviceName: 'Dedicated High-Throughput Cloud Cluster & 24/7 Enterprise SLA',
        monthlyAllocationNaira: 25000,
        allocatedAmountNaira: 25000,
        allocationPercent: 16.7,
        description: 'Dedicated database nodes, custom domain hosting, 99.99% uptime guarantee, and on-site support.'
      }
    ]
  },
  {
    id: 'buy_to_own',
    name: 'TekiMed Perpetual "Buy-to-Own" (On-Premise / Private Cloud)',
    tagline: 'One-Time Outright Purchase — Self-Hosted on Hospital Server or Private Cloud',
    audience: 'For hospitals desiring 100% data sovereignty, zero recurring fees & offline LAN operation',
    monthlyRateNaira: 0,
    maxBranches: 999,
    branchRangeLabel: 'Perpetual License (Hospital Owns Entire Application & Database)',
    features: [
      'One-Time Outright Software Purchase (No Mandatory Recurring Monthly Fees)',
      'Full On-Premise Installation on Hospital Local Area Network (LAN) Server',
      'Optional Private Cloud Deployment (Hospital AWS / Azure / Google Cloud)',
      '100% Data Sovereignty & Complete Hospital Confidentiality',
      'Autonomous Operation with Zero External Internet Dependency',
      '1 Year of Software Maintenance, Security Updates & Technical Support',
      'Full Source Code & Database Schema Documentation Included'
    ],
    servicesBreakdown: [
      {
        serviceName: 'Perpetual Hospital Operating System Core Licensing',
        monthlyAllocationNaira: 0,
        allocatedAmountNaira: 0,
        allocationPercent: 50,
        description: 'Permanent perpetual enterprise license to run TekiMed Health OS across all hospital workstations.'
      },
      {
        serviceName: 'On-Premise Server Setup & LAN Network Deployment',
        monthlyAllocationNaira: 0,
        allocatedAmountNaira: 0,
        allocationPercent: 25,
        description: 'Installation on hospital local server, local database configuration, and workstation terminal links.'
      },
      {
        serviceName: 'Data Migration, Staff Training & Handover Protocol',
        monthlyAllocationNaira: 0,
        allocatedAmountNaira: 0,
        allocationPercent: 25,
        description: 'Migration of existing patient records, comprehensive staff onboarding, and IT administrator training.'
      }
    ]
  }
];

export const TEKIPHARM_PLANS = TEKIMED_PLANS;

export function calculateSubscriptionPricing(
  planId: SubscriptionPlanId,
  durationMonths: SubscriptionDurationMonths
) {
  const plan = TEKIPHARM_PLANS.find(p => p.id === planId) || TEKIPHARM_PLANS[0];
  const duration = TEKIPHARM_DURATIONS.find(d => d.months === durationMonths) || TEKIPHARM_DURATIONS[0];

  const monthlyRate = plan.monthlyRateNaira;
  const subtotal = monthlyRate * duration.months;
  const discountPercent = duration.discountPercent;
  const discountSaved = Math.round((subtotal * discountPercent) / 100);
  const totalPayable = subtotal - discountSaved;
  const effectiveMonthly = Math.round(totalPayable / duration.months);

  const serviceBreakdown = plan.servicesBreakdown.map(s => {
    const rawDurationCost = s.monthlyAllocationNaira * duration.months;
    const discountedDurationCost = Math.round(rawDurationCost * (1 - discountPercent / 100));
    const allocationPercent = Math.round((s.monthlyAllocationNaira / monthlyRate) * 100);
    return {
      ...s,
      rawDurationCost,
      discountedDurationCost,
      allocatedAmountNaira: discountedDurationCost,
      allocationPercent
    };
  });

  return {
    plan,
    duration,
    monthlyRate,
    monthlyRateNaira: monthlyRate,
    subtotal,
    subtotalNaira: subtotal,
    discountPercent,
    discountPercentage: discountPercent,
    discountSaved,
    discountAmountNaira: discountSaved,
    totalPayable,
    totalPayableNaira: totalPayable,
    effectiveMonthly,
    effectiveMonthlyNaira: effectiveMonthly,
    scaledServicesBreakdown: serviceBreakdown,
    serviceBreakdown
  };
}

export const calculateSubscriptionQuote = calculateSubscriptionPricing;

export function slugifyCompanyName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pharmacy'
  );
}

/**
 * Generates a shortened, personalized slug that carries the company's core name first
 * by stripping generic suffixes like "pharmacy", "ltd", "nigeria", "stores", etc.
 */
export function generateShortCompanySlug(companyName: string): string {
  const stopWords = new Set([
    'pharmacy',
    'pharmacies',
    'pharmaceutical',
    'pharmaceuticals',
    'pharma',
    'ltd',
    'limited',
    'plc',
    'inc',
    'llc',
    'nigeria',
    'ng',
    'stores',
    'store',
    'superstore',
    'chemist',
    'chemists',
    'healthcare',
    'medical',
    'medics',
    'enterprise',
    'enterprises',
    'company',
    'group',
    'global',
    'ventures',
    'branch',
    'central',
    'hub',
    'and',
    'the'
  ]);

  const rawTokens = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  if (rawTokens.length === 0) return 'pharmacy';

  // Always keep the first word (the core company name first!)
  const firstWord = rawTokens[0];
  const remaining = rawTokens.slice(1).filter(w => !stopWords.has(w));

  // Keep it ultra-short: company name first (plus at most 1 distinguishing short token if first word is <= 3 chars)
  const shortTokens =
    firstWord.length <= 3 && remaining.length > 0
      ? [firstWord, remaining[0]]
      : [firstWord];

  return shortTokens.join('-').slice(0, 20).replace(/^-+|-+$/g, '') || firstWord;
}

export const sanitizeCompanySlug = slugifyCompanyName;

export const PRODUCTION_DEPLOYED_URL_KEY = 'teki_production_deployed_url';
export const DEFAULT_PRODUCTION_DEPLOYED_URL = 'https://teki-health.vercel.app';

/**
 * Checks if a hostname belongs to an internal preview/sandbox environment
 * (such as AI Studio Cloud Run preview runners, localhost, or dev containers).
 */
export function isSandboxOrAiStudioHost(host?: string): boolean {
  if (!host && typeof window !== 'undefined') {
    host = window.location.hostname;
  }
  if (!host) return false;
  const lower = host.toLowerCase();
  return (
    lower.includes('.run.app') ||
    lower.includes('aistudio') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('webcontainer') ||
    lower.includes('stackblitz') ||
    lower.includes('codesandbox')
  );
}

/**
 * Resolves the primary production deployed URL:
 * 1. Checks user/admin customized deployed URL in localStorage
 * 2. Checks build-time environment variable VITE_DEPLOYED_URL / VITE_PUBLIC_URL
 * 3. If running on a live deployed site (e.g. Vercel, Netlify, custom domain) that is NOT an AI Studio sandbox,
 *    returns the active window.location.origin and automatically syncs it.
 * 4. In sandbox or dev preview, falls back to the production deployed URL (e.g. https://teki-health.vercel.app)
 *    so generated URLs and shared links ALWAYS point to the live deployed application!
 */
export function getProductionDeployedUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTION_DEPLOYED_URL;

  // 1. Check user/admin configured production URL
  try {
    const saved = localStorage.getItem(PRODUCTION_DEPLOYED_URL_KEY);
    if (saved && saved.trim()) {
      const cleanSaved = saved.trim().replace(/\/+$/, '');
      if (cleanSaved.startsWith('http://') || cleanSaved.startsWith('https://')) {
        return cleanSaved;
      }
      return `https://${cleanSaved}`;
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  // 2. Check environment variables
  const envUrl = (import.meta as any).env?.VITE_DEPLOYED_URL || (import.meta as any).env?.VITE_PUBLIC_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. If running on actual live deployment (not AI Studio sandbox or localhost)
  if (window.location?.hostname && !isSandboxOrAiStudioHost(window.location.hostname)) {
    const origin = window.location.origin.replace(/\/+$/, '');
    try {
      localStorage.setItem(PRODUCTION_DEPLOYED_URL_KEY, origin);
    } catch {
      // safe ignore
    }
    return origin;
  }

  // 4. Fallback for AI Studio development/preview sandbox
  return DEFAULT_PRODUCTION_DEPLOYED_URL;
}

/**
 * Returns the hostname/domain of the production deployed site (e.g. teki-health.vercel.app or myhealthhub.com)
 */
export function getProductionDeployedHost(): string {
  const url = getProductionDeployedUrl();
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }
}

/**
 * Saves a new production deployed base URL (e.g. https://my-pharmacy.vercel.app or https://healthhub.ng)
 * and dispatches a broadcast event so all active cards/components update immediately.
 */
export function setProductionDeployedUrl(newUrl: string): string {
  let cleaned = newUrl.trim().replace(/\/+$/, '');
  if (!cleaned) {
    cleaned = DEFAULT_PRODUCTION_DEPLOYED_URL;
  } else if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRODUCTION_DEPLOYED_URL_KEY, cleaned);
      window.dispatchEvent(new CustomEvent('teki_deployed_url_updated', { detail: cleaned }));
    } catch {
      // safe ignore
    }
  }
  return cleaned;
}

/**
 * Returns the shortened display URL carrying the company's short first-name slug
 * using the production deployed domain (or dedicated custom domain if configured).
 * (e.g., your-domain.vercel.app/medplus or custom-domain.com)
 */
export function formatCompanyFirstShortUrl(slug: string, customDomain?: string): string {
  if (customDomain && customDomain.trim()) {
    return customDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }
  const cleanSlug = generateShortCompanySlug(slug);
  const host = getProductionDeployedHost();
  return `${host}/${cleanSlug}`;
}

/**
 * Builds the canonical portal URL for a business/tenant using the original deployed URL
 * (or dedicated business custom domain if assigned). Never uses AI Studio sandbox runner URLs!
 */
export function buildCompanyPortalUrl(slug: string, customDomain?: string): string {
  if (customDomain && customDomain.trim()) {
    const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${cleanDomain}`;
  }
  const cleanSlug = generateShortCompanySlug(slug);
  const baseUrl = getProductionDeployedUrl();
  return `${baseUrl}/${cleanSlug}`;
}

/**
 * Universal fallback URL using query parameter (?c=company) that works reliably across
 * any web host or static deployment without server rewrite configurations.
 */
export function buildUniversalCompanyUrl(slug: string, customDomain?: string): string {
  const cleanSlug = generateShortCompanySlug(slug);
  if (customDomain && customDomain.trim()) {
    const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${cleanDomain}/?c=${cleanSlug}`;
  }
  const baseUrl = getProductionDeployedUrl();
  return `${baseUrl}/?c=${cleanSlug}`;
}

/**
 * Reliably extracts the shortened company slug from the current browser URL:
 * 1. Query params: ?c=medplus, ?company=medplus, ?tenant=medplus
 * 2. Pathname: /medplus (excluding reserved system paths and static files)
 * 3. Hash: #c=medplus or #/medplus (excluding #admin)
 * 4. Custom domain subdomain (excluding shared PaaS domains like .vercel.app and .run.app)
 */
export function detectUrlCompanySlug(): string | null {
  if (typeof window === 'undefined') return null;

  const reserved = new Set([
    'admin',
    'login',
    'signin',
    'signup',
    'register',
    'api',
    'assets',
    'static',
    'public',
    'index.html',
    '404.html',
    'manifest.json',
    'admin-manifest.json',
    'service-worker.js'
  ]);

  // 1. Check query parameters (?c=medplus, ?company=medplus, ?tenant=medplus)
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get('c') || params.get('company') || params.get('tenant');
  if (querySlug && querySlug.trim()) {
    const cleanQ = slugifyCompanyName(querySlug.trim());
    if (cleanQ && !reserved.has(cleanQ)) return cleanQ;
  }

  // 2. Check URL pathname (/medplus)
  const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (rawPath && !rawPath.includes('.') && !rawPath.startsWith('admin/') && ! rawPath.startsWith('api/')) {
    const firstSegment = rawPath.split('/')[0];
    if (firstSegment && !reserved.has(firstSegment)) {
      return firstSegment;
    }
  }

  // 3. Check URL hash (#c=medplus or #/medplus)
  const rawHash = window.location.hash.replace(/^#+/, '').trim().toLowerCase();
  if (rawHash && rawHash !== 'admin' && !rawHash.startsWith('admin')) {
    if (rawHash.startsWith('c=') || rawHash.startsWith('company=')) {
      const hVal = rawHash.split('=')[1];
      if (hVal) return slugifyCompanyName(hVal);
    } else {
      const cleanHash = rawHash.replace(/^\/+|\/+$/g, '');
      if (cleanHash && !cleanHash.includes('/') && !reserved.has(cleanHash)) {
        return slugifyCompanyName(cleanHash);
      }
    }
  }

  // 4. Check true custom domain subdomain (exclude .vercel.app, .run.app, .netlify.app, .pages.dev, etc.)
  const host = window.location.hostname.toLowerCase();
  const isSharedPaaSHost =
    host === 'localhost' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.run.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.onrender.com') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.github.io') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host);

  if (host && !isSharedPaaSHost) {
    const parts = host.split('.');
    if (parts.length >= 3 && !['www', 'app', 'admin', 'portal', 'api'].includes(parts[0])) {
      return slugifyCompanyName(parts[0]);
    }
  }

  return null;
}

/**
 * Matches a Tenant record against a full or shortened company-first URL slug.
 */
export function matchTenantBySlug<T extends { id: string; slug: string; companyName: string }>(
  tenants: T[],
  rawSlug?: string | null
): T | undefined {
  if (!rawSlug || !tenants || tenants.length === 0) return undefined;
  const lower = rawSlug.trim().toLowerCase();
  const shortTarget = generateShortCompanySlug(lower);

  return (
    tenants.find(t => t.slug.toLowerCase() === lower || t.id.toLowerCase() === lower) ||
    tenants.find(t => generateShortCompanySlug(t.slug) === shortTarget) ||
    tenants.find(t => generateShortCompanySlug(t.companyName) === shortTarget) ||
    tenants.find(
      t =>
        t.slug.toLowerCase().startsWith(shortTarget + '-') ||
        shortTarget.startsWith(generateShortCompanySlug(t.companyName))
    )
  );
}

/**
 * Reads an uploaded image File and compresses/scales it to a crisp PNG/WebP data URL
 * suitable for storing in DataStax Astra DB and rendering as both a dashboard logo and browser favicon.
 */
export function compressLogoFileToDataUrl(file: File, maxWidth = 520, maxHeight = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          let w = img.width || 300;
          let h = img.height || 150;
          const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png', 0.92));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Dynamically updates the browser tab favicon (<link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon">)
 * so each pharmacy's unique URL and dashboard displays their own uploaded company logo as their favicon.
 */
export function applyDynamicFavicon(logoUrl?: string | null): void {
  if (typeof document === 'undefined') return;
  const isCustomLogo =
    Boolean(logoUrl) &&
    !logoUrl?.startsWith('/logo.png') &&
    !logoUrl?.startsWith('/favicon.png') &&
    !logoUrl?.startsWith('/favicon-1.png');

  const setHeadIconLinks = (href: string) => {
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]'
    ];
    selectors.forEach(sel => {
      let link = document.querySelector(sel) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = sel.includes('shortcut') ? 'shortcut icon' : sel.includes('apple') ? 'apple-touch-icon' : 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = href;
    });
  };

  if (!isCustomLogo || !logoUrl) {
    setHeadIconLinks('/favicon.png?v=4');
    return;
  }

  // Render the company logo onto a crisp 128x128 square favicon canvas with rounded white badge backing
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setHeadIconLinks(logoUrl);
          return;
        }
        // Rounded white background so landscape or transparent company logos look sharp in any browser tab
        const r = 24;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();

        const pad = 12;
        const avail = size - pad * 2;
        const scale = Math.min(avail / (img.width || size), avail / (img.height || size));
        const drawW = (img.width || size) * scale;
        const drawH = (img.height || size) * scale;
        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        setHeadIconLinks(canvas.toDataURL('image/png'));
      } catch {
        setHeadIconLinks(logoUrl);
      }
    };
    img.onerror = () => setHeadIconLinks(logoUrl);
    img.src = logoUrl;
  } catch {
    setHeadIconLinks(logoUrl);
  }
}

export function getSubscriptionDaysRemaining(endDateIso?: string): number {
  if (!endDateIso) return 180;
  const now = Date.now();
  const end = new Date(endDateIso).getTime();
  if (isNaN(end)) return 180;
  const diffMs = end - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function getSubscriptionProgressPercent(startDateIso?: string, endDateIso?: string): number {
  if (!startDateIso || !endDateIso) return 15;
  const start = new Date(startDateIso).getTime();
  const end = new Date(endDateIso).getTime();
  const now = Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return 15;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
