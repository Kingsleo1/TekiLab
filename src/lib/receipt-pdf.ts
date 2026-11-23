import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  saleType?: 'Retail' | 'Wholesale' | 'Volume Price';
  packageSize?: string;
}

export interface ReceiptData {
  id: string;
  createdAt: string | Date;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
  processedBy?: string;
  branchName?: string;
}

/**
 * Generates a beautifully styled sales receipt PDF using jsPDF.
 */
export function buildReceiptPDF(data: ReceiptData): jsPDF {
  // Use a neat receipt size (A5 portrait: 148mm width by 210mm height)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.width; // 148mm
  
  // Outer Border Accent
  doc.setDrawColor(226, 232, 240); // border-slate-200
  doc.setLineWidth(0.5);
  doc.rect(4, 4, width - 8, doc.internal.pageSize.height - 8);

  // 1. HEADER BRANDING
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('TEKI MED HEALTHCARE', width / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('UNIFIED CLINICAL DISPENSARY & PHARMACY OS', width / 2, 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Node: Terminal-01A / Pharma-01', width / 2, 28, { align: 'center' });
  doc.text('Lagos, Nigeria • Health is Wealth', width / 2, 32, { align: 'center' });

  // Divider Line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(10, 36, width - 10, 36);
  doc.setLineDashPattern([], 0); // reset

  // 2. RECEIPT METADATA GRID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL SALES RECEIPT', 14, 44);

  // Metadata labels & values
  const dateStr = format(new Date(data.createdAt), 'PPP p');
  const metadata = [
    { label: 'RECEIPT ID', val: data.id.toUpperCase() },
    { label: 'DATE & TIME', val: dateStr },
    { label: 'CUSTOMER', val: data.customerName.toUpperCase() },
    { label: 'OPERATOR', val: (data.processedBy || 'James Wilson').toUpperCase() },
    { label: 'PAY METHOD', val: (data.paymentMethod || 'CASH').toUpperCase() }
  ];

  doc.setFontSize(7.5);
  let metadataY = 50;
  metadata.forEach((m, idx) => {
    // Left column labels, right column values
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(m.label, 14, metadataY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(m.val, 42, metadataY);
    
    metadataY += 5;
  });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(10, metadataY + 1, width - 10, metadataY + 1);

  // 3. ITEMIZED TABLE (With Wholesale / Retail Mode per Item)
  const tableHeaders = ['ITEM DESCRIPTION', 'MODE', 'QTY', 'RATE', 'TOTAL'];
  const tableRows = data.items.map(item => {
    const modeLabel = item.saleType === 'Wholesale' || item.saleType === 'Volume Price' ? 'WHOLESALE' : 'RETAIL';
    const pkgSuffix = item.packageSize && item.packageSize !== 'Full Pack' ? ` (${item.packageSize})` : '';
    return [
      `${item.name.toUpperCase()}${pkgSuffix}`,
      modeLabel,
      `${item.quantity} ${item.unit || 'pcs'}`,
      `N${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `N${(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
  });

  autoTable(doc, {
    startY: metadataY + 4,
    head: [tableHeaders],
    body: tableRows,
    theme: 'plain',
    headStyles: { 
      fillColor: [248, 250, 252], // slate-50
      textColor: [100, 116, 139], // slate-500
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      textColor: [51, 65, 85], // slate-700
      fontSize: 7.5,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 4. FINANCIAL TOTALS BLOCK (Including Retail & Wholesale Subtotals)
  doc.setDrawColor(226, 232, 240);
  doc.line(10, finalY - 2, width - 10, finalY - 2);

  let totalsY = finalY + 2;

  const retailItems = data.items.filter(i => i.saleType !== 'Wholesale' && i.saleType !== 'Volume Price');
  const wholesaleItems = data.items.filter(i => i.saleType === 'Wholesale' || i.saleType === 'Volume Price');
  const retailSub = retailItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wholesaleSub = wholesaleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const totals: { label: string; val: string }[] = [];
  if (retailItems.length > 0 && wholesaleItems.length > 0) {
    totals.push({
      label: `RETAIL ITEMS (${retailItems.length})`,
      val: `N${retailSub.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    });
    totals.push({
      label: `WHOLESALE ITEMS (${wholesaleItems.length})`,
      val: `N${wholesaleSub.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    });
  } else if (wholesaleItems.length > 0) {
    totals.push({
      label: `WHOLESALE SUBTOTAL (${wholesaleItems.length})`,
      val: `N${wholesaleSub.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    });
  } else {
    totals.push({
      label: `RETAIL SUBTOTAL (${retailItems.length})`,
      val: `N${retailSub.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    });
  }

  totals.push(
    { label: 'COMBINED SUBTOTAL', val: `N${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'DISCOUNT', val: data.discount && data.discount > 0 ? `-N${data.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N0.00' },
    { label: 'VAT TAX (5%)', val: `N${(data.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
  );

  totals.forEach(t => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(t.label, 52, totalsY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(t.val, width - 14, totalsY, { align: 'right' });
    totalsY += 5;
  });

  // Solid dark total section
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(60, totalsY, width - 74, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL PAID', 64, totalsY + 6);
  doc.text(`N${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 18, totalsY + 6, { align: 'right' });

  // 5. FOOTER & BARCODE
  const footerY = doc.internal.pageSize.height - 24;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for purchasing from Teki Pharm!', width / 2, footerY, { align: 'center' });
  doc.text('This is a verified digital transaction proof.', width / 2, footerY + 4, { align: 'center' });

  // Simulated barcode lines
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.7);
  let barcodeX = width / 2 - 20;
  for (let i = 0; i < 22; i++) {
    const space = Math.random() > 0.4 ? 1.5 : 2.5;
    const widthLine = Math.random() > 0.5 ? 0.8 : 0.3;
    doc.setLineWidth(widthLine);
    doc.line(barcodeX, footerY + 8, barcodeX, footerY + 14);
    barcodeX += space;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`*${data.id.toUpperCase()}*`, width / 2, footerY + 18, { align: 'center' });

  return doc;
}

/**
 * Creates a neat text summary of the receipt details to accompany sharing/downloads.
 */
export function buildReceiptSummaryText(data: ReceiptData): string {
  const dateStr = format(new Date(data.createdAt), 'PPP p');
  const retailItems = data.items.filter(i => i.saleType !== 'Wholesale' && i.saleType !== 'Volume Price');
  const wholesaleItems = data.items.filter(i => i.saleType === 'Wholesale' || i.saleType === 'Volume Price');
  const retailSub = retailItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wholesaleSub = wholesaleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const itemList = data.items
    .map(item => {
      const modeTag = item.saleType === 'Wholesale' || item.saleType === 'Volume Price' ? '[Wholesale]' : '[Retail]';
      return `• ${item.name} ${modeTag} (${item.quantity} ${item.unit || 'pcs'} @ N${item.price.toFixed(2)}) — N${(item.price * item.quantity).toFixed(2)}`;
    })
    .join('\n');

  const breakdownLines =
    retailItems.length > 0 && wholesaleItems.length > 0
      ? `🏷️ *Retail Items (${retailItems.length}):* N${retailSub.toFixed(2)}\n📦 *Wholesale Items (${wholesaleItems.length}):* N${wholesaleSub.toFixed(2)}\n`
      : wholesaleItems.length > 0
        ? `📦 *Sale Type:* Wholesale (${wholesaleItems.length} items)\n`
        : `🏷️ *Sale Type:* Retail (${retailItems.length} items)\n`;

  return `📦 *TEKI PHARM SALES RECEIPT SUMMARY* 📦
----------------------------------
🧾 *Receipt ID:* ${data.id.toUpperCase()}
📅 *Date:* ${dateStr}
👤 *Customer:* ${data.customerName}
🧑‍⚕️ *Dispensed By:* ${data.processedBy || 'James Wilson'}
💳 *Payment Method:* ${data.paymentMethod || 'CASH'}
----------------------------------
🛍️ *Purchased Items:*
${itemList}

----------------------------------
${breakdownLines}💰 *Subtotal:* N${data.subtotal.toFixed(2)}
📉 *Discount:* N${(data.discount || 0).toFixed(2)}
🏢 *VAT (5%):* N${(data.tax || 0).toFixed(2)}
💵 *TOTAL SETTLED:* N${data.total.toFixed(2)}
----------------------------------
Thank you for choosing Teki Pharm!
Health is Wealth.`;
}

/**
 * Compiles the official sales receipt into a binary Blob, File, and downloadable jsPDF document.
 * Guarantees that the exact same PDF document that can be downloaded is shared across all platforms.
 */
export function compileReceiptPDFFile(data: ReceiptData): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  fileName: string;
  dataUrl: string;
} {
  const doc = buildReceiptPDF(data);
  const fileName = `teki_pharm_receipt_${data.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  let dataUrl = '';
  try {
    dataUrl = doc.output('dataurlstring');
  } catch (e) {
    // ignore if large
  }
  return { doc, blob, file, fileName, dataUrl };
}

/**
 * Previews the generated PDF receipt directly in a browser tab.
 */
export function previewReceiptPDF(data: ReceiptData): void {
  try {
    const { blob } = compileReceiptPDFFile(data);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Error previewing PDF:', err);
    toast.error('Could not open receipt preview.');
  }
}

/**
 * Universal PDF Document Sharing Engine.
 * Ensures that whenever a receipt is shared (via WhatsApp, Telegram, Email, or System Share),
 * the actual compiled PDF document is sent as an attached file.
 */
export async function shareReceiptAsPDF(
  data: ReceiptData,
  platform: 'native' | 'whatsapp' | 'telegram' | 'email' | 'facebook' = 'native'
): Promise<{ success: boolean; method: string }> {
  try {
    const { doc, file, fileName } = compileReceiptPDFFile(data);
    const summary = buildReceiptSummaryText(data);
    const isFileShareSupported = 
      typeof navigator !== 'undefined' && 
      navigator.share && 
      navigator.canShare && 
      navigator.canShare({ files: [file] });

    // 1. WhatsApp Action
    if (platform === 'whatsapp') {
      if (isFileShareSupported) {
        // Mobile / Modern device: Open native document share which WhatsApp accepts directly as a document attachment!
        try {
          await navigator.share({
            files: [file],
            title: `Teki Pharm Receipt ${data.id}.pdf`,
            text: `Sales Receipt for Order #${data.id.toUpperCase()} • Total: ₦${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          });
          toast.success('PDF Receipt shared successfully to WhatsApp!');
          return { success: true, method: 'native-file-whatsapp' };
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return { success: false, method: 'aborted' };
          }
        }
      }

      // Fallback for WhatsApp Web / desktop:
      // Download the exact PDF document to user's device and open WhatsApp with clear instructions to attach it
      doc.save(fileName);
      const waText = `🧾 *TEKI PHARM OFFICIAL SALES RECEIPT*\n` +
        `Order ID: *#${data.id.toUpperCase()}*\n` +
        `Customer: *${data.customerName}*\n` +
        `Amount Settled: *₦${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}*\n\n` +
        `📄 *The official PDF receipt document has been compiled and saved to your device (${fileName}).* Please attach the downloaded PDF receipt file directly to this chat.\n\n` +
        `Health is Wealth • Teki Pharm`;

      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, '_blank');
      toast.success('Official PDF Receipt downloaded! WhatsApp opened — please attach the downloaded PDF file.');
      return { success: true, method: 'download-and-web-whatsapp' };
    }

    // 2. Telegram Action
    if (platform === 'telegram') {
      if (isFileShareSupported) {
        try {
          await navigator.share({
            files: [file],
            title: `Teki Pharm Receipt ${data.id}.pdf`,
            text: `Teki Pharm Sales Receipt #${data.id}`
          });
          toast.success('PDF Receipt shared to Telegram!');
          return { success: true, method: 'native-file-telegram' };
        } catch (err: any) {
          if (err.name === 'AbortError') return { success: false, method: 'aborted' };
        }
      }
      doc.save(fileName);
      const tgText = `🧾 Teki Pharm Sales Receipt #${data.id.toUpperCase()} (₦${data.total.toLocaleString()}). The official PDF receipt has been downloaded to attach.`;
      window.open(`https://t.me/share/url?text=${encodeURIComponent(tgText)}`, '_blank');
      toast.success('PDF Receipt downloaded! Please attach it to your Telegram chat.');
      return { success: true, method: 'download-and-telegram' };
    }

    // 3. Email Action
    if (platform === 'email') {
      doc.save(fileName);
      const subject = `Official Sales Receipt PDF - Order #${data.id.toUpperCase()} (Teki Pharm)`;
      const body = `Dear ${data.customerName},\n\nAttached is your official sales receipt PDF from Teki Pharm for Order #${data.id.toUpperCase()}.\n\nTotal Paid: ₦${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\nPayment Method: ${data.paymentMethod || 'CASH'}\nDate: ${format(new Date(data.createdAt), 'PPP p')}\n\nPlease find the compiled PDF document (${fileName}) attached.\n\nThank you for choosing Teki Pharm!\nHealth is Wealth.`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
      toast.success('PDF receipt saved! Opening email client — please attach the downloaded PDF document.');
      return { success: true, method: 'download-and-email' };
    }

    // 4. Facebook / Social
    if (platform === 'facebook') {
      doc.save(fileName);
      const quote = `Teki Pharm Sales Receipt #${data.id.toUpperCase()} - ₦${data.total.toLocaleString()}`;
      window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(quote)}`, '_blank');
      toast.success('PDF receipt downloaded! You can upload it to your post.');
      return { success: true, method: 'download-and-facebook' };
    }

    // 5. Default Native Share (Shares the compiled PDF File to any installed app: WhatsApp, Drive, Gmail, etc.)
    if (isFileShareSupported) {
      await navigator.share({
        files: [file],
        title: `Teki Pharm Receipt ${data.id}.pdf`,
        text: `Sales Receipt for Order #${data.id.toUpperCase()} • Total: ₦${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      });
      toast.success('Successfully shared PDF receipt document!');
      return { success: true, method: 'native-share-file' };
    } else {
      // Direct local download as the primary deliverable
      doc.save(fileName);
      toast.success('PDF Receipt downloaded to your device! Standard file-sharing API is unavailable on this browser.');
      handleSummaryFallback(summary);
      return { success: true, method: 'download-fallback' };
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing PDF receipt:', error);
      toast.error('Could not complete sharing. Downloading PDF receipt instead...');
      try {
        const doc = buildReceiptPDF(data);
        doc.save(`teki_pharm_receipt_${data.id.toLowerCase()}.pdf`);
      } catch (e) {
        // ignore
      }
    }
    return { success: false, method: 'error' };
  }
}

/**
 * Downloads the receipt PDF and attempts to share it natively as a PDF document.
 */
export async function downloadAndShareReceipt(data: ReceiptData) {
  try {
    const { doc, fileName } = compileReceiptPDFFile(data);
    // 1. Save locally
    doc.save(fileName);
    toast.success('PDF Receipt downloaded successfully!');

    // 2. Share as PDF document
    await shareReceiptAsPDF(data, 'native');
  } catch (error) {
    console.error('Error in downloadAndShareReceipt:', error);
  }
}

function handleSummaryFallback(summary: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(summary);
    toast.info('Receipt summary text copied to clipboard as backup.');
  }
}
