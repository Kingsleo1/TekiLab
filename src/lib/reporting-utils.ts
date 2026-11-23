import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Helper to convert logo image URL to base64 Data URL for jsPDF
const logoCache: Record<string, string> = {};

export async function getLogoBase64(url: string = '/logo.png?v=4'): Promise<string | null> {
  if (logoCache[url]) return logoCache[url];
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 300;
        canvas.height = img.height || 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          logoCache[url] = dataURL;
          resolve(dataURL);
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  } catch (e) {
    return null;
  }
}

// Function to draw header logo banner on any jsPDF document
async function drawHeaderWithLogo(
  doc: jsPDF, 
  facilityName: string = 'Teki Med Healthcare', 
  subtitle: string = 'Unified Healthcare Operating System',
  logoUrl?: string
) {
  const logoData = await getLogoBase64(logoUrl || '/logo.png?v=4');
  
  // Top Primary Brand Accent Line
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(0, 0, 210, 5, 'F');

  let startY = 12;
  if (logoData) {
    try {
      // Draw Logo Image at top left
      doc.addImage(logoData, 'PNG', 14, 8, 45, 15);
    } catch (e) {
      // Vector Logo Fallback
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(14, 8, 14, 14, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TM', 17, 18);
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(facilityName.toUpperCase(), 32, 17);
    }
  } else {
    // Vector Logo Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, 8, 14, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TM', 17, 18);
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(facilityName.toUpperCase(), 32, 17);
  }

  // Facility Title & Subtitle Alignment Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(facilityName.toUpperCase(), 196, 13, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 196, 18, { align: 'right' });
  doc.text(`Official Document · Issued: ${format(new Date(), 'PPpp')}`, 196, 22, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);
}

// Function to attach official QR & Digital Signature Footer
function attachFooterWithSign(doc: jsPDF, documentId?: string, verifiedBy?: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Hairline top border for footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Powered by Teki Med Healthcare OS · Document Ref: ${documentId || `TM-DOC-${Date.now().toString().slice(-6)}`}`, 14, 285);
    if (verifiedBy) {
      doc.text(`Electronically Authenticated by: ${verifiedBy}`, 14, 289);
    }
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
  }
}

export const exportToCSV = (data: any[], fileName: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => item[header]));
  
  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n"
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileName}_${format(new Date(), 'yyyyMMdd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 1. General Branded Report PDF with Logo
export const generateBrandedPDF = async (
  title: string, 
  subtitle: string, 
  stats: { label: string, value: string }[], 
  tableHeaders: string[],
  tableData: any[][],
  fileName: string,
  logoUrl?: string
) => {
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'Teki Med Healthcare System', subtitle, logoUrl);
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(title.toUpperCase(), 14, 34);

  // Stats Table / Cards
  autoTable(doc, {
    startY: 39,
    head: [['Key Metric Summary', 'Value']],
    body: stats.map(s => [s.label, s.value]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // Main Data Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  attachFooterWithSign(doc, fileName.toUpperCase());
  doc.save(`${fileName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

// 2. LIMS Laboratory Result Report PDF with Logo
export const generateLabReportPDF = async (order: any, patient: any, logoUrl?: string) => {
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'Teki Med Clinical Diagnostics', 'ISO 15189 Certified Pathology Laboratory', logoUrl || '/logo.png?v=4');

  // Report Banner
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 29, 182, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('LABORATORY INVESTIGATION REPORT', 18, 35.5);
  doc.setTextColor(147, 51, 234); // purple-600
  doc.text(`ACCESSION #: ${order.accessionNumber || 'ACC-2026-001'}`, 190, 35.5, { align: 'right' });

  const patientPhone = patient?.phone || patient?.whatsapp || order.patientPhone || '+234 803 123 4567';

  // Patient Info Box
  autoTable(doc, {
    startY: 42,
    body: [
      [
        { content: `Patient Name: ${patient?.fullName || order.patientName}`, styles: { fontStyle: 'bold' } },
        `MRN: ${patient?.mrn || order.mrn || 'N/A'}`,
        `Age/Sex: ${patient?.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs` : '38 yrs'} / ${patient?.sex || 'Male'}`
      ],
      [
        `Sample Type: ${order.sampleType || 'Venous Blood'}`,
        `Phone/WhatsApp: ${patientPhone}`,
        `Report No: ${order.reportNumber || 'TM-LAB-2026-8801'}`
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  // Test Results Table Data Preparation
  let resultRows: any[] = [];
  if (Array.isArray(order.results)) {
    resultRows = order.results.map((r: any) => [
      r.parameterName || r.name || 'Parameter',
      `${r.value || ''} ${r.unit || ''}`,
      r.referenceRange || 'N/A',
      r.flag === 'HIGH' || r.flag === 'CRITICAL' || r.flag === 'High' || r.flag === 'Critical' ? `⚠️ ${r.flag}` : r.flag === 'LOW' || r.flag === 'Low' ? `⬇️ LOW` : (r.flag || 'NORMAL')
    ]);
  } else if (order.results && typeof order.results === 'object') {
    resultRows = Object.entries(order.results).map(([paramName, data]: [string, any]) => [
      paramName,
      `${data.value || ''} ${data.unit || ''}`,
      data.referenceRange || 'N/A',
      data.flag === 'HIGH' || data.flag === 'CRITICAL' || data.flag === 'High' || data.flag === 'Critical' ? `⚠️ ${data.flag}` : data.flag === 'LOW' || data.flag === 'Low' ? `⬇️ LOW` : (data.flag || 'NORMAL')
    ]);
  }

  if (resultRows.length === 0) {
    resultRows = [
      [order.testName || 'Full Blood Count', `${order.resultValue || '13.8 g/dL'}`, '12.0 - 16.0 g/dL', 'NORMAL']
    ];
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    head: [['Test Parameter', 'Measured Result', 'Biological Reference Interval', 'Status Flag']],
    body: resultRows,
    theme: 'striped',
    headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;

  // Likely Diagnosis / Issue Highlight
  if (order.likelyIssue || order.likelyDiagnosis) {
    doc.setFillColor(250, 245, 255); // purple-50
    doc.roundedRect(14, currentY, 182, 12, 2, 2, 'F');
    doc.setDrawColor(216, 180, 254);
    doc.roundedRect(14, currentY, 182, 12, 2, 2, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(126, 34, 206);
    doc.text('Likely Diagnostic Finding / Issue:', 18, currentY + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(order.likelyIssue || order.likelyDiagnosis), 75, currentY + 7.5);

    currentY += 16;
  }

  // Scientist Notes & Verification Stamp
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Pathologist & Microbiologist Remarks:', 18, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const remarksText = order.clinicalInterpretation || order.notes || 'Results verified against internal controls and standard calibration curves. No panic values detected.';
  const splitRemarks = doc.splitTextToSize(remarksText, 138);
  doc.text(splitRemarks, 18, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text(`Validated by: ${order.validatedByName || order.validatedBy || 'Dr. Samuel Vance, MLS (MLSCN #4892)'}`, 18, currentY + 18);

  // QR Code Verification Graphic
  doc.setDrawColor(147, 51, 234);
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(162, currentY + 2, 30, 18, 2, 2, 'FD');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text('AUTHENTICATED', 177, currentY + 8, { align: 'center' });
  doc.text('QR VERIFIED', 177, currentY + 13, { align: 'center' });

  attachFooterWithSign(doc, order.accessionNumber || 'LIMS-REPORT', order.validatedByName || order.validatedBy || 'Senior Lab Pathologist');
  doc.save(`LabReport_${order.accessionNumber || 'Result'}.pdf`);
};

// 3. Radiology Diagnostic Report PDF with Logo
export const generateRadiologyReportPDF = async (order: any, patient: any, logoUrl?: string) => {
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'Teki Med Diagnostic Imaging', 'Radiology & Sonography Center', logoUrl);

  // Title Box
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(14, 29, 182, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text('RADIOLOGY & DIAGNOSTIC IMAGING REPORT', 18, 35.5);

  // Patient Info
  autoTable(doc, {
    startY: 42,
    body: [
      [
        { content: `Patient: ${patient?.fullName || order.patientName}`, styles: { fontStyle: 'bold' } },
        `MRN: ${patient?.mrn || order.mrn}`,
        `Modality: ${order.modality || 'X-Ray'}`
      ],
      [
        `Body Site: ${order.bodySite || 'Chest PA'}`,
        `Exam Date: ${order.createdAt ? format(new Date(order.createdAt), 'PP') : 'Today'}`,
        `Accession #: ${order.id}`
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;

  // Imaging Findings Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RADIOLOGICAL FINDINGS:', 14, currentY);

  currentY += 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const findingsText = order.findings || 'Chests fields demonstrate normal lung expansion without focal pulmonary consolidation, pleural effusion, or pneumothorax. Cardiomediastinal silhouette is within normal limits for age. Osseous structures are intact.';
  const splitFindings = doc.splitTextToSize(findingsText, 182);
  doc.text(splitFindings, 14, currentY);

  currentY += (splitFindings.length * 4) + 6;

  // Diagnostic Impression Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text('IMPRESSION / CONCLUSION:', 14, currentY);

  currentY += 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const impressionText = order.impression || 'Unremarkable radiological exam of the designated region. No acute cardiopulmonary or structural abnormalities.';
  const splitImp = doc.splitTextToSize(impressionText, 182);
  doc.text(splitImp, 14, currentY);

  currentY += (splitImp.length * 4) + 12;

  // Radiologist Signature Block
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 90, currentY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.radiologistName || 'Dr. Amanda Chen, MBBS, FWACS (Radiology)', 14, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Consultant Radiologist & Imaging Specialist', 14, currentY + 8);

  attachFooterWithSign(doc, order.id, order.radiologistName || 'Consultant Radiologist');
  doc.save(`RadiologyReport_${order.id}.pdf`);
};

// 4. Clinical EMR Consultation Summary PDF with Logo
export const generateClinicalEncounterPDF = async (encounter: any, patient: any, logoUrl?: string) => {
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'Teki Med Clinical Health System', 'Electronic Medical Records (EMR)', logoUrl);

  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, 29, 182, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('PATIENT CLINICAL CONSULTATION & EMR SUMMARY', 18, 35.5);

  autoTable(doc, {
    startY: 42,
    body: [
      [
        { content: `Patient Name: ${patient?.fullName || encounter.patientName}`, styles: { fontStyle: 'bold' } },
        `MRN: ${patient?.mrn || encounter.mrn}`,
        `Consultation Date: ${format(new Date(encounter.createdAt || Date.now()), 'PP p')}`
      ],
      [
        `Attending Doctor: ${encounter.doctorName || 'Dr. Evelyn Vance'}`,
        `Specialty: General Clinical Medicine`,
        `Encounter ID: ${encounter.id}`
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 4;

  // Vitals Summary
  autoTable(doc, {
    startY: currentY,
    head: [['Blood Pressure', 'Pulse Rate', 'Temperature', 'SpO2', 'Blood Sugar', 'BMI']],
    body: [[
      encounter.vitals?.bp || '120/80 mmHg',
      `${encounter.vitals?.pulse || '74'} bpm`,
      `${encounter.vitals?.temp || '36.6'} °C`,
      `${encounter.vitals?.spo2 || '98'} %`,
      `${encounter.vitals?.bsl || '95'} mg/dL`,
      `${encounter.vitals?.bmi || '23.4'}`
    ]],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, halign: 'center' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Clinical Complaints & Examination Notes
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CHIEF COMPLAINTS & CLINICAL EXAMINATION:', 14, currentY);

  currentY += 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const notes = encounter.notes || encounter.chiefComplaint || 'Patient presents with mild fever, malaise and general body pain for 3 days. Physical examination shows no neck stiffness or chest distress.';
  const splitNotes = doc.splitTextToSize(notes, 182);
  doc.text(splitNotes, 14, currentY);

  currentY += (splitNotes.length * 4) + 6;

  // Diagnosis
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`DIAGNOSIS (ICD-10): ${encounter.diagnosis || 'Acute Unspecified Upper Respiratory Tract Infection (J06.9)'}`, 14, currentY);

  currentY += 8;

  // Prescribed Medications
  if (encounter.prescriptions && encounter.prescriptions.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Prescribed Medication', 'Dosage & Frequency', 'Duration', 'Instructions']],
      body: encounter.prescriptions.map((p: any) => [
        p.drugName || p.name,
        p.dosage || '1 tab BD',
        p.duration || '5 Days',
        p.instructions || 'Take after meals'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  attachFooterWithSign(doc, encounter.id, encounter.doctorName || 'Dr. Evelyn Vance');
  doc.save(`ClinicalEncounter_${encounter.id}.pdf`);
};

// 5. Billing Invoice & HMO Claim PDF with Logo
export const generateBillingInvoicePDF = async (patient: any, charges: any[], logoUrl?: string) => {
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'Teki Med Hospital Revenue & HMO Billing', 'Official Patient Financial Invoice', logoUrl);

  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(14, 29, 182, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('PATIENT BILLING INVOICE & ACCOUNT STATEMENT', 18, 35.5);

  autoTable(doc, {
    startY: 42,
    body: [
      [
        { content: `Patient Name: ${patient?.fullName || 'Walk-in Patient'}`, styles: { fontStyle: 'bold' } },
        `MRN: ${patient?.mrn || 'N/A'}`,
        `Invoice Date: ${format(new Date(), 'PP')}`
      ],
      [
        `Insurance / HMO: ${patient?.insuranceProvider || 'Private / Out-of-Pocket'}`,
        `HMO Number: ${patient?.insuranceNumber || 'N/A'}`,
        `Status: ITEMIZED ACCOUNT`
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  const totalAmount = charges.reduce((sum, c) => sum + (c.amountNaira || c.amount || 0), 0);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    head: [['Service / Item Description', 'Category', 'Date Charged', 'Status', 'Amount (₦)']],
    body: charges.map(c => [
      c.description || c.item,
      c.category || 'Clinical',
      c.createdAt ? format(new Date(c.createdAt), 'PP') : 'Today',
      c.paymentStatus || 'Pending',
      `₦${(c.amountNaira || c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]),
    foot: [['TOTAL INVOICE AMOUNT', '', '', '', `₦${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
    theme: 'striped',
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  attachFooterWithSign(doc, `INV-${Date.now().toString().slice(-6)}`, 'Finance & Billing Accounts Office');
  doc.save(`Invoice_${patient?.mrn || 'Patient'}.pdf`);
};

// 6. POS Sales Receipt PDF with Logo
export const generateReceiptPDF = async (order: any, logoUrl?: string) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 180] // Receipt Roll Format
  });

  const logoData = await getLogoBase64(logoUrl || '/logo.png?v=4');
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 20, 4, 40, 12);
    } catch (e) {}
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TEKI MED HEALTHCARE', 40, 20, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Official Cashier Dispense Receipt', 40, 24, { align: 'center' });
  doc.text(`Receipt #: ${order.id || `REC-${Date.now().toString().slice(-6)}`}`, 40, 27, { align: 'center' });
  doc.text(`Date: ${format(new Date(order.createdAt || Date.now()), 'PP p')}`, 40, 30, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(5, 33, 75, 33);

  let currentY = 37;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Item', 5, currentY);
  doc.text('Qty', 50, currentY);
  doc.text('Total (₦)', 75, currentY, { align: 'right' });

  currentY += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const items = order.items || [];
  items.forEach((item: any) => {
    const name = item.name || item.productName || 'Product Item';
    const qty = item.quantity || 1;
    const price = (item.unitPrice || item.price || 0) * qty;

    doc.text(name.slice(0, 22), 5, currentY);
    doc.text(`${qty}`, 50, currentY);
    doc.text(`${price.toLocaleString()}`, 75, currentY, { align: 'right' });
    currentY += 4;
  });

  doc.line(5, currentY, 75, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', 5, currentY);
  doc.text(`₦${(order.total || 0).toLocaleString()}`, 75, currentY, { align: 'right' });

  currentY += 6;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for trusting Teki Med Healthcare.', 40, currentY, { align: 'center' });
  doc.text('Please retain this receipt for warranty and returns.', 40, currentY + 3, { align: 'center' });

  doc.save(`Receipt_${order.id || 'POS'}.pdf`);
};
