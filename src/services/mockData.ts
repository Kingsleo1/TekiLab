import { Pharmacy, Product, Supplier, StaffMember, Tenant, SubscriptionPayment } from '../types/pharmacy';
import { TEKIPHARM_PLANS } from '../lib/saas-pricing';
import { COMPREHENSIVE_LAB_TESTS, COMPREHENSIVE_IMAGING_TESTS } from '../lib/medical-catalog';

export const mockSuppliers: Supplier[] = [];

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant-tekipharm',
    name: 'Teki Med Healthcare Ltd',
    companyName: 'Teki Med Healthcare Ltd',
    slug: 'tekimed',
    ownerName: 'Dr. Evelyn Vance',
    ownerEmail: 'evelyn.vance@tekimed.com',
    phone: '+234 803 123 4567',
    ownerPhone: '+234 803 123 4567',
    address: '12 Commercial Avenue, Healthcare District, Abuja',
    city: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    primaryColor: '#0284c7',
    logo: '/logo.png',
    planId: 'multi_branch',
    planName: 'TekiMed Hospital & Multi-Branch Suite',
    monthlyRateNaira: 25000,
    durationMonths: 12,
    discountPercent: 3.5,
    discountPercentage: 3.5,
    subtotalNaira: 300000,
    discountAmountNaira: 10500,
    totalPaidNaira: 289500,
    maxBranches: 5,
    subscriptionStatus: 'active',
    subscriptionStart: '2026-06-01T00:00:00.000Z',
    subscriptionEnd: '2027-06-01T00:00:00.000Z',
    subscriptionEndDate: '2027-06-01T00:00:00.000Z',
    paymentReference: 'TKM-SUB-2026-001',
    servicesEnabled: [
      'Patient Master Record & EMR',
      'Laboratory LIMS & Diagnostic Reporting',
      'Radiology Imaging Suite',
      'Inpatient Ward & Bed Management',
      'Pharmacy POS & Dispensing Engine',
      'Unified Billing & HMO Claims'
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  },
  {
    id: 'tenant-medplus',
    name: 'MedPlus Care Health Center',
    companyName: 'MedPlus Care Health Center',
    slug: 'medplus',
    ownerName: 'Pharm. Tunde Bakare',
    ownerEmail: 'admin@medpluscare.ng',
    phone: '+234 809 555 0192',
    ownerPhone: '+234 809 555 0192',
    address: '45 Admiralty Way, Lekki Phase 1, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    primaryColor: '#059669',
    logo: '/logo.png',
    planId: 'single_branch',
    planName: 'TekiMed Basic (Pharmacy & POS)',
    monthlyRateNaira: 10000,
    durationMonths: 6,
    discountPercent: 3,
    discountPercentage: 3,
    subtotalNaira: 60000,
    discountAmountNaira: 1800,
    totalPaidNaira: 58200,
    maxBranches: 1,
    subscriptionStatus: 'active',
    subscriptionStart: '2026-08-01T00:00:00.000Z',
    subscriptionEnd: '2027-02-01T00:00:00.000Z',
    subscriptionEndDate: '2027-02-01T00:00:00.000Z',
    paymentReference: 'TKM-SUB-2026-002',
    servicesEnabled: [
      'POS & Billing Engine',
      'Multi-Batch Inventory',
      'Expenses & Debtors Ledger',
      'Company Admin & Granular Staff RBAC',
      'Dedicated Business Portal Link'
    ],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z'
  }
];

export const DEFAULT_SUBSCRIPTION_PAYMENTS: SubscriptionPayment[] = [
  {
    id: 'SUBPAY-001',
    tenantId: 'tenant-tekipharm',
    tenantName: 'Teki Pharm Ltd',
    companyName: 'Teki Pharm Ltd',
    tenantSlug: 'teki-pharm',
    planId: 'multi_branch',
    planName: 'Multi-Branch Network Plan (1-5 Branches)',
    durationMonths: 12,
    monthlyRateNaira: 20000,
    subtotalNaira: 240000,
    discountPercent: 3.5,
    discountPercentage: 3.5,
    discountSavedNaira: 8400,
    discountAmountNaira: 8400,
    amountPaidNaira: 231600,
    currency: 'NGN',
    paymentMethod: 'Paystack',
    paymentReference: 'TKP-SUB-2026-001',
    status: 'completed',
    servicesBreakdown: TEKIPHARM_PLANS[1].servicesBreakdown,
    serviceBreakdown: TEKIPHARM_PLANS[1].servicesBreakdown,
    periodStart: '2026-06-01T00:00:00.000Z',
    periodEnd: '2027-06-01T00:00:00.000Z',
    paidAt: '2026-06-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z'
  },
  {
    id: 'SUBPAY-002',
    tenantId: 'tenant-medplus',
    tenantName: 'MedPlus Care Pharmacy',
    companyName: 'MedPlus Care Pharmacy',
    tenantSlug: 'medplus-care',
    planId: 'single_branch',
    planName: 'Single-Branch Plan',
    durationMonths: 6,
    monthlyRateNaira: 10000,
    subtotalNaira: 60000,
    discountPercent: 3,
    discountPercentage: 3,
    discountSavedNaira: 1800,
    discountAmountNaira: 1800,
    amountPaidNaira: 58200,
    currency: 'NGN',
    paymentMethod: 'Bank Transfer',
    paymentReference: 'TKP-SUB-2026-002',
    status: 'completed',
    servicesBreakdown: TEKIPHARM_PLANS[0].servicesBreakdown,
    serviceBreakdown: TEKIPHARM_PLANS[0].servicesBreakdown,
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2027-02-01T00:00:00.000Z',
    paidAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z'
  }
];

export const mockPharmacies: Pharmacy[] = [
  {
    id: 'pharma-1',
    tenantId: 'tenant-tekipharm',
    tenantSlug: 'teki-pharm',
    name: 'Teki Pharm (Central Branch)',
    address: '12 Commercial Avenue, Healthcare District, Abuja',
    ownerId: 'USR-001',
    status: 'active',
    revenue: 0,
    type: 'Central Branch',
    phone: '+234 803 123 4567',
    managerName: 'Dr. Evelyn Vance',
    createdAt: '2026-06-01T00:00:00.000Z',
    description: 'Primary dispensing facility and retail healthcare node.',
    permissions: ['can_transfer', 'can_view_financials', 'can_approve_supply']
  },
  {
    id: 'pharma-medplus-1',
    tenantId: 'tenant-medplus',
    tenantSlug: 'medplus-care',
    name: 'MedPlus Care (Lekki Phase 1)',
    address: '45 Admiralty Way, Lekki Phase 1, Lagos',
    ownerId: 'USR-MP-001',
    status: 'active',
    revenue: 0,
    type: 'Head Branch',
    phone: '+234 809 555 0192',
    managerName: 'Pharm. Tunde Bakare',
    createdAt: '2026-08-01T00:00:00.000Z',
    description: 'Flagship Lekki Phase 1 retail pharmacy and dispensary.',
    permissions: ['can_view_financials', 'can_approve_supply']
  }
];

export const DEFAULT_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'superadmin-kingsley-001',
    tenantId: 'platform-super-admin',
    tenantSlug: 'admin',
    name: 'Kingsley Agu (Super Admin)',
    role: 'Kernel Admin',
    email: 'kingsleyagu92@gmail.com',
    password: 'TEKI.pharm@1',
    status: 'online',
    level: 5,
    branchId: 'pharma-1',
    permissions: [
      'canAccessPOS',
      'canManageStaff',
      'canManageCustomers',
      'canManageInventory',
      'canAccessSuppliers',
      'canAccessExpenses',
      'canAccessTransfers',
      'canAccessWarehouse',
      'canViewReports',
      'canManageBranches',
      'canManageMarketing',
      'canManageIntegrations',
      'canAdjustSettings',
      'canApplyDiscounts',
      'canDispenseControlled',
      'canAccessAdminPanel'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-001',
    name: 'Dr. Evelyn Vance',
    role: 'Company Admin',
    email: 'evelyn.vance@tekipharm.com',
    status: 'online',
    level: 4,
    branchId: 'pharma-1',
    permissions: [
      'canAccessPOS',
      'canApplyDiscounts',
      'canDispenseControlled',
      'canManageInventory',
      'canAccessTransfers',
      'canAccessSuppliers',
      'canAccessExpenses',
      'canManageStaff',
      'canManageBranches',
      'canViewReports',
      'canManageCustomers',
      'canAccessWarehouse',
      'canManageMarketing',
      'canAdjustSettings'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-002',
    name: 'Marcus Chen',
    role: 'Certified Dispenser',
    email: 'marcus.chen@tekipharm.com',
    status: 'online',
    level: 3,
    branchId: 'pharma-1',
    permissions: [
      'canAccessPOS',
      'canApplyDiscounts',
      'canDispenseControlled',
      'canManageInventory'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-003',
    name: 'Amina Yusuf',
    role: 'POS operator',
    email: 'amina.yusuf@tekipharm.com',
    status: 'online',
    level: 1,
    branchId: 'pharma-1',
    permissions: ['canAccessPOS'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'USR-MP-001',
    name: 'Pharm. Tunde Bakare',
    role: 'Company Admin',
    email: 'admin@medpluscare.ng',
    status: 'online',
    level: 4,
    branchId: 'pharma-medplus-1',
    permissions: [
      'canAccessPOS',
      'canApplyDiscounts',
      'canDispenseControlled',
      'canManageInventory',
      'canAccessSuppliers',
      'canAccessExpenses',
      'canManageStaff',
      'canManageBranches',
      'canViewReports',
      'canManageCustomers',
      'canAdjustSettings'
    ],
    createdAt: new Date().toISOString()
  }
];

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Amoxicillin 500mg Capsules',
    genericName: 'Amoxicillin Trihydrate',
    brand: 'TekiMed Pharma',
    sku: 'AMX-500-CAP',
    barcode: '890123456701',
    category: 'Antibiotics',
    price: 1500,
    stock: 240,
    baseUnit: 'pack',
    conversionFactor: 10,
    expiryDate: '2027-08-30',
    requiresPrescription: true,
    pharmacyId: 'pharma-1',
    batches: [
      { id: 'b1', batchNumber: 'AMX-2026-B1', manufactureDate: '2025-08-01', expiryDate: '2027-08-30', quantity: 240, costPrice: 900 }
    ],
    minStockLevel: 20,
    costPrice: 900
  },
  {
    id: 'prod-002',
    name: 'Paracetamol 500mg Tablets',
    genericName: 'Acetaminophen',
    brand: 'Panadol',
    sku: 'PCM-500-TAB',
    barcode: '890123456702',
    category: 'Analgesics',
    price: 500,
    stock: 500,
    baseUnit: 'pack',
    conversionFactor: 10,
    expiryDate: '2028-01-15',
    requiresPrescription: false,
    pharmacyId: 'pharma-1',
    batches: [
      { id: 'b2', batchNumber: 'PCM-2026-B2', manufactureDate: '2025-09-01', expiryDate: '2028-01-15', quantity: 500, costPrice: 250 }
    ],
    minStockLevel: 50,
    costPrice: 250
  },
  {
    id: 'prod-003',
    name: 'Artemether + Lumefantrine (Coartem)',
    genericName: 'Artemether 80mg + Lumefantrine 480mg',
    brand: 'Coartem',
    sku: 'ACT-80480',
    barcode: '890123456703',
    category: 'Antimalarial',
    price: 3200,
    stock: 120,
    baseUnit: 'pack',
    conversionFactor: 6,
    expiryDate: '2027-11-20',
    requiresPrescription: true,
    pharmacyId: 'pharma-1',
    batches: [
      { id: 'b3', batchNumber: 'ACT-2026-B3', manufactureDate: '2025-10-01', expiryDate: '2027-11-20', quantity: 120, costPrice: 2000 }
    ],
    minStockLevel: 15,
    costPrice: 2000
  },
  {
    id: 'prod-004',
    name: 'Metformin 500mg Tablets',
    genericName: 'Metformin HCl',
    brand: 'Glucophage',
    sku: 'MET-500-TAB',
    barcode: '890123456704',
    category: 'Antidiabetic',
    price: 2800,
    stock: 85,
    baseUnit: 'pack',
    conversionFactor: 10,
    expiryDate: '2027-05-10',
    requiresPrescription: true,
    pharmacyId: 'pharma-1',
    batches: [
      { id: 'b4', batchNumber: 'MET-2026-B4', manufactureDate: '2025-05-01', expiryDate: '2027-05-10', quantity: 85, costPrice: 1800 }
    ],
    minStockLevel: 20,
    costPrice: 1800
  },
  {
    id: 'prod-005',
    name: 'Amlodipine 10mg Tablets',
    genericName: 'Amlodipine Besylate',
    brand: 'Norvasc',
    sku: 'AML-10-TAB',
    barcode: '890123456705',
    category: 'Cardiovascular',
    price: 3500,
    stock: 110,
    baseUnit: 'pack',
    conversionFactor: 10,
    expiryDate: '2027-09-18',
    requiresPrescription: true,
    pharmacyId: 'pharma-1',
    batches: [
      { id: 'b5', batchNumber: 'AML-2026-B5', manufactureDate: '2025-09-01', expiryDate: '2027-09-18', quantity: 110, costPrice: 2100 }
    ],
    minStockLevel: 15,
    costPrice: 2100
  }
];

import { 
  PatientRecord, 
  ClinicalEncounter, 
  LabTestCatalogItem, 
  LabOrder, 
  ImagingTestCatalogItem, 
  ImagingOrder, 
  Ward, 
  Bed, 
  AdmissionRecord, 
  QueueTicket, 
  HospitalAppointment, 
  PatientCharge, 
  HMOClaim 
} from '../types/pharmacy';

export const DEFAULT_PATIENTS: PatientRecord[] = [
  {
    id: 'pat-001',
    mrn: 'TM-2026-0012',
    fullName: 'Chidi Kenneth Okafor',
    dob: '1988-04-12',
    sex: 'Male',
    phone: '+234 802 334 9811',
    email: 'chidi.okafor@gmail.com',
    address: '14 Gana Street, Maitama, Abuja',
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Hypertension'],
    emergencyContactName: 'Nneka Okafor',
    emergencyContactPhone: '+234 803 112 0044',
    emergencyContactRelation: 'Wife',
    insurance: {
      provider: 'Hygeia HMO',
      planName: 'Corporate Executive Plan',
      policyNumber: 'HYG-90812-A',
      coverageLimitNaira: 500000,
      status: 'Active'
    },
    medicalNotes: 'Patient has mild essential hypertension controlled with Amlodipine.',
    registeredAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'pat-002',
    mrn: 'TM-2026-0013',
    fullName: 'Aisha Bello Abubakar',
    dob: '1995-09-24',
    sex: 'Female',
    phone: '+234 809 771 2233',
    email: 'aisha.bello@yahoo.com',
    address: '88 Ahmadu Bello Way, Central Business District, Abuja',
    bloodGroup: 'B+',
    genotype: 'AS',
    allergies: ['Ciprofloxacin'],
    chronicConditions: ['Asthma'],
    emergencyContactName: 'Kabiru Abubakar',
    emergencyContactPhone: '+234 802 990 1144',
    emergencyContactRelation: 'Brother',
    insurance: {
      provider: 'Reliance HMO',
      planName: 'Gold Family Coverage',
      policyNumber: 'REL-44810-B',
      coverageLimitNaira: 350000,
      status: 'Active'
    },
    medicalNotes: 'Intermittent asthma triggered by cold weather.',
    registeredAt: '2026-02-10T11:30:00.000Z'
  },
  {
    id: 'pat-003',
    mrn: 'TM-2026-0014',
    fullName: 'Olumide Femi Adebayo',
    dob: '1976-11-03',
    sex: 'Male',
    phone: '+234 805 119 8832',
    email: 'olumide.adebayo@hotmail.com',
    address: '19 Shehu Shagari Way, Asokoro, Abuja',
    bloodGroup: 'A+',
    genotype: 'AA',
    allergies: [],
    chronicConditions: ['Type 2 Diabetes Mellitus'],
    emergencyContactName: 'Funke Adebayo',
    emergencyContactPhone: '+234 803 771 9900',
    emergencyContactRelation: 'Wife',
    insurance: {
      provider: 'AXA Mansard Health',
      planName: 'Platinum Corporate',
      policyNumber: 'AXA-10928-C',
      coverageLimitNaira: 1000000,
      status: 'Active'
    },
    medicalNotes: 'Type 2 diabetic on Metformin 500mg BD. Routine HbA1c required.',
    registeredAt: '2026-03-01T08:15:00.000Z'
  }
];

export const DEFAULT_CLINICAL_ENCOUNTERS: ClinicalEncounter[] = [
  {
    id: 'enc-001',
    patientId: 'pat-001',
    patientName: 'Chidi Kenneth Okafor',
    mrn: 'TM-2026-0012',
    doctorId: 'doc-101',
    doctorName: 'Dr. Evelyn Vance (Chief Medical Director)',
    department: 'General Outpatient (OPD)',
    encounterType: 'OPD Consultation',
    chiefComplaint: 'High grade fever (38.9°C), joint pain, chills, and weakness for 3 days.',
    historyPresentingIllness: 'Patient reports fever starting 3 days ago accompanied by rigors, severe frontal headache, and loss of appetite. No vomiting or cough.',
    vitals: {
      bpSystolic: 135,
      bpDiastolic: 88,
      pulseRate: 98,
      temperatureCelsius: 38.9,
      respiratoryRate: 20,
      spO2: 98,
      weightKg: 82,
      heightCm: 178,
      bmi: 25.9,
      bloodGlucoseMgDl: 104,
      recordedAt: '2026-10-03T09:00:00.000Z',
      recordedBy: 'Nurse Fatima Hassan'
    },
    physicalExamNotes: 'Febrile to touch, mildly pale, clear chest bilaterally, S1 S2 present no murmurs, soft non-tender abdomen, no organomegaly.',
    primaryDiagnosis: 'Acute Uncomplicated Malaria (P. falciparum)',
    secondaryDiagnosis: 'Essential Hypertension (Controlled)',
    icdCode: 'B50.9 / I10',
    treatmentPlan: '1. Artemether+Lumefantrine (Coartem) 80/480mg BD x 3 days\n2. Paracetamol 1g TDS x 3 days\n3. Repeat blood pressure check on follow-up.',
    prescriptions: [
      {
        id: 'rx-01',
        productId: 'prod-003',
        drugName: 'Artemether + Lumefantrine (Coartem)',
        genericName: 'Artemether/Lumefantrine 80/480mg',
        dosage: '1 tablet',
        frequency: 'BD (twice daily)',
        durationDays: 3,
        quantity: 1,
        unitPrice: 3200,
        instructions: 'Take immediately with fatty meal or milk.',
        status: 'Pending Dispense'
      },
      {
        id: 'rx-02',
        productId: 'prod-002',
        drugName: 'Paracetamol 500mg Tablets',
        genericName: 'Paracetamol',
        dosage: '2 tablets',
        frequency: 'TDS (3x daily)',
        durationDays: 3,
        quantity: 1,
        unitPrice: 500,
        instructions: 'Take after meals for fever and pain.',
        status: 'Pending Dispense'
      }
    ],
    requestedLabTests: ['Full Blood Count (FBC)', 'Malaria Parasite (MP) Film'],
    requestedImagingScans: [],
    status: 'In Progress',
    createdAt: '2026-10-03T09:15:00.000Z'
  }
];

const BASE_LAB_CATALOG: LabTestCatalogItem[] = [
  {
    id: 'labtest-fbc',
    code: 'LAB-FBC',
    name: 'Full Blood Count (FBC / CBC)',
    category: 'Haematology',
    sampleType: 'Whole Blood',
    container: 'EDTA Tube',
    turnaroundTimeHours: 1,
    priceNaira: 4500,
    referenceRange: 'See parameters',
    isActive: true,
    parameters: [
      { id: 'p1', name: 'Haemoglobin (Hb)', referenceRange: '13.0 - 17.0', unit: 'g/dL', fieldType: 'number' },
      { id: 'p2', name: 'Packed Cell Volume (PCV)', referenceRange: '37.0 - 54.0', unit: '%', fieldType: 'number' },
      { id: 'p3', name: 'Total White Cell Count (WBC)', referenceRange: '4.0 - 11.0', unit: 'x10^9/L', fieldType: 'number' },
      { id: 'p4', name: 'Platelets', referenceRange: '150 - 450', unit: 'x10^9/L', fieldType: 'number' },
      { id: 'p5', name: 'Neutrophils', referenceRange: '40 - 75', unit: '%', fieldType: 'number' },
      { id: 'p6', name: 'Lymphocytes', referenceRange: '20 - 45', unit: '%', fieldType: 'number' }
    ]
  },
  {
    id: 'labtest-mp',
    code: 'LAB-MP',
    name: 'Malaria Parasite (MP) Microscopy',
    category: 'Parasitology',
    sampleType: 'Whole Blood',
    container: 'EDTA Tube',
    turnaroundTimeHours: 1,
    priceNaira: 2500,
    referenceRange: 'Negative / No parasite seen',
    isActive: true,
    parameters: [
      { id: 'p1', name: 'Plasmodium falciparum', referenceRange: 'Not Detected', unit: '', fieldType: 'select', options: ['Not Detected', 'Trophozoites (+) Seen', 'Trophozoites (++) Seen', 'Trophozoites (+++) Heavy'] },
      { id: 'p2', name: 'Parasite Density', referenceRange: '0', unit: 'parasites/µL', fieldType: 'number' }
    ]
  },
  {
    id: 'labtest-urn',
    code: 'LAB-URN',
    name: 'Urinalysis (Routine Dipstick & Microscopy)',
    category: 'Urinalysis',
    sampleType: 'Urine',
    container: 'Sterile Bottle',
    turnaroundTimeHours: 1,
    priceNaira: 2000,
    referenceRange: 'Normal',
    isActive: true,
    parameters: [
      { id: 'u1', name: 'Color', referenceRange: 'Straw / Amber', fieldType: 'select', options: ['Straw', 'Yellow', 'Amber', 'Reddish'] },
      { id: 'u2', name: 'Protein', referenceRange: 'Negative', fieldType: 'select', options: ['Negative', 'Trace', '1+', '2+', '3+'] },
      { id: 'u3', name: 'Glucose', referenceRange: 'Negative', fieldType: 'select', options: ['Negative', 'Trace', '1+', '2+'] },
      { id: 'u4', name: 'Nitrite', referenceRange: 'Negative', fieldType: 'select', options: ['Negative', 'Positive'] },
      { id: 'u5', name: 'Leukocytes', referenceRange: 'Negative', fieldType: 'select', options: ['Negative', 'Trace', '1+', '2+'] }
    ]
  },
  {
    id: 'labtest-fbs',
    code: 'LAB-FBS',
    name: 'Fasting Blood Sugar (FBS)',
    category: 'Chemical Pathology',
    sampleType: 'Plasma',
    container: 'Fluoride Bottle',
    turnaroundTimeHours: 1,
    priceNaira: 2000,
    referenceRange: '70 - 110 mg/dL',
    isActive: true,
    parameters: [
      { id: 'fb1', name: 'Fasting Glucose', referenceRange: '70 - 110', unit: 'mg/dL', fieldType: 'number' }
    ]
  },
  {
    id: 'labtest-euc',
    code: 'LAB-EUC',
    name: 'Electrolytes, Urea & Creatinine (E/U/Cr)',
    category: 'Chemical Pathology',
    sampleType: 'Serum',
    container: 'Plain Tube',
    turnaroundTimeHours: 2,
    priceNaira: 8500,
    referenceRange: 'Normal',
    isActive: true,
    parameters: [
      { id: 'e1', name: 'Sodium (Na+)', referenceRange: '135 - 145', unit: 'mmol/L', fieldType: 'number' },
      { id: 'e2', name: 'Potassium (K+)', referenceRange: '3.5 - 5.1', unit: 'mmol/L', fieldType: 'number' },
      { id: 'e3', name: 'Bicarbonate (HCO3-)', referenceRange: '22 - 29', unit: 'mmol/L', fieldType: 'number' },
      { id: 'e4', name: 'Urea', referenceRange: '2.5 - 6.7', unit: 'mmol/L', fieldType: 'number' },
      { id: 'e5', name: 'Creatinine', referenceRange: '60 - 110', unit: 'µmol/L', fieldType: 'number' }
    ]
  }
];

// Complete diagnostic laboratory catalog combining core profiled panels with global tests
export const DEFAULT_LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  ...BASE_LAB_CATALOG,
  ...COMPREHENSIVE_LAB_TESTS.filter(c => !BASE_LAB_CATALOG.some(b => b.code === c.code || b.id === c.id))
];

export const DEFAULT_LAB_ORDERS: LabOrder[] = [
  {
    id: 'labord-101',
    patientId: 'pat-001',
    patientName: 'Chidi Kenneth Okafor',
    mrn: 'TM-2026-0012',
    encounterId: 'enc-001',
    testId: 'labtest-fbc',
    testName: 'Full Blood Count (FBC / CBC)',
    category: 'Haematology',
    accessionNumber: 'ACC-2026-9041',
    sampleType: 'Whole Blood',
    sampleStatus: 'Sample Collected',
    orderStatus: 'PROCESSING',
    sampleCollectorName: 'Phlebotomist Musa Danjuma',
    sampleCollectedAt: '2026-10-03T09:30:00.000Z',
    results: {
      'Haemoglobin (Hb)': { value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'Normal' },
      'Packed Cell Volume (PCV)': { value: '42.1', unit: '%', referenceRange: '37.0 - 54.0', flag: 'Normal' },
      'Total White Cell Count (WBC)': { value: '12.8', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'High' },
      'Platelets': { value: '210', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'Normal' }
    },
    clinicalInterpretation: 'Mild leukocytosis consistent with acute infection/inflammatory response.',
    enteredByName: 'Lab Tech Samuel Oladipo',
    enteredAt: '2026-10-03T09:45:00.000Z',
    priceNaira: 4500,
    billingStatus: 'Paid',
    createdAt: '2026-10-03T09:20:00.000Z'
  },
  {
    id: 'labord-102',
    patientId: 'pat-001',
    patientName: 'Chidi Kenneth Okafor',
    mrn: 'TM-2026-0012',
    encounterId: 'enc-001',
    testId: 'labtest-mp',
    testName: 'Malaria Parasite (MP) Microscopy',
    category: 'Parasitology',
    accessionNumber: 'ACC-2026-9042',
    sampleType: 'Whole Blood',
    sampleStatus: 'Sample Collected',
    orderStatus: 'VALIDATED',
    sampleCollectorName: 'Phlebotomist Musa Danjuma',
    sampleCollectedAt: '2026-10-03T09:30:00.000Z',
    results: {
      'Plasmodium falciparum': { value: 'Trophozoites (++) Seen', referenceRange: 'Not Detected', flag: 'Positive' },
      'Parasite Density': { value: '1850', unit: 'parasites/µL', referenceRange: '0', flag: 'High' }
    },
    clinicalInterpretation: 'Positive for P. falciparum trophozoites (moderate parasitaemia).',
    enteredByName: 'Lab Tech Samuel Oladipo',
    enteredAt: '2026-10-03T09:48:00.000Z',
    validatedByName: 'Dr. Grace Ani (Chief Microbiologist)',
    validatedAt: '2026-10-03T09:55:00.000Z',
    releasedAt: '2026-10-03T09:56:00.000Z',
    reportNumber: 'TM-LAB-2026-00812',
    qrCodeUrl: 'https://tekimed.com/verify?report=TM-LAB-2026-00812',
    priceNaira: 2500,
    billingStatus: 'Paid',
    createdAt: '2026-10-03T09:20:00.000Z'
  }
];

const BASE_IMAGING_CATALOG: ImagingTestCatalogItem[] = [
  {
    id: 'img-cxr',
    code: 'RAD-CXR',
    name: 'Chest X-Ray (PA View)',
    modality: 'X-Ray',
    bodySite: 'Chest / Lungs',
    priceNaira: 8000,
    instructions: 'Remove metallic jewelry and wear hospital gown.'
  },
  {
    id: 'img-uss-abd',
    code: 'RAD-USS-ABD',
    name: 'Abdominopelvic Ultrasound Scan',
    modality: 'Ultrasound',
    bodySite: 'Abdomen & Pelvis',
    priceNaira: 10000,
    instructions: 'Fast for 6 hours; drink 1 liter of water 1 hour prior to scan.'
  },
  {
    id: 'img-ecg',
    code: 'RAD-ECG',
    name: '12-Lead Electrocardiogram (ECG)',
    modality: 'ECG',
    bodySite: 'Heart / Cardiac',
    priceNaira: 6000,
    instructions: 'Relax and avoid strenuous physical effort prior.'
  }
];

// Complete diagnostic imaging catalog combining core modalities with comprehensive scans
export const DEFAULT_IMAGING_TEST_CATALOG: ImagingTestCatalogItem[] = [
  ...BASE_IMAGING_CATALOG,
  ...COMPREHENSIVE_IMAGING_TESTS.filter(c => !BASE_IMAGING_CATALOG.some(b => b.code === c.code || b.id === c.id))
];

export const DEFAULT_IMAGING_ORDERS: ImagingOrder[] = [
  {
    id: 'imgord-201',
    patientId: 'pat-003',
    patientName: 'Olumide Femi Adebayo',
    mrn: 'TM-2026-0014',
    testId: 'img-cxr',
    testName: 'Chest X-Ray (PA View)',
    modality: 'X-Ray',
    bodySite: 'Chest / Lungs',
    orderStatus: 'Approved',
    clinicalIndication: 'Routine pre-employment screening & chronic cough evaluation.',
    techniqueNotes: 'Single erect posteroanterior radiograph of the chest.',
    findingsNotes: 'Lungs are clear bilaterally. No focal lung consolidation, pleural effusion, or pneumothorax. Cardiothoracic ratio is normal (<0.5). Thoracic bony cage appears intact.',
    impressionNotes: 'Normal chest radiograph. No active cardiopulmonary lesion detected.',
    recommendationsNotes: 'Clinical correlation advised.',
    radiologistName: 'Dr. Ibrahim Kyari (Consultant Radiologist)',
    approvedAt: '2026-10-03T10:15:00.000Z',
    reportNumber: 'TM-RAD-2026-00311',
    priceNaira: 8000,
    billingStatus: 'Paid',
    createdAt: '2026-10-03T08:30:00.000Z'
  }
];

export const DEFAULT_WARDS: Ward[] = [
  { id: 'ward-m1', name: 'Male Medical/Surgical Ward', type: 'Male Medical/Surgical', totalBeds: 10, occupiedBeds: 3 },
  { id: 'ward-f1', name: 'Female Medical/Surgical Ward', type: 'Female Medical/Surgical', totalBeds: 10, occupiedBeds: 2 },
  { id: 'ward-ped', name: 'Pediatric Ward', type: 'Pediatric Ward', totalBeds: 6, occupiedBeds: 1 },
  { id: 'ward-mat', name: 'Maternity Ward', type: 'Maternity Ward', totalBeds: 8, occupiedBeds: 4 },
  { id: 'ward-icu', name: 'Intensive Care Unit (ICU)', type: 'ICU', totalBeds: 4, occupiedBeds: 1 }
];

export const DEFAULT_BEDS: Bed[] = [
  { id: 'bed-m1-01', wardId: 'ward-m1', wardName: 'Male Medical/Surgical Ward', bedNumber: 'Bed M-01', status: 'Occupied', patientId: 'pat-003', patientName: 'Olumide Femi Adebayo', admittedAt: '2026-10-02T14:00:00.000Z', dailyRateNaira: 15000 },
  { id: 'bed-m1-02', wardId: 'ward-m1', wardName: 'Male Medical/Surgical Ward', bedNumber: 'Bed M-02', status: 'Available', dailyRateNaira: 15000 },
  { id: 'bed-m1-03', wardId: 'ward-m1', wardName: 'Male Medical/Surgical Ward', bedNumber: 'Bed M-03', status: 'Available', dailyRateNaira: 15000 },
  { id: 'bed-f1-01', wardId: 'ward-f1', wardName: 'Female Medical/Surgical Ward', bedNumber: 'Bed F-01', status: 'Occupied', patientId: 'pat-002', patientName: 'Aisha Bello Abubakar', admittedAt: '2026-10-03T07:30:00.000Z', dailyRateNaira: 15000 },
  { id: 'bed-icu-01', wardId: 'ward-icu', wardName: 'Intensive Care Unit (ICU)', bedNumber: 'ICU-01', status: 'Available', dailyRateNaira: 50000 }
];

export const DEFAULT_ADMISSIONS: AdmissionRecord[] = [
  {
    id: 'adm-301',
    patientId: 'pat-003',
    patientName: 'Olumide Femi Adebayo',
    mrn: 'TM-2026-0014',
    wardId: 'ward-m1',
    wardName: 'Male Medical/Surgical Ward',
    bedId: 'bed-m1-01',
    bedNumber: 'Bed M-01',
    admittingDoctor: 'Dr. Evelyn Vance',
    diagnosis: 'Severe Hyperglycemia / Uncontrolled Type 2 Diabetes',
    status: 'Admitted',
    admittedAt: '2026-10-02T14:00:00.000Z',
    vitalsLog: [
      { bpSystolic: 140, bpDiastolic: 90, pulseRate: 88, temperatureCelsius: 37.1, spO2: 99, bloodGlucoseMgDl: 310, recordedAt: '2026-10-02T14:30:00.000Z', recordedBy: 'Nurse Clara' },
      { bpSystolic: 132, bpDiastolic: 84, pulseRate: 80, temperatureCelsius: 36.8, spO2: 99, bloodGlucoseMgDl: 180, recordedAt: '2026-10-03T08:00:00.000Z', recordedBy: 'Nurse Clara' }
    ],
    nursingNotes: [
      { id: 'nn-1', note: 'Patient admitted via OPD with severe weakness and blood sugar of 310 mg/dL. Soluble insulin sliding scale initiated.', nurseName: 'Nurse Clara', timestamp: '2026-10-02T15:00:00.000Z' },
      { id: 'nn-2', note: 'Blood sugar down to 180 mg/dL. Patient feels much stronger and tolerating oral fluids.', nurseName: 'Nurse Clara', timestamp: '2026-10-03T08:15:00.000Z' }
    ],
    medicationAdmins: [
      { id: 'ma-1', medicationName: 'Soluble Insulin 10 units SC', dosage: '10 units', administeredBy: 'Nurse Clara', timestamp: '2026-10-02T15:30:00.000Z', status: 'Administered' },
      { id: 'ma-2', medicationName: 'Metformin 500mg', dosage: '1 tablet', administeredBy: 'Nurse Clara', timestamp: '2026-10-03T08:30:00.000Z', status: 'Administered' }
    ],
    totalChargeNaira: 45000
  }
];

export const DEFAULT_QUEUE_TICKETS: QueueTicket[] = [
  { id: 'q-101', patientId: 'pat-001', patientName: 'Chidi Kenneth Okafor', mrn: 'TM-2026-0012', ticketNumber: 'Q-101', department: 'Doctor Consultation', priority: 'Urgent', status: 'In Progress', calledBy: 'Dr. Evelyn Vance', estimatedWaitMins: 0, createdAt: '2026-10-03T08:50:00.000Z' },
  { id: 'q-102', patientId: 'pat-002', patientName: 'Aisha Bello Abubakar', mrn: 'TM-2026-0013', ticketNumber: 'Q-102', department: 'Laboratory', priority: 'Normal', status: 'Waiting', estimatedWaitMins: 10, createdAt: '2026-10-03T09:10:00.000Z' },
  { id: 'q-103', patientId: 'pat-003', patientName: 'Olumide Femi Adebayo', mrn: 'TM-2026-0014', ticketNumber: 'Q-103', department: 'Pharmacy', priority: 'Normal', status: 'Waiting', estimatedWaitMins: 5, createdAt: '2026-10-03T09:25:00.000Z' }
];

export const DEFAULT_HOSPITAL_APPOINTMENTS: HospitalAppointment[] = [
  { id: 'apt-01', patientId: 'pat-001', patientName: 'Chidi Kenneth Okafor', mrn: 'TM-2026-0012', doctorId: 'doc-101', doctorName: 'Dr. Evelyn Vance', department: 'General Outpatient (OPD)', appointmentDate: '2026-10-03', timeSlot: '09:00 AM', type: 'General Consultation', status: 'Completed', createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'apt-02', patientId: 'pat-002', patientName: 'Aisha Bello Abubakar', mrn: 'TM-2026-0013', doctorId: 'doc-102', doctorName: 'Dr. Kingsley Agu', department: 'Pulmonology / Asthma Care', appointmentDate: '2026-10-03', timeSlot: '11:30 AM', type: 'Specialist Follow-up', status: 'Checked In', createdAt: '2026-10-02T14:20:00.000Z' },
  { id: 'apt-03', patientId: 'pat-003', patientName: 'Olumide Femi Adebayo', mrn: 'TM-2026-0014', doctorId: 'doc-101', doctorName: 'Dr. Evelyn Vance', department: 'Endocrinology / Diabetes Clinic', appointmentDate: '2026-10-05', timeSlot: '10:00 AM', type: 'Specialist Follow-up', status: 'Scheduled', createdAt: '2026-10-03T08:00:00.000Z' }
];

export const DEFAULT_PATIENT_CHARGES: PatientCharge[] = [
  { id: 'chg-01', patientId: 'pat-001', patientName: 'Chidi Kenneth Okafor', mrn: 'TM-2026-0012', category: 'Consultation Fee', description: 'General Outpatient OPD Consultation Fee', totalAmountNaira: 5000, hmoCoveredNaira: 5000, patientPayableNaira: 0, paymentStatus: 'Paid', createdAt: '2026-10-03T09:00:00.000Z' },
  { id: 'chg-02', patientId: 'pat-001', patientName: 'Chidi Kenneth Okafor', mrn: 'TM-2026-0012', category: 'Lab Investigation', description: 'FBC + Malaria Parasite Microscopy', totalAmountNaira: 7000, hmoCoveredNaira: 7000, patientPayableNaira: 0, paymentStatus: 'Paid', createdAt: '2026-10-03T09:20:00.000Z' },
  { id: 'chg-03', patientId: 'pat-001', patientName: 'Chidi Kenneth Okafor', mrn: 'TM-2026-0012', category: 'Pharmacy Prescription', description: 'Coartem 80/480mg + Paracetamol 500mg', totalAmountNaira: 3700, hmoCoveredNaira: 3700, patientPayableNaira: 0, paymentStatus: 'Paid', createdAt: '2026-10-03T09:30:00.000Z' }
];

export const DEFAULT_HMO_CLAIMS: HMOClaim[] = [
  {
    id: 'hmo-clm-001',
    claimNumber: 'CLM-2026-8801',
    hmoProvider: 'Hygeia HMO',
    patientId: 'pat-001',
    patientName: 'Chidi Kenneth Okafor',
    policyNumber: 'HYG-90812-A',
    totalClaimNaira: 15700,
    status: 'Submitted',
    submissionDate: '2026-10-03',
    items: [
      { description: 'OPD Doctor Consultation Fee', amountNaira: 5000 },
      { description: 'Lab: FBC & Malaria Microscopy', amountNaira: 7000 },
      { description: 'Pharmacy: Coartem + Paracetamol', amountNaira: 3700 }
    ]
  }
];
