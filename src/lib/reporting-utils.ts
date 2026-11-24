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

// Clinical PDFs contain only entered measurements and approved findings.
async function buildDiagnosticPDF(order: any, patient: any, logoUrl: string | undefined, imaging: boolean) {
  const released = order.orderStatus === (imaging ? 'Released' : 'RELEASED');
  const approved = released && order.reportApproval;
  const doc = new jsPDF();
  await drawHeaderWithLogo(doc, 'TekiLab Diagnostics', approved ? 'Approved diagnostic report' : 'DRAFT - NOT FOR CLINICAL USE', logoUrl);
  const identity = [
    ['Patient', patient?.fullName || order.patientName || 'Not recorded'],
    ['MRN', patient?.mrn || order.mrn || 'Not recorded'],
    ['Test', order.testName || 'Not recorded'],
    ['Report / accession', order.reportNumber || order.accessionNumber || order.id],
    ['Status', approved ? 'Professionally reviewed and approved' : 'DRAFT - approval required']
  ];
  autoTable(doc, { startY: 32, body: identity, theme: 'plain', styles: { fontSize: 9 }, margin: { bottom: 24 } });
  if (!imaging) {
    const results = Array.isArray(order.results) ? order.results.map((r: any) => [r.parameterName || r.name, r.value, r.unit || '', r.referenceRange || 'Not recorded', r.flag || 'Not recorded']) :
      Object.entries(order.results || {}).map(([name,r]: [string,any]) => [name, String(r.value ?? ''), r.unit || '', r.referenceRange || 'Not recorded', r.flag || 'Not recorded']);
    autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, head: [['Parameter','Measured value','Unit','Reference interval','Flag']], body: results, styles: { fontSize: 8 }, margin: { bottom: 24 } });
  }
  const sections = imaging ? [['Clinical indication', order.clinicalIndication], ['Technique',order.techniqueNotes], ['Findings', order.findingsNotes || order.findings], ['Impression',order.impressionNotes || order.impression], ['Recommendations',order.recommendationsNotes]] :
    [['Finding / impression',order.likelyIssue], ['Professional findings and interpretation',order.clinicalInterpretation || order.notes]];
  autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, body: sections.map(([label,value]) => [label, value || 'Not recorded']), theme: 'grid', styles: { fontSize: 9, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 45 } }, margin: { bottom: 24 } });
  if (approved) {
    let y = (doc as any).lastAutoTable.finalY + 8;
    if (y > 228) { doc.addPage(); y = 25; }
    doc.addImage(order.reportApproval.signaturePng, 'PNG', 14, y, 65, 18);
    doc.setFontSize(8);
    doc.text('Approved by: ' + order.reportApproval.signerName, 14, y + 24);
    doc.text('Signed: ' + order.reportApproval.signedAt, 14, y + 29);
    doc.text('Content SHA-256: ' + order.reportApproval.reportDigest, 14, y + 34);
  }
  attachFooterWithSign(doc, order.reportNumber || order.accessionNumber || order.id, approved ? order.reportApproval.signerName : 'DRAFT - unsigned');
  doc.save((approved ? '' : 'DRAFT_') + (imaging ? 'Radiology_' : 'Laboratory_') + (order.reportNumber || order.accessionNumber || order.id) + '.pdf');
}
export const generateLabReportPDF = (order: any, patient: any, logoUrl?: string) => buildDiagnosticPDF(order, patient, logoUrl, false);
export const generateRadiologyReportPDF = (order: any, patient: any, logoUrl?: string) => buildDiagnosticPDF(order, patient, logoUrl, true);

export async function generateAIReviewPDF(data: any) {
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text('TekiLab - diagnostic review worksheet', 14, 20);
  autoTable(doc, { startY: 28, body: [
    ['Review status', 'ADVISORY ONLY - professional review mandatory; not a prescription'],
    ['Accession', data.accessionNumber], ['Test', data.testName],
    ['Review source', data.analysis?.model || 'Manual review - no AI'],
    ['Generated', data.analysis?.checkedAt || new Date().toISOString()],
    ['Interpretation', data.analysis?.clinicalSummary || 'No AI interpretation requested.'],
    ['Reviewer findings', data.notes || 'Not recorded']
  ], styles: { fontSize: 9 }, margin: { bottom: 24 } });
  autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, head: [['Measurement','Value','Unit','Reference','Recorded flag']],
    body: data.parameters.map((p: any) => [p.name,p.value,p.unit,p.referenceRange,p.flag]), styles: { fontSize: 8 }, margin: { bottom: 24 } });
  const deviations = data.analysis?.flaggedParameters || [];
  if (deviations.length) autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6, head: [['Flagged parameter','Deviation','Review note']],
    body: deviations.map((p: any) => [p.parameter,p.deviation,p.clinicalNote]), styles: { fontSize: 8 }, margin: { bottom: 24 } });
  if (data.analysis?.aiSuggestedDrug) autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 6,
    body: [['UNAPPROVED AI medication suggestion', JSON.stringify(data.analysis.aiSuggestedDrug)],['Required next step','An authorized clinician must independently assess and prescribe; do not dispense from this worksheet.']],
    styles: { fontSize: 8 }, margin: { bottom: 24 } });
  attachFooterWithSign(doc, data.accessionNumber, 'Advisory worksheet - unsigned');
  doc.save('Review_' + data.accessionNumber + '.pdf');
}

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
        `Attending Doctor: ${encounter.doctorName || 'Not recorded'}`,
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
  const notes = encounter.notes || encounter.chiefComplaint || 'Not recorded';
  const splitNotes = doc.splitTextToSize(notes, 182);
  doc.text(splitNotes, 14, currentY);

  currentY += (splitNotes.length * 4) + 6;

  // Diagnosis
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`DIAGNOSIS (ICD-10): ${encounter.primaryDiagnosis || encounter.diagnosis || 'Not recorded'}`, 14, currentY);

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

  if (encounter.reportApproval && encounter.status === 'Completed') {
    const approval = encounter.reportApproval;
    let y = Math.max(currentY + 10, ((doc as any).lastAutoTable?.finalY || 0) + 10);
    if (y > 225) { doc.addPage(); y = 25; }
    doc.addImage(approval.signaturePng, 'PNG', 14, y, 65, 18);
    doc.setFontSize(8); doc.text('Signed by ' + approval.signerName + ' at ' + approval.signedAt,14,y+24);
    doc.text('Content SHA-256: ' + approval.reportDigest,14,y+30);
  }
  attachFooterWithSign(doc, encounter.id, encounter.reportApproval?.signerName || 'DRAFT - unsigned');
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
