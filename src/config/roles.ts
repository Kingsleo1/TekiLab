// =============================================================================
// TEKILAB MULTI-BRANCH LIMS ROLES, PERMISSIONS & +234 WHATSAPP QUALIFICATION
// =============================================================================

export type TekiLabDepartment =
  | 'Executive'
  | 'Laboratory'
  | 'Phlebotomy'
  | 'Reception'
  | 'Doctor Consultation'
  | 'Pharmacy'
  | 'Billing'
  | 'Patient Portal';

export type LimsPermissionKey =
  | 'canRunRapidLab'
  | 'canSignOffCritical'
  | 'canCollectSamples'
  | 'canManageBranchStaff'
  | 'canManageAllBranches'
  | 'canManagePatients'
  | 'canManageBookings'
  | 'canManageQueue'
  | 'canConsultPatients'
  | 'canDispatchWhatsApp'
  | 'canBeepDepartments'
  | 'canManageModules'
  | 'canViewBranchAnalytics'
  | 'canManageBilling'
  | 'canAccessPharmacy';

export interface LimsPermissionDescriptor {
  key: LimsPermissionKey;
  label: string;
  description: string;
  category: 'Laboratory' | 'Clinical & Front Desk' | 'Branch Administration';
}

export const LIMS_PERMISSIONS_CATALOG: LimsPermissionDescriptor[] = [
  { key: 'canRunRapidLab', label: 'Run 5–10m Rapid Lab Workflow', description: 'Execute rapid diagnostic tests, enter results & run AI analysis', category: 'Laboratory' },
  { key: 'canSignOffCritical', label: 'Sign Off Critical / Panic Results', description: 'Pathologist / Lead Scientist final approval & digital signature', category: 'Laboratory' },
  { key: 'canCollectSamples', label: 'Sample Collection & QR Custody', description: 'Register specimens, print QR labels & confirm tube collection', category: 'Laboratory' },
  { key: 'canDispatchWhatsApp', label: 'Dispatch Results (WhatsApp / PDF)', description: 'Release validated PDFs and trigger +234 WhatsApp notifications', category: 'Laboratory' },
  { key: 'canManagePatients', label: 'Manage Patient Registry', description: 'Register patients and inspect full medical & lab history logs', category: 'Clinical & Front Desk' },
  { key: 'canManageBookings', label: 'Manage Online & Walk-in Bookings', description: 'Receive online bookings, check in walk-ins & verify payments', category: 'Clinical & Front Desk' },
  { key: 'canManageQueue', label: 'Manage Department Queue', description: 'Call next patient and transfer patients across departments', category: 'Clinical & Front Desk' },
  { key: 'canConsultPatients', label: 'Doctor Consultation & EMR', description: 'Access dedicated Doctor Consultation dashboard & order lab panels', category: 'Clinical & Front Desk' },
  { key: 'canBeepDepartments', label: 'Inter-Department Beep & Comms', description: 'Send loud department pings and status update requests', category: 'Clinical & Front Desk' },
  { key: 'canManageBranchStaff', label: 'Add & Manage Branch Staff', description: 'Create accounts and assign permissions within assigned branch', category: 'Branch Administration' },
  { key: 'canManageAllBranches', label: 'Multi-Branch Executive Access', description: 'Create/switch across all branches and manage organization staff', category: 'Branch Administration' },
  { key: 'canManageModules', label: 'Feature Visibility / Mute Modules', description: 'Toggle auxiliary EMR, Pharmacy, Hospital & Billing modules', category: 'Branch Administration' },
  { key: 'canViewBranchAnalytics', label: 'Branch Analytics & Reports', description: 'View TAT SLA performance, volume metrics & revenue', category: 'Branch Administration' },
  { key: 'canManageBilling', label: 'Billing & Online Payment Ledger', description: 'Review online payments, invoices & HMO claims', category: 'Branch Administration' },
  { key: 'canAccessPharmacy', label: 'Pharmacy POS & Rx Handoff', description: 'Dispense AI-suggested prescriptions from lab handoff queue', category: 'Clinical & Front Desk' },
];

export interface TekiLabRoleDefinition {
  id: string;
  label: string;
  shortLabel: string;
  department: TekiLabDepartment;
  level: number;
  defaultView: string;
  isMultiBranch: boolean;
  canManageBranchStaff: boolean;
  description: string;
  permissions: LimsPermissionKey[];
}

export const TEKILAB_ROLES: TekiLabRoleDefinition[] = [
  {
    id: 'ceo',
    label: 'CEO / Executive Director',
    shortLabel: 'CEO',
    department: 'Executive',
    level: 5,
    defaultView: 'overview',
    isMultiBranch: true,
    canManageBranchStaff: true,
    description: 'Full multi-branch oversight across all laboratories, staff, analytics, and SaaS modules.',
    permissions: LIMS_PERMISSIONS_CATALOG.map((p) => p.key),
  },
  {
    id: 'branch_manager',
    label: 'Branch Lab Manager',
    shortLabel: 'Lab Manager',
    department: 'Laboratory',
    level: 4,
    defaultView: 'overview',
    isMultiBranch: false,
    canManageBranchStaff: true,
    description: 'Runs an independent branch: adds branch staff, sets permissions, monitors SLA & operations.',
    permissions: [
      'canRunRapidLab',
      'canSignOffCritical',
      'canCollectSamples',
      'canDispatchWhatsApp',
      'canManagePatients',
      'canManageBookings',
      'canManageQueue',
      'canBeepDepartments',
      'canManageBranchStaff',
      'canManageModules',
      'canViewBranchAnalytics',
      'canManageBilling',
    ],
  },
  {
    id: 'lead_lab_scientist',
    label: 'Lead Lab Scientist / Pathologist',
    shortLabel: 'Lead Scientist',
    department: 'Laboratory',
    level: 4,
    defaultView: 'rapid_console',
    isMultiBranch: false,
    canManageBranchStaff: true,
    description: 'Clinical lead for the branch lab: signs off critical values, oversees QC, and adds lab staff.',
    permissions: [
      'canRunRapidLab',
      'canSignOffCritical',
      'canCollectSamples',
      'canDispatchWhatsApp',
      'canManagePatients',
      'canManageQueue',
      'canBeepDepartments',
      'canManageBranchStaff',
      'canViewBranchAnalytics',
    ],
  },
  {
    id: 'lab_scientist',
    label: 'Medical Lab Scientist',
    shortLabel: 'Lab Scientist',
    department: 'Laboratory',
    level: 3,
    defaultView: 'rapid_console',
    isMultiBranch: false,
    canManageBranchStaff: false,
    description: 'Executes 5–10 minute rapid tests, operates analyzers, runs AI verification & dispatches reports.',
    permissions: [
      'canRunRapidLab',
      'canCollectSamples',
      'canDispatchWhatsApp',
      'canManagePatients',
      'canManageQueue',
      'canBeepDepartments',
    ],
  },
  {
    id: 'phlebotomist',
    label: 'Phlebotomist / Sample Collector',
    shortLabel: 'Phlebotomist',
    department: 'Phlebotomy',
    level: 2,
    defaultView: 'rapid_console',
    isMultiBranch: false,
    canManageBranchStaff: false,
    description: 'Handles express sample intake, QR specimen tagging, and chain-of-custody verification.',
    permissions: ['canCollectSamples', 'canRunRapidLab', 'canManagePatients', 'canManageQueue', 'canBeepDepartments'],
  },
  {
    id: 'receptionist',
    label: 'Front Desk / Receptionist',
    shortLabel: 'Receptionist',
    department: 'Reception',
    level: 2,
    defaultView: 'queue',
    isMultiBranch: false,
    canManageBranchStaff: false,
    description: 'Dedicated Front Desk dashboard: receives online bookings & walk-ins, manages queue & payments.',
    permissions: ['canManagePatients', 'canManageBookings', 'canManageQueue', 'canBeepDepartments', 'canManageBilling'],
  },
  {
    id: 'doctor',
    label: 'Consulting Doctor',
    shortLabel: 'Doctor',
    department: 'Doctor Consultation',
    level: 3,
    defaultView: 'emr',
    isMultiBranch: false,
    canManageBranchStaff: false,
    description: 'Dedicated Consultation Dashboard: reviews patient lab results, conducts consultations & orders tests.',
    permissions: ['canConsultPatients', 'canManagePatients', 'canManageQueue', 'canBeepDepartments'],
  },
  {
    id: 'patient',
    label: 'Patient (Portal Account)',
    shortLabel: 'Patient',
    department: 'Patient Portal',
    level: 1,
    defaultView: 'patient_portal',
    isMultiBranch: false,
    canManageBranchStaff: false,
    description: 'Self-service Patient Portal: view only own lab results, book lab services online & pay online.',
    permissions: [],
  },
];

export function getRoleDefinition(roleNameOrId?: string): TekiLabRoleDefinition {
  if (!roleNameOrId) return TEKILAB_ROLES[2]; // Lead Lab Scientist default
  const q = roleNameOrId.toLowerCase().trim();
  if (q === 'kernel admin' || q === 'admin' || q.includes('ceo') || q.includes('executive')) {
    return TEKILAB_ROLES[0];
  }
  if (q.includes('branch') || q.includes('manager') || q === 'merchant') {
    return TEKILAB_ROLES[1];
  }
  if (q.includes('lead') || q.includes('pathologist')) {
    return TEKILAB_ROLES[2];
  }
  if (q.includes('scientist') || q.includes('lab')) {
    return TEKILAB_ROLES[3];
  }
  if (q.includes('phleb') || q.includes('sample')) {
    return TEKILAB_ROLES[4];
  }
  if (q.includes('recept') || q.includes('front') || q === 'cashier') {
    return TEKILAB_ROLES[5];
  }
  if (q.includes('doctor') || q.includes('physician') || q.includes('consult')) {
    return TEKILAB_ROLES[6];
  }
  if (q.includes('patient')) {
    return TEKILAB_ROLES[7];
  }
  return TEKILAB_ROLES[3];
}

export const ALL_DEPARTMENTS: TekiLabDepartment[] = [
  'Laboratory',
  'Phlebotomy',
  'Reception',
  'Doctor Consultation',
  'Pharmacy',
  'Billing',
  'Executive',
];

/**
 * Normalizes Nigerian phone numbers (+234) and automatically qualifies them for WhatsApp.
 */
export function normalizeNigerianWhatsAppPhone(rawPhone: string = ''): {
  digits: string;
  e164: string;
  isNigerian234: boolean;
  isWhatsAppQualified: boolean;
  display: string;
} {
  const cleaned = String(rawPhone || '').replace(/[^\d+]/g, '');
  let digits = cleaned.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 11) {
    digits = '234' + digits.slice(1);
  } else if (digits.length === 10 && /^[789]\d{9}$/.test(digits)) {
    digits = '234' + digits;
  }

  const isNigerian234 = digits.startsWith('234') && digits.length === 13;
  const isValidNigerianPrefix =
    isNigerian234 && /^234(70|80|81|90|91)\d{8}$/.test(digits);

  const e164 = digits ? `+${digits}` : '';
  const display = isNigerian234
    ? `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
    : e164 || rawPhone;

  return {
    digits,
    e164,
    isNigerian234,
    isWhatsAppQualified: isValidNigerianPrefix,
    display,
  };
}
