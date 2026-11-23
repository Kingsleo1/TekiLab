import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Package, 
  ArrowLeft, 
  Printer, 
  RefreshCw,
  Clock,
  User,
  Phone,
  Receipt,
  FileText,
  X,
  CreditCard,
  Building,
  Wallet
} from 'lucide-react';
import { Order, OrderItem, RefundRecord, RefundItem } from '../../types/pharmacy';
import { apiService } from '../../services/api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranchId: string;
  initialOrderId?: string;
  initialOrder?: Order;
  currentStaff?: any;
  onRefundCompleted?: (refund: RefundRecord) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  selectedBranchId,
  initialOrderId,
  initialOrder,
  currentStaff,
  onRefundCompleted
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Refund State
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [restockToggles, setRestockToggles] = useState<Record<string, boolean>>({});
  const [refundReason, setRefundReason] = useState('Customer Return (Unopened / Good condition)');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'transfer' | 'card' | 'wallet'>('cash');
  const [staffNote, setStaffNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedRefund, setProcessedRefund] = useState<RefundRecord | null>(null);

  // Load orders when modal opens
  useEffect(() => {
    if (isOpen) {
      setProcessedRefund(null);
      if (initialOrder) {
        setSelectedOrder(initialOrder);
        initializeOrderItems(initialOrder);
      } else if (initialOrderId) {
        loadSpecificOrder(initialOrderId);
      } else {
        loadRecentOrders();
      }
    } else {
      setSelectedOrder(null);
      setRefundQuantities({});
      setRestockToggles({});
      setSearchQuery('');
      setProcessedRefund(null);
    }
  }, [isOpen, initialOrderId, initialOrder, selectedBranchId]);

  const loadRecentOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const allOrders = await apiService.orders.list(selectedBranchId);
      // Filter for confirmed or delivered orders that are not fully refunded or voided
      const eligible = allOrders.filter(o => o.status !== 'voided' && o.status !== 'cancelled' && o.status !== 'refunded');
      setOrders(eligible);
    } catch (err) {
      console.error('Failed to load orders for refund', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadSpecificOrder = async (orderId: string) => {
    setIsLoadingOrders(true);
    try {
      const allOrders = await apiService.orders.list(selectedBranchId);
      const found = allOrders.find(o => o.id === orderId);
      if (found) {
        setSelectedOrder(found);
        initializeOrderItems(found);
      }
    } catch (err) {
      console.error('Failed to load specific order', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const initializeOrderItems = (order: Order) => {
    const quantities: Record<string, number> = {};
    const restocks: Record<string, boolean> = {};
    order.items.forEach(item => {
      // Default to 0 selected items for refund (user increments what they want to return)
      quantities[item.productId] = 0;
      restocks[item.productId] = true;
    });
    setRefundQuantities(quantities);
    setRestockToggles(restocks);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    initializeOrderItems(order);
  };

  const handleQuantityChange = (productId: string, val: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(val, maxQty));
    setRefundQuantities(prev => ({
      ...prev,
      [productId]: clamped
    }));
  };

  const handleToggleRestock = (productId: string) => {
    setRestockToggles(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Calculations
  const refundItems: RefundItem[] = selectedOrder ? selectedOrder.items
    .filter(item => (refundQuantities[item.productId] || 0) > 0)
    .map(item => {
      const qty = refundQuantities[item.productId] || 0;
      return {
        productId: item.productId,
        name: item.name,
        quantity: qty,
        unitPrice: item.price,
        totalRefund: qty * item.price,
        returnToInventory: restockToggles[item.productId] ?? true
      };
    }) : [];

  const totalRefundAmount = refundItems.reduce((acc, item) => acc + item.totalRefund, 0);
  const totalItemsCount = refundItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleProcessRefund = async () => {
    if (!selectedOrder || refundItems.length === 0 || totalRefundAmount <= 0) {
      alert('Please select at least one item and quantity to refund.');
      return;
    }

    const finalReason = refundReason === 'Other' && customReason ? customReason : refundReason;

    setIsProcessing(true);
    try {
      const refundRecord: RefundRecord = {
        id: `REF-${Date.now().toString().slice(-6)}`,
        orderId: selectedOrder.id,
        pharmacyId: selectedOrder.pharmacyId || selectedBranchId || 'pharma-1',
        customerName: selectedOrder.patientId && selectedOrder.patientId !== 'walk-in' ? selectedOrder.patientId : 'Walk-in Customer',
        items: refundItems,
        refundAmount: totalRefundAmount,
        reason: finalReason,
        refundMethod: refundMethod,
        processedBy: currentStaff?.id || currentStaff?.name || 'Authorized Staff',
        processedByName: currentStaff?.name || 'Staff Member',
        receiptNumber: `REC-${selectedOrder.id.replace('ord-', '').slice(-6)}`,
        notes: staffNote || undefined,
        createdAt: new Date().toISOString()
      };

      const savedRefund = await apiService.refunds.create(refundRecord);
      setProcessedRefund(savedRefund);
      if (onRefundCompleted) {
        onRefundCompleted(savedRefund);
      }
    } catch (err) {
      console.error('Failed to process refund', err);
      alert('Failed to process refund. Please check network connection and database synchronization.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Filtered orders for search
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o.patientId && o.patientId.toLowerCase().includes(q)) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Sales Hall Refund & Item Return System
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  Supabase Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Process customer returns, issue monetary refunds, and automatically replenish live inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Post-Refund Success Voucher View */}
          {processedRefund ? (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Refund Successfully Synchronized</h3>
                <p className="text-sm text-slate-400">
                  Refund voucher created, inventory stock updated, and logged to database audit ledger.
                </p>
              </div>

              {/* Printable Voucher Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 max-w-lg mx-auto shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Official Voucher</span>
                    <p className="font-mono text-base font-bold text-amber-400">{processedRefund.id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{new Date(processedRefund.createdAt).toLocaleDateString()}</span>
                    <p className="text-xs font-mono text-slate-400">{new Date(processedRefund.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Original Order:</span>
                    <p className="font-semibold text-white">{processedRefund.orderId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Customer:</span>
                    <p className="font-semibold text-white">{processedRefund.customerName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Refund Method:</span>
                    <p className="font-semibold uppercase text-emerald-400">{processedRefund.refundMethod}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Authorized Staff:</span>
                    <p className="font-semibold text-white">{processedRefund.processedByName || processedRefund.processedBy}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Reason for Return:</span>
                    <p className="font-medium text-slate-300">{processedRefund.reason}</p>
                  </div>
                </div>

                {/* Returned Items List */}
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Refunded Items Breakdown</span>
                  <div className="space-y-2">
                    {processedRefund.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <span className="text-slate-400">Qty: {item.quantity} × ₦{item.unitPrice.toLocaleString()} {item.returnToInventory && <span className="text-emerald-400 font-medium ml-1">(Restocked)</span>}</span>
                        </div>
                        <p className="font-mono font-bold text-amber-300">₦{item.totalRefund.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Refund */}
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-300">Total Refund Amount:</span>
                  <span className="text-xl font-mono font-bold text-emerald-400">₦{processedRefund.refundAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handlePrintVoucher}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 border border-slate-700 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Voucher
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-900/30"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !selectedOrder ? (
            /* Step 1: Order Lookup / Selection */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 1: Select Order to Refund</h3>
                  <p className="text-xs text-slate-400">Search by receipt number, order ID, or customer name</p>
                </div>
                <button
                  onClick={loadRecentOrders}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders (e.g. ord-1234, walk-in, paracetamol)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {isLoadingOrders ? (
                <div className="text-center py-12 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading branch order transactions from database...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">No eligible completed orders found</p>
                  <p className="text-xs text-slate-600 mt-1">Make a sale in the POS Sales Hall first or try adjusting your search terms</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white group-hover:text-amber-400 transition">
                            {order.id}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {order.paymentMethod.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3 h-3 text-slate-500" />
                            {order.patientId && order.patientId !== 'walk-in' ? order.patientId : 'Walk-in Customer'}
                          </span>
                          <span>•</span>
                          <span>{order.items.length} product(s): {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ').slice(0, 45)}...</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-mono font-bold text-emerald-400">
                          ₦{order.total.toLocaleString()}
                        </p>
                        <span className="text-xs text-amber-400/80 group-hover:text-amber-400 font-medium">
                          Select for Return →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Item Selection & Refund Details */
            <div className="space-y-6">
              
              {/* Selected Order Banner */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Change Order"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{selectedOrder.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                        Original Total: ₦{selectedOrder.total.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Customer: <strong className="text-slate-300">{selectedOrder.patientId}</strong> • Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Change Order
                </button>
              </div>

              {/* Items Return Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Items & Quantity to Refund
                  </h4>
                  <button
                    onClick={() => {
                      // Select all max
                      const allMax: Record<string, number> = {};
                      selectedOrder.items.forEach(i => {
                        allMax[i.productId] = i.quantity;
                      });
                      setRefundQuantities(allMax);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Select All Items (Full Refund)
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-center">Unit Price</th>
                        <th className="p-3 text-center">Bought Qty</th>
                        <th className="p-3 text-center">Refund Qty</th>
                        <th className="p-3 text-center">Restock Inventory</th>
                        <th className="p-3 text-right">Item Refund (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedOrder.items.map(item => {
                        const currentQty = refundQuantities[item.productId] || 0;
                        const isRestocking = restockToggles[item.productId] ?? true;
                        const itemSubtotal = currentQty * item.price;

                        return (
                          <tr key={item.productId} className={`transition ${currentQty > 0 ? 'bg-amber-500/5' : 'hover:bg-slate-900/40'}`}>
                            <td className="p-3">
                              <p className="font-semibold text-white">{item.name}</p>
                              <span className="text-slate-500 text-[11px] capitalize">{item.unit || 'base unit'}</span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-300">
                              ₦{item.price.toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-400">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                                <button
                                  onClick={() => handleQuantityChange(item.productId, currentQty - 1, item.quantity)}
                                  disabled={currentQty <= 0}
                                  className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-mono font-bold text-white">
                                  {currentQty}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.productId, currentQty + 1, item.quantity)}
                                  disabled={currentQty >= item.quantity}
                                  className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isRestocking}
                                  onChange={() => handleToggleRestock(item.productId)}
                                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className={`text-[11px] ${isRestocking ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                                  {isRestocking ? 'Restock (+)' : 'Damaged / Discard'}
                                </span>
                              </label>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white">
                              ₦{itemSubtotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund Reason & Payment Method Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Reason for Refund / Return
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Customer Return (Unopened / Good condition)">Customer Return (Unopened / Good condition)</option>
                    <option value="Wrong Medication / Dosage Dispensed">Wrong Medication / Dosage Dispensed</option>
                    <option value="Damaged / Broken Seal / Package Defect">Damaged / Broken Seal / Package Defect</option>
                    <option value="Near-Expiry / Expired Item Notice">Near-Expiry / Expired Item Notice</option>
                    <option value="Billing Discrepancy / Overcharge Correction">Billing Discrepancy / Overcharge Correction</option>
                    <option value="Clinician Recommendation / Adverse Reaction">Clinician Recommendation / Adverse Reaction</option>
                    <option value="Customer Changed Mind">Customer Changed Mind</option>
                    <option value="Other">Other Reason (Custom)</option>
                  </select>

                  {refundReason === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify reason details..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mt-2"
                    />
                  )}
                </div>

                {/* Refund Payment Channel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Refund Disbursal Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cash', label: 'Cash Refund', icon: DollarSign },
                      { id: 'transfer', label: 'Bank Transfer', icon: Building },
                      { id: 'card', label: 'POS Reversal', icon: CreditCard },
                      { id: 'wallet', label: 'Store Credit', icon: Wallet }
                    ].map(channel => {
                      const Icon = channel.icon;
                      const isSelected = refundMethod === channel.id;
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setRefundMethod(channel.id as any)}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                            isSelected 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {channel.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Notes */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Internal Staff Authorization Memo (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter notes or customer identification details..."
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Items to Return</span>
                      <span className="text-sm font-bold text-white">{totalItemsCount} item(s)</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Total Refund Calculated</span>
                      <span className="text-xl font-mono font-bold text-emerald-400">₦{totalRefundAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessRefund}
                    disabled={isProcessing || totalRefundAmount <= 0}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-950/40"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronizing Database...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Authorize & Process Refund
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
