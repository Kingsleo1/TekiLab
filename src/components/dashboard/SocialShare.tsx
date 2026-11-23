import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Mail, 
  Send,
  MessageCircle,
  ExternalLink,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { 
  buildReceiptPDF, 
  buildReceiptSummaryText, 
  compileReceiptPDFFile, 
  shareReceiptAsPDF, 
  previewReceiptPDF, 
  ReceiptData 
} from '../../lib/receipt-pdf';

interface SocialShareProps {
  title: string;
  text?: string;
  url?: string | null;
  variant?: 'inline' | 'card' | 'compact';
  pdfData?: ReceiptData;
  onShareSuccess?: (platform: string) => void;
}

export function SocialShare({
  title,
  text = '',
  url,
  variant = 'card',
  pdfData,
  onShareSuccess
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  // If pdfData is provided, default the text to the beautiful receipt summary!
  const finalSharingText = pdfData ? buildReceiptSummaryText(pdfData) : text;

  // If url is explicitly null or undefined, do not default it to window.location if we want to share without link
  const cleanUrl = url === null ? '' : (url !== undefined ? url : (typeof window !== 'undefined' ? window.location.href : ''));
  const shareText = cleanUrl ? `${title}: ${finalSharingText}` : finalSharingText;

  const sharePlatforms = [
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp',
      icon: <MessageCircle size={18} />,
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80',
      link: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + (cleanUrl ? ' ' + cleanUrl : ''))}`
    },
    {
      id: 'telegram' as const,
      name: 'Telegram',
      icon: <Send size={18} />,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      textColor: 'text-sky-600',
      bgColor: 'bg-sky-50 hover:bg-sky-100/80',
      link: cleanUrl
        ? `https://t.me/share/url?url=${encodeURIComponent(cleanUrl)}&text=${encodeURIComponent(shareText)}`
        : `https://t.me/share/url?text=${encodeURIComponent(shareText)}`
    },
    {
      id: 'email' as const,
      name: 'Email',
      icon: <Mail size={18} />,
      color: 'bg-slate-700 hover:bg-slate-800 text-white',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-50 hover:bg-slate-100',
      link: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(finalSharingText + (cleanUrl ? '\n\nLink: ' + cleanUrl : ''))}`
    },
    {
      id: 'twitter' as const,
      name: 'Twitter / X',
      icon: <Twitter size={18} />,
      color: 'bg-slate-900 hover:bg-black text-white',
      textColor: 'text-slate-950',
      bgColor: 'bg-slate-50 hover:bg-slate-100',
      link: cleanUrl 
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(cleanUrl)}`
        : `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    },
    {
      id: 'facebook' as const,
      name: 'Facebook',
      icon: <Facebook size={18} />,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80',
      link: cleanUrl 
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanUrl)}`
        : `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`
    },
    {
      id: 'linkedin' as const,
      name: 'LinkedIn',
      icon: <Linkedin size={18} />,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80',
      link: cleanUrl 
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cleanUrl)}`
        : `https://www.linkedin.com/sharing/share-offsite/`
    }
  ];

  const handleSharePDF = async () => {
    if (!pdfData) return;
    try {
      const res = await shareReceiptAsPDF(pdfData, 'native');
      if (res.success && onShareSuccess) onShareSuccess(res.method);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to share PDF:', err);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfData) return;
    try {
      const { doc, fileName } = compileReceiptPDFFile(pdfData);
      doc.save(fileName);
      toast.success(`Official PDF Receipt downloaded (${fileName})!`);
      if (onShareSuccess) onShareSuccess('pdf-download');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      toast.error('Could not download PDF receipt.');
    }
  };

  const handlePlatformClick = async (platformId: string) => {
    if (pdfData) {
      if (platformId === 'whatsapp' || platformId === 'telegram' || platformId === 'email' || platformId === 'facebook') {
        await shareReceiptAsPDF(pdfData, platformId);
      } else {
        await shareReceiptAsPDF(pdfData, 'native');
      }
    } else {
      toast.success(`Opening ${platformId}...`);
    }
    if (onShareSuccess) onShareSuccess(platformId);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: finalSharingText,
          url: cleanUrl
        });
        toast.success('Successfully shared via your device!');
        if (onShareSuccess) onShareSuccess('native');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Could not open system share dialog');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (pdfData) {
      // For receipts, copying should copy the beautifully formatted summary text
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(finalSharingText);
        setCopied(true);
        toast.success('Formatted receipt summary copied to clipboard!');
        if (onShareSuccess) onShareSuccess('clipboard-summary');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Clipboard copy not supported on this device');
      }
    } else {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cleanUrl);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        if (onShareSuccess) onShareSuccess('clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Clipboard copy not supported on this device');
      }
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {pdfData && (
          <button
            onClick={handleDownloadPDF}
            title="Download PDF"
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-100 flex items-center justify-center transition-all cursor-pointer"
          >
            <Download size={14} />
          </button>
        )}
        <button
          onClick={handleNativeShare}
          title="Share via device"
          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-100 flex items-center justify-center transition-all cursor-pointer"
        >
          <Share2 size={14} />
        </button>
        <button
          onClick={handleCopyLink}
          title={pdfData ? "Copy receipt text" : "Copy direct link"}
          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-100 flex items-center justify-center transition-all cursor-pointer"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-3">
        {pdfData && (
          <div className="flex flex-wrap gap-2 mb-1">
            <button
              onClick={handleSharePDF}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer shadow-sm"
            >
              <Share2 size={12} />
              <span>Share Receipt PDF</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <Download size={12} />
              <span>Download PDF</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {sharePlatforms.map((p) => {
            if (pdfData) {
              return (
                <button
                  key={p.name}
                  onClick={() => handlePlatformClick(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-transparent ${p.bgColor} ${p.textColor} cursor-pointer`}
                >
                  {p.icon}
                  <span>{p.name}</span>
                </button>
              );
            }
            return (
              <a
                key={p.name}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handlePlatformClick(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-transparent ${p.bgColor} ${p.textColor}`}
              >
                {p.icon}
                <span>{p.name}</span>
              </a>
            );
          })}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-100 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{pdfData ? "Copy Text" : "Copy Link"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4">
          <div>
            <h4 className="font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <Share2 size={16} className="text-blue-600 animate-pulse" /> {pdfData ? "Official PDF Receipt & Sharing" : "Share Receipt & Details"}
            </h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {pdfData ? "Compiled PDF documents and verified invoice logs" : "Send links and formatted invoice logs directly"}
            </p>
          </div>
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="h-9 border-2 border-slate-100 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              System Share <ExternalLink size={10} className="ml-1.5" />
            </Button>
          )}
        </div>

        {pdfData && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100/60 p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSharePDF}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
            >
              <Share2 size={14} /> Share PDF Document
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex-1 border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl h-11 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={14} /> Download PDF Receipt
            </Button>
          </div>
        )}

        {/* Sharing Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sharePlatforms.map((p) => {
            if (pdfData) {
              return (
                <button
                  key={p.name}
                  onClick={() => handlePlatformClick(p.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border border-slate-100/50 hover:border-slate-200 hover:-translate-y-0.5 duration-300 ${p.bgColor} cursor-pointer text-left`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${p.color} shadow-sm`}>
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-900 leading-none">{p.name}</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Share PDF File</span>
                  </div>
                </button>
              );
            }
            return (
              <a
                key={p.name}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handlePlatformClick(p.id)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border border-slate-100/50 hover:border-slate-200 hover:-translate-y-0.5 duration-300 ${p.bgColor} cursor-pointer`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${p.color} shadow-sm`}>
                  {p.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-900 leading-none">{p.name}</p>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Send Text Invoice</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Direct URL / Summary copy action row */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-2">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            {pdfData ? "Receipt Summary Text Content" : "Direct Secure Access URL"}
          </p>
          <div className="flex gap-2 items-center">
            {pdfData ? (
              <textarea
                readOnly
                value={finalSharingText}
                rows={3}
                className="flex-1 bg-white border border-slate-100 px-3.5 py-2.5 rounded-xl text-[9px] font-mono text-slate-600 focus:outline-none resize-none"
              />
            ) : (
              <input
                type="text"
                readOnly
                value={cleanUrl}
                className="flex-1 bg-white border border-slate-100 px-3.5 py-2.5 rounded-xl text-[10px] font-mono text-slate-600 focus:outline-none"
              />
            )}
            <Button
              onClick={handleCopyLink}
              className={`h-11 px-5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shrink-0 ${
                copied 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                  : 'bg-slate-900 hover:bg-black text-white shadow-lg'
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1.5"><Check size={12} /> Copied!</span>
              ) : (
                <span className="flex items-center gap-1.5"><Copy size={12} /> Copy</span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
