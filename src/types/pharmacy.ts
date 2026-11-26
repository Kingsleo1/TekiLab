export type UserRole = 
  | 'merchant' 
  | 'admin' 
  | 'cashier' 
  | 'storekeeper' 
  | 'company_admin'
  | 'doctor'
  | 'nurse'
  | 'lab_scientist'
  | 'radiologist'
  | 'receptionist'
  | 'billing_officer'
  | 'hospital_admin'
  | 'pharmacist'
  | 'patient';

export type FacilityType = 
  | 'Pharmacy' 
  | 'Laboratory' 
  | 'Diagnostic Centre' 
  | 'Clinic' 
  | 'Medical Centre' 
  | 'Specialist Clinic' 
  | 'Maternity Centre' 
  | 'Hospital' 
  | 'Multi-specialty Hospital' 
  | 'Hospital Group';

export type SubscriptionPlanId = 
  | 'pharmacy_solo' 
  | 'diagnostics_suite' 
  | 'clinic_opd' 
  | 'hospital_ultimate' 
  | 'enterprise' 
  | 'buy_to_own' 
  | 'single_branch' 
  | 'multi_branch';

export type SubscriptionDurationMonths = 1 | 6 | 12 | 24 | 36;

export interface ServiceBreakdownItem {
  serviceName: string;
  monthlyAllocationNaira: number;
  allocatedAmountNaira?: number;
  allocationPercent?: number;
  description: string;
}

export interface Tenant {
  id: string;
  name?: string;
  companyName: string;
  slug: string; // Dedicated URL path: website.com/<slug>
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  ownerPhone: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  primaryColor?: string;
  registrationNumber?: string;
  logo?: string;
  customDomain?: string; // Optional dedicated custom domain (e.g. portal.medplus.ng)
  planId: SubscriptionPlanId;
  planName: string;
  monthlyRateNaira: number;
  durationMonths: SubscriptionDurationMonths;
  discountPercent?: number;
  discountPercentage: number;
  subtotalNaira?: number;
  discountAmountNaira?: number;
  totalPaidNaira: number;
  maxBranches: number;
  subscriptionStatus: 'active' | 'expired' | 'suspended' | 'trial';
  subscriptionStart: string;
  subscriptionEnd: string;
  subscriptionEndDate?: string;
  paymentReference?: string;
  servicesEnabled: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  tenantName?: string;
  companyName: string;
  tenantSlug: string;
  planId: SubscriptionPlanId;
  planName: string;
  durationMonths: SubscriptionDurationMonths;
  monthlyRateNaira: number;
  subtotalNaira: number;
  discountPercent?: number;
  discountPercentage: number;
  discountSavedNaira?: number;
  discountAmountNaira: number;
  amountPaidNaira: number;
  currency?: string;
  paymentMethod: string;
  paymentReference: string;
  status: 'completed' | 'pending';
  servicesBreakdown?: ServiceBreakdownItem[];
  serviceBreakdown?: ServiceBreakdownItem[];
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId?: string; // For multi-tenant isolation
  tenantSlug?: string;
  branchId?: string; // Specific location
  createdAt: string;
}

export interface Pharmacy {
  id: string;
  tenantId?: string;
  tenantSlug?: string;
  name: string;
  address: string;
  location?: string;
  ownerId: string;
  email?: string;
  status: 'active' | 'pending' | 'suspended';
  revenue: number;
  createdAt: string;
  description?: string;
  image?: string;
  type?: 'Head Branch' | 'Central Branch' | 'Sub-Branch' | 'Warehouse' | 'HEAD_BRANCH' | 'BRANCH' | 'WAREHOUSE';
  phone?: string;
  managerName?: string;
  manager?: string;
  permissions?: string[]; // e.g. ["can_transfer", "can_view_financials", "can_approve_supply"]
}

export type ProductUnit = 'tablet' | 'sachet' | 'pack' | 'bottle' | 'carton' | 'vial';

export interface Batch {
  id: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
}

export interface Attribute {
  id: string;
  name: string;
  type: 'text' | 'select';
  options?: string[]; // e.g., ["Tablet", "Syrup", "Injection"]
}

export interface PricingStrategy {
  retailPrice: number;
  wholesalePrice: number;
  volumePrice?: number;
  volumeThreshold?: number;
}

export interface PackageUnitConfig {
  enabled: boolean;
  pricing: PricingStrategy;
}

export interface PackageUnits {
  fullPack?: PricingStrategy;
  halfPack?: PricingStrategy;
  quarterPack?: PricingStrategy;
}

export interface Product {
  id: string;
  tenantId?: string;
  name: string;
  genericName?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  category: string;
  price: number; // Retail price per base unit
  stock: number; // Total stock across all batches
  baseUnit: ProductUnit;
  conversionFactor: number; // e.g. 10 tablets in 1 sachet
  expiryDate: string; // Earliest expiry among batches
  requiresPrescription: boolean;
  pharmacyId: string;
  image?: string;
  batches: Batch[];
  supplierId?: string;
  minStockLevel: number;
  costPrice?: number;
  wholesalePrice?: number;
  attributes?: Record<string, string>; // custom attributes e.g., {"Dosage": "500mg"}
  packagingPricing?: any;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  totalOwing: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: ProductUnit;
  packageSize?: 'Full Pack' | 'Half Pack' | 'Quarter Pack';
  saleType?: 'Retail' | 'Wholesale' | 'Volume Price';
  originalBasePrice?: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'wallet' | 'owing' | 'split';

export interface OwingPayment {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'wallet';
  createdAt: string;
}

export interface OwingRecord {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  amountPaid: number;
  amountOwed: number;
  dueDate: string;
  status: 'unpaid' | 'partially-paid' | 'fully-paid';
  items?: { name: string; quantity: number }[];
  pharmacyId: string;
  notes?: string;
  createdAt: string;
  payments: OwingPayment[];
}

export interface StaffMember {
  id: string;
  tenantId?: string;
  tenantSlug?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  branchId: string;
  status: 'active' | 'inactive' | 'online' | 'break';
  level: number;
  permissions: string[];
  password?: string;
  joinDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tier?: string;
  balance?: number;
  totalSpent?: number;
  ordersCount?: number;
  joinDate?: string;
  status?: string;
  notes?: string;
  pharmacyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  pharmacyId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status?: 'Confirmed' | 'Pending';
  vendorId?: string;
  paymentMethod?: string;
  recordedBy?: string;
  notes?: string;
  createdAt?: string;
}

export interface RefundItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalRefund: number;
  returnToInventory: boolean;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  pharmacyId: string;
  customerName?: string;
  customerPhone?: string;
  items: RefundItem[];
  refundAmount: number;
  reason: string;
  refundMethod: 'cash' | 'transfer' | 'card' | 'wallet';
  processedBy: string;
  processedByName?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  tenantId?: string;
  patientId: string;
  pharmacyId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'voided' | 'refunded' | 'partially_refunded';
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  paymentMethod: PaymentMethod;
  cashPaid?: number;
  transferPaid?: number;
  cardPaid?: number;
  owingPaid?: number;
  voidReason?: string;
  processedBy: string; // User ID
  prescriptionUrl?: string;
  trackingHistory: {
    status: string;
    timestamp: string;
    message: string;
  }[];
  createdAt: string;
  source?: 'POS' | 'The Store' | 'Web App' | 'B2B Logistics';
  receiptPdfUrl?: string;
  receiptMetadata?: Record<string, any>;
  lastSharedAt?: string;
  lastSharedPlatform?: string;
  refundInfo?: {
    refundId: string;
    amount: number;
    reason: string;
    refundedAt: string;
  };
}

export interface SaleRecord {
  id: string;
  pharmacyId: string;
  amount: number;
  type: 'online' | 'pos';
  timestamp: string;
  items: OrderItem[];
}

export interface ProductLog {
  id: string;
  productId: string;
  productName: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'SALE_COMPLETED' | 'STOCK_ADJUSTMENT';
  metadata?: Record<string, any>;
  activityType?: 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'SALE_COMPLETED' | 'STOCK_ADJUSTMENT';
  resourceId?: string;
  description?: string;
}

// =============================================================================
// UNIFIED HEALTHCARE DOMAIN MODELS (EMR, LIMS, RADIOLOGY, Wards, QUEUE)
// =============================================================================

export interface PatientInsurance {
  provider: string;
  planName: string;
  policyNumber: string;
  coverageLimitNaira?: number;
  status: 'Active' | 'Pending Approval' | 'Expired';
}

export interface PatientRecord {
  id: string;
  mrn: string; // e.g. "TM-2026-0812"
  tenantId?: string;
  facilityId?: string;
  fullName: string;
  dob: string;
  sex: 'Male' | 'Female' | 'Other';
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  genotype?: 'AA' | 'AS' | 'SS' | 'AC';
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insurance?: PatientInsurance;
  medicalNotes?: string;
  registeredAt: string;
  updatedAt?: string;
}

export interface ClinicalVitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number; // bpm
  temperatureCelsius?: number; // °C
  respiratoryRate?: number; // breaths/min
  spO2?: number; // %
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  bloodGlucoseMgDl?: number;
  recordedAt: string;
  recordedBy?: string;
}

export interface PrescribedMedication {
  id: string;
  productId?: string;
  drugName: string;
  genericName?: string;
  dosage: string; // e.g., "500mg"
  frequency: string; // e.g., "TDS (3x daily)"
  durationDays: number;
  quantity: number;
  instructions?: string;
  unitPrice: number;
  status: 'Pending Dispense' | 'Partially Dispensed' | 'Dispensed' | 'Cancelled';
}

export interface ClinicalEncounter {
  reportApproval?: import('../lib/report-approval').ReportApproval;
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  tenantId?: string;
  facilityId?: string;
  doctorId: string;
  doctorName: string;
  department: string;
  encounterType: 'OPD Consultation' | 'Emergency Triage' | 'Inpatient Ward Round' | 'ANC Care' | 'Telemedicine';
  chiefComplaint: string;
  historyPresentingIllness?: string;
  vitals?: ClinicalVitals;
  physicalExamNotes?: string;
  primaryDiagnosis: string;
  secondaryDiagnosis?: string;
  icdCode?: string;
  treatmentPlan?: string;
  prescriptions: PrescribedMedication[];
  requestedLabTests?: string[]; // Lab test names/codes
  requestedImagingScans?: string[]; // Imaging scan names/codes
  status: 'In Progress' | 'Awaiting Investigations' | 'Completed' | 'Referred';
  createdAt: string;
  completedAt?: string;
}

export interface LabTestParameter {
  id: string;
  name: string;
  referenceRange: string;
  unit?: string;
  fieldType: 'number' | 'text' | 'select';
  options?: string[];
}

export interface DiagnosisItem {
  id: string;
  name: string;
  code: string; // Official ICD-10
  category: string;
  letter: string; // Alphabet letter A-Z
  description?: string;
  commonSymptoms?: string[];
  severity?: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabTestCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  container?: string;
  turnaroundTimeHours: number;
  priceNaira: number;
  referenceRange?: string;
  units?: string;
  parameters?: LabTestParameter[];
  department?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabOrder {
  verification?:{token:string;url:string;publishedAt?:string;contentDigest?:string;localOnly?:boolean};
  findingCode?:string; referenceSource?:string; assayMethod?:string; referenceReviewed?:boolean; rapidWorkflow?:boolean; consultationRequested?:boolean;
  findingsHtml?: string;
  reportApproval?: import('../lib/report-approval').ReportApproval;
  pricingStatus?: 'Quoted' | 'Unquoted';
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  mrn: string;
  encounterId?: string;
  tenantId?: string;
  facilityId?: string;
  testId: string;
  testName: string;
  category: string;
  accessionNumber: string; // e.g. "ACC-2026-9041"
  sampleType: string;
  sampleStatus: 'Awaiting Collection' | 'Sample Collected' | 'Sample Received' | 'Processing' | 'Completed' | 'Rejected';
  orderStatus: 'ORDERED' | 'PAID' | 'PROCESSING' | 'RESULT_ENTERED' | 'VALIDATED' | 'RELEASED' | 'CANCELLED';
  rejectionReason?: string;
  sampleCollectorName?: string;
  sampleCollectedAt?: string;
  results?: Record<string, {
    value: string | number;
    unit?: string;
    referenceRange?: string;
    flag?: 'Normal' | 'High' | 'Low' | 'Critical' | 'Positive' | 'Negative';
  }>;
  likelyIssue?: string;
  clinicalInterpretation?: string;
  enteredByName?: string;
  enteredAt?: string;
  validatedByName?: string;
  validatedAt?: string;
  releasedAt?: string;
  whatsappSentAt?: string;
  reportNumber?: string; // e.g. "TM-LAB-2026-00481"
  qrCodeUrl?: string;
  priceNaira: number;
  billingStatus: 'Pending' | 'Billed' | 'Paid' | 'HMO Coverage';
  createdAt: string;
}

export interface ImagingTestCatalogItem {
  id: string;
  code: string;
  name: string;
  modality: string;
  bodySite: string;
  priceNaira: number;
  instructions?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImagingOrder {
  findingsHtml?: string;
  reportApproval?: import('../lib/report-approval').ReportApproval;
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  encounterId?: string;
  tenantId?: string;
  testId: string;
  testName: string;
  modality: string;
  bodySite: string;
  orderStatus: 'Awaiting Scan' | 'Scan Completed' | 'Report Preparing' | 'Approved' | 'Released';
  clinicalIndication?: string;
  techniqueNotes?: string;
  findingsNotes?: string;
  impressionNotes?: string;
  recommendationsNotes?: string;
  radiologistName?: string;
  approvedAt?: string;
  reportNumber?: string;
  priceNaira: number;
  billingStatus: 'Pending' | 'Billed' | 'Paid' | 'HMO Coverage';
  createdAt: string;
}

export interface Ward {
  id: string;
  name: string;
  type: 'Male Medical/Surgical' | 'Female Medical/Surgical' | 'Pediatric Ward' | 'Maternity Ward' | 'ICU' | 'Private Suite';
  totalBeds: number;
  occupiedBeds: number;
}

export interface Bed {
  id: string;
  wardId: string;
  wardName: string;
  bedNumber: string; // e.g., "Bed 04"
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
  patientId?: string;
  patientName?: string;
  admittedAt?: string;
  dailyRateNaira: number;
}

export interface NursingNote {
  id: string;
  note: string;
  nurseName: string;
  timestamp: string;
}

export interface MedicationAdminRecord {
  id: string;
  medicationName: string;
  dosage: string;
  administeredBy: string;
  timestamp: string;
  status: 'Administered' | 'Skipped' | 'Refused';
  notes?: string;
}

export interface AdmissionRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  admittingDoctor: string;
  diagnosis: string;
  status: 'Admitted' | 'Discharged';
  admittedAt: string;
  dischargedAt?: string;
  vitalsLog: ClinicalVitals[];
  nursingNotes: NursingNote[];
  medicationAdmins: MedicationAdminRecord[];
  totalChargeNaira: number;
}

export interface QueueTicket {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  ticketNumber: string; // e.g., "Q-104"
  department: 'Reception' | 'Triage' | 'Doctor Consultation' | 'Laboratory' | 'Radiology' | 'Pharmacy' | 'Billing';
  priority: 'Normal' | 'Urgent' | 'Emergency';
  status: 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled';
  calledBy?: string;
  estimatedWaitMins?: number;
  createdAt: string;
}

export interface HospitalAppointment {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  timeSlot: string; // e.g. "10:30 AM"
  type: 'General Consultation' | 'Specialist Follow-up' | 'Lab Specimen Collection' | 'Radiology Scan' | 'Telemedicine';
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
  notes?: string;
  createdAt: string;
}

export interface PatientCharge {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  category: 'Consultation Fee' | 'Lab Investigation' | 'Radiology Scan' | 'Pharmacy Prescription' | 'Ward Accommodation' | 'Procedure';
  description: string;
  totalAmountNaira: number;
  hmoCoveredNaira: number;
  patientPayableNaira: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | 'HMO Claim Pending' | 'Waived';
  encounterId?: string;
  createdAt: string;
}

export interface HMOClaim {
  id: string;
  claimNumber: string;
  hmoProvider: string;
  patientId: string;
  patientName: string;
  policyNumber: string;
  totalClaimNaira: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Remitted';
  submissionDate: string;
  items: { description: string; amountNaira: number }[];
}

