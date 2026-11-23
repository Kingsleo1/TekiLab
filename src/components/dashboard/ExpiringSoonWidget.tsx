import { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Tag, 
  Skull,
  ExternalLink,
  ShieldAlert,
  Boxes,
  Layers,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, Batch } from '../../types/pharmacy';
import { format } from 'date-fns';

interface ExpiringSoonWidgetProps {
  products: Product[];
  onNavigateToInventory?: () => void;
  className?: string;
  daysThreshold?: number; // default 90 days
}

interface ExpiringItem {
  productId: string;
  productName: string;
  category: string;
  price: number;
  batchId?: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning';
}

function calculateDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 999;
  try {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export function ExpiringSoonWidget({ 
  products, 
  onNavigateToInventory, 
  className = '',
  daysThreshold = 90
}: ExpiringSoonWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');

  // Flatten product batches and products to identify all expiring inventory units within threshold
  const expiringItems = useMemo(() => {
    const items: ExpiringItem[] = [];

    products.forEach(p => {
      // If product has specific batches, evaluate each batch
      if (p.batches && p.batches.length > 0) {
        p.batches.forEach(b => {
          const days = calculateDaysRemaining(b.expiryDate || p.expiryDate);
          if (days <= daysThreshold) {
            let status: 'expired' | 'critical' | 'warning' = 'warning';
            if (days <= 0) status = 'expired';
            else if (days <= 30) status = 'critical';

            items.push({
              productId: p.id,
              productName: p.name,
              category: p.category,
              price: p.price,
              batchId: b.id,
              batchNumber: b.batchNumber || 'Batch-01',
              quantity: b.quantity ?? p.stock,
              expiryDate: b.expiryDate || p.expiryDate,
              daysRemaining: days,
              status
            });
          }
        });
      } else if (p.expiryDate) {
        // Fallback to top-level product expiry
        const days = calculateDaysRemaining(p.expiryDate);
        if (days <= daysThreshold) {
          let status: 'expired' | 'critical' | 'warning' = 'warning';
          if (days <= 0) status = 'expired';
          else if (days <= 30) status = 'critical';

          items.push({
            productId: p.id,
            productName: p.name,
            category: p.category,
            price: p.price,
            batchNumber: (p as any).batchId || 'Active Stock',
            quantity: p.stock,
            expiryDate: p.expiryDate,
            daysRemaining: days,
            status
          });
        }
      }
    });

    // Sort by most urgent first (expired first, then fewest days remaining)
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [products, daysThreshold]);

  // Statistics
  const expiredCount = useMemo(() => expiringItems.filter(i => i.status === 'expired').length, [expiringItems]);
  const criticalCount = useMemo(() => expiringItems.filter(i => i.status === 'critical').length, [expiringItems]);
  const warningCount = useMemo(() => expiringItems.filter(i => i.status === 'warning').length, [expiringItems]);
  
  const totalValueAtRisk = useMemo(() => {
    return expiringItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [expiringItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return expiringItems.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'expired') return item.status === 'expired';
      if (filterMode === 'critical') return item.status === 'critical';
      if (filterMode === 'warning') return item.status === 'warning';
      return true;
    });
  }, [expiringItems, searchQuery, filterMode]);

  return (
    <Card className={`rounded-[2rem] border border-amber-200/70 shadow-xl shadow-amber-900/5 bg-white overflow-hidden ${className}`}>
      <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/60 via-orange-50/30 to-white border-b border-amber-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Calendar size={18} />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Expiring Soon & Batch Expiry Controller
            </CardTitle>
          </div>
          <CardDescription className="text-slate-500 text-xs font-normal">
            Real-time tracking of medicinal batches approaching or past expiration dates
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Badge className={`px-3 py-1 text-xs font-bold border-none rounded-full ${
            expiredCount > 0 
              ? 'bg-rose-100 text-rose-700' 
              : expiringItems.length > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {expiringItems.length > 0 ? `${expiringItems.length} Batches Near Expiry` : 'All Batches Fresh'}
          </Badge>
          {onNavigateToInventory && (
            <Button
              onClick={onNavigateToInventory}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 shadow-xs"
            >
              <span>Batch Audit</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {expiringItems.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200/80 p-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-900">All Batches Fresh</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              No product batches are expired or scheduled to expire within the next {daysThreshold} days across monitored inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Value at Risk Banner & Filters */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterMode === 'all' 
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Expiring ({expiringItems.length})
                </button>
                {expiredCount > 0 && (
                  <button
                    onClick={() => setFilterMode('expired')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      filterMode === 'expired' 
                        ? 'bg-rose-600 text-white shadow-xs' 
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Skull size={13} />
                    <span>Expired ({expiredCount})</span>
                  </button>
                )}
                <button
                  onClick={() => setFilterMode('critical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === 'critical' 
                      ? 'bg-orange-500 text-white shadow-xs' 
                      : 'text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  <Clock size={13} />
                  <span>Critical &lt;30d ({criticalCount})</span>
                </button>
                <button
                  onClick={() => setFilterMode('warning')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === 'warning' 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <AlertCircle size={13} />
                  <span>30-90 Days ({warningCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valuation at Risk</span>
                  <span className="text-xs font-black text-rose-600">₦{totalValueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                
                {/* Search input */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <Input
                    placeholder="Search batch or product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Expiring List */}
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl">
                No expiring batch records match your filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {filteredItems.map((item, idx) => {
                  const isExpired = item.status === 'expired';
                  const isCritical = item.status === 'critical';

                  return (
                    <div 
                      key={`${item.productId}-${item.batchNumber}-${idx}`}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isExpired 
                            ? 'bg-rose-100 text-rose-600 font-bold' 
                            : isCritical 
                            ? 'bg-orange-100 text-orange-600 font-bold'
                            : 'bg-amber-100 text-amber-700 font-bold'
                        }`}>
                          {isExpired ? <Skull size={18} /> : <Calendar size={18} />}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{item.productName}</h4>
                            <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] px-2 py-0 font-medium">
                              Batch: {item.batchNumber}
                            </Badge>
                            <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] px-2 py-0 font-normal">
                              {item.category}
                            </Badge>

                            {isExpired ? (
                              <Badge className="bg-rose-600 text-white border-none text-[10px] px-2 py-0 font-bold animate-pulse">
                                EXPIRED ({Math.abs(item.daysRemaining)}d ago)
                              </Badge>
                            ) : isCritical ? (
                              <Badge className="bg-orange-500 text-white border-none text-[10px] px-2 py-0 font-bold">
                                CRITICAL ({item.daysRemaining} days left)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white border-none text-[10px] px-2 py-0 font-bold">
                                {item.daysRemaining} days remaining
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>Expiry Date: <strong className={isExpired ? 'text-rose-600 font-bold' : 'text-slate-800'}>{item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Batch Units: <strong className="text-slate-800 font-bold">{item.quantity}</strong></span>
                            <span>•</span>
                            <span>Stock Value: <strong className="text-slate-800 font-bold">₦{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {onNavigateToInventory && (
                          <Button
                            onClick={onNavigateToInventory}
                            size="sm"
                            className={`h-8 px-3 rounded-xl text-xs font-bold shadow-xs ${
                              isExpired 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                          >
                            <span>{isExpired ? 'Quarantine / Dispose' : 'Promote / Discount'}</span>
                            <ExternalLink size={12} className="ml-1.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
