import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Barcode, 
  Camera, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Scan, 
  Keyboard, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  title?: string;
  targetProductName?: string;
  existingBarcode?: string;
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = "Optical Barcode Scanner",
  targetProductName,
  existingBarcode
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "catalog-qr-reader";

  useEffect(() => {
    if (existingBarcode) {
      setManualCode(existingBarcode);
    } else {
      setManualCode('');
    }
    setScannerError(null);
  }, [open, existingBarcode]);

  useEffect(() => {
    let timer: any = null;

    if (open) {
      timer = setTimeout(() => {
        try {
          // Clear any stale instances
          const el = document.getElementById(containerId);
          if (el) el.innerHTML = '';

          const scanner = new Html5QrcodeScanner(
            containerId,
            { fps: 10, qrbox: { width: 260, height: 200 } },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              if (decodedText && decodedText.trim().length > 0) {
                onScan(decodedText.trim());
                try {
                  scanner.clear();
                } catch (e) {}
                onOpenChange(false);
              }
            },
            (_errorMessage) => {
              // Frame scan error - normal when frame has no barcode
            }
          );
          scannerRef.current = scanner;
        } catch (err: any) {
          console.error("Camera Scanner Initialization Error", err);
          setScannerError("Camera access required. Ensure permissions are allowed or use manual code entry.");
        }
      }, 200);
    } else {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, [open]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
    }
    onOpenChange(false);
  };

  const generateRandomEAN13 = () => {
    // Generate 12 random digits
    let result = '200'; // Internal store prefix
    for (let i = 0; i < 9; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(result[i], 10);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalCode = result + checkDigit;
    setManualCode(finalCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                <Scan size={18} />
              </div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                {title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 font-normal text-xs mt-1">
              {targetProductName 
                ? `Assigning barcode to: ${targetProductName}` 
                : 'Scan or input barcode digits to link to product'}
            </DialogDescription>
          </div>
          {targetProductName && (
            <Badge className="bg-blue-500/20 text-blue-300 border-none text-[10px] px-2.5 py-1 font-bold">
              Product Targeted
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Scanner Viewport */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-200 p-1 min-h-[220px] flex flex-col justify-center items-center">
            <div id={containerId} className="w-full h-full overflow-hidden text-slate-300"></div>
            {scannerError && (
              <div className="p-4 text-center text-rose-400 text-xs font-medium space-y-1">
                <AlertCircle className="mx-auto text-rose-500" size={20} />
                <p>{scannerError}</p>
                <p className="text-[10px] text-slate-400">Use manual entry or USB laser scanner below.</p>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-500 font-medium">
            Supports: EAN-13, UPC-A, Code 128, QR Code & USB Hardware Scanners
          </p>

          <div className="relative flex items-center my-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR MANUAL / HARDWARE ENTRY
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  placeholder="Scan with USB laser or type barcode digits..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="pl-9 h-11 text-xs font-mono font-bold rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                onClick={generateRandomEAN13}
                variant="outline"
                title="Generate EAN-13 Barcode"
                className="h-11 px-3 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 shrink-0"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Auto EAN-13</span>
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-10 text-xs font-medium rounded-xl text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!manualCode.trim()}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>Associate Barcode</span>
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
