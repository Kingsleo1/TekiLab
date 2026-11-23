import { DiagnosisItem, LabTestCatalogItem, ImagingTestCatalogItem } from '../types/pharmacy';

// =============================================================================
// COMPREHENSIVE ICD-10 MEDICAL CONDITIONS & AILMENTS (A - Z)
// =============================================================================
export const COMPREHENSIVE_DIAGNOSES: DiagnosisItem[] = [
  // --- LETTER A ---
  { id: 'dx-a01', letter: 'A', name: 'Acute Appendicitis', code: 'K35.80', category: 'Gastrointestinal', severity: 'Severe', description: 'Acute inflammation of the vermiform appendix requiring surgical evaluation.' },
  { id: 'dx-a02', letter: 'A', name: 'Acute Bronchitis', code: 'J20.9', category: 'Respiratory', severity: 'Mild', description: 'Transient inflammation of the major bronchi, commonly viral.' },
  { id: 'dx-a03', letter: 'A', name: 'Acute Coronary Syndrome (Unstable Angina / NSTEMI)', code: 'I24.9', category: 'Cardiovascular', severity: 'Critical', description: 'Spectrum of conditions compatible with acute myocardial ischaemia.' },
  { id: 'dx-a04', letter: 'A', name: 'Acute Gastroenteritis & Colitis', code: 'A09', category: 'Gastrointestinal', severity: 'Moderate', description: 'Diarrhoeal illness with nausea, vomiting, and abdominal cramps.' },
  { id: 'dx-a05', letter: 'A', name: 'Acute Kidney Injury (AKI)', code: 'N17.9', category: 'Renal & Urology', severity: 'Severe', description: 'Rapid reduction in kidney function resulting in retention of urea and nitrogenous waste.' },
  { id: 'dx-a06', letter: 'A', name: 'Acute Otitis Media', code: 'H66.90', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Suppurative infection of the middle ear cleft, common in paediatric patients.' },
  { id: 'dx-a07', letter: 'A', name: 'Acute Pancreatitis', code: 'K85.90', category: 'Gastrointestinal', severity: 'Severe', description: 'Inflammatory disorder of the pancreas with elevated lipase and amylase.' },
  { id: 'dx-a08', letter: 'A', name: 'Acute Pharyngitis & Tonsillitis', code: 'J02.9', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Sore throat, erythema of pharyngeal mucosa, and tonsillar exudates.' },
  { id: 'dx-a09', letter: 'A', name: 'Acute Sinusitis (Rhinosinusitis)', code: 'J01.90', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Inflammation of paranasal sinuses causing nasal congestion and facial pain.' },
  { id: 'dx-a10', letter: 'A', name: 'Acute Upper Respiratory Tract Infection (URTI)', code: 'J06.9', category: 'Respiratory', severity: 'Mild', description: 'Common viral infection of upper respiratory passages.' },
  { id: 'dx-a11', letter: 'A', name: 'Allergic Rhinitis (Hay Fever)', code: 'J30.9', category: 'Immunology', severity: 'Mild', description: 'IgE-mediated inflammatory condition of the nasal mucosa.' },
  { id: 'dx-a12', letter: 'A', name: 'Alzheimer Disease with Late Onset', code: 'G30.9', category: 'Neurology', severity: 'Severe', description: 'Neurodegenerative disease characterized by progressive cognitive decline.' },
  { id: 'dx-a13', letter: 'A', name: 'Amoebiasis (Amoebic Dysentery)', code: 'A06.0', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Entamoeba histolytica infection causing blood-stained mucoid stool.' },
  { id: 'dx-a14', letter: 'A', name: 'Anaemia - Iron Deficiency', code: 'D50.9', category: 'Haematology', severity: 'Moderate', description: 'Microcytic hypochromic anaemia caused by inadequate body iron stores.' },
  { id: 'dx-a15', letter: 'A', name: 'Ankylosing Spondylitis', code: 'M45.9', category: 'Musculoskeletal', severity: 'Moderate', description: 'Chronic inflammatory arthritis primarily affecting the spine and sacroiliac joints.' },
  { id: 'dx-a16', letter: 'A', name: 'Anxiety Disorder - Generalized (GAD)', code: 'F41.1', category: 'Mental Health', severity: 'Moderate', description: 'Persistent and excessive worry interfering with daily functioning.' },
  { id: 'dx-a17', letter: 'A', name: 'Ascariasis (Roundworm Infestation)', code: 'B77.9', category: 'Infectious & Parasitic', severity: 'Mild', description: 'Intestinal nematode infection by Ascaris lumbricoides.' },
  { id: 'dx-a18', letter: 'A', name: 'Asthma - Bronchial (Acute Exacerbation)', code: 'J45.901', category: 'Respiratory', severity: 'Severe', description: 'Reversible bronchospasm with wheezing, chest tightness, and dyspnoea.' },
  { id: 'dx-a19', letter: 'A', name: 'Atopic Dermatitis / Eczema', code: 'L20.9', category: 'Dermatology', severity: 'Mild', description: 'Pruritic, inflammatory chronic skin condition with xerosis.' },
  { id: 'dx-a20', letter: 'A', name: 'Atrial Fibrillation (Paroxysmal / Chronic)', code: 'I48.91', category: 'Cardiovascular', severity: 'Moderate', description: 'Supraventricular tachyarrhythmia with uncoordinated atrial activation.' },

  // --- LETTER B ---
  { id: 'dx-b01', letter: 'B', name: 'Bacterial Meningitis', code: 'G00.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Pyogenic infection of the subarachnoid space and meninges.' },
  { id: 'dx-b02', letter: 'B', name: 'Bacterial Vaginosis', code: 'N76.0', category: 'Obstetrics & Gynaecology', severity: 'Mild', description: 'Dysbiosis of vaginal flora with Gardnerella vaginalis overgrowth.' },
  { id: 'dx-b03', letter: 'B', name: "Bell's Palsy (Idiopathic Facial Paresis)", code: 'G51.0', category: 'Neurology', severity: 'Moderate', description: 'Unilateral lower motor neuron paralysis of the seventh cranial nerve.' },
  { id: 'dx-b04', letter: 'B', name: 'Benign Prostatic Hyperplasia (BPH)', code: 'N40.0', category: 'Renal & Urology', severity: 'Moderate', description: 'Non-malignant enlargement of prostate gland causing lower urinary tract symptoms.' },
  { id: 'dx-b05', letter: 'B', name: 'Biliary Colic / Cholelithiasis', code: 'K80.20', category: 'Gastrointestinal', severity: 'Moderate', description: 'Episodic right upper quadrant pain from gallbladder calculi.' },
  { id: 'dx-b06', letter: 'B', name: 'Bipolar Affective Disorder', code: 'F31.9', category: 'Mental Health', severity: 'Severe', description: 'Episodic shifts in mood, energy, and activity levels between mania and depression.' },
  { id: 'dx-b07', letter: 'B', name: 'Blepharitis & Meibomian Gland Dysfunction', code: 'H01.00', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Chronic inflammation of eyelid margins.' },
  { id: 'dx-b08', letter: 'B', name: 'Bronchiectasis', code: 'J47.9', category: 'Respiratory', severity: 'Moderate', description: 'Permanent, abnormal dilation of bronchi with chronic purulent sputum.' },
  { id: 'dx-b09', letter: 'B', name: 'Bronchiolitis (Acute Paediatric)', code: 'J21.9', category: 'Paediatrics', severity: 'Moderate', description: 'Viral lower respiratory tract infection in infants, predominantly RSV.' },
  { id: 'dx-b10', letter: 'B', name: 'Brucellosis', code: 'A23.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Zoonotic bacterial infection causing undulant fever, sweats, and arthralgia.' },

  // --- LETTER C ---
  { id: 'dx-c01', letter: 'C', name: 'Candidiasis - Oral / Oesophageal / Vulvovaginal', code: 'B37.9', category: 'Infectious & Parasitic', severity: 'Mild', description: 'Fungal infection caused by Candida albicans species.' },
  { id: 'dx-c02', letter: 'C', name: 'Carpal Tunnel Syndrome', code: 'G56.00', category: 'Neurology', severity: 'Mild', description: 'Median nerve entrapment neuropathy at the flexor retinaculum of the wrist.' },
  { id: 'dx-c03', letter: 'C', name: 'Cataract - Senile / Age-Related', code: 'H26.9', category: 'ENT & Ophthalmology', severity: 'Moderate', description: 'Opacification of the ocular crystalline lens leading to visual impairment.' },
  { id: 'dx-c04', letter: 'C', name: 'Cellulitis - Acute Bacterial Skin Infection', code: 'L03.90', category: 'Dermatology', severity: 'Moderate', description: 'Spreading bacterial infection of deep dermis and subcutaneous tissues.' },
  { id: 'dx-c05', letter: 'C', name: 'Cervical Spondylosis with Radiculopathy', code: 'M47.812', category: 'Musculoskeletal', severity: 'Moderate', description: 'Degenerative osteoarthritis of the cervical spine causing neck pain and numbness.' },
  { id: 'dx-c06', letter: 'C', name: 'Chickenpox (Varicella Zoster Virus)', code: 'B01.9', category: 'Infectious & Parasitic', severity: 'Mild', description: 'Contagious primary infection presenting with generalized vesicular rash.' },
  { id: 'dx-c07', letter: 'C', name: 'Chlamydia Trachomatis Genital Infection', code: 'A56.2', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Sexually transmitted bacterial infection of the urogenital tract.' },
  { id: 'dx-c08', letter: 'C', name: 'Cholecystitis - Acute Calculous', code: 'K81.0', category: 'Gastrointestinal', severity: 'Severe', description: 'Inflammation of the gallbladder wall, typically secondary to cystic duct obstruction.' },
  { id: 'dx-c09', letter: 'C', name: 'Cholera (Vibrio cholerae)', code: 'A00.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Acute secretor diarrhoeal illness causing rapid profound dehydration.' },
  { id: 'dx-c10', letter: 'C', name: 'Chronic Kidney Disease (CKD Stages 1-5)', code: 'N18.9', category: 'Renal & Urology', severity: 'Severe', description: 'Progressive loss of renal parenchyma and estimated GFR over 3+ months.' },
  { id: 'dx-c11', letter: 'C', name: 'Chronic Obstructive Pulmonary Disease (COPD)', code: 'J44.9', category: 'Respiratory', severity: 'Severe', description: 'Persistent airflow limitation associated with chronic bronchitis and emphysema.' },
  { id: 'dx-c12', letter: 'C', name: 'Cirrhosis of Liver (Decompensated / Compensated)', code: 'K74.60', category: 'Gastrointestinal', severity: 'Severe', description: 'End-stage diffuse hepatic fibrosis with regenerative nodules.' },
  { id: 'dx-c13', letter: 'C', name: 'Colorectal Adenocarcinoma', code: 'C18.9', category: 'Oncology', severity: 'Severe', description: 'Malignant neoplasm of the colon or rectum.' },
  { id: 'dx-c14', letter: 'C', name: 'Congestive Cardiac Failure (CCF / HFpEF / HFrEF)', code: 'I50.9', category: 'Cardiovascular', severity: 'Severe', description: 'Impairment of ventricular filling or ejection causing pulmonary/peripheral congestion.' },
  { id: 'dx-c15', letter: 'C', name: 'Conjunctivitis - Acute Infectious / Allergic', code: 'H10.9', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Hyperaemia and inflammation of conjunctival membranes.' },
  { id: 'dx-c16', letter: 'C', name: 'Coronary Artery Atherosclerotic Disease', code: 'I25.10', category: 'Cardiovascular', severity: 'Severe', description: 'Stenosis of epicardial coronary arteries by atherosclerotic plaques.' },
  { id: 'dx-c17', letter: 'C', name: 'COVID-19 Acute Respiratory Infection', code: 'U07.1', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'SARS-CoV-2 viral syndrome ranging from mild URI to pneumonia.' },
  { id: 'dx-c18', letter: 'C', name: "Crohn's Disease (Regional Enteritis)", code: 'K50.90', category: 'Gastrointestinal', severity: 'Moderate', description: 'Transmural granulomatous inflammatory bowel disease with skip lesions.' },
  { id: 'dx-c19', letter: 'C', name: 'Cushing Syndrome (Hypercortisolism)', code: 'E24.9', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Clinical state resulting from prolonged systemic elevation of free glucocorticoids.' },
  { id: 'dx-c20', letter: 'C', name: 'Cystitis - Acute Uncomplicated (UTI)', code: 'N30.00', category: 'Renal & Urology', severity: 'Mild', description: 'Bacterial infection of urinary bladder causing dysuria, urgency, and frequency.' },

  // --- LETTER D ---
  { id: 'dx-d01', letter: 'D', name: 'Deep Vein Thrombosis (DVT) of Lower Extremity', code: 'I82.40', category: 'Cardiovascular', severity: 'Severe', description: 'Formation of blood clots in deep venous system with risk of pulmonary embolism.' },
  { id: 'dx-d02', letter: 'D', name: 'Dengue Fever / Dengue Haemorrhagic Fever', code: 'A90', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Arboviral infection transmitted by Aedes mosquitoes causing breakbone fever.' },
  { id: 'dx-d03', letter: 'D', name: 'Depression - Major Depressive Disorder (MDD)', code: 'F32.9', category: 'Mental Health', severity: 'Moderate', description: 'Persistent low mood, anhedonia, fatigue, and feelings of worthlessness.' },
  { id: 'dx-d04', letter: 'D', name: 'Dermatophytosis (Tinea Corporis / Cruris / Pedis)', code: 'B35.9', category: 'Dermatology', severity: 'Mild', description: 'Superficial fungal ringworm infection of skin.' },
  { id: 'dx-d05', letter: 'D', name: 'Diabetic Ketoacidosis (DKA)', code: 'E11.10', category: 'Endocrinology & Metabolic', severity: 'Critical', description: 'Life-threatening acute metabolic decompensation with severe ketonaemia and acidosis.' },
  { id: 'dx-d06', letter: 'D', name: 'Diabetes Mellitus - Type 1 (Insulin Dependent)', code: 'E10.9', category: 'Endocrinology & Metabolic', severity: 'Severe', description: 'Autoimmune destruction of pancreatic beta cells causing absolute insulin deficiency.' },
  { id: 'dx-d07', letter: 'D', name: 'Diabetes Mellitus - Type 2 (Non-Insulin Dependent)', code: 'E11.9', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Metabolic disorder of progressive insulin resistance and relative secretory defect.' },
  { id: 'dx-d08', letter: 'D', name: 'Diverticulitis of Large Intestine', code: 'K57.92', category: 'Gastrointestinal', severity: 'Moderate', description: 'Micro-perforation and acute inflammation of colonic diverticula.' },
  { id: 'dx-d09', letter: 'D', name: 'Dyslipidaemia / Mixed Hyperlipidaemia', code: 'E78.5', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Elevated total cholesterol, triglycerides, LDL, or depressed HDL.' },
  { id: 'dx-d10', letter: 'D', name: 'Dyspepsia / Functional Indigestion', code: 'K30', category: 'Gastrointestinal', severity: 'Mild', description: 'Epigastric fullness, postprandial distress, and early satiety.' },

  // --- LETTER E ---
  { id: 'dx-e01', letter: 'E', name: 'Encephalitis - Viral / Autoimmune', code: 'G04.90', category: 'Neurology', severity: 'Critical', description: 'Acute inflammation of brain parenchyma with altered mental state.' },
  { id: 'dx-e02', letter: 'E', name: 'Endometriosis - Pelvic / Ovarian', code: 'N80.9', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Ectopic endometrial glands and stroma outside uterine cavity.' },
  { id: 'dx-e03', letter: 'E', name: 'Enteric Fever / Typhoid Fever (Salmonella Typhi)', code: 'A01.00', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Systemic bacterial infection characterized by step-ladder fever and bacteremia.' },
  { id: 'dx-e04', letter: 'E', name: 'Epilepsy - Recurrent Unprovoked Seizures', code: 'G40.909', category: 'Neurology', severity: 'Severe', description: 'Brain disorder causing predisposition to recurrent unprovoked paroxysmal seizures.' },
  { id: 'dx-e05', letter: 'E', name: 'Epistaxis (Anterior / Posterior Bleeding)', code: 'R04.0', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Hemorrhage from nasal mucosa, commonly Kiesselbach plexus.' },
  { id: 'dx-e06', letter: 'E', name: 'Erectile Dysfunction - Organic / Psychogenic', code: 'N52.9', category: 'Renal & Urology', severity: 'Mild', description: 'Inability to achieve or maintain penile erection sufficient for intercourse.' },
  { id: 'dx-e07', letter: 'E', name: 'Erysipelas', code: 'A46', category: 'Dermatology', severity: 'Moderate', description: 'Acute superficial cellulitis with marked lymphatic involvement, sharply demarcated.' },
  { id: 'dx-e08', letter: 'E', name: 'Essential Primary Hypertension', code: 'I10', category: 'Cardiovascular', severity: 'Moderate', description: 'Persistently elevated arterial pressure without identifiable secondary etiology.' },

  // --- LETTER F ---
  { id: 'dx-f01', letter: 'F', name: 'Fatty Liver Disease (NAFLD / NASH)', code: 'K76.0', category: 'Gastrointestinal', severity: 'Moderate', description: 'Excessive triglyceride accumulation within hepatocytes in absence of alcohol.' },
  { id: 'dx-f02', letter: 'F', name: 'Febrile Convulsion / Seizure (Simple / Complex)', code: 'R56.00', category: 'Paediatrics', severity: 'Moderate', description: 'Seizure associated with febrile illness in young children aged 6 months - 5 years.' },
  { id: 'dx-f03', letter: 'F', name: 'Fibromyalgia Syndrome', code: 'M79.7', category: 'Musculoskeletal', severity: 'Moderate', description: 'Chronic widespread musculoskeletal pain with tender trigger points and fatigue.' },
  { id: 'dx-f04', letter: 'F', name: 'Filariasis - Lymphatic (Elephantiasis)', code: 'B74.9', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Mosquito-borne nematode infection causing chronic lymphatic obstruction.' },
  { id: 'dx-f05', letter: 'F', name: 'Folliculitis & Furunculosis', code: 'L73.9', category: 'Dermatology', severity: 'Mild', description: 'Infection and inflammation of hair follicles, often Staphylococcal.' },
  { id: 'dx-f06', letter: 'F', name: 'Food Poisoning - Acute Toxin-Mediated', code: 'A05.9', category: 'Gastrointestinal', severity: 'Moderate', description: 'Ingestion of pre-formed bacterial enterotoxins (Staph, B. cereus).' },
  { id: 'dx-f07', letter: 'F', name: 'Frozen Shoulder (Adhesive Capsulitis)', code: 'M75.00', category: 'Musculoskeletal', severity: 'Moderate', description: 'Painful restriction of active and passive glenohumeral range of motion.' },

  // --- LETTER G ---
  { id: 'dx-g01', letter: 'G', name: 'Gastric Peptic Ulcer Disease', code: 'K25.9', category: 'Gastrointestinal', severity: 'Moderate', description: 'Mucosal defect in stomach wall penetrating through muscularis mucosae.' },
  { id: 'dx-g02', letter: 'G', name: 'Gastritis - Acute / Chronic H. pylori', code: 'K29.70', category: 'Gastrointestinal', severity: 'Mild', description: 'Inflammation of gastric lining associated with Helicobacter pylori or NSAIDs.' },
  { id: 'dx-g03', letter: 'G', name: 'Gastro-Oesophageal Reflux Disease (GERD)', code: 'K21.9', category: 'Gastrointestinal', severity: 'Mild', description: 'Retrograde flow of gastric contents into oesophagus causing heartburn.' },
  { id: 'dx-g04', letter: 'G', name: 'Giardiasis (Giardia duodenalis)', code: 'A07.1', category: 'Infectious & Parasitic', severity: 'Mild', description: 'Protozoan infection of small intestine causing greasy stools and bloating.' },
  { id: 'dx-g05', letter: 'G', name: 'Glaucoma - Primary Open Angle (POAG)', code: 'H40.10', category: 'ENT & Ophthalmology', severity: 'Severe', description: 'Optic neuropathy with characteristic visual field defects and elevated IOP.' },
  { id: 'dx-g06', letter: 'G', name: 'Glomerulonephritis - Acute Post-Infectious', code: 'N05.9', category: 'Renal & Urology', severity: 'Severe', description: 'Immune complex-mediated glomerular inflammation causing haematuria and edema.' },
  { id: 'dx-g07', letter: 'G', name: 'Gout & Hyperuricaemic Arthropathy', code: 'M10.9', category: 'Musculoskeletal', severity: 'Moderate', description: 'Deposition of monosodium urate monohydrate crystals in synovial joints.' },
  { id: 'dx-g08', letter: 'G', name: 'Graves Disease (Autoimmune Hyperthyroidism)', code: 'E05.00', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'TSH receptor autoantibodies stimulating excessive thyroid hormone production.' },

  // --- LETTER H ---
  { id: 'dx-h01', letter: 'H', name: 'Haemorrhoids - Internal / External Thrombosed', code: 'K64.9', category: 'Gastrointestinal', severity: 'Mild', description: 'Dilated vascular anal cushions causing rectal bleeding and discomfort.' },
  { id: 'dx-h02', letter: 'H', name: "Hashimoto's Autoimmune Thyroiditis", code: 'E06.3', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Autoimmune chronic thyroid inflammation leading to primary hypothyroidism.' },
  { id: 'dx-h03', letter: 'H', name: 'Hepatitis B Virus Infection - Chronic', code: 'B18.1', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Persistent HBsAg seropositivity for >6 months with risk of cirrhosis.' },
  { id: 'dx-h04', letter: 'H', name: 'Hepatitis C Virus Infection (HCV)', code: 'B18.2', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Blood-borne viral hepatitis with high rate of chronicity and hepatic fibrosis.' },
  { id: 'dx-h05', letter: 'H', name: 'Herpes Zoster (Shingles) & Postherpetic Neuralgia', code: 'B02.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Reactivation of dormant varicella-zoster virus in dorsal root ganglion.' },
  { id: 'dx-h06', letter: 'H', name: 'HIV Infection - Clinical Stage 1-4', code: 'B20', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Human immunodeficiency virus infection with progressive CD4 decline.' },
  { id: 'dx-h07', letter: 'H', name: 'Hyperemesis Gravidarum', code: 'O21.0', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Intractable vomiting of pregnancy causing ketosis and electrolyte imbalance.' },
  { id: 'dx-h08', letter: 'H', name: 'Hypertensive Heart Disease with Heart Failure', code: 'I11.9', category: 'Cardiovascular', severity: 'Severe', description: 'Concentric left ventricular hypertrophy secondary to chronic high afterload.' },

  // --- LETTER I ---
  { id: 'dx-i01', letter: 'I', name: 'Impetigo Contagiosa', code: 'L01.00', category: 'Dermatology', severity: 'Mild', description: 'Contagious superficial bacterial skin infection with honey-coloured crusts.' },
  { id: 'dx-i02', letter: 'I', name: 'Infective Endocarditis - Subacute / Acute', code: 'I33.0', category: 'Cardiovascular', severity: 'Critical', description: 'Microbial infection of heart valves or mural endocardium.' },
  { id: 'dx-i03', letter: 'I', name: 'Infertility - Primary / Secondary', code: 'N97.9', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Failure to achieve pregnancy after 12+ months of regular unprotected intercourse.' },
  { id: 'dx-i04', letter: 'I', name: 'Influenza (Seasonal Flu Syndrome)', code: 'J11.1', category: 'Respiratory', severity: 'Mild', description: 'Acute respiratory illness caused by influenza A or B viruses.' },
  { id: 'dx-i05', letter: 'I', name: 'Inguinal Hernia - Indirect / Direct', code: 'K40.90', category: 'Gastrointestinal', severity: 'Moderate', description: 'Protrusion of abdominal cavity contents through inguinal canal.' },
  { id: 'dx-i06', letter: 'I', name: 'Intestinal Obstruction - Mechanical / Paralytic', code: 'K56.60', category: 'Gastrointestinal', severity: 'Severe', description: 'Blockage of intestinal lumen preventing normal transit of contents.' },
  { id: 'dx-i07', letter: 'I', name: 'Iron Deficiency Anaemia - Severe', code: 'D50.0', category: 'Haematology', severity: 'Moderate', description: 'Significant reduction in haemoglobin due to blood loss or malnutrition.' },
  { id: 'dx-i08', letter: 'I', name: 'Irritable Bowel Syndrome (IBS)', code: 'K58.9', category: 'Gastrointestinal', severity: 'Mild', description: 'Recurrent abdominal pain associated with defecation and altered stool form.' },
  { id: 'dx-i09', letter: 'I', name: 'Ischaemic Stroke / Cerebrovascular Accident', code: 'I63.9', category: 'Neurology', severity: 'Critical', description: 'Focal neurological deficit from sudden occlusion of cerebral arterial supply.' },

  // --- LETTER J ---
  { id: 'dx-j01', letter: 'J', name: 'Jaundice - Unspecified (Obstructive / Hepatic)', code: 'R17', category: 'Gastrointestinal', severity: 'Moderate', description: 'Yellowish pigmentation of skin and sclerae from hyperbilirubinaemia.' },
  { id: 'dx-j02', letter: 'J', name: 'Juvenile Idiopathic Arthritis (JIA)', code: 'M08.00', category: 'Paediatrics', severity: 'Moderate', description: 'Persistent joint inflammation in children under 16 years of age.' },

  // --- LETTER K ---
  { id: 'dx-k01', letter: 'K', name: 'Keratitis - Microbial Corneal Ulcer', code: 'H16.9', category: 'ENT & Ophthalmology', severity: 'Moderate', description: 'Inflammation and ulceration of the cornea posing threat to vision.' },
  { id: 'dx-k02', letter: 'K', name: 'Kwashiorkor - Protein Energy Malnutrition', code: 'E40', category: 'Paediatrics', severity: 'Severe', description: 'Severe protein malnutrition with peripheral oedema and hepatomegaly.' },

  // --- LETTER L ---
  { id: 'dx-l01', letter: 'L', name: 'Lassa Fever (Viral Haemorrhagic Fever)', code: 'A96.2', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Arenavirus infection transmitted by multimammate rats causing capillary leak.' },
  { id: 'dx-l02', letter: 'L', name: 'Leukaemia - Acute Myeloid / Lymphoid (AML / ALL)', code: 'C95.90', category: 'Oncology', severity: 'Critical', description: 'Malignant proliferation of clonal haematopoietic stem cells.' },
  { id: 'dx-l03', letter: 'L', name: 'Lumbar Spondylosis with Sciatica', code: 'M47.816', category: 'Musculoskeletal', severity: 'Moderate', description: 'Lumbosacral disc degeneration with nerve root impingement.' },
  { id: 'dx-l04', letter: 'L', name: 'Lupus Erythematosus - Systemic (SLE)', code: 'M32.9', category: 'Immunology', severity: 'Severe', description: 'Chronic multisystem autoimmune disease with antinuclear antibodies.' },

  // --- LETTER M ---
  { id: 'dx-m01', letter: 'M', name: 'Malaria - Acute Uncomplicated (P. falciparum)', code: 'B50.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Intraerythrocytic protozoan infection with fever, rigors, and splenomegaly.' },
  { id: 'dx-m02', letter: 'M', name: 'Malaria - Severe / Cerebral Malaria', code: 'B50.0', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Complicated falciparum malaria with impaired consciousness or acidosis.' },
  { id: 'dx-m03', letter: 'M', name: 'Measles (Morbilli Virus)', code: 'B05.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Paramyxovirus infection with fever, coryza, cough, Koplik spots, and maculopapular rash.' },
  { id: 'dx-m04', letter: 'M', name: 'Meningitis - Acute Bacterial / Aseptic', code: 'G03.9', category: 'Neurology', severity: 'Critical', description: 'Infection of arachnoid membrane and CSF producing neck stiffness and photophobia.' },
  { id: 'dx-m05', letter: 'M', name: 'Migraine - with / without Aura', code: 'G43.909', category: 'Neurology', severity: 'Moderate', description: 'Neurovascular headache disorder with throbbing pain, photophobia, and nausea.' },
  { id: 'dx-m06', letter: 'M', name: 'Myocardial Infarction - Acute (STEMI / NSTEMI)', code: 'I21.9', category: 'Cardiovascular', severity: 'Critical', description: 'Ischaemic necrosis of cardiac muscle following coronary thrombotic occlusion.' },

  // --- LETTER N ---
  { id: 'dx-n01', letter: 'N', name: 'Neonatal Jaundice (Physiological / Pathological)', code: 'P59.9', category: 'Paediatrics', severity: 'Moderate', description: 'Hyperbilirubinaemia in newborns requiring phototherapy monitoring.' },
  { id: 'dx-n02', letter: 'N', name: 'Neonatal Sepsis - Early / Late Onset', code: 'P36.9', category: 'Paediatrics', severity: 'Critical', description: 'Systemic bacterial bloodstream infection occurring in first 28 days of life.' },
  { id: 'dx-n03', letter: 'N', name: 'Nephrotic Syndrome - Idiopathic / Minimal Change', code: 'N04.9', category: 'Renal & Urology', severity: 'Severe', description: 'Massive proteinuria (>3.5g/day), severe hypoalbuminaemia, and generalized oedema.' },
  { id: 'dx-n04', letter: 'N', name: 'Nephrolithiasis (Renal Calculi / Kidney Stones)', code: 'N20.0', category: 'Renal & Urology', severity: 'Moderate', description: 'Crystalline concretions in renal pelvis or ureter producing acute renal colic.' },

  // --- LETTER O ---
  { id: 'dx-o01', letter: 'O', name: 'Osteoarthritis of Knee / Hip Joint', code: 'M17.9', category: 'Musculoskeletal', severity: 'Moderate', description: 'Degenerative joint disease with cartilage loss, osteophytes, and joint narrowing.' },
  { id: 'dx-o02', letter: 'O', name: 'Osteomyelitis - Acute / Chronic Pyogenic', code: 'M86.9', category: 'Musculoskeletal', severity: 'Severe', description: 'Infection and inflammatory destruction of cortical bone and marrow.' },
  { id: 'dx-o03', letter: 'O', name: 'Otitis Externa (Outer Ear Canal Infection)', code: 'H60.90', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Infection of external auditory meatus with erythema and ear canal oedema.' },
  { id: 'dx-o04', letter: 'O', name: 'Ovarian Cyst - Functional / Haemorrhagic', code: 'N83.20', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Fluid-filled sac on ovary, often physiological or endometriotic.' },

  // --- LETTER P ---
  { id: 'dx-p01', letter: 'P', name: 'Pelvic Inflammatory Disease (PID)', code: 'N73.9', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Ascending infection of female upper genital tract (uterus, fallopian tubes, ovaries).' },
  { id: 'dx-p02', letter: 'P', name: 'Peptic Ulcer Disease (PUD)', code: 'K27.9', category: 'Gastrointestinal', severity: 'Moderate', description: 'Ulceration of gastric or duodenal mucosa due to acid, pepsin, or H. pylori.' },
  { id: 'dx-p03', letter: 'P', name: 'Pneumonia - Community-Acquired (CAP)', code: 'J18.9', category: 'Respiratory', severity: 'Severe', description: 'Acute consolidation of lung parenchyma caused by pathogenic bacteria or viruses.' },
  { id: 'dx-p04', letter: 'P', name: 'Polycystic Ovary Syndrome (PCOS)', code: 'E28.2', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Endocrine disorder characterized by hyperandrogenism, ovulatory dysfunction, and polycystic ovaries.' },
  { id: 'dx-p05', letter: 'P', name: 'Pre-eclampsia in Pregnancy', code: 'O14.90', category: 'Obstetrics & Gynaecology', severity: 'Severe', description: 'Gestational hypertension and significant proteinuria arising after 20 weeks gestation.' },
  { id: 'dx-p06', letter: 'P', name: 'Prostatitis - Acute Bacterial / Chronic', code: 'N41.0', category: 'Renal & Urology', severity: 'Moderate', description: 'Infection and swelling of prostate gland causing perineal pain and dysuria.' },
  { id: 'dx-p07', letter: 'P', name: 'Psoriasis Vulgaris (Plaque Psoriasis)', code: 'L40.0', category: 'Dermatology', severity: 'Moderate', description: 'Immune-mediated dermatosis producing erythematous silvery scaling plaques.' },
  { id: 'dx-p08', letter: 'P', name: 'Pulmonary Embolism (PE)', code: 'I26.99', category: 'Cardiovascular', severity: 'Critical', description: 'Thromboembolic occlusion of one or more pulmonary arteries.' },
  { id: 'dx-p09', letter: 'P', name: 'Pulmonary Tuberculosis (PTB - Sputum Smear Positive)', code: 'A15.0', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Mycobacterium tuberculosis infection causing chronic cough, haemoptysis, and night sweats.' },
  { id: 'dx-p10', letter: 'P', name: 'Pyelonephritis - Acute Upper UTI', code: 'N10', category: 'Renal & Urology', severity: 'Severe', description: 'Bacterial infection of renal parenchyma and pelvis with loin pain and rigors.' },

  // --- LETTER Q ---
  { id: 'dx-q01', letter: 'Q', name: 'Q Fever (Coxiella burnetii Infection)', code: 'A78', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Zoonotic intracellular bacterial infection causing high fever, chills, and atypical pneumonia.' },
  { id: 'dx-q02', letter: 'Q', name: 'Quinsy (Peritonsillar Abscess)', code: 'J36', category: 'ENT & Ophthalmology', severity: 'Severe', description: 'Collection of pus between tonsillar capsule and superior pharyngeal constrictor muscle.' },

  // --- LETTER R ---
  { id: 'dx-r01', letter: 'R', name: 'Rabies Virus Encephalomyelitis', code: 'A82.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Fatal rhabdovirus zoonotic neurotropic infection transmitted by animal bites.' },
  { id: 'dx-r02', letter: 'R', name: 'Rheumatoid Arthritis (Seropositive / Seronegative)', code: 'M05.9', category: 'Musculoskeletal', severity: 'Moderate', description: 'Symmetric erosive polyarthritis targeting synovial joints with rheumatoid factor.' },
  { id: 'dx-r03', letter: 'R', name: 'Rickets - Nutritional Vitamin D Deficiency', code: 'E55.0', category: 'Paediatrics', severity: 'Moderate', description: 'Defective mineralization of growing bone plates in children.' },

  // --- LETTER S ---
  { id: 'dx-s01', letter: 'S', name: 'Scabies Ectoparasitic Infestation', code: 'B86', category: 'Dermatology', severity: 'Mild', description: 'Infestation by Sarcoptes scabiei causing intense nocturnal pruritus and burrows.' },
  { id: 'dx-s02', letter: 'S', name: 'Schistosomiasis (Urinary / Intestinal Bilharzia)', code: 'B65.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Parasitic flatworm infection causing terminal haematuria or portal hypertension.' },
  { id: 'dx-s03', letter: 'S', name: 'Sepsis - Systemic Inflammatory Response', code: 'A41.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Life-threatening organ dysfunction caused by a dysregulated host response to infection.' },
  { id: 'dx-s04', letter: 'S', name: 'Sickle Cell Disease - Vaso-occlusive Crisis (HbSS)', code: 'D57.00', category: 'Haematology', severity: 'Severe', description: 'Inherited haemoglobinopathy causing microvascular occlusion and acute bone pain.' },
  { id: 'dx-s05', letter: 'S', name: 'Sinusitis - Chronic Hyperplastic', code: 'J32.9', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Persistent mucosal sinus inflammation lasting >12 consecutive weeks.' },
  { id: 'dx-s06', letter: 'S', name: 'Stroke - Haemorrhagic (Intracerebral / Subarachnoid)', code: 'I61.9', category: 'Neurology', severity: 'Critical', description: 'Intracranial bleeding producing sudden neurological deficit.' },
  { id: 'dx-s07', letter: 'S', name: 'Systemic Lupus Erythematosus (SLE)', code: 'M32.9', category: 'Immunology', severity: 'Severe', description: 'Prototypical autoimmune multisystem disease with immune complex deposition.' },

  // --- LETTER T ---
  { id: 'dx-t01', letter: 'T', name: 'Tetanus Infection (Clostridium tetani)', code: 'A35', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Neurotoxin-mediated disease causing trismus (lockjaw) and severe muscle spasms.' },
  { id: 'dx-t02', letter: 'T', name: 'Tonsillitis - Acute Follicular / Membranous', code: 'J03.90', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Acute bacterial infection of palatine tonsils.' },
  { id: 'dx-t03', letter: 'T', name: 'Transient Ischaemic Attack (TIA)', code: 'G45.9', category: 'Neurology', severity: 'Severe', description: 'Brief episode of neurological dysfunction without acute infarction.' },
  { id: 'dx-t04', letter: 'T', name: 'Trichomoniasis (Trichomonas vaginalis)', code: 'A59.9', category: 'Infectious & Parasitic', severity: 'Mild', description: 'Flagellated protozoan sexually transmitted infection causing vaginitis.' },
  { id: 'dx-t05', letter: 'T', name: 'Tuberculosis - Miliary / Disseminated', code: 'A19.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Haematogenous dissemination of tubercle bacilli to multiple organs.' },
  { id: 'dx-t06', letter: 'T', name: 'Type 2 Diabetes with Peripheral Neuropathy', code: 'E11.40', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Distal symmetrical sensorimotor polyneuropathy in diabetic patients.' },
  { id: 'dx-t07', letter: 'T', name: 'Typhoid Fever with Intestinal Perforation', code: 'A01.04', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Severe complication of enteric fever causing peritonitis.' },

  // --- LETTER U ---
  { id: 'dx-u01', letter: 'U', name: 'Ulcerative Colitis - Moderate / Severe', code: 'K51.90', category: 'Gastrointestinal', severity: 'Moderate', description: 'Diffuse mucosal inflammation limited to colon and rectum with bloody diarrhoea.' },
  { id: 'dx-u02', letter: 'U', name: 'Upper Respiratory Tract Infection - Viral', code: 'J06.9', category: 'Respiratory', severity: 'Mild', description: 'Rhinovirus / adenovirus syndrome with rhinorrhoea and sneezing.' },
  { id: 'dx-u03', letter: 'U', name: 'Urinary Tract Infection (UTI) - Complicated', code: 'N39.0', category: 'Renal & Urology', severity: 'Moderate', description: 'Infection of urinary tract occurring in setting of catheter, obstruction, or pregnancy.' },
  { id: 'dx-u04', letter: 'U', name: 'Urticaria - Acute / Chronic Spontaneous (Hives)', code: 'L50.0', category: 'Dermatology', severity: 'Mild', description: 'Transient pruritic erythematous wheals from mast cell degranulation.' },
  { id: 'dx-u05', letter: 'U', name: 'Uterine Leiomyoma (Fibroids)', code: 'D25.9', category: 'Obstetrics & Gynaecology', severity: 'Moderate', description: 'Benign monoclonal smooth muscle neoplasms of the myometrium.' },

  // --- LETTER V ---
  { id: 'dx-v01', letter: 'V', name: 'Varicose Veins of Lower Limbs with Ulceration', code: 'I83.00', category: 'Cardiovascular', severity: 'Moderate', description: 'Incompetence of saphenous venous valves leading to venous stasis.' },
  { id: 'dx-v02', letter: 'V', name: 'Vertigo - Benign Paroxysmal Positional (BPPV)', code: 'H81.10', category: 'ENT & Ophthalmology', severity: 'Mild', description: 'Canalithiasis in semicircular canals causing brief rotatory vertigo.' },
  { id: 'dx-v03', letter: 'V', name: 'Viral Hepatitis - Acute Unspecified', code: 'B19.9', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Hepatotropic viral infection with elevated aminotransferases and jaundice.' },
  { id: 'dx-v04', letter: 'V', name: 'Vitamin B12 Deficiency Anaemia (Pernicious)', code: 'D51.9', category: 'Haematology', severity: 'Moderate', description: 'Macrocytic megaloblastic anaemia with subacute combined cord degeneration.' },
  { id: 'dx-v05', letter: 'V', name: 'Vitiligo - Generalized', code: 'L80', category: 'Dermatology', severity: 'Mild', description: 'Autoimmune depigmenting skin condition from destruction of melanocytes.' },

  // --- LETTER W ---
  { id: 'dx-w01', letter: 'W', name: 'Whooping Cough (Bordetella pertussis)', code: 'A37.90', category: 'Infectious & Parasitic', severity: 'Severe', description: 'Paroxysmal spasmodic coughing fits terminated by an inspiratory whoop.' },
  { id: 'dx-w02', letter: 'W', name: 'Wound Infection - Postoperative Surgical Site', code: 'T81.4XXA', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Purulent drainage or wound breakdown within 30 days of surgical operation.' },

  // --- LETTER X ---
  { id: 'dx-x01', letter: 'X', name: 'Xerophthalmia / Vitamin A Deficiency with Bitot Spots', code: 'E50.0', category: 'Endocrinology & Metabolic', severity: 'Moderate', description: 'Ocular manifestations of severe vitamin A deficiency leading to conjunctival xerosis and keratomalacia.' },
  { id: 'dx-x02', letter: 'X', name: 'X-Linked Agammaglobulinaemia (Bruton Disease)', code: 'D80.0', category: 'Immunology', severity: 'Severe', description: 'Primary immunodeficiency characterized by failure of mature B lymphocyte development and recurrent infections.' },
  { id: 'dx-x03', letter: 'X', name: 'Xeroderma Pigmentosum', code: 'Q82.1', category: 'Dermatology', severity: 'Severe', description: 'Rare autosomal recessive defect in nucleotide excision repair causing extreme UV sensitivity.' },
  { id: 'dx-x04', letter: 'X', name: 'Xanthelasma Palpebrarum & Tendon Xanthoma', code: 'H02.60', category: 'Dermatology', severity: 'Mild', description: 'Circumscribed yellowish fat deposits on eyelid and skin associated with hyperlipidaemia.' },

  // --- LETTER Y ---
  { id: 'dx-y01', letter: 'Y', name: 'Yellow Fever (Flavivirus)', code: 'A95.9', category: 'Infectious & Parasitic', severity: 'Critical', description: 'Arboviral hemorrhagic fever presenting with hepatitis and renal failure.' },

  // --- LETTER Z ---
  { id: 'dx-z01', letter: 'Z', name: 'Zika Virus Acute Infection', code: 'A92.5', category: 'Infectious & Parasitic', severity: 'Moderate', description: 'Flavivirus infection causing fever, rash, and congenital microcephaly risk.' },
  { id: 'dx-z02', letter: 'Z', name: 'Zollinger-Ellison Syndrome (Gastrinoma)', code: 'E16.4', category: 'Endocrinology & Metabolic', severity: 'Severe', description: 'Gastrin-secreting neuroendocrine tumor causing severe refractory peptic ulcers.' }
];

// =============================================================================
// COMPREHENSIVE GLOBAL DIAGNOSTIC LABORATORY INVESTIGATIONS CATALOG
// =============================================================================
export const COMPREHENSIVE_LAB_TESTS: LabTestCatalogItem[] = [
  // --- HAEMATOLOGY & COAGULATION ---
  { id: 'lab-fbc', code: 'LAB-FBC', name: 'Full Blood Count (FBC / CBC with Differential)', category: 'Haematology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 1, priceNaira: 4500, referenceRange: 'Hb: 12.0-17.5 g/dL, WBC: 4.0-11.0, Plt: 150-450', isActive: true },
  { id: 'lab-esr', code: 'LAB-ESR', name: 'Erythrocyte Sedimentation Rate (ESR - Westergren)', category: 'Haematology', sampleType: 'Whole Blood (Citrate)', turnaroundTimeHours: 1, priceNaira: 2000, referenceRange: '0 - 20 mm/hr', isActive: true },
  { id: 'lab-pt-inr', code: 'LAB-PT', name: 'Prothrombin Time (PT) & INR', category: 'Haematology', sampleType: 'Plasma (Sodium Citrate)', turnaroundTimeHours: 2, priceNaira: 5000, referenceRange: 'PT: 11.0 - 13.5 sec, INR: 0.8 - 1.2', isActive: true },
  { id: 'lab-aptt', code: 'LAB-APTT', name: 'Activated Partial Thromboplastin Time (aPTT)', category: 'Haematology', sampleType: 'Plasma (Sodium Citrate)', turnaroundTimeHours: 2, priceNaira: 5000, referenceRange: '25.0 - 35.0 sec', isActive: true },
  { id: 'lab-ddimer', code: 'LAB-DDM', name: 'D-Dimer Quantitative Assay (Thromboembolism)', category: 'Haematology', sampleType: 'Plasma (Citrate)', turnaroundTimeHours: 3, priceNaira: 12000, referenceRange: '< 0.50 µg/mL FEU', isActive: true },
  { id: 'lab-hb-geno', code: 'LAB-GENO', name: 'Haemoglobin Electrophoresis (Genotype - AA/AS/SS/AC)', category: 'Haematology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 4, priceNaira: 4000, referenceRange: 'Normal Adult: HbAA', isActive: true },
  { id: 'lab-bgrp', code: 'LAB-BGRP', name: 'ABO Blood Grouping & Rhesus Factor Typing', category: 'Haematology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 1, priceNaira: 2000, referenceRange: 'A, B, AB, O (Rh Positive / Negative)', isActive: true },
  { id: 'lab-pbf', code: 'LAB-PBF', name: 'Peripheral Blood Film (PBF) Morphology Review', category: 'Haematology', sampleType: 'Whole Blood Film', turnaroundTimeHours: 4, priceNaira: 4500, referenceRange: 'Normocytic normochromic, normal platelets', isActive: true },
  { id: 'lab-retic', code: 'LAB-RETIC', name: 'Reticulocyte Count & Index', category: 'Haematology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 2, priceNaira: 3500, referenceRange: '0.5% - 2.5%', isActive: true },
  { id: 'lab-ferritin', code: 'LAB-FERR', name: 'Serum Ferritin Assay (Iron Stores)', category: 'Haematology', sampleType: 'Serum (Plain Tube)', turnaroundTimeHours: 6, priceNaira: 8500, referenceRange: '30 - 400 ng/mL', isActive: true },

  // --- CHEMICAL PATHOLOGY & METABOLIC PANELS ---
  { id: 'lab-fbs', code: 'LAB-FBS', name: 'Fasting Blood Sugar (FBS Glucose)', category: 'Chemical Pathology', sampleType: 'Plasma (Fluoride Oxalate)', turnaroundTimeHours: 1, priceNaira: 1500, referenceRange: '70 - 100 mg/dL (3.9 - 5.6 mmol/L)', isActive: true },
  { id: 'lab-rbs', code: 'LAB-RBS', name: 'Random Blood Sugar (RBS Glucose)', category: 'Chemical Pathology', sampleType: 'Plasma (Fluoride)', turnaroundTimeHours: 1, priceNaira: 1500, referenceRange: '< 140 mg/dL', isActive: true },
  { id: 'lab-hba1c', code: 'LAB-A1C', name: 'Glycated Haemoglobin (HbA1c Diabetes Control)', category: 'Chemical Pathology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 2, priceNaira: 7500, referenceRange: '< 5.7% (Good diabetic control: < 7.0%)', isActive: true },
  { id: 'lab-euc', code: 'LAB-EUC', name: 'Electrolytes, Urea & Creatinine (E/U/Cr - Renal Panel)', category: 'Chemical Pathology', sampleType: 'Serum (Plain/Gel Tube)', turnaroundTimeHours: 2, priceNaira: 7000, referenceRange: 'Na: 135-145, K: 3.5-5.0, Urea: 2.5-6.4, Cr: 60-110', isActive: true },
  { id: 'lab-lft', code: 'LAB-LFT', name: 'Comprehensive Liver Function Test (LFT Panel)', category: 'Chemical Pathology', sampleType: 'Serum (Plain Tube)', turnaroundTimeHours: 2, priceNaira: 8000, referenceRange: 'AST: <35, ALT: <45, ALP: 40-129, Bilirubin: <17', isActive: true },
  { id: 'lab-lipid', code: 'LAB-LIPID', name: 'Fasting Lipid Profile (Chol, Trig, HDL, LDL, VLDL)', category: 'Chemical Pathology', sampleType: 'Serum (Plain Tube)', turnaroundTimeHours: 3, priceNaira: 8000, referenceRange: 'Total Chol < 200, LDL < 100, HDL > 40 mg/dL', isActive: true },
  { id: 'lab-trop', code: 'LAB-TROP', name: 'High-Sensitivity Troponin I (Cardiac Biomarker)', category: 'Chemical Pathology', sampleType: 'Serum', turnaroundTimeHours: 1, priceNaira: 15000, referenceRange: '< 0.04 ng/mL', isActive: true },
  { id: 'lab-uric', code: 'LAB-URIC', name: 'Serum Uric Acid (Gout Panel)', category: 'Chemical Pathology', sampleType: 'Serum', turnaroundTimeHours: 2, priceNaira: 3500, referenceRange: '3.5 - 7.2 mg/dL', isActive: true },
  { id: 'lab-ca-phos', code: 'LAB-CAPHOS', name: 'Serum Calcium, Phosphate & Magnesium Panel', category: 'Chemical Pathology', sampleType: 'Serum', turnaroundTimeHours: 3, priceNaira: 6500, referenceRange: 'Calcium: 2.15 - 2.55 mmol/L', isActive: true },
  { id: 'lab-amylase', code: 'LAB-AMYL', name: 'Serum Amylase & Lipase (Pancreatic Biomarkers)', category: 'Chemical Pathology', sampleType: 'Serum', turnaroundTimeHours: 2, priceNaira: 9000, referenceRange: 'Amylase: 28-100 U/L, Lipase: 13-60 U/L', isActive: true },
  { id: 'lab-crp-quant', code: 'LAB-CRP', name: 'C-Reactive Protein (CRP Quantitative Inflammation)', category: 'Chemical Pathology', sampleType: 'Serum', turnaroundTimeHours: 2, priceNaira: 5000, referenceRange: '< 5.0 mg/L', isActive: true },

  // --- ENDOCRINOLOGY & REPRODUCTIVE HORMONES ---
  { id: 'lab-tft', code: 'LAB-TFT', name: 'Thyroid Function Test (Free T3, Free T4, TSH)', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 4, priceNaira: 12000, referenceRange: 'TSH: 0.4 - 4.2 µIU/mL, FT4: 12 - 22 pmol/L', isActive: true },
  { id: 'lab-fem-horm', code: 'LAB-FHRM', name: 'Female Fertility Profile (FSH, LH, Prolactin, Estradiol, Prog)', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 18000, referenceRange: 'Phase specific reference intervals', isActive: true },
  { id: 'lab-testo', code: 'LAB-TESTO', name: 'Total Testosterone Assay', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 8000, referenceRange: 'Male: 300 - 1000 ng/dL', isActive: true },
  { id: 'lab-psa', code: 'LAB-PSA', name: 'Total & Free Prostate Specific Antigen (PSA)', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 3, priceNaira: 9000, referenceRange: '< 4.0 ng/mL', isActive: true },
  { id: 'lab-hcg', code: 'LAB-HCG', name: 'Beta-hCG Quantitative Serum Pregnancy Test', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 2, priceNaira: 5500, referenceRange: 'Non-pregnant: < 5 mIU/mL', isActive: true },
  { id: 'lab-vitd', code: 'LAB-VITD', name: '25-Hydroxy Vitamin D3 Total', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 8, priceNaira: 15000, referenceRange: '30 - 100 ng/mL', isActive: true },
  { id: 'lab-vitb12', code: 'LAB-B12', name: 'Vitamin B12 & Folate Serum Assay', category: 'Endocrinology', sampleType: 'Serum', turnaroundTimeHours: 8, priceNaira: 14000, referenceRange: 'B12: 200 - 900 pg/mL', isActive: true },

  // --- MEDICAL MICROBIOLOGY & PARASITOLOGY ---
  { id: 'lab-mp-micro', code: 'LAB-MP', name: 'Malaria Parasite Microscopy (Thick/Thin Smear)', category: 'Parasitology', sampleType: 'Whole Blood (EDTA)', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: 'Negative / No plasmodium seen', isActive: true },
  { id: 'lab-mp-rdt', code: 'LAB-RDT', name: 'Malaria Antigen Rapid Diagnostic Test (mRDT)', category: 'Parasitology', sampleType: 'Whole Blood', turnaroundTimeHours: 1, priceNaira: 1500, referenceRange: 'Negative', isActive: true },
  { id: 'lab-urinalysis', code: 'LAB-URN', name: 'Urinalysis (10-Parameter Dipstick & Sediment Microscopy)', category: 'Microbiology', sampleType: 'Clean Catch Midstream Urine', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: 'No protein, glucose, nitrites, 0-2 WBC/HPF', isActive: true },
  { id: 'lab-urine-mcs', code: 'LAB-UMCS', name: 'Urine Culture & Antimicrobial Sensitivity (m/c/s)', category: 'Microbiology', sampleType: 'Sterile Urine', turnaroundTimeHours: 48, priceNaira: 7500, referenceRange: 'No bacterial growth at 48 hours', isActive: true },
  { id: 'lab-stool-re', code: 'LAB-STOOL', name: 'Stool Routine Microscopy (Ova, Cysts & Parasites)', category: 'Parasitology', sampleType: 'Fresh Stool', turnaroundTimeHours: 2, priceNaira: 3000, referenceRange: 'No cysts, ova, or trophozoites seen', isActive: true },
  { id: 'lab-stool-fobt', code: 'LAB-FOBT', name: 'Stool Occult Blood Test (FOBT Screening)', category: 'Microbiology', sampleType: 'Fresh Stool', turnaroundTimeHours: 2, priceNaira: 3500, referenceRange: 'Negative', isActive: true },
  { id: 'lab-sputum-afb', code: 'LAB-AFB', name: 'Sputum AFB Smear for Tuberculosis (Ziehl-Neelsen)', category: 'Microbiology', sampleType: 'Early Morning Sputum', turnaroundTimeHours: 24, priceNaira: 4000, referenceRange: 'No Acid-Fast Bacilli Seen', isActive: true },
  { id: 'lab-genexpert', code: 'LAB-GENEX', name: 'GeneXpert MTB/RIF Molecular TB PCR Assay', category: 'Microbiology', sampleType: 'Sputum Specimen', turnaroundTimeHours: 4, priceNaira: 15000, referenceRange: 'MTB Not Detected', isActive: true },
  { id: 'lab-blood-mcs', code: 'LAB-BLDMCS', name: 'Blood Culture & Sensitivity (Aerobic / Anaerobic)', category: 'Microbiology', sampleType: 'Venous Blood Bottle', turnaroundTimeHours: 72, priceNaira: 14000, referenceRange: 'No growth at 7 days incubation', isActive: true },
  { id: 'lab-hvs-mcs', code: 'LAB-HVS', name: 'High Vaginal Swab (HVS) Microscopy & Culture', category: 'Microbiology', sampleType: 'Vaginal Swab', turnaroundTimeHours: 48, priceNaira: 6500, referenceRange: 'Normal vaginal flora, no Trichomonas/Candida', isActive: true },
  { id: 'lab-sfa', code: 'LAB-SFA', name: 'Seminal Fluid Analysis (SFA - Count, Motility, Morphology)', category: 'Microbiology', sampleType: 'Semen Specimen', turnaroundTimeHours: 4, priceNaira: 6000, referenceRange: '> 15 million/mL, > 40% progressive motility', isActive: true },

  // --- SEROLOGY & INFECTIOUS DISEASE MARKERS ---
  { id: 'lab-widal', code: 'LAB-WIDAL', name: 'Widal Agglutination Reaction (Typhoid O & H Titers)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: '< 1:80 considered non-significant', isActive: true },
  { id: 'lab-hbsag', code: 'LAB-HBS', name: 'Hepatitis B Surface Antigen (HBsAg Screening)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: 'Non-Reactive (Negative)', isActive: true },
  { id: 'lab-hcv', code: 'LAB-HCV', name: 'Hepatitis C Virus Antibody (Anti-HCV Rapid/ELISA)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 1, priceNaira: 3000, referenceRange: 'Non-Reactive (Negative)', isActive: true },
  { id: 'lab-hiv', code: 'LAB-HIV', name: 'HIV 1 & 2 Screening (National 3-Test Algorithm)', category: 'Serology', sampleType: 'Serum / Whole Blood', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: 'Non-Reactive (Negative)', isActive: true },
  { id: 'lab-vdrl', code: 'LAB-VDRL', name: 'Syphilis Serology (VDRL / RPR Screening)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 1, priceNaira: 2500, referenceRange: 'Non-Reactive', isActive: true },
  { id: 'lab-hpylori-ag', code: 'LAB-HPAG', name: 'Helicobacter Pylori Stool Antigen (HpSA Test)', category: 'Serology', sampleType: 'Stool Specimen', turnaroundTimeHours: 1, priceNaira: 4500, referenceRange: 'Negative for H. pylori antigen', isActive: true },
  { id: 'lab-rf', code: 'LAB-RF', name: 'Rheumatoid Factor (RF Quantitative)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 3, priceNaira: 5000, referenceRange: '< 14 IU/mL', isActive: true },
  { id: 'lab-ana', code: 'LAB-ANA', name: 'Antinuclear Antibodies (ANA IFA Screening)', category: 'Serology', sampleType: 'Serum', turnaroundTimeHours: 24, priceNaira: 16000, referenceRange: 'Negative / Titer < 1:40', isActive: true },

  // --- TUMOR MARKERS & CYTOPATHOLOGY ---
  { id: 'lab-cea', code: 'LAB-CEA', name: 'Carcinoembryonic Antigen (CEA - Colorectal Tumor Marker)', category: 'Tumor Markers', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 10000, referenceRange: 'Non-smoker: < 3.0 ng/mL', isActive: true },
  { id: 'lab-afp', code: 'LAB-AFP', name: 'Alpha-Fetoprotein (AFP - Hepatic / Germ Cell Marker)', category: 'Tumor Markers', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 9500, referenceRange: '< 10.0 ng/mL', isActive: true },
  { id: 'lab-ca125', code: 'LAB-CA125', name: 'CA 125 (Ovarian Cancer Biomarker)', category: 'Tumor Markers', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 12000, referenceRange: '< 35 U/mL', isActive: true },
  { id: 'lab-ca199', code: 'LAB-CA199', name: 'CA 19-9 (Pancreatic / Biliary Malignancy Marker)', category: 'Tumor Markers', sampleType: 'Serum', turnaroundTimeHours: 6, priceNaira: 12000, referenceRange: '< 37 U/mL', isActive: true },
  { id: 'lab-pap', code: 'LAB-PAP', name: 'Cervical Pap Smear (Liquid-Based Cytology LBC)', category: 'Histopathology', sampleType: 'Endocervical Brush', turnaroundTimeHours: 48, priceNaira: 12000, referenceRange: 'Negative for Intraepithelial Lesion (NILM)', isActive: true },
  { id: 'lab-biopsy-med', code: 'LAB-BX', name: 'Histopathology Biopsy Tissue Examination', category: 'Histopathology', sampleType: 'Formalin-fixed Tissue', turnaroundTimeHours: 96, priceNaira: 25000, referenceRange: 'Pathology microscopic report', isActive: true }
];

// =============================================================================
// COMPREHENSIVE GLOBAL DIAGNOSTIC IMAGING & SCAN CATALOG
// =============================================================================
export const COMPREHENSIVE_IMAGING_TESTS: ImagingTestCatalogItem[] = [
  // --- DIAGNOSTIC X-RAY RADIOGRAPHY ---
  { id: 'rad-cxr', code: 'RAD-CXR', name: 'Chest X-Ray (PA & Lateral Views)', modality: 'X-Ray', bodySite: 'Thorax / Lungs', priceNaira: 8000, instructions: 'Remove necklace, metallic objects, bra with underwire.' },
  { id: 'rad-axr', code: 'RAD-AXR', name: 'Abdominal X-Ray (Erect & Supine Views)', modality: 'X-Ray', bodySite: 'Abdomen / Bowel', priceNaira: 8500, instructions: 'Assess for air-fluid levels or subdiaphragmatic free gas.' },
  { id: 'rad-pelvis', code: 'RAD-PELV', name: 'Pelvis & Both Hip Joints X-Ray (AP View)', modality: 'X-Ray', bodySite: 'Pelvis & Hips', priceNaira: 8000, instructions: 'Clear bowel, remove belt buckles and metallic zippers.' },
  { id: 'rad-cspine', code: 'RAD-CSPINE', name: 'Cervical Spine X-Ray (AP, Lateral & Open-Mouth Odontoid)', modality: 'X-Ray', bodySite: 'Neck / Cervical Spine', priceNaira: 9000, instructions: 'Remove earrings, necklaces, and hair pins.' },
  { id: 'rad-lspine', code: 'RAD-LSPINE', name: 'Lumbosacral Spine X-Ray (AP & Lateral Views)', modality: 'X-Ray', bodySite: 'Lower Back / Spine', priceNaira: 9000, instructions: 'Evaluate disc space narrowing and spondylolisthesis.' },
  { id: 'rad-skull', code: 'RAD-SKULL', name: 'Skull X-Ray (AP & Lateral / Paranasal Sinuses)', modality: 'X-Ray', bodySite: 'Head / Sinuses', priceNaira: 8000, instructions: 'Remove eyeglasses, hearing aids, and dental dentures.' },
  { id: 'rad-shoulder', code: 'RAD-SHLD', name: 'Shoulder Joint X-Ray (AP & Axillary Views)', modality: 'X-Ray', bodySite: 'Shoulder', priceNaira: 7500, instructions: 'Assess for dislocation, acromial spur, or fracture.' },
  { id: 'rad-knee', code: 'RAD-KNEE', name: 'Knee Joint X-Ray (AP & Lateral Weight-Bearing)', modality: 'X-Ray', bodySite: 'Knee', priceNaira: 7500, instructions: 'Evaluate joint space loss and osteophytes.' },
  { id: 'rad-ankle-foot', code: 'RAD-ANKLE', name: 'Ankle & Foot X-Ray (AP, Lateral & Mortise Views)', modality: 'X-Ray', bodySite: 'Ankle / Foot', priceNaira: 7500, instructions: 'Assess for malleolar fracture or ligamentous avulsion.' },
  { id: 'rad-hsg', code: 'RAD-HSG', name: 'Hysterosalpingography (HSG Tubal Patency Study)', modality: 'X-Ray', bodySite: 'Uterus & Fallopian Tubes', priceNaira: 28000, instructions: 'Perform on Day 7-10 of menstrual cycle; prophylactic antibiotic given.' },

  // --- DIAGNOSTIC ULTRASOUND & DOPPLER ---
  { id: 'rad-uss-abd', code: 'RAD-USS-ABD', name: 'Comprehensive Abdominopelvic Ultrasound Scan', modality: 'Ultrasound', bodySite: 'Abdomen & Pelvis', priceNaira: 10000, instructions: 'Fast for 6 hours; drink 1 litre of water 1 hour prior to scan.' },
  { id: 'rad-uss-pelvis', code: 'RAD-USS-PELV', name: 'Transvaginal Ultrasound (TVS Pelvic Gynae Scan)', modality: 'Ultrasound', bodySite: 'Pelvic Organs', priceNaira: 12000, instructions: 'Empty bladder immediately prior to examination.' },
  { id: 'rad-uss-obs-1', code: 'RAD-USS-OBS1', name: 'Obstetric Ultrasound (1st Trimester Viability & Dating)', modality: 'Ultrasound', bodySite: 'Fetus / Uterus', priceNaira: 8000, instructions: 'Drink 3 glasses of water 45 minutes prior.' },
  { id: 'rad-uss-obs-anom', code: 'RAD-USS-ANOM', name: 'Fetal Anomaly Ultrasound Scan (18-22 Weeks Detailed Anatomy)', modality: 'Ultrasound', bodySite: 'Fetus Anatomy', priceNaira: 16000, instructions: 'Comprehensive anatomical survey of fetal organs.' },
  { id: 'rad-uss-thyroid', code: 'RAD-USS-THYR', name: 'Thyroid & Soft Tissues of Neck Ultrasound', modality: 'Ultrasound', bodySite: 'Neck / Thyroid', priceNaira: 10000, instructions: 'Assess nodule size, vascularity, and TI-RADS classification.' },
  { id: 'rad-uss-breast', code: 'RAD-USS-BRST', name: 'Bilateral Breast Ultrasound Scan', modality: 'Ultrasound', bodySite: 'Breasts / Axillae', priceNaira: 12000, instructions: 'BI-RADS evaluation of palpable lumps and cysts.' },
  { id: 'rad-uss-scrotal', code: 'RAD-USS-TEST', name: 'Scrotal & Testicular Color Doppler Ultrasound', modality: 'Ultrasound', bodySite: 'Scrotum / Testes', priceNaira: 12000, instructions: 'Rule out testicular torsion, epididymitis, or varicocele.' },
  { id: 'rad-dop-carotid', code: 'RAD-DOP-CAR', name: 'Carotid & Vertebral Duplex Doppler Ultrasound', modality: 'Ultrasound', bodySite: 'Carotid Arteries', priceNaira: 22000, instructions: 'Evaluate carotid intimal thickness and atherosclerotic stenosis.' },
  { id: 'rad-dop-venous', code: 'RAD-DOP-DVT', name: 'Lower Limb Deep Venous Doppler (DVT Study)', modality: 'Ultrasound', bodySite: 'Lower Limb Veins', priceNaira: 22000, instructions: 'Assess femoral, popliteal and calf vein compressibility.' },
  { id: 'rad-echo', code: 'RAD-ECHO', name: 'Transthoracic Echocardiogram (2D, M-Mode & Color Doppler)', modality: 'Ultrasound', bodySite: 'Heart / Cardiac Chambers', priceNaira: 25000, instructions: 'Resting cardiac examination evaluating ejection fraction and valves.' },

  // --- COMPUTED TOMOGRAPHY (CT SCAN) ---
  { id: 'rad-ct-brain-plain', code: 'RAD-CT-BRN', name: 'Brain / Head CT Scan (Plain Non-Contrast)', modality: 'CT Scan', bodySite: 'Brain / Cranium', priceNaira: 45000, instructions: 'Immediate acute stroke, head trauma, and hemorrhage protocol.' },
  { id: 'rad-ct-brain-cont', code: 'RAD-CT-BRNC', name: 'Brain CT Scan with Intravenous Contrast', modality: 'CT Scan', bodySite: 'Brain / Vascular', priceNaira: 65000, instructions: 'Check serum creatinine; 4 hours fasting before contrast injection.' },
  { id: 'rad-ct-pns', code: 'RAD-CT-PNS', name: 'Paranasal Sinuses (PNS) CT Scan (Bone Window)', modality: 'CT Scan', bodySite: 'Sinuses & Facial Bones', priceNaira: 48000, instructions: 'Detailed 3D assessment of ostiomeatal complexes.' },
  { id: 'rad-ct-chest-hrct', code: 'RAD-CT-HRCT', name: 'High Resolution Chest CT (HRCT Thorax)', modality: 'CT Scan', bodySite: 'Lungs / Parenchyma', priceNaira: 55000, instructions: 'Fine slice (1mm) evaluation of interstitial lung disease and nodules.' },
  { id: 'rad-ct-abd-pelvis', code: 'RAD-CT-CAP', name: 'Abdomen & Pelvis Triple-Phase Contrast CT', modality: 'CT Scan', bodySite: 'Abdomen & Pelvis', priceNaira: 85000, instructions: 'Oral and IV contrast protocol; verify normal renal function.' },
  { id: 'rad-ct-angio-pe', code: 'RAD-CT-CTPA', name: 'CT Pulmonary Angiography (CTPA for Pulmonary Embolism)', modality: 'CT Scan', bodySite: 'Pulmonary Vasculature', priceNaira: 95000, instructions: 'Emergency bolus-tracking contrast study for filling defects.' },
  { id: 'rad-ct-coronary', code: 'RAD-CT-COR', name: 'CT Coronary Angiogram & Calcium Scoring', modality: 'CT Scan', bodySite: 'Coronary Arteries', priceNaira: 135000, instructions: 'Beta-blocker premedication to achieve heart rate <65 bpm.' },
  { id: 'rad-ct-spine', code: 'RAD-CT-SPINE', name: 'Lumbosacral / Cervical Spine CT Scan', modality: 'CT Scan', bodySite: 'Spine Column', priceNaira: 50000, instructions: 'Bone window assessment for fractures and cord compression.' },

  // --- MAGNETIC RESONANCE IMAGING (MRI) ---
  { id: 'rad-mri-brain', code: 'RAD-MRI-BRN', name: 'Brain MRI (T1, T2, FLAIR, DWI, SWI Multi-Sequence)', modality: 'MRI', bodySite: 'Brain & Cranial Nerves', priceNaira: 85000, instructions: 'Absolute screening: No cardiac pacemakers or metallic implants.' },
  { id: 'rad-mri-spine', code: 'RAD-MRI-LSP', name: 'Lumbar Spine MRI (Sagittal & Axial T1/T2)', modality: 'MRI', bodySite: 'Lumbar Spine & Discs', priceNaira: 85000, instructions: 'Gold standard for herniated intervertebral disc and spinal stenosis.' },
  { id: 'rad-mri-knee', code: 'RAD-MRI-KNEE', name: 'Knee Joint MRI (ACL, PCL, Menisci, Collaterals)', modality: 'MRI', bodySite: 'Knee Joint', priceNaira: 90000, instructions: 'Evaluation of ligamentous tears and chondral defects.' },
  { id: 'rad-mri-shoulder', code: 'RAD-MRI-SHLD', name: 'Shoulder Joint MRI (Rotator Cuff & Labrum)', modality: 'MRI', bodySite: 'Shoulder', priceNaira: 90000, instructions: 'Assess supraspinatus tear and Bankart/SLAP lesions.' },
  { id: 'rad-mri-prostate', code: 'RAD-MRI-PROST', name: 'Multiparametric Prostate MRI (mpMRI PI-RADS Protocol)', modality: 'MRI', bodySite: 'Prostate Gland', priceNaira: 110000, instructions: 'High-resolution T2, DWI, and dynamic contrast enhancement.' },
  { id: 'rad-mri-mrcp', code: 'RAD-MRI-MRCP', name: 'Magnetic Resonance Cholangiopancreatography (MRCP)', modality: 'MRI', bodySite: 'Biliary Tree & Pancreas', priceNaira: 95000, instructions: 'Fast for 6 hours; non-invasive evaluation of common bile duct.' },

  // --- CARDIOPULMONARY & SPECIALIZED FUNCTIONAL DIAGNOSTICS ---
  { id: 'rad-ecg-12', code: 'RAD-ECG-12', name: '12-Lead Resting Electrocardiogram (ECG)', modality: 'ECG / Functional', bodySite: 'Heart', priceNaira: 6000, instructions: 'Rest quiet for 5 minutes prior to tracing.' },
  { id: 'rad-ecg-holter', code: 'RAD-HOLTER', name: '24-Hour Ambulatory Holter ECG Rhythm Monitor', modality: 'ECG / Functional', bodySite: 'Heart Rhythm', priceNaira: 30000, instructions: 'Wear recorder continuously for 24 hours while keeping symptom diary.' },
  { id: 'rad-abpm-24', code: 'RAD-ABPM', name: '24-Hour Ambulatory Blood Pressure Monitor (ABPM)', modality: 'ECG / Functional', bodySite: 'Systemic Circulation', priceNaira: 25000, instructions: 'Day/night blood pressure cuff inflation to rule out white-coat hypertension.' },
  { id: 'rad-spiro', code: 'RAD-SPIRO', name: 'Spirometry & Pulmonary Function Test (Pre & Post Bronchodilator)', modality: 'Pulmonary Functional', bodySite: 'Lungs & Airways', priceNaira: 15000, instructions: 'Withhold short-acting bronchodilators for 6 hours prior to test.' },
  { id: 'rad-eeg', code: 'RAD-EEG', name: 'Electroencephalogram (EEG Routine & Sleep-Deprived)', modality: 'Neurophysiology', bodySite: 'Brain Wave Activity', priceNaira: 28000, instructions: 'Wash hair clean without oils; sleep deprivation as requested.' },
  { id: 'rad-emg-ncs', code: 'RAD-EMG', name: 'Electromyography & Nerve Conduction Studies (EMG / NCS)', modality: 'Neurophysiology', bodySite: 'Peripheral Nerves & Muscles', priceNaira: 35000, instructions: 'Diagnostic assessment for radiculopathy, carpal tunnel, and myopathy.' },
  { id: 'rad-endo-ogd', code: 'RAD-OGD', name: 'Diagnostic Upper Gastrointestinal Endoscopy (OGD / Gastroscopy)', modality: 'Endoscopy', bodySite: 'Oesophagus, Stomach, Duodenum', priceNaira: 50000, instructions: 'Overnight fasting for 8 hours; throat spray local anaesthesia.' },
  { id: 'rad-colonoscopy', code: 'RAD-COLON', name: 'Diagnostic Lower GI Colonoscopy with Biopsy', modality: 'Endoscopy', bodySite: 'Colon & Rectum', priceNaira: 75000, instructions: 'Bowel preparation protocol with PEG solution 24 hours prior.' },
  { id: 'rad-dexa', code: 'RAD-DEXA', name: 'Dual-Energy X-Ray Absorptiometry (DEXA Bone Density Scan)', modality: 'Bone Densitometry', bodySite: 'Lumbar Spine & Femoral Neck', priceNaira: 25000, instructions: 'T-score and Z-score calculation for osteoporosis screening.' },
  { id: 'rad-mammo', code: 'RAD-MAMMO', name: 'Digital Bilateral Mammography (with 3D Tomosynthesis)', modality: 'Mammography', bodySite: 'Breasts', priceNaira: 20000, instructions: 'Do not use deodorant, talcum powder, or lotion under arms.' }
];

// Alphabet letters A through Z with ALL
export const ALPHABET_LETTERS = [
  'ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const DIAGNOSIS_CATEGORIES = [
  'ALL',
  'Infectious & Parasitic',
  'Cardiovascular',
  'Respiratory',
  'Gastrointestinal',
  'Endocrinology & Metabolic',
  'Renal & Urology',
  'Neurology',
  'Obstetrics & Gynaecology',
  'Paediatrics',
  'Musculoskeletal',
  'Dermatology',
  'Haematology',
  'ENT & Ophthalmology',
  'Mental Health',
  'Immunology',
  'Oncology'
];

export const LAB_CATEGORIES = [
  'ALL',
  'Haematology',
  'Chemical Pathology',
  'Endocrinology',
  'Parasitology',
  'Microbiology & Serology',
  'Tumour Biomarkers',
  'Toxicology'
];

export const IMAGING_MODALITIES = [
  'ALL',
  'X-Ray',
  'Ultrasound',
  'CT Scan',
  'MRI',
  'ECG / Functional',
  'Pulmonary Functional',
  'Neurophysiology',
  'Endoscopy',
  'Bone Densitometry',
  'Mammography'
];

// Helper to filter diagnoses by search query, alphabet letter, and clinical category
export function filterDiagnoses(
  items: DiagnosisItem[],
  query: string,
  selectedLetter: string,
  selectedCategory: string
): DiagnosisItem[] {
  const cleanQ = query.trim().toLowerCase();

  return items.filter(item => {
    // 1. Check letter filter
    if (selectedLetter && selectedLetter !== 'ALL') {
      if (item.letter.toUpperCase() !== selectedLetter.toUpperCase()) {
        return false;
      }
    }

    // 2. Check category filter
    if (selectedCategory && selectedCategory !== 'ALL') {
      if (item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // 3. Check search query (matches name, code, category, or description)
    if (cleanQ) {
      const matchName = item.name.toLowerCase().includes(cleanQ);
      const matchCode = item.code.toLowerCase().includes(cleanQ);
      const matchCategory = item.category.toLowerCase().includes(cleanQ);
      const matchDesc = item.description ? item.description.toLowerCase().includes(cleanQ) : false;
      return matchName || matchCode || matchCategory || matchDesc;
    }

    return true;
  });
}

// Helper to filter laboratory tests by search query and category
export function filterLabTests(
  items: LabTestCatalogItem[],
  query: string,
  category: string
): LabTestCatalogItem[] {
  const cleanQ = query.trim().toLowerCase();

  return items.filter(item => {
    if (category && category !== 'ALL') {
      if (item.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }
    if (cleanQ) {
      const matchName = item.name.toLowerCase().includes(cleanQ);
      const matchCode = item.code.toLowerCase().includes(cleanQ);
      const matchCat = item.category.toLowerCase().includes(cleanQ);
      const matchSample = item.sampleType.toLowerCase().includes(cleanQ);
      return matchName || matchCode || matchCat || matchSample;
    }
    return true;
  });
}

// Helper to filter imaging investigations by search query and modality
export function filterImagingTests(
  items: ImagingTestCatalogItem[],
  query: string,
  modality: string
): ImagingTestCatalogItem[] {
  const cleanQ = query.trim().toLowerCase();

  return items.filter(item => {
    if (modality && modality !== 'ALL') {
      if (item.modality.toLowerCase() !== modality.toLowerCase()) {
        return false;
      }
    }
    if (cleanQ) {
      const matchName = item.name.toLowerCase().includes(cleanQ);
      const matchCode = item.code.toLowerCase().includes(cleanQ);
      const matchModality = item.modality.toLowerCase().includes(cleanQ);
      const matchSite = item.bodySite.toLowerCase().includes(cleanQ);
      return matchName || matchCode || matchModality || matchSite;
    }
    return true;
  });
}

