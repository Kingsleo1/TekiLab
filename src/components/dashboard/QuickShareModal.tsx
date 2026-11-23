import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Download, 
  Copy, 
  Check, 
  MessageCircle, 
  Facebook, 
  Send, 
  Mail, 
  Receipt,
  FileCheck,
  Eye,
  Smartphone
} from 'lucide-react';
import { Order } from '../../types/pharmacy';
import { toast } from 'sonner';
import { 
  compileReceiptPDFFile, 
  shareReceiptAsPDF, 
  previewReceiptPDF, 
  ReceiptData 
} from '../../lib/receipt-pdf';

interface QuickShareModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickShareModal({
  order,
  open,
  onOpenChange
}: QuickShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!order) return null;

  const receiptData: ReceiptData = {
    id: order.id,
    createdAt: order.createdAt,
    customerName: order.patientId === 'walk-in' ? 'General Consumer' : (order.patientId || 'General Consumer'),
    items: (order.items || []).map(i => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      unit: i.unit || 'pcs',
      saleType: i.saleType || 'Retail',
      packageSize: i.packageSize
    })),
    subtotal: order.subtotal || (order.total - (order.tax || 0)),
    discount: order.discount || 0,
    tax: order.tax || 0,
    total: order.total,
    paymentMethod: order.paymentMethod || 'CASH',
    processedBy: order.processedBy || 'James Wilson'
  };

  const handleDownloadPDF = () => {
    try {
      const { doc, fileName } = compileReceiptPDFFile(receiptData);
      doc.save(fileName);
      toast.success(`Official PDF receipt downloaded (${fileName})!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not download PDF.');
    }
  };

  const handleShareToPlatform = async (platform: 'native' | 'whatsapp' | 'telegram' | 'email' | 'facebook') => {
    setIsSharing(true);
    try {
      await shareReceiptAsPDF(receiptData, platform);
    } catch (err) {
      console.error('Error sharing receipt as PDF:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePreviewPDF = () => {
    previewReceiptPDF(receiptData);
  };

  const platforms = [
    {
      id: 'whatsapp' as const,
      name: 'Share PDF via WhatsApp',
      description: 'Sends the compiled PDF receipt document directly to WhatsApp',
      badge: 'PDF Document',
      icon: <MessageCircle size={20} className="text-emerald-600" />,
      color: 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/70 text-slate-800'
    },
    {
      id: 'telegram' as const,
      name: 'Send PDF via Telegram',
      description: 'Shares compiled PDF receipt directly to Telegram chat',
      badge: 'PDF File',
      icon: <Send size={20} className="text-sky-600" />,
      color: 'bg-sky-50/70 border-sky-200/80 hover:bg-sky-100/70 text-slate-800'
    },
    {
      id: 'email' as const,
      name: 'Email PDF Receipt',
      description: 'Prepares email with transaction ledger and PDF document',
      badge: 'Attachment',
      icon: <Mail size={20} className="text-indigo-600" />,
      color: 'bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100/70 text-slate-800'
    },
    {
      id: 'facebook' as const,
      name: 'Facebook & Social',
      description: 'Downloads receipt PDF and opens social share composer',
      badge: 'PDF Export',
      icon: <Facebook size={20} className="text-blue-600" />,
      color: 'bg-blue-50/70 border-blue-200/80 hover:bg-blue-100/70 text-slate-800'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[96vw] max-w-[96vw] sm:w-full rounded-2xl p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white max-h-[90dvh] flex flex-col focus:outline-none">
        <div className="bg-slate-900 text-white p-5 shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Share2 size={16} className="text-blue-400" />
                Share Transaction as PDF Receipt
              </DialogTitle>
              <Badge className="bg-blue-600 text-white border-none text-[10px] font-semibold px-2 py-0.5">
                PDF Document
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Order #{order.id} • Grand Total: <span className="text-emerald-400 font-bold font-mono">₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y focus:outline-none">
          {/* Highlight: Same Document Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileCheck size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Verified PDF Document</p>
                <p className="text-[11px] text-slate-500">Same official formatted receipt as download</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPDF}
              className="h-7 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-white cursor-pointer flex items-center gap-1"
            >
              <Eye size={13} />
              <span>Preview</span>
            </Button>
          </div>

          {/* Primary Action: Universal Native Device Document Share */}
          <Button
            onClick={() => handleShareToPlatform('native')}
            disabled={isSharing}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Smartphone size={16} />
            <span>Share PDF Document to Any App (Phone/PC Share)</span>
          </Button>

          {/* Platform Specific PDF Sharing */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Direct Platform PDF Delivery
            </span>
            <div className="grid grid-cols-1 gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShareToPlatform(p.id)}
                  disabled={isSharing}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${p.color}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-100 flex items-center justify-center shrink-0">
                      {p.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold leading-tight text-slate-900">{p.name}</p>
                        <span className="text-[9px] font-medium px-1.5 py-0.2 bg-white/90 text-slate-600 border border-slate-200 rounded">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.description}</p>
                    </div>
                  </div>
                  <Share2 size={13} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Direct Download Button */}
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="w-full h-9 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} className="text-blue-600" />
              <span>Download Exact PDF Receipt File</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs font-medium text-slate-600 cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
