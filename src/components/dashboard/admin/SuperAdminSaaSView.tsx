import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  Layers,
  Users,
  ShoppingBag,
  TrendingUp,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Search,
  Globe,
  Key,
  Lock,
  Unlock,
  Eye,
  Receipt,
  Store,
  Activity,
  DollarSign,
  Package,
  Layers3,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Upload,
  Download,
  LayoutGrid,
  List,
  Filter,
  Stethoscope,
  FlaskConical,
  FileSearch,
  Bed,
  CheckCheck,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { generateBrandedPDF } from '../../../lib/reporting-utils';
import {
  Tenant,
  SubscriptionPayment,
  SubscriptionPlanId,
  SubscriptionDurationMonths,
  Pharmacy,
  Order,
  Product,
  StaffMember
} from '../../../types/pharmacy';
import {
  TEKIMED_PLANS,
  TEKIMED_DURATIONS,
  calculateSubscriptionQuote,
  getSubscriptionDaysRemaining,
  getSubscriptionProgressPercent,
  buildCompanyPortalUrl,
  sanitizeCompanySlug,
  generateShortCompanySlug,
  formatCompanyFirstShortUrl,
  compressLogoFileToDataUrl,
  applyDynamicFavicon,
  getProductionDeployedUrl,
  getProductionDeployedHost,
  setProductionDeployedUrl,
  isSandboxOrAiStudioHost
} from '../../../lib/saas-pricing';
import { apiService } from '../../../services/api';
import { AstraDatabaseSetupModal } from './AstraDatabaseSetupModal';

interface SuperAdminSaaSViewProps {
  currentUser?: StaffMember | null;
  activeTenant?: Tenant | null;
  activeTenantSlug?: string | null;
  isSuperAdmin?: boolean;
  onSelectTenantWorkspace?: (tenant: Tenant | null) => void;
  onSwitchToCompanyPortal?: (slug: string | null) => void;
  pharmacies?: Pharmacy[];
  orders?: Order[];
  products?: Product[];
}

export const SuperAdminSaaSView: React.FC<SuperAdminSaaSViewProps> = ({
  currentUser,
  activeTenant,
  activeTenantSlug,
  isSuperAdmin: isSuperAdminProp,
  onSelectTenantWorkspace,
  onSwitchToCompanyPortal,
  pharmacies = [],
  orders = [],
  products = []
}) => {
  const isSuperAdmin =
    isSuperAdminProp !== undefined
      ? isSuperAdminProp
      : !currentUser ||
        currentUser.role === 'Kernel Admin' ||
        currentUser.level >= 5 ||
        currentUser.email?.toLowerCase().includes('tekimed') ||
        currentUser.email?.toLowerCase().includes('tekipharm') ||
        currentUser.email?.toLowerCase() === 'kingsleyagu92@gmail.com' ||
        currentUser.email?.toLowerCase() === 'admin@tekimed.com';

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [allPharmacies, setAllPharmacies] = useState<Pharmacy[]>(pharmacies);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [activeSubTab, setActiveSubTab] = useState<
    'businesses' | 'analytics' | 'tracker' | 'pricing' | 'payments' | 'astra_cql'
  >(isSuperAdmin ? 'businesses' : 'tracker');

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedTrackerTenantId, setSelectedTrackerTenantId] = useState<string>('');

  // Primary Production Deployed URL State
  const [deployedBaseUrl, setDeployedBaseUrl] = useState(getProductionDeployedUrl());
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempBaseUrl, setTempBaseUrl] = useState(getProductionDeployedUrl());

  // Ref for tab slider
  const tabSliderRef = useRef<HTMLDivElement>(null);

  // New Company Registration Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [onboardCustomDomain, setOnboardCustomDomain] = useState('');
  const [onboardLogo, setOnboardLogo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('Admin123!');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [stateName, setStateName] = useState('Lagos State');
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('hospital_ultimate');
  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDurationMonths>(12);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'bank_transfer' | 'card' | 'ussd'>('paystack');
  const [submittingOnboard, setSubmittingOnboard] = useState(false);

  // Edit / Modify Business Modal State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');
  const [editMaxBranches, setEditMaxBranches] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<'active' | 'trial' | 'expired'>('active');
  const [editEndDate, setEditEndDate] = useState<string>('');

  // Renew / Upgrade Modal State
  const [renewingTenant, setRenewingTenant] = useState<Tenant | null>(null);
  const [renewPlanId, setRenewPlanId] = useState<SubscriptionPlanId>('hospital_ultimate');
  const [renewDuration, setRenewDuration] = useState<SubscriptionDurationMonths>(12);
  const [submittingRenew, setSubmittingRenew] = useState(false);

  // Load SaaS Platform Data
  const loadSaaSData = async () => {
    setLoading(true);
    try {
      const [loadedTenants, loadedPayments, loadedPharmacies, loadedStaff] = await Promise.all([
        apiService.tenants.list(),
        apiService.subscriptions.listPayments(),
        apiService.pharmacies.list(),
        apiService.staff.list()
      ]);

      setTenants(loadedTenants);
      setPayments(loadedPayments);
      setAllPharmacies(loadedPharmacies);
      setAllStaff(loadedStaff);

      if (loadedTenants.length > 0 && !selectedTrackerTenantId) {
        setSelectedTrackerTenantId(loadedTenants[0].id);
      }
    } catch (err) {
      console.error('Error loading SaaS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaaSData();
    const handleUrlSync = () => {
      const live = getProductionDeployedUrl();
      setDeployedBaseUrl(live);
      setTempBaseUrl(live);
    };
    window.addEventListener('teki_deployed_url_updated', handleUrlSync);
    return () => window.removeEventListener('teki_deployed_url_updated', handleUrlSync);
  }, []);

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const daysLeft = getSubscriptionDaysRemaining(t.subscriptionEnd);
      const isExpired = daysLeft <= 0;
      const isTrial = t.planId.includes('trial') || t.subscriptionStatus === 'trial';

      if (activeFilter === 'active' && isExpired) return false;
      if (activeFilter === 'trial' && !isTrial) return false;
      if (activeFilter === 'expired' && !isExpired) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        t.companyName.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.planName.toLowerCase().includes(q)
      );
    });
  }, [tenants, searchQuery, activeFilter]);

  // Selected Tenant for Detailed Tracker Inspection
  const trackedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTrackerTenantId) || tenants[0] || null;
  }, [tenants, selectedTrackerTenantId]);

  // Consolidated Platform KPIs
  const totalSaaSRevenue = useMemo(
    () => payments.reduce((acc, p) => acc + (Number(p.amountPaidNaira) || 0), 0),
    [payments]
  );

  const activeTenantsCount = useMemo(
    () => tenants.filter(t => getSubscriptionDaysRemaining(t.subscriptionEnd) > 0 && t.subscriptionStatus !== 'expired').length,
    [tenants]
  );

  const totalBranchesCount = allPharmacies.length || tenants.length;
  const totalStaffCount = allStaff.length;

  const handleCopyPortalLink = (slug: string, customDomain?: string) => {
    const shortDomain = formatCompanyFirstShortUrl(slug, customDomain);
    const url = buildCompanyPortalUrl(slug, customDomain);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success(`Copied access link: ${shortDomain}`);
    setTimeout(() => setCopiedSlug(null), 3000);
  };

  const handleSaveDeployedBaseUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = setProductionDeployedUrl(tempBaseUrl);
    setDeployedBaseUrl(clean);
    setIsEditingBaseUrl(false);
    toast.success(`Production Deployed URL set to: ${clean}`);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      toast.error('Please fill in Organization Name, Admin Name, and Admin Email.');
      return;
    }
    setSubmittingOnboard(true);
    try {
      const result = await apiService.tenants.register({
        companyName,
        slug: customSlug || generateShortCompanySlug(companyName),
        customDomain: onboardCustomDomain.trim() || undefined,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || '+234 800 000 0000',
        ownerPassword: ownerPassword || 'Admin123!',
        address: address || 'Healthcare Complex, Nigeria',
        city,
        state: stateName,
        planId: selectedPlanId,
        durationMonths: selectedDuration,
        paymentMethod,
        logo: onboardLogo || '/logo.png?v=4'
      });

      toast.success(`${result.tenant.companyName} provisioned successfully!`);
      setShowOnboardModal(false);
      setCompanyName('');
      setCustomSlug('');
      setOnboardCustomDomain('');
      setOnboardLogo('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPhone('');
      setAddress('');
      await loadSaaSData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to onboard organization');
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditCompanyName(tenant.companyName);
    setEditSlug(tenant.slug);
    setEditCustomDomain(tenant.customDomain || '');
    setEditLogo(tenant.logo || '/logo.png?v=4');
    setEditOwnerName(tenant.ownerName);
    setEditOwnerEmail(tenant.ownerEmail);
    setEditOwnerPhone(tenant.ownerPhone);
    setEditMaxBranches(tenant.maxBranches);
    setEditStatus(tenant.subscriptionStatus);
    setEditEndDate(tenant.subscriptionEnd ? tenant.subscriptionEnd.split('T')[0] : '');
  };

  const handleSaveTenantModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const updated = await apiService.tenants.update(editingTenant.id, {
      companyName: editCompanyName.trim(),
      slug: sanitizeCompanySlug(editSlug || generateShortCompanySlug(editCompanyName)),
      customDomain: editCustomDomain.trim() || undefined,
      logo: editLogo || editingTenant.logo,
      ownerName: editOwnerName.trim(),
      ownerEmail: editOwnerEmail.trim().toLowerCase(),
      ownerPhone: editOwnerPhone.trim(),
      maxBranches: Number(editMaxBranches) || 1,
      subscriptionStatus: editStatus,
      subscriptionEnd: editEndDate ? new Date(editEndDate).toISOString() : editingTenant.subscriptionEnd
    });

    if (updated) {
      toast.success(`Updated settings for ${updated.companyName}`);
      setEditingTenant(null);
      await loadSaaSData();
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingTenant) return;
    setSubmittingRenew(true);
    try {
      const res = await apiService.tenants.renewOrUpgrade({
        tenantId: renewingTenant.id,
        planId: renewPlanId,
        durationMonths: renewDuration,
        paymentMethod: 'paystack'
      });
      if (res) {
        toast.success(`Successfully updated subscription for ${res.tenant.companyName}!`);
        setRenewingTenant(null);
        await loadSaaSData();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to renew subscription');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (confirm(`Remove ${tenant.companyName}?`)) {
      await apiService.tenants.delete(tenant.id);
      toast.success(`Removed ${tenant.companyName}.`);
      await loadSaaSData();
    }
  };

  const handleExportSaaSSummaryPDF = async () => {
    try {
      const columns = ['Organization', 'Slug', 'Plan', 'Terminals', 'Owner Contact', 'Status', 'Days Left'];
      const rows = tenants.map(t => {
        const days = getSubscriptionDaysRemaining(t.subscriptionEnd);
        return [
          t.companyName,
          `/${t.slug}`,
          t.planName,
          `${allPharmacies.filter(b => b.tenantId === t.id).length || 1} Nodes`,
          `${t.ownerName} (${t.ownerEmail})`,
          days > 0 ? 'Active' : 'Expired',
          `${days} Days`
        ];
      });

      const stats = [
        { label: 'Total Organizations', value: tenants.length.toString() },
        { label: 'Active Facilities', value: activeTenantsCount.toString() },
        { label: 'Total Revenue', value: `₦${totalSaaSRevenue.toLocaleString()}` }
      ];

      await generateBrandedPDF(
        'SAAS BUSINESS & BILLING AUDIT',
        `Consolidated Multi-Tenant Audit · Generated: ${new Date().toLocaleString()}`,
        stats,
        columns,
        rows,
        `SaaS_Audit_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('Downloaded SaaS business PDF report.');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16 w-full max-w-full overflow-x-hidden px-2 sm:px-4">
      {/* 1. Simple Hero Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 text-white p-4 sm:p-5 shadow-sm border border-slate-800 w-full">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* Healthcare Image Thumbnail */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shrink-0 border-2 border-white/10 shadow-md bg-slate-800">
              <img 
                src="/stethoscope_bg.jpg" 
                alt="Healthcare" 
                className="w-full h-full object-cover" 
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-white truncate">
                SaaS Businesses
              </h1>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                Organizations · Subscriptions · Pricing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportSaaSSummaryPDF}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Export PDF</span>
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setShowOnboardModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Business</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Simplified Sub-Tab Navigation Strip */}
        <div className="relative mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 w-full">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setActiveSubTab('businesses')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'businesses'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Organizations</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20">
                    {tenants.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('analytics')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'analytics'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytics</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveSubTab('tracker')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'tracker'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Subscriptions</span>
            </button>

            <button
              onClick={() => setActiveSubTab('pricing')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'pricing'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Plans & Pricing</span>
            </button>

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setActiveSubTab('payments')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'payments'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Billing</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20">
                    {payments.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('astra_cql')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'astra_cql'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Database</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Dynamic Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading Organizations...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ORGANIZATIONS */}
          {activeSubTab === 'businesses' && isSuperAdmin && (
            <div className="space-y-6 w-full">
              {/* Simple Single-Word Key KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Organizations</span>
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {tenants.length}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Branches</span>
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {totalBranchesCount}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Revenue</span>
                    <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono truncate block">
                      ₦{totalSaaSRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Staff</span>
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {totalStaffCount || 12}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Deployed Website & Portal Domain Bar */}
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 sm:p-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Primary Deployed URL:
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-900 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 break-all">
                          {deployedBaseUrl}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        All organization custom links ({getProductionDeployedHost()}/[org]) are built from this deployed URL, not temporary sandbox URLs.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTempBaseUrl(deployedBaseUrl);
                      setIsEditingBaseUrl(!isEditingBaseUrl);
                    }}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 underline cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    {isEditingBaseUrl ? 'Close' : 'Configure Deployed URL'}
                  </button>
                </div>

                {isEditingBaseUrl && (
                  <form onSubmit={handleSaveDeployedBaseUrl} className="pt-3 mt-2.5 border-t border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={tempBaseUrl}
                      onChange={e => setTempBaseUrl(e.target.value)}
                      placeholder="https://your-pharmacy.vercel.app or https://healthhub.ng"
                      className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Save Deployed URL
                    </button>
                  </form>
                )}
              </div>

              {/* Mobile-Friendly Search & Status Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs w-full">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search organization or slug..."
                    className="w-full pl-10 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All ({tenants.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Active ({activeTenantsCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('trial')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === 'trial'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Trial
                  </button>
                  <button
                    onClick={() => setActiveFilter('expired')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === 'expired'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Expired
                  </button>
                </div>
              </div>

              {/* Empty state */}
              {filteredTenants.length === 0 && (
                <div className="p-8 sm:p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 space-y-3 w-full">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No organizations found</h3>
                  <button
                    onClick={() => setShowOnboardModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Organization
                  </button>
                </div>
              )}

              {/* GRID VIEW OF ORGANIZATIONS */}
              {filteredTenants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
                  {filteredTenants.map(tenant => {
                    const daysRemaining = getSubscriptionDaysRemaining(tenant.subscriptionEnd);
                    const isExpired = daysRemaining <= 0;

                    return (
                      <div
                        key={tenant.id}
                        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4 w-full"
                      >
                        <div className="space-y-3">
                          {/* Card Top Row: Logo & Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                                <img
                                  src={tenant.logo || '/logo.png?v=4'}
                                  alt={tenant.companyName}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logo.png?v=4';
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight truncate">
                                  {tenant.companyName}
                                </h3>
                                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 block truncate" title={formatCompanyFirstShortUrl(tenant.slug, tenant.customDomain)}>
                                  {formatCompanyFirstShortUrl(tenant.slug, tenant.customDomain)}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full shrink-0 ${
                                isExpired
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {isExpired ? 'Expired' : 'Active'}
                            </span>
                          </div>

                          {/* Quick Specs */}
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Package</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                {tenant.planName}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Days Left</span>
                              <span className={`font-bold font-mono ${daysRemaining > 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {daysRemaining > 0 ? `${daysRemaining} Days` : '0 Days'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                          <button
                            onClick={() => {
                              if (onSwitchToCompanyPortal) {
                                onSwitchToCompanyPortal(tenant.slug);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <span>Enter Portal</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCopyPortalLink(tenant.slug, tenant.customDomain)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                            title="Copy Deployed Portal Link"
                          >
                            {copiedSlug === tenant.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => openEditModal(tenant)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                            title="Edit Settings"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteTenant(tenant)}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer shrink-0"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICS */}
          {activeSubTab === 'analytics' && isSuperAdmin && (
            <div className="space-y-6 w-full">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Analytics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Total Subscribed Facilities</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{tenants.length}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Active Subscriptions</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeTenantsCount}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Total Revenue</span>
                    <span className="text-2xl font-black font-mono text-purple-600 mt-1 block">₦{totalSaaSRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTIONS TRACKER */}
          {activeSubTab === 'tracker' && trackedTenant && (
            <div className="space-y-6 w-full">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-5 sm:p-8 space-y-6 w-full">
                {/* Selector */}
                {tenants.length > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Select Organization:
                    </span>
                    <select
                      value={trackedTenant.id}
                      onChange={e => setSelectedTrackerTenantId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-900 dark:text-white max-w-full"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.companyName} (/{t.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 p-1.5 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                      <img
                        src={trackedTenant.logo || '/logo.png?v=4'}
                        alt={trackedTenant.companyName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.png?v=4';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                        {trackedTenant.companyName}
                      </h2>
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 block truncate">
                        Portal Link: {formatCompanyFirstShortUrl(trackedTenant.slug, trackedTenant.customDomain)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyPortalLink(trackedTenant.slug, trackedTenant.customDomain)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSlug === trackedTenant.slug ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => setRenewingTenant(trackedTenant)}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Renew</span>
                    </button>
                  </div>
                </div>

                {/* Subscription Progress */}
                {(() => {
                  const daysLeft = getSubscriptionDaysRemaining(trackedTenant.subscriptionEnd);
                  const progressPct = getSubscriptionProgressPercent(
                    trackedTenant.subscriptionStart,
                    trackedTenant.subscriptionEnd
                  );

                  return (
                    <div className="space-y-4 bg-slate-50 dark:bg-zinc-950 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Package</span>
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{trackedTenant.planName}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Status</span>
                          <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {trackedTenant.subscriptionStatus}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Subscription Timeline</span>
                          <span className="text-slate-900 dark:text-white font-mono">
                            {daysLeft > 0 ? `${daysLeft} Days Left` : 'Expired'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Start Date</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(trackedTenant.subscriptionStart).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Expiration Date</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(trackedTenant.subscriptionEnd).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Max Branches</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {trackedTenant.maxBranches} Nodes
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 4: PLANS & PRICING */}
          {activeSubTab === 'pricing' && (
            <div className="space-y-6 w-full">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  Plans & Pricing
                </h2>
                <p className="text-xs text-slate-500">
                  Select a subscription package or trial for your healthcare organization.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 w-full">
                {TEKIMED_PLANS.map(plan => {
                  const sampleQuote = calculateSubscriptionQuote(plan.id, 12);
                  const isBuyToOwn = plan.id === 'buy_to_own';
                  const isEnterprise = plan.id === 'enterprise';

                  return (
                    <div
                      key={plan.id}
                      className={`bg-white dark:bg-zinc-900 rounded-3xl border p-6 flex flex-col justify-between hover:shadow-lg transition-all space-y-5 w-full ${
                        plan.popular
                          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                          : 'border-slate-200 dark:border-zinc-800 shadow-xs'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{plan.tagline}</p>
                          </div>
                          {plan.popular && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0">
                              Popular
                            </span>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {isBuyToOwn ? 'Perpetual License' : isEnterprise ? 'Enterprise Quote' : 'Monthly Rate'}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {isBuyToOwn
                                ? 'One-Time Buy'
                                : isEnterprise
                                ? 'Custom Quote'
                                : `₦${plan.monthlyRateNaira.toLocaleString()}`}
                            </span>
                            {!isBuyToOwn && !isEnterprise && (
                              <span className="text-xs text-slate-400 font-semibold">/ month</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Features:</span>
                          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                            {plan.features.slice(0, 5).map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setShowOnboardModal(true);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          plan.popular
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-slate-900 hover:bg-black text-white dark:bg-zinc-800'
                        }`}
                      >
                        Select Plan
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeSubTab === 'payments' && isSuperAdmin && (
            <div className="space-y-6 w-full">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden w-full">
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Billing Ledger</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Transaction receipts across all subscription plans.</p>
                  </div>
                  <button
                    onClick={handleExportSaaSSummaryPDF}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>

                <div className="overflow-x-auto w-full max-w-full custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                        <th className="p-3.5 whitespace-nowrap">Ref</th>
                        <th className="p-3.5 whitespace-nowrap">Organization</th>
                        <th className="p-3.5 whitespace-nowrap">Package</th>
                        <th className="p-3.5 whitespace-nowrap">Term</th>
                        <th className="p-3.5 whitespace-nowrap">Amount</th>
                        <th className="p-3.5 whitespace-nowrap">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/50">
                          <td className="p-3.5 font-mono font-bold text-blue-600 whitespace-nowrap">{pay.paymentReference}</td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{pay.companyName}</td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{pay.planName}</td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{pay.durationMonths} M</td>
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            ₦{(pay.amountPaidNaira || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-slate-400 whitespace-nowrap">{new Date(pay.paidAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DATABASE */}
          {activeSubTab === 'astra_cql' && isSuperAdmin && (
            <div className="w-full overflow-x-auto">
              <AstraDatabaseSetupModal embedded={true} />
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ONBOARD NEW ORGANIZATION */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-[95vw] sm:w-full max-w-xl overflow-hidden my-6">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Onboard New Organization</h2>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => {
                      setCompanyName(e.target.value);
                      setCustomSlug(generateShortCompanySlug(e.target.value));
                    }}
                    placeholder="e.g. Apex Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Identifier (/slug) *
                  </label>
                  <div className="flex items-center px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 font-mono text-xs text-blue-600 overflow-hidden">
                    <span className="text-slate-400 shrink-0 text-xs mr-1">{getProductionDeployedHost()}/</span>
                    <input
                      type="text"
                      required
                      value={customSlug}
                      onChange={e => setCustomSlug(sanitizeCompanySlug(e.target.value))}
                      placeholder="apex"
                      className="bg-transparent w-full focus:outline-none text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dedicated Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  value={onboardCustomDomain}
                  onChange={e => setOnboardCustomDomain(e.target.value)}
                  placeholder="e.g. portal.apexclinic.ng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-mono"
                />
              </div>

              {/* Logo Upload */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {onboardLogo ? (
                      <img src={onboardLogo} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo</span>
                  </div>
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer shrink-0">
                  <span>{onboardLogo ? 'Change' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const dataUrl = await compressLogoFileToDataUrl(f, 560, 240);
                        setOnboardLogo(dataUrl);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="Dr. Evelyn Vance"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="admin@apexhospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingOnboard}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {submittingOnboard ? 'Onboarding...' : 'Onboard Organization'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ORGANIZATION SETTINGS */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-[95vw] sm:w-full max-w-xl overflow-hidden my-6">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Edit Organization Settings</h2>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTenantModification} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={editCompanyName}
                    onChange={e => setEditCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">URL Identifier (/slug)</label>
                  <div className="flex items-center px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 font-mono text-xs text-blue-600 overflow-hidden">
                    <span className="text-slate-400 shrink-0 text-xs mr-1">{getProductionDeployedHost()}/</span>
                    <input
                      type="text"
                      required
                      value={editSlug}
                      onChange={e => setEditSlug(sanitizeCompanySlug(e.target.value))}
                      className="w-full bg-transparent focus:outline-none text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dedicated Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={editCustomDomain}
                  onChange={e => setEditCustomDomain(e.target.value)}
                  placeholder="e.g. portal.apexclinic.ng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Save Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RENEW / UPGRADE SUBSCRIPTION */}
      {renewingTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-[95vw] sm:w-full max-w-lg overflow-hidden my-6">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">Renew Subscription — {renewingTenant.companyName}</h2>
              </div>
              <button
                onClick={() => setRenewingTenant(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenewSubscription} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Package</label>
                <select
                  value={renewPlanId}
                  onChange={e => setRenewPlanId(e.target.value as SubscriptionPlanId)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-bold"
                >
                  <option value="single_branch">Pharmacy POS — ₦10,000/mo</option>
                  <option value="multi_branch">Multi-Branch Network — ₦20,000/mo</option>
                  <option value="hospital_ultimate">Hospital OS — ₦35,000/mo</option>
                  <option value="enterprise">Enterprise Chain — ₦50,000/mo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                <select
                  value={renewDuration}
                  onChange={e => setRenewDuration(Number(e.target.value) as SubscriptionDurationMonths)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-xs font-bold"
                >
                  <option value={6}>6 Months</option>
                  <option value={12}>1 Year (12 Months)</option>
                  <option value={24}>2 Years</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingRenew}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                {submittingRenew ? 'Renewing...' : 'Confirm Renewal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
