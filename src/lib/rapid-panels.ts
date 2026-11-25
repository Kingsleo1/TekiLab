import type { RapidLabParameter } from '../types/tekilab';
export interface RapidPanelPreset {
  id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  tubeColor: string;
  targetTatMinutes: number;
  isQualitative?: boolean;
  parameters: RapidLabParameter[];
}

export const RAPID_TEST_PANELS: RapidPanelPreset[] = [
  {
    id: 'panel-malaria-rdt',
    code: 'MP-RDT',
    name: 'Malaria RDT (P. falciparum / Pan)',
    category: 'Parasitology',
    sampleType: 'Capillary / Venous Blood',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'P. falciparum HRP-II Band', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Pan-Malaria pLDH Band', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Control Line (C)', value: 'Valid', unit: 'QC', referenceRange: 'Valid', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-typhoid-widal',
    code: 'TYP-RDT',
    name: 'Typhoid Rapid IgM / Widal',
    category: 'Serology',
    sampleType: 'Serum / Whole Blood',
    tubeColor: 'Red (Plain)',
    targetTatMinutes: 6,
    isQualitative: true,
    parameters: [
      { name: 'Salmonella Typhi IgM', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Salmonella Typhi O-Titre', value: '1:40', unit: 'Titre', referenceRange: '< 1:80', flag: 'Normal' },
      { name: 'Salmonella Typhi H-Titre', value: '1:40', unit: 'Titre', referenceRange: '< 1:80', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-glucose-hba1c',
    code: 'GLU-A1C',
    name: 'Blood Glucose & HbA1c Rapid',
    category: 'Clinical Chemistry',
    sampleType: 'Fluoride Oxalate Blood',
    tubeColor: 'Grey (Fl-Ox)',
    targetTatMinutes: 5,
    parameters: [
      { name: 'Fasting Blood Glucose', value: '92', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'Normal' },
      { name: 'HbA1c', value: '5.3', unit: '%', referenceRange: '4.0 - 5.6', flag: 'Normal' },
      { name: 'Serum Creatinine (eGFR guard)', value: '0.88', unit: 'mg/dL', referenceRange: '0.60 - 1.20', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-cbc-rapid',
    code: 'CBC-5P',
    name: 'Complete Blood Count (CBC) Rapid',
    category: 'Haematology',
    sampleType: 'Venous Blood',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 5,
    parameters: [
      { name: 'Hemoglobin (Hb)', value: '13.8', unit: 'g/dL', referenceRange: '12.0 - 17.0', flag: 'Normal' },
      { name: 'White Blood Cell (WBC)', value: '6.8', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'Normal' },
      { name: 'Platelets', value: '245', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'Normal' },
      { name: 'Packed Cell Volume (PCV)', value: '41', unit: '%', referenceRange: '36 - 50', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-lipid',
    code: 'LIP-4',
    name: 'Lipid Profile Rapid',
    category: 'Clinical Chemistry',
    sampleType: 'Serum',
    tubeColor: 'Gold (SST)',
    targetTatMinutes: 7,
    parameters: [
      { name: 'Total Cholesterol', value: '182', unit: 'mg/dL', referenceRange: '< 200', flag: 'Normal' },
      { name: 'LDL Cholesterol', value: '96', unit: 'mg/dL', referenceRange: '< 100', flag: 'Normal' },
      { name: 'HDL Cholesterol', value: '54', unit: 'mg/dL', referenceRange: '> 40', flag: 'Normal' },
      { name: 'Triglycerides', value: '128', unit: 'mg/dL', referenceRange: '< 150', flag: 'Normal' }
    ]
  },
  {
    id: 'panel-urine-10',
    code: 'URI-10',
    name: 'Urine Dipstick 10-Param',
    category: 'Urinalysis',
    sampleType: 'Midstream Urine',
    tubeColor: 'Sterile Universal Cup',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'Leukocyte Esterase', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Nitrite', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Urine Protein', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Urine Glucose', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-covid-flu',
    code: 'RESP-3',
    name: 'COVID-19 / Flu A+B Rapid Swab',
    category: 'Virology',
    sampleType: 'Nasopharyngeal Swab',
    tubeColor: 'Viral Transport Buffer',
    targetTatMinutes: 8,
    isQualitative: true,
    parameters: [
      { name: 'SARS-CoV-2 Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Influenza A Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Influenza B Antigen', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-hep-bc',
    code: 'HEP-BC',
    name: 'Hepatitis B (HBsAg) & C Rapid',
    category: 'Serology',
    sampleType: 'Serum / Plasma',
    tubeColor: 'Red (Plain)',
    targetTatMinutes: 6,
    isQualitative: true,
    parameters: [
      { name: 'HBsAg Rapid', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' },
      { name: 'Anti-HCV Rapid', value: 'Negative', unit: 'Qualitative', referenceRange: 'Negative', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-pregnancy',
    code: 'BHCG',
    name: 'Pregnancy β-hCG Rapid',
    category: 'Immunoassay',
    sampleType: 'Urine / Serum',
    tubeColor: 'Sterile Cup / SST',
    targetTatMinutes: 5,
    isQualitative: true,
    parameters: [
      { name: 'Qualitative β-hCG', value: 'Negative', unit: 'mIU/mL', referenceRange: 'Negative (<5)', flag: 'Negative' }
    ]
  },
  {
    id: 'panel-sti',
    code: 'STI-3',
    name: 'STI Rapid Screening (HIV / Syphilis)',
    category: 'Serology',
    sampleType: 'Whole Blood / Serum',
    tubeColor: 'Purple (EDTA)',
    targetTatMinutes: 8,
    isQualitative: true,
    parameters: [
      { name: 'HIV 1/2 Antibody', value: 'Negative', unit: 'Qualitative', referenceRange: 'Non-Reactive', flag: 'Negative' },
      { name: 'Syphilis (Treponema pallidum)', value: 'Negative', unit: 'Qualitative', referenceRange: 'Non-Reactive', flag: 'Negative' }
    ]
  }
];
