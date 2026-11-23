# TekiLab SaaS Laboratory Management & Information System (LIMS / LIS)
## Business Requirements Document (BRD) & Google AI Studio Refactoring Blueprint

---

### Executive Summary & System Vision
**TekiLab** is a next-generation, high-throughput SaaS Laboratory Information Management System (LIMS) and Laboratory Information System (LIS) engineered for clinical, pathology, and diagnostic laboratories. 

The primary objective of TekiLab is to reduce turnaround time (TAT) to **5 to 10 minutes** for rapid point-of-care and clinical diagnostic tests, while maintaining compliance, sample traceability, and diagnostic accuracy. TekiLab features an **AI Diagnostic Engine** for automated verification, clinical summary generation, and direct diagnostic-to-pharmacy prescription workflows.

To allow maximum flexibility, TekiLab incorporates a **Modular Feature Toggle Engine ("Feature Muting")**, allowing operators to run TekiLab as a standalone laboratory suite or seamlessly enable integrated auxiliary modules (EMR, Hospital Management, Pharmacy, and Billing) with inter-module data dependencies.

---

### 1. Global LIMS / LIS Research & AI Benchmarking

Based on an analysis of enterprise LIMS and LIS platforms (such as LabWare, Thermo Scientific SampleManager, STARLIMS, LabVantage, Benchling, and MocDoc LIS):

#### Key Industry Insights & Best Practices
1. **Unification of LIMS & LIS:** Modern clinical environments require combining sample lifecycle tracking (LIMS) with patient clinical history and diagnostic reporting (LIS).
2. **Rapid Accessioning:** Modern labs eliminate entry bottlenecks using barcode/QR intake kiosks, pre-registered test panels, and single-click specimen receipt.
3. **Analyzer Middleware Integration:** High-volume laboratories rely on direct serial/TCP/IP or HL7/ASTM middleware to ingest analyzer readings directly into the software without manual data transcription.
4. **AI-Powered Laboratory Operations:**
   - **Autonomous Test Review (Auto-Verification):** AI algorithms validate standard baseline results that fall strictly within normal physiological reference ranges, automatically clearing over 70% of routine tests so laboratory technicians can focus exclusively on critical/abnormal flags.
   - **AI Anomaly & Outlier Detection:** Pattern detection models analyze historical patient data and instrument baselines to flag improbable values, sample contamination, or hemolyzed specimen signatures.
   - **AI Clinical Summary & Patient Insights:** Translates complex numerical matrices into natural-language diagnostic summaries for attending physicians and easy-to-understand summaries for patients.
   - **Direct Reflex Action & Diagnostic-to-Pharmacy Pipeline:** When a test result displays actionable pathognomonic markers (e.g., elevated bacterial infection indicators or specific parasite detection), the AI automatically suggests evidence-based drug regimens for single-click physician approval and pharmacy queue dispatch.

---

### 2. Core Architecture & Dynamic Feature Muting Engine

TekiLab is built on a hub-and-spoke architecture where the **TekiLab LIMS/LIS Core** is the primary operational center, surrounded by auxiliary modules that can be dynamically **muted (hidden/disabled)** or **unmuted (active)** without breaking underlying database relationships or data integrity.

```
       +-------------------------------------------------------+
       |               TekiLab LIMS / LIS Core                 |
       |  (Accessioning, Rapid Analyzer, AI Engine, Reports)   |
       +----------------------------+--------------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
+---------v---------+     +---------v---------+     +---------v---------+
|    EMR / Patient  |     | Pharmacy & Presc. |     |  Hospital Ops &   |
|   (Mute / Active) |     |  (Mute / Active)  |     |  Billing (Mute)   |
+-------------------+     +-------------------+     +-------------------+
```

#### Feature Muting Behavior Rules:
- **When Auxiliary Modules are MUTED:** The main UI/sidebar renders purely laboratory-focused navigation (Accessioning, Test Workstation, AI Verification, Sample Tracking, Diagnostic Reports). The background engine maintains silent references (e.g., light patient records and auto-generated prescription payloads stored in background schemas).
- **When Auxiliary Modules are ACTIVE:** The system exposes deep cross-functional shortcuts, such as "Dispatch Prescription to Pharmacy," "Sync to Patient EMR Chart," or "Generate Hospital Billing Invoice."

---

### 3. The 5-to-10 Minute Ultra-Fast Rapid Test Workflow Blueprint

TekiLab achieves 5–10 minute test turnarounds through a streamlined 5-step workflow:

```
[Step 1: Express Accessioning] -> [Step 2: QR Specimen Tagging] -> [Step 3: Rapid Analyzer Workstation]
                                                                                |
[Step 5: Instant Dispatch & Pharmacy Script] <--- [Step 4: AI Auto-Verification] <---+
```

| Step | Phase | Target Duration | Action Description |
| :--- | :--- | :--- | :--- |
| **1** | Express Intake | 30–60 Seconds | Quick patient lookup via Phone/ID/QR code or rapid new patient intake; quick-select predefined test panel. |
| **2** | QR Specimen Tagging | 30 Seconds | Auto-generate unique Sample ID with barcode/QR printable label; specimen tagged (Blood, Urine, Swab). |
| **3** | Rapid Analyzer Workstation | 2–5 Minutes | Technician executes rapid kit test or analyzer sync; inputs raw values or uses camera/OCR/Bluetooth analyzer bridge. |
| **4** | AI Verification Engine | 15–30 Seconds | AI runs delta check, range validation, flags critical values, and auto-generates patient summary & drug recommendations. |
| **5** | Instant Dispatch & Action | 30 Seconds | Multi-channel dispatch (WhatsApp, SMS, PDF download, EMR sync); optional instant script generation sent to Pharmacy queue. |

---

### 4. Comprehensive Feature Specifications

#### Module 1: Specimen Accessioning & Chain of Custody
- **Express Intake Kiosk:** Single-screen intake requiring minimal mandatory fields (Name, Age, Gender, Contact, Rapid Test Panel).
- **Unique Specimen UID & QR Barcoding:** Auto-generates ISO-compliant sample tracking IDs (e.g., `TK-2026-08912`).
- **Sample Status Lifecycle:** States: `Registered` -> `Collected` -> `In Analyzer` -> `Verified` -> `Dispatched` -> `Archived`.
- **Chain of Custody Tracking:** Timestamped audit trail tracking technician ID, collection site, tube color, and storage location.

#### Module 2: Rapid Test Master & Parameter Configuration
- **Pre-configured Rapid Panels:** Malaria RDT, Typhoid Widal, Blood Glucose, Complete Blood Count (CBC) Rapid, Lipid Profile, Urine Dipstick 10-Param, COVID/Flu Rapid Swab, Hepatitis B/C, Pregnancy, STI Panels.
- **Reference Range Engine:** Supports age-specific, gender-specific, and condition-specific reference ranges with mathematical standard units (e.g., `mg/dL`, `x10^9/L`).
- **Flagging Thresholds:** Automated triggers for Normal, Borderline, Panic/Critical High, and Panic/Critical Low values.

#### Module 3: Rapid Analyzer & Test Execution Workspace
- **Batch & Grid Entry Workspace:** High-velocity spreadsheet-style layout for tech input with shortcut keys.
- **OCR & Camera Sample Capture:** Smart camera scanner to read rapid lateral flow cassettes (e.g., interpreting test vs. control bands automatically).
- **Analyzer Simulation Bridge:** Mock serial/TCP endpoint to simulate direct feed from automated hematology and biochemistry analyzers.

#### Module 4: TekiLab AI Diagnostic Engine
- **Autonomous Auto-Verification:** Auto-approves results that fall within normal thresholds without requiring manual senior pathologist sign-off.
- **Outlier & Delta Checking:** Compares current results against patient historical baseline to detect unexplained shifts (e.g., sudden drop in Hb from 14.2 g/dL to 7.1 g/dL).
- **Natural Language Patient Report Summarizer:** Automatically converts complex diagnostic values into clear patient summaries in multiple languages.
- **Diagnostic-to-Pharmacy Prescription Suggestion Engine:** Detects abnormal diagnostic findings (e.g., positive *Plasmodium falciparum* test) and generates standardized dosage protocols (e.g., Artemether-Lumefantrine) tailored to patient age and weight.

#### Module 5: Diagnostic-to-Pharmacy & EMR Interconnectivity
- **Direct Result-Driven Prescription:** One-click button on test report: `"Generate Associated Prescription"`. Pre-fills drug selection, strength, frequency, and duration based on lab findings.
- **Drug Interaction & Contraindication Guard:** Cross-references lab results (e.g., low eGFR / renal impairment) against drug dosage to prevent improper prescribing.
- **Pharmacy Queue Dispatch:** Instantly transfers verified orders into the integrated Pharmacy Management module (if unmuted) or formats an e-Prescription (if muted).

#### Module 6: SaaS Tenant Management & Operational Settings
- **Multi-Tenant SaaS Customization:** Custom lab header, logo, digital signature overlay, custom accreditation footers (ISO 15189, CLIA, CAP).
- **Modular Feature Toggle ("Mute Engine"):** Global settings toggle matrix allowing admins to toggle sub-modules:
  - `[x] Laboratory Core (Always Active)`
  - `[ ] Pharmacy Management (Muted/Active)`
  - `[ ] EMR & Patient Charts (Muted/Active)`
  - `[ ] Hospital Beds & Admissions (Muted/Active)`
  - `[ ] Billing & Insurance Claims (Muted/Active)`

---

### 5. Google AI Studio Master Refactoring Prompt

Below is the structured prompt designed to be copied directly into Google AI Studio. It instructs the LLM to refactor the current codebase into **TekiLab SaaS**.

```text
================================================================================
GOOGLE AI STUDIO PROMPT: TEKILAB LIMS/LIS REFACTORING & EXPANSION
================================================================================

YOU ARE ACTING AS A SENIOR FULL-STACK SOFTWARE ARCHITECT SPECIALIZING IN HEALTHCARE SAAS AND LABORATORY INFORMATION MANAGEMENT SYSTEMS (LIMS/LIS).

YOUR MISSION IS TO CONVERT AND EXTEND THE EXISTING CODEBASE INTO "TekiLab" — AN ENTERPRISE-GRADE, AI-POWERED SAAS LABORATORY MANAGEMENT SYSTEM.

--------------------------------------------------------------------------------
1. CORE STRATEGY & REFACTORING DIRECTIONS:
--------------------------------------------------------------------------------
- APP NAME: TekiLab (Laboratory Information Management System)
- PRIMARY FOCUS: Reorient the entire application around Laboratory Accessioning, Rapid Specimen Processing (5-10 Minute Turnaround Workflow), AI Diagnostic Verification, and Fast Patient Result Delivery.
- AUXILIARY MODULES: EMR, Pharmacy Management, Hospital Management, and Billing must be integrated cleanly but connected through a dynamic "FEATURE TOGGLE / MUTING SYSTEM".

--------------------------------------------------------------------------------
2. FEATURE TOGGLE / MUTING SYSTEM IMPLEMENTATION:
--------------------------------------------------------------------------------
- Implement a global application state setting (e.g., `moduleToggles`) with keys:
  * `laboratoryCore`: true (always enabled)
  * `pharmacyModule`: boolean (default: false or collapsible)
  * `emrModule`: boolean (default: false or collapsible)
  * `hospitalModule`: boolean (default: false or collapsible)
  * `billingModule`: boolean (default: false or collapsible)
- When a module is MUTED (false):
  * Hide its navigation items from the main sidebar.
  * Hide secondary dashboards not related to the laboratory.
  * KEEP all background APIs, data structures, and cross-module hooks functional so that laboratory actions can still silently create patient records or generate pharmacy prescription objects.
- Provide a clear "Settings -> Feature Visibility / Mute Modules" control panel in the Admin section.

--------------------------------------------------------------------------------
3. THE 5-10 MINUTE RAPID LAB WORKFLOW ENGINE:
--------------------------------------------------------------------------------
Create a dedicated primary interface optimized for ultra-fast sample execution:
- STEP 1 (Express Accessioning): Quick patient intake form (Name, Age, Gender, Phone, Selected Rapid Test Panel). Generate instant QR/Barcode UID (`TK-XXXXX`).
- STEP 2 (Rapid Workstation): Batch grid/form where technicians enter raw numeric/qualitative values or click rapid qualitative buttons (e.g., [Positive] / [Negative] / [Invalid]).
- STEP 3 (AI Verification & Outlier Check): Integrate an AI engine that immediately:
  a) Checks values against age/gender reference ranges.
  b) Highlights Critical/Panic values with visual alerts.
  c) Auto-generates a 2-sentence patient-friendly summary.
  d) Generates an AI-suggested evidence-based prescription when pathognomonic lab results are positive (e.g., Positive Malaria -> Artemether-Lumefantrine dosage recommendation).
- STEP 4 (Dispatch): 1-click execution to output a polished PDF laboratory report, trigger instant simulated WhatsApp/SMS notification, and optionally push the prescription to the Pharmacy queue.

--------------------------------------------------------------------------------
4. DESIGN SYSTEM & UI/UX REQUIREMENT:
--------------------------------------------------------------------------------
- MODERN CLINICAL SAAS AESTHETIC: Deep navy/slate header (`#0F172A`), clinical teal accents (`#0D9488`), clean white card layouts, high-contrast readable data tables, status badge pills (Pending, In-Analysis, Verified, Dispatched).
- TOP NAVIGATION / SIDEBAR: Modern collapsible sidebar with TekiLab branding, quick status indicators, user role badges, and quick search bar for sample IDs or patient names.

--------------------------------------------------------------------------------
5. EXECUTION REQUIREMENTS:
--------------------------------------------------------------------------------
- Refactor existing React components and modularize the navigation.
- Ensure all existing medical and hospital features are preserved under the muted/unmuted settings architecture.
- Combine all logic, UI components, state management, and simulated AI services into a single clean, fully operational single-file application.

PLEASE GENERATE THE COMPLETE REFACTORED APPLICATION FOR TEKILAB NOW.
================================================================================
```

---
*End of BRD Document.*
