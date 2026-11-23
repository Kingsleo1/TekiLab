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
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Share2, 
  Printer, 
  Copy, 
  Check, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Send, 
  Mail, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Package, 
  User as UserIcon, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';
import { Order } from '../../types/pharmacy';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  buildReceiptPDF, 
  buildReceiptSummaryText, 
  compileReceiptPDFFile, 
  shareReceiptAsPDF, 
  previewReceiptPDF, 
  ReceiptData 
} from '../../lib/receipt-pdf';

interface TransactionDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoidOrder?: (orderId: string) => void;
}

export function TransactionDetailModal({
  order,
  open,
  onOpenChange,
  onVoidOrder
}: TransactionDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!order) return null;

  const orderItems = order.items || [];
  const retailItems = orderItems.filter(i => i.saleType !== 'Wholesale' && i.saleType !== 'Volume Price');
  const wholesaleItems = orderItems.filter(i => i.saleType === 'Wholesale' || i.saleType === 'Volume Price');
  const retailSubtotal = retailItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wholesaleSubtotal = wholesaleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const isMixedOrder = retailItems.length > 0 && wholesaleItems.length > 0;

  const receiptData: ReceiptData = {
    id: order.id,
    createdAt: order.createdAt,
    customerName: order.patientId === 'walk-in' ? 'General Consumer' : (order.patientId || 'General Consumer'),
    items: orderItems.map(i => ({
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

  const summaryText = buildReceiptSummaryText(receiptData);
  const dateStr = format(new Date(order.createdAt), 'PPP • p');

  const handleDownloadPDF = () => {
    try {
      const { doc, fileName } = compileReceiptPDFFile(receiptData);
      doc.save(fileName);
      toast.success(`Official PDF receipt downloaded (${fileName})!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not generate PDF receipt.');
    }
  };

  const handleSharePDF = async (platform: 'native' | 'whatsapp' | 'telegram' | 'email' | 'facebook' = 'native') => {
    setIsSharing(true);
    try {
      await shareReceiptAsPDF(receiptData, platform);
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePreviewPDF = () => {
    previewReceiptPDF(receiptData);
  };

  const handleCopyText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success('Receipt details copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info('Copy not supported on this browser.');
    }
  };

  const sharePlatforms = [
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp (PDF)',
      icon: <MessageCircle size={15} />,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    {
      id: 'telegram' as const,
      name: 'Telegram (PDF)',
      icon: <Send size={15} />,
      color: 'bg-sky-500 hover:bg-sky-600 text-white'
    },
    {
      id: 'email' as const,
      name: 'Email (PDF)',
      icon: <Mail size={15} />,
      color: 'bg-slate-700 hover:bg-slate-800 text-white'
    },
    {
      id: 'facebook' as const,
      name: 'Facebook (PDF)',
      icon: <Facebook size={15} />,
      color: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[96vw] max-w-[96vw] sm:w-full rounded-2xl p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white max-h-[90dvh] h-[90dvh] sm:h-auto sm:max-h-[88vh] flex flex-col focus:outline-none">
        {/* Header banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-8 sm:pr-0">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Transaction Details</span>
                <Badge className={`${order.status === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} border-none text-[10px] font-semibold px-2 py-0.2 rounded-md`}>
                  {order.status}
                </Badge>
                {isMixedOrder ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold px-2 py-0.2 rounded-md">
                    Mixed: {retailItems.length} Retail • {wholesaleItems.length} Wholesale
                  </Badge>
                ) : wholesaleItems.length > 0 ? (
                  <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-semibold px-2 py-0.2 rounded-md">
                    Wholesale Order
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-semibold px-2 py-0.2 rounded-md">
                    Retail Order
                  </Badge>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">{order.id}</h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Clock size={12} /> {dateStr}
              </p>
            </div>
            
            <div className="text-left sm:text-right bg-slate-800/80 p-3 rounded-xl border border-slate-700/70 sm:min-w-[140px]">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Total Amount</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                ₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </Button>

            <Button
              onClick={() => handleSharePDF('native')}
              disabled={isSharing}
              size="sm"
              className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Share2 size={14} className="text-blue-400" />
              <span>Share PDF</span>
            </Button>

            <Button
              onClick={() => setShowShareOptions(!showShareOptions)}
              size="sm"
              variant="outline"
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText size={14} className="text-slate-500" />
              <span>Channels</span>
            </Button>

            <Button
              onClick={handlePreviewPDF}
              size="sm"
              variant="ghost"
              className="h-8 sm:h-9 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer hidden sm:flex"
              title="Preview Receipt in Browser"
            >
              <ExternalLink size={13} className="mr-1" />
              <span>Preview</span>
            </Button>

            <Button
              onClick={handleCopyText}
              size="sm"
              variant="ghost"
              className="h-8 sm:h-9 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
              title="Copy Summary Text"
            >
              {copied ? <Check size={14} className="text-emerald-600 mr-1" /> : <Copy size={14} className="mr-1" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[11px] font-medium">Verified Receipt</span>
          </div>
        </div>

        {/* Share Options Drawer (when toggled) */}
        {showShareOptions && (
          <div className="p-3 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center gap-2 shrink-0 animate-in fade-in duration-200">
            <span className="text-[11px] font-semibold text-slate-600 mr-1">Share PDF File to:</span>
            {sharePlatforms.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSharePDF(p.id)}
                disabled={isSharing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer ${p.color}`}
              >
                {p.icon}
                <span>{p.name}</span>
              </button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSharePDF('native')}
              disabled={isSharing}
              className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-100/60 rounded-md font-medium cursor-pointer"
            >
              <ExternalLink size={12} className="mr-1" />
              More Apps
            </Button>
          </div>
        )}

        {/* Scrollable details container with full touch support on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 touch-pan-y focus:outline-none">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Customer</span>
              <p className="text-xs font-semibold text-slate-900 truncate mt-0.5" title={order.patientId}>
                {order.patientId === 'walk-in' ? 'General Consumer' : order.patientId}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Payment Method</span>
              <div className="flex items-center gap-1 mt-0.5">
                {order.paymentMethod === 'cash' ? <Banknote size={12} className="text-emerald-600" /> : 
                 order.paymentMethod === 'card' ? <CreditCard size={12} className="text-blue-600" /> : 
                 <Smartphone size={12} className="text-amber-600" />}
                <p className="text-xs font-semibold text-slate-900 capitalize">{order.paymentMethod || 'Cash'}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Dispensed By</span>
              <p className="text-xs font-semibold text-slate-900 truncate mt-0.5" title={order.processedBy}>
                {order.processedBy || 'Cashier'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Branch Node</span>
              <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">
                {order.pharmacyId === 'pharma-1' ? 'Central Main' : (order.pharmacyId || 'Central Branch')}
              </p>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-blue-600" />
                Purchased Inventory Items ({(order.items || []).length})
              </h3>
              <span className="text-[11px] text-slate-400">
                {(order.items || []).reduce((sum, item) => sum + item.quantity, 0)} total units
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[340px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Sale Mode</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(order.items || []).map((item, idx) => {
                      const isWholesaleItem = item.saleType === 'Wholesale' || item.saleType === 'Volume Price';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isWholesaleItem ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {item.name ? item.name[0] : '•'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-900 truncate max-w-[180px] sm:max-w-xs">{item.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {item.unit || 'unit'}{item.packageSize ? ` • ${item.packageSize}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isWholesaleItem
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                            }`}>
                              {isWholesaleItem ? 'Wholesale' : 'Retail'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                            ₦{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ₦{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-2">
            {retailItems.length > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Retail Items Subtotal ({retailItems.length} {retailItems.length === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-blue-700 font-mono">
                  ₦{retailSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {wholesaleItems.length > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  Wholesale Items Subtotal ({wholesaleItems.length} {wholesaleItems.length === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-indigo-700 font-mono">
                  ₦{wholesaleSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Combined Subtotal</span>
              <span className="font-semibold text-slate-800 font-mono">
                ₦{(order.subtotal || (order.total - (order.tax || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {order.discount && order.discount > 0 ? (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Promotional Discount</span>
                <span className="font-semibold font-mono">-₦{order.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-xs text-slate-500">
              <span>VAT (5%)</span>
              <span className="font-semibold text-slate-800 font-mono">
                ₦{(order.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Split Breakdown details if recorded */}
            {((order.cashPaid && order.cashPaid > 0) || (order.transferPaid && order.transferPaid > 0) || (order.cardPaid && order.cardPaid > 0) || (order.owingPaid && order.owingPaid > 0)) && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Payment Allocation</span>
                {order.cashPaid && order.cashPaid > 0 ? (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Cash Tendered:</span>
                    <span className="font-mono font-medium">₦{order.cashPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}
                {order.cardPaid && order.cardPaid > 0 ? (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Card / POS Terminal:</span>
                    <span className="font-mono font-medium">₦{order.cardPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}
                {order.transferPaid && order.transferPaid > 0 ? (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Direct Bank Transfer:</span>
                    <span className="font-mono font-medium">₦{order.transferPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}
                {order.owingPaid && order.owingPaid > 0 ? (
                  <div className="flex justify-between text-[11px] text-amber-700 font-medium">
                    <span>Customer Credit / Balance:</span>
                    <span className="font-mono">₦{order.owingPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}
              </div>
            )}

            <Separator className="bg-slate-200 my-1" />

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Total Paid</span>
              <span className="text-lg font-bold text-blue-700 font-mono">
                ₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex gap-2">
            {order.status !== 'voided' && onVoidOrder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVoidOrder(order.id)}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium cursor-pointer h-8 px-2.5"
              >
                Void Transaction
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-slate-700 cursor-pointer h-8 px-3.5"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
