import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  PackageX, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Filter, 
  ShieldAlert,
  Boxes,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '../../types/pharmacy';
import { motion, AnimatePresence } from 'motion/react';

interface LowStockWidgetProps {
  products: Product[];
  onNavigateToInventory?: () => void;
  className?: string;
}

export function LowStockWidget({ products, onNavigateToInventory, className = '' }: LowStockWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'outOfStock' | 'lowStock'>('all');

  // Compute products below or at their configured reorder threshold
  const lowStockList = useMemo(() => {
    return products.filter(p => {
      const threshold = p.minStockLevel !== undefined ? p.minStockLevel : 10;
      return p.stock <= threshold;
    }).sort((a, b) => {
      // Out of stock first, then lowest percentage of threshold
      if (a.stock === 0 && b.stock !== 0) return -1;
      if (b.stock === 0 && a.stock !== 0) return 1;
      const thresholdA = a.minStockLevel !== undefined ? a.minStockLevel : 10;
      const thresholdB = b.minStockLevel !== undefined ? b.minStockLevel : 10;
      const ratioA = thresholdA > 0 ? a.stock / thresholdA : a.stock;
      const ratioB = thresholdB > 0 ? b.stock / thresholdB : b.stock;
      return ratioA - ratioB;
    });
  }, [products]);

  // Statistics
  const outOfStockCount = useMemo(() => lowStockList.filter(p => p.stock === 0).length, [lowStockList]);
  const lowStockCount = useMemo(() => lowStockList.filter(p => p.stock > 0).length, [lowStockList]);

  // Filtered list based on search and selected tab filter
  const filteredProducts = useMemo(() => {
    return lowStockList.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (filterMode === 'outOfStock') return p.stock === 0;
      if (filterMode === 'lowStock') return p.stock > 0;
      return true;
    });
  }, [lowStockList, searchQuery, filterMode]);

  return (
    <Card className={`rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-900/5 bg-white overflow-hidden ${className}`}>
      <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-rose-50/50 via-amber-50/30 to-white border-b border-rose-100/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
              <AlertTriangle size={18} />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Low Stock & Reorder Watchlist
            </CardTitle>
          </div>
          <CardDescription className="text-slate-500 text-xs font-normal">
            Products where current quantity is below the reorder threshold defined in product edit settings
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Badge className={`px-3 py-1 text-xs font-bold border-none rounded-full ${
            lowStockList.length > 0 
              ? 'bg-rose-100 text-rose-700' 
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {lowStockList.length > 0 ? `${lowStockList.length} Items Below Threshold` : 'All Stock Healthy'}
          </Badge>
          {onNavigateToInventory && (
            <Button
              onClick={onNavigateToInventory}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 shadow-xs"
            >
              <span>Manage Inventory</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {lowStockList.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200/80 p-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Inventory Levels Optimal</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              All active products in your store currently exceed their configured reorder thresholds ({products.length} total items monitored).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Stats Bar & Filter Controls */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterMode === 'all' 
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Low Stock ({lowStockList.length})
                </button>
                <button
                  onClick={() => setFilterMode('outOfStock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === 'outOfStock' 
                      ? 'bg-rose-500 text-white shadow-xs' 
                      : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <PackageX size={13} />
                  <span>Out of Stock ({outOfStockCount})</span>
                </button>
                <button
                  onClick={() => setFilterMode('lowStock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === 'lowStock' 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <ShieldAlert size={13} />
                  <span>Below Threshold ({lowStockCount})</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <Input
                  placeholder="Filter product or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-rose-500"
                />
              </div>
            </div>

            {/* Product List */}
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl">
                No low stock products match your filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const threshold = p.minStockLevel !== undefined ? p.minStockLevel : 10;
                  const isOutOfStock = p.stock === 0;
                  const deficit = Math.max(0, threshold - p.stock);
                  const pct = Math.min(100, Math.max(0, Math.round((p.stock / (threshold || 1)) * 100)));

                  return (
                    <div 
                      key={p.id} 
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-600 font-bold' 
                            : 'bg-amber-100 text-amber-700 font-bold'
                        }`}>
                          {isOutOfStock ? <PackageX size={18} /> : <Boxes size={18} />}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{p.name}</h4>
                            <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] px-2 py-0 font-medium">
                              {p.category}
                            </Badge>
                            {isOutOfStock ? (
                              <Badge className="bg-rose-500 text-white border-none text-[10px] px-2 py-0 font-bold animate-pulse">
                                OUT OF STOCK
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white border-none text-[10px] px-2 py-0 font-bold">
                                BELOW THRESHOLD
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>Unit Price: <strong className="text-slate-800">₦{p.price.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span>Unit Type: <strong className="text-slate-800 capitalize">{p.baseUnit}</strong></span>
                            {deficit > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-rose-600 font-semibold">Shortage: +{deficit} units needed</span>
                              </>
                            )}
                          </div>

                          {/* Progress bar comparing current stock against reorder threshold */}
                          <div className="pt-1.5 max-w-md">
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="font-semibold text-slate-700">
                                Stock: <span className={isOutOfStock ? 'text-rose-600 font-black' : 'text-amber-600 font-black'}>{p.stock}</span> / {threshold} threshold
                              </span>
                              <span className="text-slate-400 font-medium">{pct}% of threshold</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOutOfStock ? 'bg-rose-500' : pct <= 30 ? 'bg-rose-500' : 'bg-amber-500'
                                }`} 
                                style={{ width: `${Math.max(5, pct)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {onNavigateToInventory && (
                          <Button
                            onClick={onNavigateToInventory}
                            size="sm"
                            className={`h-8 px-3 rounded-xl text-xs font-bold shadow-xs ${
                              isOutOfStock 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                          >
                            <span>Reorder Stock</span>
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
