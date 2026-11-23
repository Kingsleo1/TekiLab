import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Package, 
  Clock, 
  ShieldCheck, 
  Info, 
  Calendar, 
  Activity, 
  Sparkles, 
  FileText,
  AlertTriangle,
  Layers,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { Product } from '../../types/pharmacy';
import { toast } from 'sonner';
import { SocialShare } from './SocialShare';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  cart: any[];
  walletBalance: number;
  onNavigateToUpload: () => void;
}

export function ProductDetailView({
  product,
  onBack,
  onAddToCart,
  cart,
  walletBalance,
  onNavigateToUpload
}: ProductDetailViewProps) {
  const [qty, setQty] = useState(1);
  const isOutOfStock = product.stock <= 0;

  // Custom data generator corresponding to physical pharma details
  const getProductDetails = (prod: Product) => {
    const nameLower = prod.name.toLowerCase();
    if (nameLower.includes('amox') || nameLower.includes('augmentin')) {
      return {
        description: "Amoxicillin is a moderate-spectrum, bactericidal, beta-lactam antibiotic. It treats susceptible bacterial infections by inhibiting bacterial cell wall synthesis. Prescribed for upper respiratory tracts, skin tissue management, and renal paths.",
        instructions: "Complete the full clinical course under strict observation. Standard safe dosage is typically taken every 8 to 12 hours with meals.",
        caution: "Unsuitable for individuals with confirmed hypersensitivity to penicillin or cephalosporins. Report severe skin rashes or abdomen discomfort immediately.",
        storage: "Preserve in airtight containers. Keep dry. Store below 25°C. For liquid suspensions, keep refrigerated and discard unused portions after 14 days.",
        activeIngredients: "Amoxicillin Trihydrate (corresponding to 500mg anhydrous amoxicillin)",
        contraindications: "Beta-lactam allergy, glandular fever, lymphatic leukemia",
        formula: "C16H19N3O5S • 3H2O",
        badgeTheme: "bg-blue-50 text-blue-600 border-blue-100",
        illustrationColor: "from-blue-600/20 via-indigo-600/5 to-transparent"
      };
    }
    if (nameLower.includes('paracetamol') || nameLower.includes('panadol') || nameLower.includes('acetaminophen')) {
      return {
        description: "Paracetamol (acetaminophen) is a widely recommended non-opioid analgesic and antipyretic. It targets mild-to-moderate pain and reduces fever by acting primarily on the thermo-regulatory center of the brain.",
        instructions: "Adults take 1-2 tablets every 4-6 hours. Avoid exceeding 8 tablets (4,000mg) in any 24-hour window to protect renal and hepatic pathways.",
        caution: "Excessive ingestion can lead to severe or irreversible liver injury. Avoid combining with secondary paracetamol-containing remedies.",
        storage: "Store dry at room temperature (15–30°C). Protect from heat and moisture.",
        activeIngredients: "Acetaminophen / N-(4-hydroxyphenyl)acetamide (500mg)",
        contraindications: "Severe hepatic impairment, chronic alcoholism",
        formula: "C8H9NO2",
        badgeTheme: "bg-orange-50 text-orange-600 border-orange-100",
        illustrationColor: "from-orange-600/20 via-amber-600/5 to-transparent"
      };
    }
    if (nameLower.includes('lipitor') || nameLower.includes('atorvastatin')) {
      return {
        description: "Lipitor (atorvastatin) is an HMG-CoA reductase inhibitor (statin) used alongside diet to decrease elevated low-density lipoprotein (LDL) cholesterol, total cholesterol, or triglycerides, reducing cardiovascular hazards.",
        instructions: "Standard maintenance is 10mg to 80mg orally daily. Administer at any hour of the day, with or without nourishment.",
        caution: "Consult a healthcare specialist if experiencing unexplained muscle weakness, soreness, or fatigue. Avoid daily grapefruit concentrations.",
        storage: "Preserve in a cool, dry setting below 25°C.",
        activeIngredients: "Atorvastatin Calcium (20mg)",
        contraindications: "Active hepatic dysfunction, pregnancy, lactation",
        formula: "C33H35FN2O5",
        badgeTheme: "bg-indigo-50 text-indigo-600 border-indigo-100",
        illustrationColor: "from-indigo-600/20 via-slate-600/5 to-transparent"
      };
    }
    if (nameLower.includes('insulin')) {
      return {
        description: "Insulin Humulin N is an intermediate-acting biosynthetic human insulin suspension. It coordinates blood glucose metabolism, encouraging peripheral insulin absorption and suppressing hepatic glucose production.",
        instructions: "Administer subcutaneously strictly in line with personal carbohydrate intake and blood sugar logs. Rotate injection sites consistently.",
        caution: "Always confirm current blood sugar levels prior to injection to avoid acute hypoglycemia. Never share designated syringe instruments.",
        storage: "Unopened vials must be kept under refrigeration (2-8°C). Avoid freezing. Opened cartridges can be stored at room temperature for up to 28 days.",
        activeIngredients: "Biosynthetic Human Insulin (100 USP units/mL)",
        contraindications: "Hypoglycemia (low blood sugar), systemic insulin hypersensitivity",
        formula: "C257H383N65O77S6",
        badgeTheme: "bg-teal-50 text-teal-600 border-teal-100",
        illustrationColor: "from-teal-600/30 via-emerald-600/10 to-transparent"
      };
    }
    if (nameLower.includes('ventolin') || nameLower.includes('albuterol') || nameLower.includes('salbutamol')) {
      return {
        description: "Ventolin (albuterol/salbutamol) is a rapidly acting beta2-adrenergic agonist bronchodilator. It treats and prevents spasms inside bronchial airways related to reversible obstructive Pulmonary illnesses.",
        instructions: "Inhale 1 to 2 puffs when experiencing acute chest tightness or prior to vigorous exercise. Ensure proper coordination of actuation and inhalation.",
        caution: "Exceeding daily directed usage may result in muscle tremors, tachycardia, or cardiac palpitations. Seek quick medical help if relief is short-lived.",
        storage: "Store upright below 30°C. Keep away from direct sunlight, heat sources, and do not freeze. Do not pierce or incinerate the container.",
        activeIngredients: "Albuterol Sulfate (100 micrograms per metered actuation)",
        contraindications: "Tachyarrhythmias, hypersensitivity to aerosol propellants",
        formula: "C13H21NO3",
        badgeTheme: "bg-cyan-50 text-cyan-600 border-cyan-100",
        illustrationColor: "from-cyan-600/30 via-sky-600/10 to-transparent"
      };
    }
    if (nameLower.includes('pregnacare')) {
      return {
        description: "Pregnacare Original is a scientifically developed prenatal dietary formulation containing 19 essential vitamins and bioactive cell nutrients, curated specifically for pregnancy and general fetal care.",
        instructions: "Swallow one tablet daily with a cold beverage during your main meal. Do not chew.",
        caution: "Take exclusively on a full stomach. Contains iron which, in excess, can be harmful to vulnerable pediatric groups.",
        storage: "Keep in a cool, dry place. Protect from moisture and direct sunlight.",
        activeIngredients: "Folic Acid (400mcg), Vitamin D3 (10mcg), Iron (17mg), plus trace elements",
        contraindications: "Known mineral or iron intolerance, hypercalcemia",
        formula: "Multivitamin Complex",
        badgeTheme: "bg-purple-50 text-purple-600 border-purple-100",
        illustrationColor: "from-purple-600/20 via-pink-600/5 to-transparent"
      };
    }

    // Generic fallback corresponding to the category
    const isRxRequired = prod.requiresPrescription;
    return {
      description: `A certified pharmaceutical clinical agent listed within our ${prod.category} section. Recommended for standard therapeutic compliance under directed guidelines.`,
      instructions: "Administer precisely as prescribed by a clinical partner. Review the instruction leaflet inside the physical packing.",
      caution: `Always examine appropriate dosage patterns. Do not complete self-prescribed regimens of ${prod.category.toLowerCase()} treatments.`,
      storage: "Preserve below 30°C in a dry cool workspace. Protect completely from moisture and bright light.",
      activeIngredients: `${prod.name} Active Base Ingredient`,
      contraindications: "Hypersensitivity to the primary active ingredients",
      formula: "Anhydrous Bio-Complex",
      badgeTheme: "bg-slate-50 text-slate-600 border-slate-150",
      illustrationColor: "from-slate-600/10 via-slate-500/5 to-transparent"
    };
  };

  const info = getProductDetails(product);

  const getExpiryStatus = (dateStr: string) => {
    if (!dateStr) return { label: 'Unchecked', color: 'bg-slate-50 text-slate-500 border-slate-100', isCritical: false };
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { label: 'Expired (Discard Safely)', color: 'bg-red-50 text-red-600 border-red-200 animate-pulse', isCritical: true };
    }
    if (diffDays < 90) {
      return { label: `Alert: Expires in ${diffDays} Days`, color: 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse', isCritical: true };
    }
    if (diffDays < 180) {
      return { label: `Warning: Expires in ${Math.round(diffDays / 30)} Months`, color: 'bg-amber-50 text-amber-600 border-amber-250', isCritical: false };
    }
    return { label: `Premium Integrity: Expires on ${new Date(dateStr).toLocaleDateString()}`, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', isCritical: false };
  };

  const expStatus = getExpiryStatus(product.expiryDate);

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) {
      return { label: 'Out of Stock', percent: 0, barColor: 'bg-red-500', textClass: 'text-red-500' };
    }
    const safeMin = minStock || 10;
    if (stock <= safeMin) {
      return { label: `Critical low stock: ${stock} units`, percent: Math.max(10, (stock / safeMin) * 30), barColor: 'bg-amber-500', textClass: 'text-amber-500' };
    }
    return { label: 'Fully Stocked', percent: Math.min(100, (stock / (safeMin * 4)) * 100), barColor: 'bg-emerald-500', textClass: 'text-emerald-500' };
  };

  const stockStatus = getStockStatus(product.stock, product.minStockLevel);

  const increment = () => {
    if (qty >= product.stock) {
      toast.warning(`Maximum available stock reached: ${product.stock} units`);
      return;
    }
    setQty(prev => prev + 1);
  };

  const decrement = () => {
    if (qty <= 1) return;
    setQty(prev => prev - 1);
  };

  const totalPrice = product.price * qty;
  const isWalletSufficient = walletBalance >= totalPrice;

  const handleCommitAddToCart = () => {
    onAddToCart(product, qty);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Upper Navigation Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-6 rounded-3xl shadow-xl shadow-slate-100/40 border-none">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-slate-800 hover:text-blue-600 font-extrabold text-xs uppercase tracking-widest transition-colors cursor-pointer group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Marketplace
        </button>
        
        <div className="flex gap-2 items-center flex-wrap">
          <Badge className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase tracking-widest border border-slate-100 px-3 py-1.5 rounded-xl">
            MED-NODE: {product.id}
          </Badge>
          <Badge className="bg-blue-50 text-[#0052CC] font-black text-[9px] uppercase tracking-widest border border-blue-100 px-3 py-1.5 rounded-xl">
            {product.category}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Premium Interactive Display & Cart Operations */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Showcase Panel */}
          <Card className="rounded-[2.5rem] bg-white border-none shadow-xl shadow-slate-200/40 overflow-hidden relative">
            <div className={`aspect-[4/3] bg-gradient-to-b ${info.illustrationColor} flex flex-col items-center justify-center relative p-8`}>
              <div className="absolute top-6 left-6">
                {product.requiresPrescription ? (
                  <Badge className="bg-amber-100 border border-amber-200 text-amber-700 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> Clinical Prescr. Required
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                    OTC Available
                  </Badge>
                )}
              </div>

              {/* Central Vector Med Pack */}
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-125 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-32 h-32 rounded-[2.25rem] bg-white shadow-2xl flex items-center justify-center border border-slate-50 relative z-10 scale-100 group-hover:scale-105 transition-transform duration-500">
                  <Package className="w-16 h-16 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>

              <div className="absolute bottom-6 right-6">
                <span className="text-2xl font-black text-blue-600 font-mono">₦{product.price.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-400 block text-right uppercase tracking-wider">Per {product.baseUnit}</span>
              </div>
            </div>

            <CardContent className="p-8 space-y-6 border-t border-slate-100 bg-white">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tighter uppercase italic">{product.name}</h3>
                {product.genericName && (
                  <p className="text-xs font-semibold text-slate-400 italic mt-1 flex items-center gap-1">
                    <Activity size={12} className="text-slate-300" /> {product.genericName}
                  </p>
                )}
              </div>

              {/* Stock Bar & Technical Parameters */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Inventory Allocation</span>
                  <span className={stockStatus.textClass}>{stockStatus.label}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-50 border rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stockStatus.barColor} transition-all duration-1000`} 
                    style={{ width: `${stockStatus.percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                  <span>Current stock: {product.stock} {product.baseUnit}s</span>
                  <span>Min threshold: {product.minStockLevel || 10}</span>
                </div>
              </div>

              {/* Premium Integrations Expiry validation */}
              <div className={`p-4 border rounded-2xl flex items-center gap-3 ${expStatus.color}`}>
                <Calendar className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">Regulatory Compliance Exp</h4>
                  <p className="text-[10px] font-bold uppercase mt-0.5">{expStatus.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Core Cart Quantifier Controller */}
          <Card className="rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 text-white border-none p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">QUANTITY CONTROLLER</p>
                  <h4 className="text-sm font-black uppercase tracking-wider text-white mt-1">SELECT DOSAGE AMOUNT</h4>
                </div>
                <Badge className="bg-white/10 text-white font-mono font-bold border-none px-3 py-1 rounded-md">
                  {qty} Units Selected
                </Badge>
              </div>

              {/* Plus / Minus click action keys */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2">
                <button 
                  onClick={decrement}
                  disabled={qty <= 1}
                  className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={18} />
                </button>
                <span className="text-2xl font-mono font-extrabold tracking-tight text-white">{qty}</span>
                <button 
                  onClick={increment}
                  disabled={isOutOfStock}
                  className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Total estimation & digital pocket comparison statement */}
              <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">ESTIMATED EXPENDITURE</p>
                  <p className="text-2xl font-black tracking-tight text-blue-400 mt-1">₦{totalPrice.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">DIGITAL WALLET</p>
                  <p className={`text-xs font-bold mt-1 ${isWalletSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₦{walletBalance.toLocaleString()} ({isWalletSufficient ? 'Covered ✓' : 'Short Credits ⚡'})
                  </p>
                </div>
              </div>

              {!isWalletSufficient && (
                <div className="text-[10px] text-rose-300/90 font-bold uppercase tracking-wide bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl animate-pulse">
                  Alert: Transaction is larger than your Wallet. Clear existing orders or pre-fund under the Digital Wallet tab.
                </div>
              )}

              {/* Interactive add triggers */}
              <div className="space-y-3">
                <Button 
                  onClick={handleCommitAddToCart}
                  disabled={isOutOfStock}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} /> {isOutOfStock ? 'Product Out of Stock' : `Add ${qty} ${product.baseUnit}s to Cart`}
                </Button>

                {product.requiresPrescription && (
                  <Button
                    onClick={onNavigateToUpload}
                    variant="outline"
                    className="w-full h-12 border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-900 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
                  >
                    <FileText size={14} /> Upload Verified Prescr.
                  </Button>
                )}
              </div>

            </div>
          </Card>

          {/* Social Sharing Node */}
          <SocialShare 
            title={`Clinical Info: ${product.name}`} 
            text={`Check out details for ${product.name} (${product.genericName || 'Pharmaceutical'}). Stock status: ${product.stock} units available.`}
            variant="card"
          />

        </div>

        {/* Right Column: In-depth Clinical Reference & Educational Information */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Main clinical report sheet */}
          <Card className="rounded-[2.5rem] bg-white border-none shadow-xl shadow-slate-200/40 p-8 sm:p-10 space-y-8">
            
            <div className="border-b pb-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase italic">Clinical Monograph Summary</h4>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Certified pharmacopeia profile & laboratory guidelines</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] px-3 py-1 uppercase tracking-widest">
                VERIFIED MED
              </Badge>
            </div>

            {/* Scientific chemical formula section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Active Formulation Matrix</span>
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{info.activeIngredients}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Empirical Formula</span>
                <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">{info.formula}</span>
              </div>
            </div>

            {/* Description Card */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Info size={14} className="text-blue-500" /> Therapeutic Description
              </h5>
              <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed">
                {info.description}
              </p>
            </div>

            {/* Directions & Safe Administration */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" /> Direction & Dosage Protocols
              </h5>
              <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 text-slate-750 text-xs sm:text-sm leading-relaxed font-medium">
                {info.instructions}
              </div>
            </div>

            {/* Clinical Contraindications */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" /> Contraindications & Exclusions
              </h5>
              <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-100/60 text-slate-750 text-xs sm:text-sm leading-relaxed font-semibold italic">
                <span>Exclude administration in cases of: </span>
                <span className="text-amber-700">{info.contraindications}</span>
              </div>
            </div>

            {/* Physical Storage Integrity */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-purple-500" /> Packaging & Conversion Factor
              </h5>
              <div className="p-5 bg-purple-50/20 rounded-2xl border border-purple-100/40 text-slate-700 text-xs sm:text-sm leading-relaxed font-normal space-y-1">
                <p>• Conversion Factor: <span className="font-black text-purple-700">1 {product.baseUnit} pack = {product.conversionFactor || 10} single doses</span></p>
                <p>• Primary Packaging: Full protective tamper-evident clinical box container</p>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest pt-2">Barcode Reference: {product.barcode || 'N/A'}</p>
              </div>
            </div>

            {/* Clinical Warning Notice */}
            <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-200 shadow-sm space-y-3">
              <div className="flex gap-2.5 items-center">
                <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                <h5 className="text-xs sm:text-sm font-black uppercase text-rose-900 tracking-tight leading-none italic">Important Pharmacopical Caution</h5>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-750 leading-relaxed font-bold">
                {info.caution}
              </p>
              <p className="text-[10px] text-rose-500/80 leading-snug">
                Warning: If you display symptoms of rash, dyspnea, shock or hypersensitivity reaction, stop use immediately and call local healthcare networks. Keep all medications safely away from pediatric environments.
              </p>
            </div>

            {/* Storage Advice */}
            <div className="border-t pt-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold flex flex-col sm:flex-row justify-between gap-2">
              <span>Storage Node: {info.storage}</span>
              <span>Regulatory Standard: NAFDAC Synchronized</span>
            </div>

          </Card>

        </div>

      </div>

    </div>
  );
}
