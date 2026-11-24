import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Package, 
  Printer,
  ChevronRight,
  User as UserIcon,
  Barcode,
  History,
  CheckCircle2,
  XCircle,
  Smartphone,
  Maximize2,
  Scan,
  RefreshCcw,
  Zap,
  ArrowRight,
  LayoutGrid,
  List,
  Coins,
  AlertTriangle,
  Share2,
  Lock,
  Download,
  Tag,
  Boxes,
  Store,
  ChevronDown,
  Loader2,
  Receipt,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { OrderItem, Product, PaymentMethod } from '../../types/pharmacy';
import { PharmacyHandoffQueueBar } from './PharmacyHandoffQueueBar';
import { ClinicianHandoff, updatePharmacyHandoffStatus } from '../../lib/cross-module-handoff';
import { useTenantModules } from '../../context/TenantModuleContext';
import { CustomerSelectInput } from './CustomerSelectInput';
import { calculateItemPrice } from '../../lib/pricing';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  getCachedInventoryFromDB, 
  saveInventoryToDB, 
  addPendingSale, 
  updateLocalProductStock 
} from '../../services/offlineDB';
import { SocialShare } from './SocialShare';
import { syncOfflineCache } from '../../services/syncManager';
import { downloadAndShareReceipt, buildReceiptSummaryText, buildReceiptPDF, ReceiptData } from '../../lib/receipt-pdf';
import { TransactionDetailModal } from './TransactionDetailModal';
import { QuickShareModal } from './QuickShareModal';
import { RefundModal } from './RefundModal';
import { RotateCcw } from 'lucide-react';

// Scanner Component
function ScannerDialog({ 
  open, 
  onOpenChange, 
  onScan 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
}) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        
        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            scanner.clear();
            onOpenChange(false);
          },
          (errorMessage) => {
            // Error handling - usually ignored if it's just "not found"
          }
        );
        scannerRef.current = scanner;
      }, 100);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border border-slate-200 shadow-xl p-0 overflow-hidden">
        <div className="bg-slate-900 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white tracking-tight">Barcode & QR Scan</DialogTitle>
            <DialogDescription className="text-slate-400 font-normal text-xs mt-1">
              Position barcode or QR within the optical frame
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-6">
          <div id="qr-reader" className="overflow-hidden rounded-lg border-2 border-slate-200"></div>
          <p className="text-center text-xs text-slate-500 mt-4">
            Supports: EAN-13, QR Code, UPC-A, Code 128
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function POSView({ selectedBranchId = 'pharma-1' }: { selectedBranchId?: string }) {
  const [currentUser] = useState<any>(() => {
    const saved = localStorage.getItem('ph_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const canApplyDiscounts = currentUser?.role === 'Kernel Admin' || currentUser?.permissions?.includes('canApplyDiscounts');

  const [items, setItems] = useState<OrderItem[]>([]);
  const [globalSaleType, setGlobalSaleType] = useState<'Retail' | 'Wholesale'>('Retail');
  const [isSaleTypeModalOpen, setSaleTypeModalOpen] = useState(false);

  const applyGlobalSaleType = (newSaleType: 'Retail' | 'Wholesale') => {
    setGlobalSaleType(newSaleType);
    setItems(prev => prev.map(i => ({ ...i, saleType: newSaleType })));
  };

  const updatePackageSize = (id: string, size: 'Full Pack' | 'Half Pack' | 'Quarter Pack') => {
    setItems(prev => prev.map(i => i.productId === id ? { ...i, packageSize: size } : i));
  };

  const updateItemSaleType = (id: string, saleType: 'Retail' | 'Wholesale') => {
    setItems(prev => prev.map(i => i.productId === id ? { ...i, saleType } : i));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const { config: tenantConfig } = useTenantModules();
  const [linkedPrescriptions, setLinkedPrescriptions] = useState<ClinicianHandoff[]>([]);
  const loadPrescription = (raw: any, dryRun = false): boolean => {
    const rx = raw as ClinicianHandoff;
    if (rx.source !== 'CLINICIAN_PRESCRIPTION' || !rx.prescriberId) { toast.error('A clinician-approved prescription is required.'); return false; }
    if (items.length && customer.id !== rx.patientId) { toast.error('Complete or clear the current patient cart first.'); return false; }
    const product = availableProducts.find(p => p.id === rx.productId);
    if (!product || product.pharmacyId !== selectedBranchId) { toast.error('Prescribed product is not linked to this branch stock. Ask the clinician to select an inventory item.'); return false; }
    const controlled = (product as any).isControlled || /controlled/i.test(product.category || '');
    if (controlled && currentUser?.role !== 'Kernel Admin' && !currentUser?.permissions?.includes('canDispenseControlled')) { toast.error('Controlled-drug dispensing permission required.'); return false; }
    const quantity = rx.aiSuggestedDrug.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock || items.some(i => i.productId === product.id)) { toast.error('Verify prescribed quantity, available stock and duplicate cart items.'); return false; }
    if (dryRun) return true;
    setItems(prev => [...prev, { productId: product.id, name: product.name, price: product.price, quantity, unit: product.baseUnit, packageSize: 'Full Pack', saleType: globalSaleType }]);
    setCustomer({ id: rx.patientId, name: rx.patientName });
    setLinkedPrescriptions(prev => [...prev, rx]);
    return true;
  };
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [isOrderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [mobileSplitRatio, setMobileSplitRatio] = useState<'equal' | 'products' | 'cart'>('equal');
  const [mobileViewTab, setMobileViewTab] = useState<'products' | 'cart' | 'split'>('products');

  // Loading & Multi-Click Lock States
  const [isInitiatingSale, setIsInitiatingSale] = useState(false);
  const [isHoldingSale, setIsHoldingSale] = useState(false);
  const [isProceedingToPayment, setIsProceedingToPayment] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Synchronous atomic refs to immediately drop any rapid duplicate click events
  const isInitiatingRef = useRef(false);
  const isHoldingRef = useRef(false);
  const isProceedingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any>(null);
  const [selectedOrderForShare, setSelectedOrderForShare] = useState<any>(null);
  const [isRefundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPreselectedOrder, setRefundPreselectedOrder] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [enableVAT, setEnableVAT] = useState(false);
  const [customer, setCustomer] = useState({ name: 'General Consumer', id: 'walk-in' });

  const handleQuickDownloadRecentOrder = (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const receiptData: ReceiptData = {
        id: order.id,
        createdAt: order.createdAt,
        customerName: order.patientId === 'walk-in' ? 'General Consumer' : (order.patientId || 'General Consumer'),
        items: (order.items || []).map((i: any) => ({
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
      const doc = buildReceiptPDF(receiptData);
      doc.save(`teki_pharm_receipt_${order.id.toLowerCase()}.pdf`);
      toast.success(`Receipt for ${order.id} downloaded!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not download receipt PDF.');
    }
  };
  
  // Held carts multi-cart state with LocalStorage persistence
  const [heldCarts, setHeldCarts] = useState<any[]>(() => {
    const saved = localStorage.getItem('ph_held_carts');
    return saved ? JSON.parse(saved) : [];
  });
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ph_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);

  const holdCurrentSale = () => {
    if (items.length === 0) {
      toast.error('Cannot hold an empty cart!');
      return;
    }

    const newHeldCart = {
      id: `HELD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [...items],
      customer: { ...customer },
      globalSaleType,
      discount,
      enableVAT,
      heldAt: new Date().toISOString()
    };

    setHeldCarts(prev => [newHeldCart, ...prev]);
    
    // Reset current POS active cart values
    setItems([]);
    setCustomer({ name: 'General Consumer', id: 'walk-in' });
    setDiscount(0);
    setEnableVAT(false);
    setGlobalSaleType('Retail');

    toast.success('Sale successfully placed on hold!', {
      description: `Session referenced as ${newHeldCart.id}.`,
      icon: <ShoppingCart className="text-amber-500" />
    });
  };

  const handleHoldCurrentSale = () => {
    if (isHoldingRef.current || isProcessingRef.current || items.length === 0) return;
    isHoldingRef.current = true;
    setIsHoldingSale(true);
    try {
      holdCurrentSale();
    } finally {
      setTimeout(() => {
        isHoldingRef.current = false;
        setIsHoldingSale(false);
      }, 350);
    }
  };

  const handleInitiateSale = () => {
    if (isInitiatingRef.current || isProcessingRef.current || items.length === 0) return;
    isInitiatingRef.current = true;
    setIsInitiatingSale(true);
    setSaleTypeModalOpen(true);
    setTimeout(() => {
      isInitiatingRef.current = false;
      setIsInitiatingSale(false);
    }, 400);
  };

  const handleRefreshProducts = async () => {
    if (isRefreshingProducts) return;
    setIsRefreshingProducts(true);
    try {
      await loadProducts();
      toast.success('Products refreshed');
    } finally {
      setIsRefreshingProducts(false);
    }
  };

  const resumeHeldSale = (heldCart: any) => {
    setItems(heldCart.items);
    setCustomer(heldCart.customer);
    setGlobalSaleType(heldCart.globalSaleType || 'Retail');
    setDiscount(heldCart.discount || 0);
    setEnableVAT(heldCart.enableVAT || false);

    // Filter resumed cart out of held queue
    setHeldCarts(prev => prev.filter(c => c.id !== heldCart.id));

    toast.success(`Restored checkout session ${heldCart.id}!`, {
      description: `${heldCart.items.length} items returned to active register.`,
      icon: <ShoppingCart className="text-emerald-500" />
    });
  };

  const discardHeldSale = (id: string) => {
    setHeldCarts(prev => prev.filter(c => c.id !== id));
    toast.success('Suspended sale session has been discarded.');
  };
  
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'cash' as PaymentMethod,
    cashAmount: 0,
    received: 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [splitAmounts, setSplitAmounts] = useState({
    cash: 0,
    card: 0,
    transfer: 0,
    owing: 0
  });

  const handleSplitAmountChange = (key: 'cash' | 'card' | 'transfer' | 'owing', value: number) => {
    const val = isNaN(value) ? 0 : value;
    setSplitAmounts(prev => {
      if (key === 'cash') {
        return { ...prev, cash: val };
      } else {
        const updatedOthers = { ...prev, [key]: val };
        const sumOthers = updatedOthers.card + updatedOthers.transfer + updatedOthers.owing;
        const calculatedCash = Math.max(0, total - sumOthers);
        return {
          ...updatedOthers,
          cash: calculatedCash
        };
      }
    });
  };

  const handleFillRemaining = (key: 'cash' | 'card' | 'transfer' | 'owing') => {
    const sumOthers = Object.entries(splitAmounts)
      .filter(([k]) => k !== key)
      .reduce((sum, [_, val]) => sum + (val as number), 0);
    const remaining = Math.max(0, total - sumOthers);
    handleSplitAmountChange(key, remaining);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadRecentOrders();
    // Simulate keyboard shortcut for focus
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') searchInputRef.current?.focus();
      if (e.key === 'F4') setScannerOpen(true);
      if (e.key === 'Escape') setCheckoutOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedBranchId]);

  const loadProducts = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const data = await apiService.products.list(selectedBranchId);
        setAvailableProducts(data);
        await saveInventoryToDB(data);
      } else {
        console.log('[POS] Offline state: loading product inventory from IndexedDB cache');
        const cached = await getCachedInventoryFromDB();
        setAvailableProducts(cached);
      }
    } catch (e) {
      console.warn('[POS] Failed to fetch products online: routing query to IndexedDB cache', e);
      const cached = await getCachedInventoryFromDB();
      setAvailableProducts(cached);
    }
  };

  const loadRecentOrders = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const orders = await apiService.orders.list(selectedBranchId);
        setRecentOrders(orders.slice(0, 10));
      } else {
        setRecentOrders([]);
      }
    } catch (e) {
      console.error(e);
      setRecentOrders([]);
    }
  };

  const findProductByCode = (code: string) => {
    const product = availableProducts.find(p => 
      p.barcode === code || p.id === code
    );
    if (product) {
      addToCart(product);
      setSearchQuery('');
    } else {
      toast.error(`Product with code ${code} not found`);
    }
  };

  const filteredProducts = availableProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery) ||
    p.genericName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemsWithPricing = items.map(item => {
    const product = availableProducts.find(p => p.id === item.productId);
    const packageSize = item.packageSize || 'Full Pack';
    const saleType: 'Retail' | 'Wholesale' = item.saleType === 'Wholesale' ? 'Wholesale' : 'Retail';
    if (!product) {
      return {
        ...item,
        packageSize,
        saleType,
        retailUnitPrice: item.price,
        wholesaleUnitPrice: Math.round(item.price * 0.85 * 100) / 100,
        appliedTier: saleType as 'Retail' | 'Wholesale' | 'Volume Price'
      };
    }
    const pricing = calculateItemPrice({
      productId: item.productId,
      quantity: item.quantity,
      packageSize,
      saleType
    }, product);
    return {
      ...item,
      price: pricing.unitPrice,
      retailUnitPrice: pricing.retailUnitPrice,
      wholesaleUnitPrice: pricing.wholesaleUnitPrice,
      packageSize,
      saleType,
      appliedTier: pricing.appliedTier
    };
  });

  const retailItems = itemsWithPricing.filter(item => item.saleType !== 'Wholesale');
  const wholesaleItems = itemsWithPricing.filter(item => item.saleType === 'Wholesale');
  const retailSubtotal = retailItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const wholesaleSubtotal = wholesaleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isMixedCart = retailItems.length > 0 && wholesaleItems.length > 0;

  const subtotal = itemsWithPricing.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = enableVAT ? Math.max(0, (subtotal - discount) * 0.05) : 0; 
  const total = Math.max(0, subtotal - discount + tax);

  const handleToggleItemSaleType = (productId: string, newSaleType: 'Retail' | 'Wholesale') => {
    setItems(prev => {
      const next = prev.map(i => i.productId === productId ? { ...i, saleType: newSaleType } : i);
      const allWholesale = next.length > 0 && next.every(i => i.saleType === 'Wholesale');
      const allRetail = next.length > 0 && next.every(i => i.saleType !== 'Wholesale');
      if (allWholesale) setGlobalSaleType('Wholesale');
      else if (allRetail) setGlobalSaleType('Retail');
      return next;
    });
  };

  // Keep cash split amount synced when item saleType changes while checkout is open
  useEffect(() => {
    if (isCheckoutOpen) {
      setSplitAmounts(prev => {
        const sumOthers = prev.card + prev.transfer + prev.owing;
        return {
          ...prev,
          cash: Math.max(0, total - sumOthers)
        };
      });
    }
  }, [total, isCheckoutOpen]);

  const handleToggleVAT = (enabled: boolean) => {
    setEnableVAT(enabled);
    const newTax = enabled ? Math.max(0, (subtotal - discount) * 0.05) : 0;
    const newTotal = Math.max(0, subtotal - discount + newTax);
    setSplitAmounts(prev => {
      const sumOthers = prev.card + prev.transfer + prev.owing;
      return {
        ...prev,
        cash: Math.max(0, newTotal - sumOthers)
      };
    });
  };

  const calculateCartTotalForType = (type: 'Retail' | 'Wholesale') => {
    const calculatedItems = items.map(item => {
      const product = availableProducts.find(p => p.id === item.productId);
      const packageSize = item.packageSize || 'Full Pack';
      if (!product) return item.price * item.quantity;
      const pricing = calculateItemPrice({
        productId: item.productId,
        quantity: item.quantity,
        packageSize,
        saleType: type
      }, product);
      return pricing.unitPrice * item.quantity;
    });
    const sub = calculatedItems.reduce((acc, curr) => acc + curr, 0);
    const t = enableVAT ? Math.max(0, (sub - discount) * 0.05) : 0;
    return Math.max(0, sub - discount + t);
  };

  const handleProceedWithCurrentSelection = () => {
    if (isProceedingRef.current || isProcessingRef.current) return;
    isProceedingRef.current = true;
    setIsProceedingToPayment(true);

    setSplitAmounts({
      cash: total,
      card: 0,
      transfer: 0,
      owing: 0
    });
    setSaleTypeModalOpen(false);
    setCheckoutOpen(true);
    setTimeout(() => {
      isProceedingRef.current = false;
      setIsProceedingToPayment(false);
    }, 350);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Product out of stock!');
      return;
    }

    const isControlled = (product as any).isControlled || 
                        product.category?.toLowerCase().includes('controlled') || 
                        product.name?.toLowerCase().includes('controlled') || 
                        product.genericName?.toLowerCase().includes('controlled');
    const canDispenseControlled = currentUser?.role === 'Kernel Admin' || currentUser?.permissions?.includes('canDispenseControlled');

    if (isControlled && !canDispenseControlled) {
      toast.error('Dispensing Access Restricted', {
        description: `You do not have the clearance required to dispense controlled substances. Please seek a certified dispenser.`,
        icon: <Lock className="text-rose-500" />
      });
      return;
    }

    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Cannot add more than available stock');
          return prev;
        }
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1, 
        unit: product.baseUnit,
        packageSize: 'Full Pack',
        saleType: globalSaleType
      }];
    });
    toast.success(`${product.name} added`, { 
      duration: 1000,
      icon: <Zap className="text-blue-600" size={14} /> 
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = availableProducts.find(p => p.id === id);
    setItems(prev => prev.map(i => {
      if (i.productId === id) {
        const newQty = Math.max(1, i.quantity + delta);
        if (product && newQty > product.stock) {
          toast.error('Insufficient stock');
          return i;
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const processSale = async () => {
    // Atomic check: immediately drop any rapid double clicks or redundant invocations
    if (isProcessingRef.current) {
      console.warn('[POS] Prevented duplicate execution of processSale');
      return;
    }

    const totalPaid = splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing;
    if (totalPaid < total) {
      toast.error('Insufficient amount received across payment channels');
      return;
    }

    if (splitAmounts.owing > 0) {
      if (customer.name === 'General Consumer' || !customer.name) {
        toast.error('Please specify debtor profile name');
        return;
      }
      if (!(customer as any).phone) {
        toast.error('Please enter debtor phone number');
        return;
      }
    }

    // Acquire lock immediately
    isProcessingRef.current = true;
    setIsProcessingSale(true);

    try {
      // Automatically register/add customer if name is custom typed and not Walk-In
      if (customer.name && customer.name !== 'General Consumer') {
        try {
          const addedCust = await (apiService as any).customers.add(customer.name, (customer as any).phone);
          if (addedCust && customer.id === 'walk-in') {
            customer.id = addedCust.id;
          }
        } catch (e) {
          console.error("Failed to automatically register customer during checkout:", e);
        }
      }

      const orderId = `POS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const timestampNow = new Date().toISOString();

      const activeChannels = [];
      if (splitAmounts.cash > 0) activeChannels.push('cash');
      if (splitAmounts.card > 0) activeChannels.push('card');
      if (splitAmounts.transfer > 0) activeChannels.push('transfer');
      if (splitAmounts.owing > 0) activeChannels.push('owing');

      const determinedPaymentMethod = activeChannels.length === 1 
        ? activeChannels[0] as PaymentMethod 
        : activeChannels.length > 1 
          ? 'split' as any
          : 'cash' as PaymentMethod;

      const staffIdentifier = currentUser?.name || currentUser?.id || 'Cashier';

      const order = {
        id: orderId,
        patientId: customer.id,
        pharmacyId: selectedBranchId,
        items: itemsWithPricing,
        total,
        subtotal,
        tax,
        discount,
        status: 'confirmed' as const,
        paymentMethod: determinedPaymentMethod,
        cashPaid: splitAmounts.cash,
        transferPaid: splitAmounts.transfer,
        cardPaid: splitAmounts.card,
        owingPaid: splitAmounts.owing,
        processedBy: staffIdentifier,
        createdAt: timestampNow,
        source: 'POS' as const,
        trackingHistory: [
          { status: 'completed', timestamp: timestampNow, message: 'Transacted via POS' }
        ]
      };

      // Deduct inventory state locally immediately so UI updates instantly
      setAvailableProducts(prev => 
        prev.map(p => {
          const purchased = items.find(i => i.productId === p.id);
          if (purchased) {
            return { ...p, stock: Math.max(0, p.stock - purchased.quantity) };
          }
          return p;
        })
      );

      let checkoutSucceededOnline = false;

      // Check if network is available
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await apiService.orders.create(order as any);

          if (splitAmounts.owing > 0) {
            const remainingAmount = splitAmounts.owing;
            const paidAmount = splitAmounts.cash + splitAmounts.card + splitAmounts.transfer;
            const status = paidAmount > 0 ? 'partially-paid' as const : 'unpaid' as const;

            await apiService.owing.add({
              id: `OW-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              orderId: orderId,
              customerName: customer.name,
              customerPhone: (customer as any).phone || '080-000-0000',
              totalAmount: total,
              amountPaid: paidAmount,
              amountOwed: remainingAmount,
              dueDate: (paymentDetails as any).dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status,
              items: items.map(i => ({ name: i.name, quantity: i.quantity })),
              pharmacyId: selectedBranchId,
              notes: `POS credit sale. Balance outstanding from order ${orderId}.`,
              createdAt: timestampNow,
              payments: paidAmount > 0 ? [
                {
                  id: `PAY-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                  amount: paidAmount,
                  paymentMethod: determinedPaymentMethod,
                  createdAt: timestampNow
                }
              ] : []
            });
          }
          checkoutSucceededOnline = true;
          // Trigger background reconciliation without blocking UI
          syncOfflineCache(selectedBranchId).catch(() => {});
        } catch (err) {
          console.warn('[POS] API request failed during online checkout. Falling back to offline queue...', err);
        }
      }

      if (!checkoutSucceededOnline) {
        // Enqueue transaction in IndexedDB
        await addPendingSale({
          transaction_id: orderId,
          timestamp: timestampNow,
          staff_id: staffIdentifier,
          branch_id: selectedBranchId,
          items: itemsWithPricing.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            unit: i.unit || 'unit',
            saleType: i.saleType || 'Retail',
            packageSize: i.packageSize || 'Full Pack'
          })),
          total,
          subtotal,
          tax,
          discount,
          payment_channels: { 
            'Cash': splitAmounts.cash,
            'Card': splitAmounts.card,
            'Transfer': splitAmounts.transfer,
            'Owing': splitAmounts.owing
          },
          paymentMethod: determinedPaymentMethod,
          customer: {
            id: customer.id,
            name: customer.name,
            phone: (customer as any).phone,
            dueDate: (paymentDetails as any).dueDate
          },
          sync_status: 'pending'
        });

        // Deduct inventory stock in IndexedDB
        for (const item of items) {
          await updateLocalProductStock(item.productId, item.quantity);
        }

        toast.warning('Offline Mode Active: Sale securely saved in local queue! Syncing when connection re-establishes.', { duration: 5000 });
      } else {
        toast.success('Sale Completed Successfully!');
      }

      if (checkoutSucceededOnline) {
        for (const rx of linkedPrescriptions) {
          const sold = items.find(i => i.productId === rx.productId);
          if (customer.id === rx.patientId && sold?.quantity === rx.aiSuggestedDrug.quantity) {
            try { await updatePharmacyHandoffStatus(rx.handoffId, 'DISPENSED', tenantConfig.tenantId); }
            catch { toast.warning('Sale saved. Prescription status needs reconciliation in the pharmacy queue.'); }
          }
        }
      }
      setLinkedPrescriptions([]);
      setLastOrder(order);
      setItems([]);
      setEnableVAT(false);
      setCheckoutOpen(false);
      setPaymentDetails({ 
         method: 'cash', 
         cashAmount: 0, 
         received: 0, 
         dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      });
      setSplitAmounts({
        cash: 0,
        card: 0,
        transfer: 0,
        owing: 0
      });
      setReceiptOpen(true);
      // Fast refresh without blocking
      loadProducts().catch(() => {});
      loadRecentOrders().catch(() => {});
    } catch (e) {
      console.error(e);
      toast.error('System failed to process sale recording.');
    } finally {
      isProcessingRef.current = false;
      setIsProcessingSale(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4.2rem)] sm:h-[calc(100dvh-5rem)] lg:h-auto lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start animate-in fade-in duration-500 p-0 sm:p-1 overflow-hidden lg:overflow-visible">
      <div className="lg:col-span-12 shrink-0 max-h-64 overflow-auto"><PharmacyHandoffQueueBar onLoadSuggestionToCart={loadPrescription} /></div>
      {/* Mobile Top Navigation Tabs */}
      <div className="lg:hidden flex items-center justify-between gap-1 p-1 mb-1.5 bg-slate-900 text-white rounded-xl shadow-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileViewTab('products')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'products'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package size={13} />
          <span>Products</span>
          <span className="text-[10px] opacity-80">({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileViewTab('cart')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'cart'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShoppingCart size={13} />
          <span>Cart</span>
          {items.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {items.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileViewTab('split')}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            mobileViewTab === 'split'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Split View"
        >
          <LayoutGrid size={13} />
          <span className="text-[11px]">Split</span>
        </button>
      </div>

      {/* Top / Left Part: Product Browsing & Searching */}
      <div className={`flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/80 p-2 sm:p-3 shadow-xs lg:col-span-7 lg:h-[calc(100vh-11.5rem)] lg:p-0 lg:border-none lg:bg-transparent lg:shadow-none transition-all duration-200 ${
        mobileViewTab === 'products' 
          ? 'h-full flex-1' 
          : mobileViewTab === 'cart' 
            ? 'hidden lg:flex' 
            : 'h-[46%] flex-1'
      } lg:flex-auto`}>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 mb-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-3.5 h-3.5" />
            <Input 
              ref={searchInputRef}
              placeholder="Search product name, generic formula or barcode (F2)..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (/^\d{8,13}$/.test(e.target.value)) {
                  findProductByCode(e.target.value);
                }
              }}
              className="pl-8.5 pr-8 h-9 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-900 shadow-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 w-full"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-slate-200 shadow-xs self-end sm:self-auto shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => setIsHeldCartsOpen(true)}
              className="h-7 sm:h-8 px-2 rounded-md hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center gap-1 relative cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium hidden sm:inline text-slate-700">Held</span>
              {heldCarts.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.1 bg-amber-500 text-white rounded-full font-semibold text-[9px]">
                  {heldCarts.length}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setScannerOpen(true)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-500 cursor-pointer"
              title="Barcode Scanner"
            >
              <Scan className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setOrderHistoryOpen(true)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-md hover:bg-slate-50 transition-colors text-slate-500 hidden sm:flex cursor-pointer"
              title="Recent Orders"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setRefundPreselectedOrder(null);
                setRefundModalOpen(true);
              }}
              className="h-7 sm:h-8 px-2.5 rounded-md border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 hover:text-amber-950 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Process Order Return / Refund"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden md:inline">Refunds</span>
            </Button>
            <Button 
              variant="ghost" 
              disabled={isRefreshingProducts}
              onClick={handleRefreshProducts}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-md hover:bg-slate-50 transition-colors text-slate-500 cursor-pointer disabled:opacity-50"
              title="Refresh Products"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshingProducts ? 'animate-spin text-blue-600' : ''}`} />
            </Button>
            <Separator orientation="vertical" className="h-4 mx-0.5 my-auto bg-slate-200" />
            <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-md">
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => setViewMode('grid')}
                 className={`h-6 w-6 sm:h-7 sm:w-7 p-0 rounded transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <LayoutGrid size={13} />
               </Button>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => setViewMode('list')}
                 className={`h-6 w-6 sm:h-7 sm:w-7 p-0 rounded transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-xs text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <List size={13} />
               </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 bg-slate-50/40 rounded-xl border border-slate-200/70 p-2 sm:p-3 pb-16 lg:pb-3">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Package size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-xs">
                 No items matching your search parameters
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pb-2">
              {filteredProducts.map(product => {
                const inCart = items.find(i => i.productId === product.id);
                return (
                  <Card 
                    key={product.id} 
                    className={`group cursor-pointer hover:border-blue-400/80 transition-all border shadow-xs rounded-xl overflow-hidden bg-white relative ${
                      inCart ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200/80'
                    } ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-[16/10] bg-slate-50 flex items-center justify-center p-3 group-hover:bg-blue-50/30 transition-colors relative">
                      {inCart && (
                        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          <span>x{inCart.quantity} in cart</span>
                        </div>
                      )}
                      {product.stock < 10 && product.stock > 0 && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md">Low Stock</div>
                      )}
                      <Package className={`w-7 h-7 ${product.stock <= 0 ? 'text-slate-300' : 'text-blue-400'}`} />
                    </div>
                    <CardContent className="p-2.5 sm:p-3.5">
                      <h4 className="font-semibold text-slate-900 leading-snug mb-0.5 text-xs truncate">{product.name}</h4>
                      <p className="text-[10px] text-slate-500 font-normal truncate">{product.genericName || 'Standard formulation'}</p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                         <span className="text-xs font-bold text-blue-600">₦{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                         <Badge className={`${product.stock < 50 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'} border-none font-normal text-[10px] px-1.5 py-0.2 rounded-md`}>
                            {product.stock} {product.baseUnit}s
                         </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5 pb-2">
               <div className="px-3 py-1.5 flex items-center text-[11px] font-medium text-slate-500 border-b border-slate-200/80 hidden md:flex">
                  <div className="w-8">Icon</div>
                  <div className="flex-1 px-3">Item Name & Formulation</div>
                  <div className="w-24">Barcode</div>
                  <div className="w-20 text-right">Unit Price</div>
                  <div className="w-20 text-right pr-2">In Stock</div>
               </div>
               {filteredProducts.map(product => {
                 const inCart = items.find(i => i.productId === product.id);
                 return (
                   <button
                     key={product.id}
                     onClick={() => addToCart(product)}
                     className={`w-full flex items-center p-2 rounded-lg border transition-all text-left group cursor-pointer ${
                       inCart 
                         ? 'bg-blue-50/40 border-blue-400 ring-1 ring-blue-400/30' 
                         : 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/50'
                     } ${product.stock <= 0 ? 'opacity-50' : ''}`}
                   >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        inCart ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50'
                      }`}>
                         <Package size={14} />
                      </div>
                      <div className="flex-1 px-2.5 min-w-0">
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <h4 className="font-semibold text-slate-900 text-xs truncate">{product.name}</h4>
                           {inCart && (
                             <Badge className="bg-blue-600 text-white font-semibold text-[9px] px-1.5 py-0">
                               x{inCart.quantity} in cart
                             </Badge>
                           )}
                         </div>
                         <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate mt-0.5">{product.genericName || 'Standard formulation'}</p>
                      </div>
                      <div className="w-24 hidden md:block">
                         <code className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{product.barcode || product.id.split('-')[0]}</code>
                      </div>
                      <div className="text-right shrink-0">
                         <span className="font-bold text-slate-900 text-xs">₦{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                         <p className="text-[10px] text-slate-400 font-normal sm:hidden">{product.stock} in stock</p>
                      </div>
                      <div className="w-20 text-right pr-1 hidden sm:block">
                         <Badge variant="outline" className={`${product.stock < 50 ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-slate-200 text-slate-600 bg-slate-50'} font-normal text-[10px] rounded-md`}>
                            {product.stock}
                         </Badge>
                      </div>
                   </button>
                 );
               })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Mobile Split Screen Divider & Real-Time Status Bar */}
      {mobileViewTab === 'split' && (
        <div className="lg:hidden flex items-center justify-between px-2.5 py-1.5 my-1 bg-slate-900 text-white rounded-lg text-xs shrink-0 select-none shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
              <ShoppingCart size={11} />
              <span>{items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-[11px] text-slate-300 truncate">
              Live Total: <strong className="text-emerald-400 font-bold">₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-md border border-slate-700 shrink-0">
            <button
              onClick={() => setMobileSplitRatio('products')}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                mobileSplitRatio === 'products' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Focus Product Catalog"
            >
              Catalog
            </button>
            <button
              onClick={() => setMobileSplitRatio('equal')}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                mobileSplitRatio === 'equal' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Split 50/50 View"
            >
              50/50
            </button>
            <button
              onClick={() => setMobileSplitRatio('cart')}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                mobileSplitRatio === 'cart' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Focus Cart Items"
            >
              Cart
            </button>
          </div>
        </div>
      )}

      {/* Right Part: Real-Time Selected Items & Dynamic Total/Checkout */}
      <div className={`flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden lg:col-span-5 lg:h-auto lg:self-start lg:sticky lg:top-4 transition-all duration-200 ${
        mobileViewTab === 'cart' 
          ? 'h-full flex-1' 
          : mobileViewTab === 'products' 
            ? 'hidden lg:flex' 
            : 'h-[52%] flex-1'
      } lg:flex-none`}>
         <div className="p-2.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
               <div className="flex items-center gap-1.5">
                 <h3 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight whitespace-nowrap">Selected Items</h3>
                 <Badge className="bg-blue-50 text-blue-700 border-none font-semibold text-[10px] px-1.5 py-0">
                   {items.length}
                 </Badge>
               </div>
               <button
                 type="button"
                 onClick={() => setSaleTypeModalOpen(true)}
                 className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                   isMixedCart
                     ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                     : wholesaleItems.length > 0
                       ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                       : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200/80'
                 }`}
                 title="Click to configure Retail or Wholesale per product"
               >
                 <span>
                   {isMixedCart
                     ? `🔀 Mixed (${retailItems.length}R • ${wholesaleItems.length}W)`
                     : wholesaleItems.length > 0
                       ? '📦 Wholesale'
                       : '🏷️ Retail'}
                 </span>
                 <ChevronDown size={11} className="opacity-80" />
               </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
               <button 
                 onClick={() => setCustomerDialogOpen(true)}
                 className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 text-[10px] sm:text-xs text-slate-700 truncate max-w-[110px] sm:max-w-[150px] cursor-pointer"
                 title="Change Customer Account"
               >
                 <UserIcon size={11} className="text-slate-400 shrink-0" />
                 <span className="truncate">{customer.name}</span>
               </button>
               <button 
                 onClick={() => setItems([])} 
                 disabled={items.length === 0}
                 className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 rounded-md hover:bg-slate-100 cursor-pointer"
                 title="Clear Cart"
               >
                 <Trash2 size={14} />
               </button>
            </div>
         </div>

        {/* Selected Items List - flexible scroll area that lets the footer stay pinned */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 py-4 sm:py-6 text-center">
              <div className="p-2 bg-slate-100 rounded-full">
                 <ShoppingCart size={18} className="text-slate-400" />
              </div>
              <p className="font-semibold text-xs text-slate-600">Cart is empty</p>
              <p className="font-normal text-[11px] text-slate-400">Click or scan any product to add to cart</p>
            </div>
          ) : (
            <div className="space-y-2">
               {itemsWithPricing.map(item => (
                 <motion.div layout key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <div className="w-8 h-8 bg-white border border-slate-200/80 rounded-md flex items-center justify-center font-bold text-blue-600 text-xs shadow-xs shrink-0">
                      {item.name[0]}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-[180px]">{item.name}</p>
                        {item.appliedTier === 'Volume Price' && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-none font-normal text-[9px] px-1 py-0">Volume</Badge>
                        )}
                        {item.appliedTier === 'Wholesale' && (
                          <Badge className="bg-indigo-50 text-indigo-700 border-none font-normal text-[9px] px-1 py-0">Wholesale</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal">
                        ₦{item.price.toFixed(2)} / {item.unit}
                      </p>
                      
                      {/* Package Size & Retail/Wholesale Mode Segment Picker */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <div className="flex gap-1">
                          {(['Full Pack', 'Half Pack', 'Quarter Pack'] as const).map(size => {
                            const isSelected = (item.packageSize || 'Full Pack') === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => updatePackageSize(item.productId, size)}
                                className={`text-[9px] font-medium px-1.5 py-0.2 rounded border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {size.replace(' Pack', '')}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center bg-white rounded border border-slate-200 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleItemSaleType(item.productId, 'Retail')}
                            className={`text-[9px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                              item.saleType !== 'Wholesale'
                                ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title={`Sell ${item.name} at Retail price (₦${item.retailUnitPrice.toLocaleString()})`}
                          >
                            Retail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleItemSaleType(item.productId, 'Wholesale')}
                            className={`text-[9px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                              item.saleType === 'Wholesale'
                                ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title={`Sell ${item.name} at Wholesale price (₦${item.wholesaleUnitPrice.toLocaleString()})`}
                          >
                            Wholesale
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 p-0.5 bg-white rounded-md border border-slate-200 shrink-0">
                       <button onClick={() => updateQuantity(item.productId, -1)} className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                          <Minus size={10} />
                       </button>
                       <span className="w-5 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.productId, 1)} className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                          <Plus size={10} />
                       </button>
                    </div>
                    <div className="text-right min-w-[60px] shrink-0">
                       <p className="font-bold text-xs text-slate-900">₦{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                       <button 
                         onClick={() => setItems(prev => prev.filter(i => i.productId !== item.productId))}
                         className="text-slate-400 hover:text-rose-500 text-[10px] mt-0.5 cursor-pointer inline-flex items-center"
                         title="Remove"
                       >
                         <Trash2 size={10} />
                       </button>
                    </div>
                 </motion.div>
               ))}
            </div>
          )}
        </div>

        {/* Real-Time Total & Action Footer - Positioned directly below selected products */}
        <div className="p-2.5 sm:p-4 bg-slate-50/90 border-t border-slate-100 space-y-2 shrink-0 rounded-b-xl">
           <div className="space-y-1 text-xs">
              {items.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-[10px] pb-1 border-b border-slate-200/60">
                  <span className="text-blue-700 font-medium">
                    🏷️ Retail ({retailItems.length}): <strong className="font-mono">₦{retailSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="text-indigo-700 font-medium">
                    📦 Wholesale ({wholesaleItems.length}): <strong className="font-mono">₦{wholesaleSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500 font-normal text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Subtotal: <strong className="text-slate-700">₦{subtotal.toFixed(2)}</strong></span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full">
                    <span className="text-[10px] font-medium text-slate-600">VAT (5%):</span>
                    <button
                      type="button"
                      onClick={() => handleToggleVAT(!enableVAT)}
                      className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enableVAT ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      title={enableVAT ? 'Click to remove VAT' : 'Click to apply 5% VAT'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          enableVAT ? 'translate-x-2.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-[10px] font-semibold ${enableVAT ? 'text-blue-700' : 'text-slate-400'}`}>
                      {enableVAT ? `₦${tax.toFixed(2)}` : 'OFF'}
                    </span>
                  </div>
                </div>
                {discount > 0 && (
                  <span className="text-emerald-600 font-medium">-₦{discount.toFixed(2)}</span>
                )}
              </div>

              {/* Collapsible Discount on Mobile */}
              {showDiscountInput ? (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Input 
                    type="number" 
                    placeholder={canApplyDiscounts ? "Discount (₦)" : "Discount Locked"} 
                    value={discount || ''}
                    disabled={!canApplyDiscounts}
                    className="h-8 text-xs rounded-lg border-slate-200 bg-white font-normal"
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDiscountInput(false)}
                    className="h-8 px-2 text-xs text-slate-500 cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between items-center text-[10px]">
                  {canApplyDiscounts ? (
                    <button 
                      onClick={() => setShowDiscountInput(true)} 
                      className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium cursor-pointer"
                    >
                      {discount > 0 ? `Edit Discount (₦${discount})` : '+ Add Discount'}
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Discounts restricted</span>
                  )}
                </div>
              )}

              <Separator className="bg-slate-200 my-0.5" />
              <div className="flex justify-between items-center py-0.5">
                 <span className="text-xs font-semibold text-slate-700">Grand Total</span>
                 <span className="text-base sm:text-xl font-bold text-blue-700">
                   ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </span>
              </div>
           </div>

            {/* Initiate Purchase / Checkout Button */}
            <div className="flex gap-2 pt-0.5">
              <Button 
                disabled={items.length === 0 || isHoldingSale || isProcessingSale}
                onClick={handleHoldCurrentSale}
                className="px-3 h-9 sm:h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                title="Hold current basket"
              >
                {isHoldingSale ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />}
                <span>{isHoldingSale ? 'Holding...' : 'Hold'}</span>
              </Button>
              <Button 
                disabled={items.length === 0 || isInitiatingSale || isProcessingSale}
                onClick={handleInitiateSale}
                className="flex-1 h-9 sm:h-10 rounded-lg bg-blue-600 hover:bg-blue-500 shadow-sm font-semibold text-xs sm:text-sm transition-colors text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isInitiatingSale ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Initiating Sale...</span>
                  </>
                ) : (
                  <>
                    <span>Initiate Sale • ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </Button>
            </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRANSACTION TYPE SELECTION POP-UP (PER-PRODUCT RETAIL vs WHOLESALE FLOW) */}
      {/* ========================================================================= */}
      <Dialog open={isSaleTypeModalOpen} onOpenChange={setSaleTypeModalOpen}>
        <DialogContent className="sm:max-w-xl w-[96vw] max-w-[96vw] sm:w-full p-0 overflow-hidden border border-slate-200/90 shadow-2xl rounded-2xl bg-white max-h-[90dvh] h-[90dvh] sm:h-auto sm:max-h-[88vh] flex flex-col focus:outline-none">
          {/* Fixed Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 sm:p-5 text-white shrink-0">
            <div className="flex items-center justify-between gap-2.5 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Select Wholesale or Retail Per Product
                  </DialogTitle>
                  <DialogDescription className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    Sell all items under one mode or choose Wholesale / Retail for specific products
                  </DialogDescription>
                </div>
              </div>
              <Badge className={`shrink-0 border-none text-[10px] font-semibold px-2.5 py-0.5 ${
                isMixedCart
                  ? 'bg-amber-500 text-white'
                  : wholesaleItems.length > 0
                    ? 'bg-indigo-500 text-white'
                    : 'bg-blue-600 text-white'
              }`}>
                {isMixedCart
                  ? `Mixed (${retailItems.length}R / ${wholesaleItems.length}W)`
                  : wholesaleItems.length > 0
                    ? 'All Wholesale'
                    : 'All Retail'}
              </Badge>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 touch-pan-y">
            {/* Quick Bulk Apply Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Quick Apply to Entire Cart</span>
                <span className="text-slate-700 font-medium normal-case">
                  {customer.name} • {items.length} {items.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Bulk Option 1: All Retail */}
                <button
                  type="button"
                  onClick={() => applyGlobalSaleType('Retail')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    !isMixedCart && wholesaleItems.length === 0
                      ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    !isMixedCart && wholesaleItems.length === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Tag size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900">All Retail</span>
                      {!isMixedCart && wholesaleItems.length === 0 && (
                        <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">Standard unit rates</p>
                    <p className="text-xs font-bold text-blue-700 font-mono mt-1">
                      ₦{calculateCartTotalForType('Retail').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </button>

                {/* Bulk Option 2: All Wholesale */}
                <button
                  type="button"
                  onClick={() => applyGlobalSaleType('Wholesale')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    !isMixedCart && retailItems.length === 0 && wholesaleItems.length > 0
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    !isMixedCart && retailItems.length === 0 && wholesaleItems.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Boxes size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900">All Wholesale</span>
                      {!isMixedCart && retailItems.length === 0 && wholesaleItems.length > 0 && (
                        <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">Bulk tier rates</p>
                    <p className="text-xs font-bold text-indigo-700 font-mono mt-1">
                      ₦{calculateCartTotalForType('Wholesale').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Per-Product Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-blue-600" />
                  Select Mode Per Product ({itemsWithPricing.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Click Retail or Wholesale on any item
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                {itemsWithPricing.map((item) => {
                  const isWholesale = item.saleType === 'Wholesale';
                  return (
                    <div
                      key={item.productId}
                      className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isWholesale ? 'bg-indigo-50/30' : 'bg-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-600 font-medium">
                            x{item.quantity} {item.unit} ({item.packageSize})
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px]">
                          <span className={`${!isWholesale ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                            Retail: ₦{item.retailUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unit}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className={`${isWholesale ? 'text-indigo-700 font-semibold' : 'text-slate-400'}`}>
                            Wholesale: ₦{item.wholesaleUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {/* Segmented Retail / Wholesale Toggle for this specific product */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleItemSaleType(item.productId, 'Retail')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              !isWholesale
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Tag size={11} />
                            <span>Retail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleItemSaleType(item.productId, 'Wholesale')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              isWholesale
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Boxes size={11} />
                            <span>Wholesale</span>
                          </button>
                        </div>

                        <div className="text-right min-w-[78px]">
                          <span className="text-[10px] text-slate-400 block leading-none">Line Total</span>
                          <span className={`text-xs font-bold font-mono ${isWholesale ? 'text-indigo-700' : 'text-slate-900'}`}>
                            ₦{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Combined Calculation Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800 text-xs">
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70">
                  <span className="text-[10px] text-blue-300 font-semibold uppercase block">
                    🏷️ Retail Items ({retailItems.length})
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    ₦{retailSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70">
                  <span className="text-[10px] text-indigo-300 font-semibold uppercase block">
                    📦 Wholesale Items ({wholesaleItems.length})
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    ₦{wholesaleSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <span className="text-[11px] text-slate-400 block">Calculated Order Total</span>
                  <span className="text-[10px] text-slate-400">
                    {discount > 0 ? `Includes -₦${discount.toLocaleString()} discount` : 'Synchronized across receipt & ledger'}
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
                  ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between sm:justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaleTypeModalOpen(false)}
              className="h-9 px-3 rounded-lg border-slate-200 text-slate-700 text-xs cursor-pointer"
            >
              Back to Cart
            </Button>
            <Button
              size="sm"
              disabled={isProceedingToPayment || isProcessingSale}
              onClick={handleProceedWithCurrentSelection}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProceedingToPayment ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing Payment...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Payment • ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SCROLLABLE PAYMENT SETTLEMENT POP-UP WITH FULL ORDER ITEMS REVIEW        */}
      {/* ========================================================================= */}
      <Dialog open={isCheckoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-xl w-[96vw] max-w-[96vw] sm:w-full rounded-2xl p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white max-h-[90dvh] h-[90dvh] sm:h-auto sm:max-h-[88vh] flex flex-col focus:outline-none">
           {/* Fixed Header */}
           <div className="bg-slate-900 p-4 sm:p-5 text-white relative shrink-0">
              <DialogHeader className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pr-6 sm:pr-4">
                   <div>
                     <DialogTitle className="text-base font-semibold text-white tracking-tight">Payment Settlement</DialogTitle>
                     <div className="flex items-center gap-2 mt-1 flex-wrap">
                       <DialogDescription className="text-slate-400 font-normal text-xs">
                         {customer.name} • {itemsWithPricing.length} {itemsWithPricing.length === 1 ? 'Product' : 'Products'}
                       </DialogDescription>
                       <span className="text-slate-600">•</span>
                       <button
                         type="button"
                         onClick={() => {
                           setCheckoutOpen(false);
                           setSaleTypeModalOpen(true);
                         }}
                         className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
                         title="Change Wholesale / Retail Mode per Product"
                       >
                         <span>
                           {isMixedCart
                             ? `🔀 Mixed (${retailItems.length}R • ${wholesaleItems.length}W)`
                             : wholesaleItems.length > 0
                               ? '📦 All Wholesale'
                               : '🏷️ All Retail'}
                         </span>
                         <span className="text-blue-300 underline underline-offset-2 ml-0.5 text-[9px]">Change</span>
                       </button>
                     </div>
                   </div>
                   <div className="text-left sm:text-right">
                      <p className="text-slate-400 text-xs font-normal">Total Due</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 tracking-tight leading-none mt-0.5 font-mono">
                        ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                   </div>
                </div>
              </DialogHeader>
           </div>
           
           {/* Scrollable Content Area so user can review all products and payment fields */}
           <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 bg-white touch-pan-y focus:outline-none">
               {/* Selected Products & Wholesale/Retail Review List */}
               <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/40">
                  <div className="px-3.5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-2">
                     <div className="flex items-center gap-1.5">
                        <Package size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">
                           Selected Order Items ({itemsWithPricing.length})
                        </span>
                        <span className="text-[11px] text-slate-500">
                           • {itemsWithPricing.reduce((s, i) => s + i.quantity, 0)} units
                        </span>
                     </div>
                     <button
                        type="button"
                        onClick={() => {
                           setCheckoutOpen(false);
                           setSaleTypeModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                     >
                        Configure Wholesale/Retail
                     </button>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                     {itemsWithPricing.map((item) => {
                        const isWholesale = item.saleType === 'Wholesale';
                        return (
                           <div key={item.productId} className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 truncate">{item.name}</span>
                                    <button
                                       type="button"
                                       onClick={() => handleToggleItemSaleType(item.productId, isWholesale ? 'Retail' : 'Wholesale')}
                                       className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                          isWholesale
                                             ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                             : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                       }`}
                                       title="Click to switch between Retail and Wholesale for this item"
                                    >
                                       <span>{isWholesale ? '📦 Wholesale' : '🏷️ Retail'}</span>
                                    </button>
                                 </div>
                                 <p className="text-[11px] text-slate-500 mt-0.5">
                                    {item.quantity} {item.unit} ({item.packageSize}) × ₦{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </p>
                              </div>
                              <div className="text-right shrink-0 font-mono font-bold text-slate-900">
                                 ₦{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  {/* Subtotal Breakdown by Retail & Wholesale */}
                  <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 space-y-1 text-xs">
                     {retailItems.length > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                           <span>🏷️ Retail Items Subtotal ({retailItems.length} {retailItems.length === 1 ? 'item' : 'items'})</span>
                           <span className="font-mono font-semibold text-blue-700">
                              ₦{retailSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                        </div>
                     )}
                     {wholesaleItems.length > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                           <span>📦 Wholesale Items Subtotal ({wholesaleItems.length} {wholesaleItems.length === 1 ? 'item' : 'items'})</span>
                           <span className="font-mono font-semibold text-indigo-700">
                              ₦{wholesaleSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                        </div>
                     )}
                     <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-200/70">
                        <span>Combined Items Subtotal</span>
                        <span className="font-mono">
                           ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                     </div>
                  </div>
               </div>

               {/* VAT Toggle Control in Checkout Modal */}
               <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                     <div className={`p-2 rounded-lg ${enableVAT ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        <Receipt size={18} />
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-800">Value Added Tax (5% VAT)</span>
                           <Badge className={`text-[10px] px-2 py-0 border-none ${enableVAT ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-200 text-slate-600 font-medium'}`}>
                              {enableVAT ? '+5% ADDED' : 'OFF BY DEFAULT'}
                           </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                           {enableVAT 
                              ? `VAT of ₦${tax.toFixed(2)} is applied to this transaction.` 
                              : 'VAT is excluded from this payment. Toggle on to apply 5% VAT.'}
                        </p>
                     </div>
                  </div>
                  <button
                     type="button"
                     onClick={() => handleToggleVAT(!enableVAT)}
                     className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enableVAT ? 'bg-blue-600' : 'bg-slate-300'
                     }`}
                     title={enableVAT ? 'Disable VAT for this payment' : 'Enable 5% VAT for this payment'}
                  >
                     <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                           enableVAT ? 'translate-x-5' : 'translate-x-0'
                        }`}
                     />
                  </button>
               </div>

               {/* 4 Payment Type Entry Fields */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'cash', icon: <Banknote size={15} />, label: 'Cash' },
                    { id: 'card', icon: <CreditCard size={15} />, label: 'POS Terminal (Card)' },
                    { id: 'transfer', icon: <Smartphone size={15} />, label: 'Bank Transfer' },
                    { id: 'owing', icon: <Coins size={15} />, label: 'Credit / Owing' }
                  ].map(m => (
                    <div key={m.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="text-slate-500">{m.icon}</div>
                          <span className="text-xs font-medium text-slate-700">{m.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => handleFillRemaining(m.id as any)}
                            className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Fill Due
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSplitAmountChange(m.id as any, 0)}
                            className="text-[11px] font-normal text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₦</div>
                        <Input 
                          type="number"
                          placeholder="0.00"
                          value={splitAmounts[m.id as keyof typeof splitAmounts] || ''}
                          onChange={(e) => handleSplitAmountChange(m.id as any, Number(e.target.value))}
                          className="h-9 pl-7 pr-3 bg-white border-slate-200 rounded-md font-medium text-slate-900 text-xs focus-visible:ring-1 focus-visible:ring-blue-600"
                        />
                      </div>
                    </div>
                  ))}
               </div>

               {/* Debtor Details Form if owingPaid > 0 */}
               {splitAmounts.owing > 0 && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-3">
                     <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5 leading-none">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" /> Debtor Registry Information
                     </p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <span className="text-xs font-medium text-slate-600">Debtor Name *</span>
                            <CustomerSelectInput 
                              placeholder="Select or enter debtor name..." 
                              value={customer.name === 'General Consumer' ? '' : customer.name}
                              onChange={(val) => setCustomer({ ...customer, name: val })}
                              onSelectCustomer={(cust) => setCustomer({ id: cust.id || 'walk-in', name: cust.name, phone: cust.phone } as any)}
                              className="h-9 text-xs bg-white border border-slate-200 rounded-md font-normal"
                            />
                        </div>
                        <div className="space-y-1">
                           <span className="text-xs font-medium text-slate-600">Phone Number *</span>
                           <Input 
                             placeholder="e.g. 08012345678" 
                             value={(customer as any).phone || ''}
                             className="h-9 text-xs bg-white border border-slate-200 rounded-md font-normal"
                             onChange={(e) => setCustomer({ ...customer, phone: e.target.value } as any)}
                           />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">Repayment Deadline *</span>
                        <Input 
                          type="date"
                          value={(paymentDetails as any).dueDate || ''}
                          className="h-9 text-xs bg-white border border-slate-200 rounded-md font-normal"
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, dueDate: e.target.value })}
                        />
                     </div>
                  </div>
               )}

               {/* Dynamic Real-time Calculations Summary Card */}
               <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                     <p className="text-xs text-slate-400 font-normal mb-1">Total Paid</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight font-mono">₦{(splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-xs text-slate-400">of ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     {(splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing) < total ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md font-medium text-xs">
                           Shortfall: ₦{(total - (splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Badge>
                     ) : (splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing) > total ? (
                        <div className="text-right">
                           <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-medium text-xs mb-0.5">
                              Ready
                           </Badge>
                           {splitAmounts.cash > 0 && (
                              <p className="text-xs text-emerald-400 font-medium">
                                 Change: ₦{((splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing) - total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                           )}
                        </div>
                     ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-medium text-xs">
                           Exact Amount
                        </Badge>
                     )}
                  </div>
               </div>
            </div>

            {/* Pinned Footer with Back & Execute Transaction Buttons */}
            <DialogFooter className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => {
                   setCheckoutOpen(false);
                   setSaleTypeModalOpen(true);
                 }}
                 className="h-10 px-3.5 rounded-lg border-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
               >
                 Back
               </Button>
               <Button 
                 disabled={isProcessingSale || (splitAmounts.cash + splitAmounts.card + splitAmounts.transfer + splitAmounts.owing) < total}
                 onClick={processSale}
                 className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
               >
                 {isProcessingSale ? (
                   <>
                     <Loader2 size={16} className="animate-spin" />
                     <span>Processing & Logging Sale...</span>
                   </>
                 ) : (
                   <>
                     <span>Approve & Execute Transaction</span>
                     <ArrowRight size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                   </>
                 )}
               </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScannerDialog 
        open={isScannerOpen} 
        onOpenChange={setScannerOpen} 
        onScan={findProductByCode} 
      />

      <Dialog open={isOrderHistoryOpen} onOpenChange={setOrderHistoryOpen}>
        <DialogContent className="sm:max-w-2xl rounded-xl p-0 overflow-hidden border border-slate-200 shadow-xl bg-white">
           <div className="bg-slate-900 p-5 text-white">
              <DialogTitle className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <History size={18} className="text-blue-400" />
                Recent Sales Register
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-normal text-xs mt-0.5">
                Click any transaction to view full breakdown, download receipt, or share via WhatsApp/social
              </DialogDescription>
           </div>
           <ScrollArea className="h-[380px] p-0">
             <div className="divide-y divide-slate-100">
               {recentOrders.map((order) => (
                 <div 
                   key={order.id} 
                   onClick={() => setSelectedOrderForDetail(order)}
                   className="p-3.5 sm:p-4 hover:bg-blue-50/40 transition-colors flex items-center justify-between group cursor-pointer"
                 >
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                          <CheckCircle2 size={18} />
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-slate-900 text-xs">{order.id}</p>
                            <Badge className="bg-slate-100 text-slate-600 border-none font-normal text-[10px] capitalize px-1.5 py-0">{order.paymentMethod}</Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-900 font-mono">₦{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <span className="text-[10px] text-blue-600 font-medium group-hover:underline">View Details</span>
                       </div>
                       <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                          {order.status !== 'refunded' && order.status !== 'voided' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderHistoryOpen(false);
                                setRefundPreselectedOrder(order);
                                setRefundModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                              title="Refund / Return Items"
                            >
                              <RotateCcw size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleQuickDownloadRecentOrder(order, e)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Download PDF Receipt"
                          >
                            <Download size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderForShare(order);
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Share Receipt"
                          >
                            <Share2 size={14} />
                          </Button>
                       </div>
                    </div>
                 </div>
               ))}
               {recentOrders.length === 0 && (
                 <div className="p-12 text-center text-slate-400 font-normal text-xs">No recent records</div>
               )}
             </div>
           </ScrollArea>
           <DialogFooter className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Showing {recentOrders.length} recent register sales</span>
              <Button variant="ghost" onClick={() => setOrderHistoryOpen(false)} className="text-xs font-medium text-slate-600">Close</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Customer Selector Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border border-slate-200 shadow-xl p-0 overflow-hidden bg-white">
          <div className="bg-slate-900 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-white tracking-tight">Customer Information</DialogTitle>
              <DialogDescription className="text-slate-400 font-normal text-xs mt-0.5">Associate a customer with this active POS sale</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Customer Name</label>
              <CustomerSelectInput 
                placeholder="Select or enter customer name..."
                value={customer.name === 'General Consumer' ? '' : customer.name}
                onChange={(val) => setCustomer(prev => ({ ...prev, name: val || 'General Consumer' }))}
                onSelectCustomer={(cust) => setCustomer({ id: cust.id || 'walk-in', name: cust.name, phone: cust.phone } as any)}
                className="bg-white border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Phone Number (Optional)</label>
              <Input 
                placeholder="e.g. 08012345678"
                value={(customer as any).phone || ''}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                className="h-9 rounded-lg bg-white border-slate-200 text-xs font-normal"
              />
            </div>

            <div className="pt-2 flex gap-2.5">
              <Button 
                variant="outline"
                type="button"
                onClick={() => {
                  setCustomer({ name: 'General Consumer', id: 'walk-in' });
                  setCustomerDialogOpen(false);
                  toast.success("POS session reset to General Consumer / Walk-In");
                }}
                className="flex-1 h-9 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-100"
              >
                Reset to Walk-In
              </Button>
              <Button 
                type="button"
                disabled={isSavingCustomer}
                onClick={async () => {
                  setIsSavingCustomer(true);
                  try {
                    if (customer.name && customer.name !== 'General Consumer') {
                      try {
                        const res = await apiService.customers.add(customer.name, (customer as any).phone);
                        if (res) {
                          setCustomer({ id: res.id, name: res.name, phone: res.phone } as any);
                        }
                      } catch (e) {
                        console.error("Failed to add customer on confirmation:", e);
                      }
                    }
                    setCustomerDialogOpen(false);
                    toast.success(`Customer associated: ${customer.name}`);
                  } finally {
                    setIsSavingCustomer(false);
                  }
                }}
                className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSavingCustomer ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Customer</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Held Carts Dashboard Modal Dialog */}
      <Dialog open={isHeldCartsOpen} onOpenChange={setIsHeldCartsOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl p-0 overflow-hidden border border-slate-200 shadow-xl bg-white">
          <div className="bg-amber-600 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Suspended POS Sessions
              </DialogTitle>
              <DialogDescription className="text-amber-100 font-normal text-xs mt-0.5">
                Select a paused transaction to restore and resume checkout
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto">
            {heldCarts.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-xs">No Sales on Hold</p>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Place active sales on hold when switching between customers
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {heldCarts.map((c) => {
                  const cSubtotal = c.items.reduce((sum, i) => {
                    const prod = availableProducts.find(p => p.id === i.productId);
                    if (!prod) return sum + (i.price || 0) * i.quantity;
                    const pricing = calculateItemPrice({
                      productId: i.productId,
                      quantity: i.quantity,
                      packageSize: i.packageSize || 'Full Pack',
                      saleType: i.saleType || c.globalSaleType || 'Retail'
                    }, prod);
                    return sum + pricing.unitPrice * i.quantity;
                  }, 0);
                  const cTax = (cSubtotal - (c.discount || 0)) * 0.05;
                  const cTotal = Math.max(0, cSubtotal - (c.discount || 0) + cTax);

                  return (
                    <div 
                      key={c.id} 
                      className="p-3.5 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-xs bg-slate-200/80 px-1.5 py-0.5 rounded">
                            {c.id}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {new Date(c.heldAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          Customer: <span className="text-blue-600 font-medium">{c.customer?.name || 'Walk-in'}</span>
                        </p>
                        <p className="text-xs text-slate-500 font-normal truncate">
                          {c.items.map((i) => i.name + ' (x' + i.quantity + ')').join(', ')}
                        </p>
                      </div>
                      
                      <div className="flex sm:flex-col items-end gap-2 sm:gap-1.5 w-full sm:w-auto shrink-0 justify-between">
                        <span className="text-xs font-semibold text-blue-600">
                          ₦{cTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => discardHeldSale(c.id)}
                            className="h-7 px-2 rounded-md text-xs font-normal text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Discard
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              resumeHeldSale(c);
                              setIsHeldCartsOpen(false);
                            }}
                            className="h-7 px-3 rounded-md text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs"
                          >
                            Resume
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={() => setIsHeldCartsOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 px-4 font-medium text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Screen (Completed Sale or History item) */}
      <TransactionDetailModal
        order={lastOrder}
        open={isReceiptOpen}
        onOpenChange={setReceiptOpen}
      />

      {/* Transaction Detail Screen for Recent History row selection */}
      <TransactionDetailModal
        order={selectedOrderForDetail}
        open={!!selectedOrderForDetail}
        onOpenChange={(open) => !open && setSelectedOrderForDetail(null)}
      />

      {/* Quick Share Modal for WhatsApp, Facebook, Telegram, Email, PDF download */}
      <QuickShareModal
        order={selectedOrderForShare}
        open={!!selectedOrderForShare}
        onOpenChange={(open) => !open && setSelectedOrderForShare(null)}
      />

      {/* Refunds & Returns Modal with Supabase Live Sync */}
      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setRefundModalOpen(false);
          setRefundPreselectedOrder(null);
        }}
        selectedBranchId={selectedBranchId}
        initialOrder={refundPreselectedOrder}
        currentStaff={currentUser}
        onRefundCompleted={() => {
          loadProducts();
          loadRecentOrders();
          toast.success('Refund processed & stock replenished successfully!');
        }}
      />

      {/* Floating Bottom Quick-Action Dock on Mobile in Product Catalog Mode */}
      {mobileViewTab === 'products' && items.length > 0 && (
        <div className="lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setMobileViewTab('cart')}
            className="flex items-center gap-2 text-left min-w-0 flex-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="relative w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
              <ShoppingCart size={15} className="text-blue-400" />
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-full min-w-4 text-center">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium leading-none">Total ({items.length} {items.length === 1 ? 'item' : 'items'})</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 truncate mt-0.5">
                ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              disabled={items.length === 0 || isHoldingSale || isProcessingSale}
              onClick={handleHoldCurrentSale}
              className="h-9 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
              title="Hold Cart"
            >
              {isHoldingSale ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />}
              <span>{isHoldingSale ? 'Holding...' : 'Hold'}</span>
            </Button>
            <Button
              disabled={items.length === 0 || isInitiatingSale || isProcessingSale}
              onClick={handleInitiateSale}
              className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {isInitiatingSale ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Initiating...</span>
                </>
              ) : (
                <>
                  <span>Initiate Sale</span>
                  <CheckCircle2 size={14} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
     </div>
  );
}
