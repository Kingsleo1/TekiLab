import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Link2,
  Copy,
  Check,
  Sparkles,
  Globe,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { Tenant } from '../../types/pharmacy';
import { apiService } from '../../services/api';
import {
  generateShortCompanySlug,
  sanitizeCompanySlug,
  formatCompanyFirstShortUrl,
  buildCompanyPortalUrl,
  buildUniversalCompanyUrl,
  compressLogoFileToDataUrl,
  applyDynamicFavicon,
  detectUrlCompanySlug,
  matchTenantBySlug,
  getProductionDeployedUrl,
  getProductionDeployedHost,
  setProductionDeployedUrl,
  isSandboxOrAiStudioHost
} from '../../lib/saas-pricing';

interface CompanyBrandingCardProps {
  tenant?: Tenant | null;
  selectedBranchId?: string;
  onTenantUpdated?: (updated: Tenant) => void;
  compact?: boolean;
}

export const CompanyBrandingCard: React.FC<CompanyBrandingCardProps> = ({
  tenant: tenantProp,
  selectedBranchId,
  onTenantUpdated
}) => {
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(tenantProp || null);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [shortSlug, setShortSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [deployedBaseUrl, setDeployedBaseUrl] = useState(getProductionDeployedUrl());
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempBaseUrl, setTempBaseUrl] = useState(getProductionDeployedUrl());
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedUniversal, setCopiedUniversal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadActiveTenant = async () => {
    try {
      const [tenantsList, pharmaciesList] = await Promise.all([
        apiService.tenants.list(),
        apiService.pharmacies.list()
      ]);
      setAllTenants(tenantsList);

      let resolved: Tenant | null = tenantProp || null;

      if (!resolved && selectedBranchId && selectedBranchId !== 'all') {
        const branch = pharmaciesList.find(b => b.id === selectedBranchId);
        if (branch?.tenantId || branch?.tenantSlug) {
          resolved =
            tenantsList.find(t => t.id === branch.tenantId) ||
            matchTenantBySlug(tenantsList, branch.tenantSlug) ||
            null;
        }
      }

      if (!resolved && typeof window !== 'undefined') {
        const urlSlug = detectUrlCompanySlug();
        if (urlSlug) {
          resolved = matchTenantBySlug(tenantsList, urlSlug) || null;
        }
      }

      if (!resolved) {
        const savedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('ph_current_user') : null;
        if (savedUserRaw) {
          try {
            const u = JSON.parse(savedUserRaw);
            if (u.tenantId || u.tenantSlug) {
              resolved =
                tenantsList.find(t => t.id === u.tenantId) ||
                matchTenantBySlug(tenantsList, u.tenantSlug) ||
                null;
            }
          } catch {}
        }
      }

      if (!resolved && tenantsList.length > 0) {
        resolved = tenantsList[0];
      }

      if (resolved) {
        setActiveTenant(resolved);
        setCompanyName(resolved.companyName);
        setShortSlug(resolved.slug);
        setCustomDomain(resolved.customDomain || '');
        setLogoDataUrl(resolved.logo || '/logo.png?v=4');
      }
    } catch (err) {
      console.error('Failed to load tenant branding:', err);
    }
  };

  useEffect(() => {
    if (tenantProp) {
      setActiveTenant(tenantProp);
      setCompanyName(tenantProp.companyName);
      setShortSlug(tenantProp.slug);
      setCustomDomain(tenantProp.customDomain || '');
      setLogoDataUrl(tenantProp.logo || '/logo.png?v=4');
    } else {
      loadActiveTenant();
    }
  }, [tenantProp, selectedBranchId]);

  useEffect(() => {
    const handleTenantSync = () => {
      if (!tenantProp) loadActiveTenant();
    };
    const handleUrlSync = () => {
      const live = getProductionDeployedUrl();
      setDeployedBaseUrl(live);
      setTempBaseUrl(live);
    };
    window.addEventListener('tenants_updated', handleTenantSync);
    window.addEventListener('teki_deployed_url_updated', handleUrlSync);
    return () => {
      window.removeEventListener('tenants_updated', handleTenantSync);
      window.removeEventListener('teki_deployed_url_updated', handleUrlSync);
    };
  }, [tenantProp, selectedBranchId]);

  const isCustomCompanyLogo =
    Boolean(logoDataUrl) &&
    !logoDataUrl.startsWith('/logo.png') &&
    !logoDataUrl.startsWith('/favicon.png') &&
    !logoDataUrl.startsWith('/favicon-1.png');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const compressedDataUrl = await compressLogoFileToDataUrl(file, 560, 240);
      setLogoDataUrl(compressedDataUrl);

      if (activeTenant) {
        const updated = await apiService.tenants.update(activeTenant.id, {
          logo: compressedDataUrl
        });
        if (updated) {
          setActiveTenant(updated);
          applyDynamicFavicon(compressedDataUrl);
          onTenantUpdated?.(updated);
          toast.success(`${updated.companyName} logo updated and applied as your URL favicon.`);
        }
      }
    } catch {
      toast.error('Could not process the uploaded logo image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyLogoUrl = async () => {
    const trimmed = logoUrlInput.trim();
    if (!trimmed) {
      toast.error('Please enter a valid image URL.');
      return;
    }
    setIsSaving(true);
    try {
      setLogoDataUrl(trimmed);
      if (activeTenant) {
        const updated = await apiService.tenants.update(activeTenant.id, {
          logo: trimmed
        });
        if (updated) {
          setActiveTenant(updated);
          applyDynamicFavicon(trimmed);
          onTenantUpdated?.(updated);
          setShowUrlInput(false);
          setLogoUrlInput('');
          toast.success('Company logo & URL favicon updated.');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLogo = async () => {
    if (!activeTenant) return;
    setIsSaving(true);
    try {
      const defaultLogo = '/logo.png';
      setLogoDataUrl(defaultLogo);
      const updated = await apiService.tenants.update(activeTenant.id, {
        logo: defaultLogo
      });
      if (updated) {
        setActiveTenant(updated);
        applyDynamicFavicon(null);
        onTenantUpdated?.(updated);
        toast.info('Reset company branding to default Teki Pharm logo.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateShortCompanyFirstUrl = async () => {
    if (!activeTenant) return;
    const generated = generateShortCompanySlug(companyName || activeTenant.companyName);
    setShortSlug(generated);
    setIsSaving(true);
    try {
      const updated = await apiService.tenants.update(activeTenant.id, {
        companyName: (companyName || activeTenant.companyName).trim(),
        slug: generated,
        logo: logoDataUrl || activeTenant.logo
      });
      if (updated) {
        setActiveTenant(updated);
        apiService.tenants.setActiveContext(updated.slug);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
          window.history.replaceState(null, '', `/${updated.slug}`);
        }
        applyDynamicFavicon(updated.logo);
        onTenantUpdated?.(updated);
        const directUrl = buildCompanyPortalUrl(updated.slug);
        navigator.clipboard?.writeText(directUrl).catch(() => {});
        toast.success(`Shortened URL saved & copied: ${directUrl}`);
      }
    } catch {
      toast.error('Failed to shorten and save company URL.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBrandingAndUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    const finalName = companyName.trim() || activeTenant.companyName;
    const finalSlug = sanitizeCompanySlug(shortSlug.trim() || generateShortCompanySlug(finalName));

    setIsSaving(true);
    try {
      const updated = await apiService.tenants.update(activeTenant.id, {
        companyName: finalName,
        slug: finalSlug,
        logo: logoDataUrl || activeTenant.logo,
        customDomain: customDomain.trim() || undefined
      });
      if (updated) {
        setActiveTenant(updated);
        setShortSlug(updated.slug);
        setCustomDomain(updated.customDomain || '');
        apiService.tenants.setActiveContext(updated.slug);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
          window.history.replaceState(null, '', `/${updated.slug}`);
        }
        applyDynamicFavicon(updated.logo);
        onTenantUpdated?.(updated);
        toast.success(`Saved branding and URL for ${updated.companyName}.`);
      }
    } catch {
      toast.error('Could not save company branding changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBaseUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = setProductionDeployedUrl(tempBaseUrl);
    setDeployedBaseUrl(clean);
    setIsEditingBaseUrl(false);
    toast.success(`Production Deployed URL set to: ${clean}`);
  };

  if (!activeTenant) return null;

  const deployedHost = getProductionDeployedHost();
  const isSandbox = isSandboxOrAiStudioHost();
  const effectiveSlug = generateShortCompanySlug(shortSlug || companyName || activeTenant.companyName);
  const fullPortalUrl = buildCompanyPortalUrl(effectiveSlug, customDomain);
  const universalPortalUrl = buildUniversalCompanyUrl(effectiveSlug, customDomain);

  const handleCopyShortUrl = () => {
    navigator.clipboard.writeText(fullPortalUrl);
    setCopiedShort(true);
    toast.success(`Copied company URL: ${fullPortalUrl}`);
    setTimeout(() => setCopiedShort(false), 2500);
  };

  const handleCopyUniversalUrl = () => {
    navigator.clipboard.writeText(universalPortalUrl);
    setCopiedUniversal(true);
    toast.success(`Copied universal link: ${universalPortalUrl}`);
    setTimeout(() => setCopiedUniversal(false), 2500);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-8">
      {/* Clean Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Company Branding & Portal URL
              </h2>
              {isCustomCompanyLogo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-3 h-3" /> Custom Brand Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload your pharmacy logo for your dashboard & browser tab favicon, and configure your shortened company-first URL.
            </p>
          </div>
        </div>

        {allTenants.length > 1 && !tenantProp && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Company:</label>
            <select
              value={activeTenant.id}
              onChange={e => {
                const chosen = allTenants.find(t => t.id === e.target.value);
                if (chosen) {
                  setActiveTenant(chosen);
                  setCompanyName(chosen.companyName);
                  setShortSlug(chosen.slug);
                  setLogoDataUrl(chosen.logo || '/logo.png?v=4');
                  apiService.tenants.setActiveContext(chosen.slug);
                  applyDynamicFavicon(chosen.logo);
                  onTenantUpdated?.(chosen);
                }
              }}
              className="h-10 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-semibold px-3 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {allTenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.companyName} (/{generateShortCompanySlug(t.slug)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SECTION 1: COMPANY LOGO & FAVICON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Company Logo & Browser Favicon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your uploaded logo is displayed across your pharmacy dashboard and automatically formatted as the browser tab favicon on your company URL.
          </p>
        </div>

        <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-zinc-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
          {/* Previews */}
          <div className="flex items-center gap-3">
            {/* Dashboard Logo Frame */}
            <div className="h-16 w-36 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2.5 flex items-center justify-center shrink-0 shadow-2xs">
              <img
                src={logoDataUrl || '/logo.png?v=4'}
                alt={companyName || activeTenant.companyName}
                className="max-h-full max-w-full object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/logo.png?v=4';
                }}
              />
            </div>

            {/* Compact Browser Tab Favicon Preview */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Browser Tab Preview
              </span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs max-w-[180px]">
                <img
                  src={logoDataUrl || '/favicon.png?v=4'}
                  alt="Favicon"
                  className="w-4 h-4 object-contain shrink-0 rounded-xs"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/favicon.png?v=4';
                  }}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {companyName || activeTenant.companyName}
                </span>
              </div>
            </div>
          </div>

          {/* Upload Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {showUrlInput ? 'Cancel' : 'Image URL'}
            </button>

            {isCustomCompanyLogo && (
              <button
                type="button"
                onClick={handleResetLogo}
                title="Reset to default logo"
                className="h-10 w-10 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 max-w-xl ml-auto">
          <input
            type="url"
            value={logoUrlInput}
            onChange={e => setLogoUrlInput(e.target.value)}
            placeholder="https://example.com/pharmacy-logo.png"
            className="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
          <button
            type="button"
            onClick={handleApplyLogoUrl}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Apply URL
          </button>
        </div>
      )}

      {/* SECTION 2: SHORTENED COMPANY-FIRST URL */}
      <form onSubmit={handleSaveBrandingAndUrl} className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
              Shortened Company-First URL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized links place your company name first and build from your original deployed domain (e.g., on Vercel or custom domain), not AI Studio temporary URLs.
            </p>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleGenerateShortCompanyFirstUrl}
            className="h-9 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Shorten from Name</span>
          </button>
        </div>

        {/* Deployed Website Base Domain Banner */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Primary Deployed Website URL:
                  </span>
                  <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-900 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    {deployedBaseUrl}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {isSandbox
                    ? 'Preview mode: URLs are resolved using your original deployed website (Vercel/Custom Domain), avoiding broken AI Studio sandbox links.'
                    : 'Active live deployment detected. Custom URLs automatically resolve from this deployment.'}
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
              {isEditingBaseUrl ? 'Close' : 'Change Deployed URL'}
            </button>
          </div>

          {isEditingBaseUrl && (
            <div className="pt-2 border-t border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={tempBaseUrl}
                onChange={e => setTempBaseUrl(e.target.value)}
                placeholder="https://your-pharmacy.vercel.app or https://healthhub.ng"
                className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleSaveBaseUrl}
                className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Save Deployed URL
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pharmacy / Company Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => {
                const val = e.target.value;
                setCompanyName(val);
                setShortSlug(generateShortCompanySlug(val));
              }}
              placeholder="e.g. MedPlus Care Pharmacy"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Shortened URL Slug (Company Name First)
            </label>
            <div className="flex items-center h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-3.5 focus-within:border-emerald-600 overflow-hidden">
              <span className="text-xs font-mono text-slate-400 shrink-0 select-none truncate max-w-[130px]">
                {deployedHost}/
              </span>
              <input
                type="text"
                required
                value={shortSlug}
                onChange={e => setShortSlug(generateShortCompanySlug(e.target.value))}
                placeholder="medplus"
                className="w-full bg-transparent text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none pl-0.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Dedicated Custom Domain (Optional)
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="e.g. portal.medplus.ng"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Clean Action & Link Bar */}
        <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Company Portal URL (Built from Deployment)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-all">
                {fullPortalUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCopyShortUrl}
              className="h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {copiedShort ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedShort ? 'Copied!' : 'Copy Short URL'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUniversalUrl}
              className="h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy universal query parameter link (?c=)"
            >
              {copiedUniversal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedUniversal ? 'Copied!' : 'Copy ?c= Link'}</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Branding'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
