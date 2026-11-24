import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
export function SpecimenCode({ value }: { value: string }) {
  const [url,setUrl] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 192, margin: 2, errorCorrectionLevel: 'M' }).then(data => { if (active) setUrl(data); }).catch(() => { if (active) setUrl(''); });
    return () => { active = false; };
  }, [value]);
  return url ? <img src={url} width={96} height={96} alt={'Scannable specimen QR code for ' + value} /> : <span className="text-xs">Generating label…</span>;
}
export async function downloadSpecimenLabel(value: string, patientName: string, testName: string) {
  const [{ jsPDF }, png] = await Promise.all([import('jspdf'), QRCode.toDataURL(value, { width: 256, margin: 1 })]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [80,50] });
  doc.setFontSize(9); doc.text('TekiLab specimen label', 4, 6);
  doc.addImage(png,'PNG',4,9,25,25);
  doc.setFontSize(7); doc.text(doc.splitTextToSize(value,43),32,12); doc.text(doc.splitTextToSize(patientName,43),32,25);
  doc.text(doc.splitTextToSize(testName,72),4,39);
  doc.save('Specimen_' + value + '.pdf');
}
