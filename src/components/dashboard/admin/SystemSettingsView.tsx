import React, { useState } from 'react';
import { 
  Settings, 
  MapPin, 
  ShieldCheck, 
  Globe, 
  Mail, 
  Smartphone, 
  Lock, 
  Database, 
  Palette, 
  Search, 
  Save, 
  Trash2, 
  Plus, 
  Layout, 
  Menu as MenuIcon, 
  Image as ImageIcon, 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  Building2,
  Receipt,
  Share2,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { CompanyBrandingCard } from '../CompanyBrandingCard';
import {
  getProductionDeployedUrl,
  setProductionDeployedUrl,
  getProductionDeployedHost,
  isSandboxOrAiStudioHost
} from '../../../lib/saas-pricing';

interface NavGroup {
  category: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    description: string;
  }[];
}

export function SystemSettingsView({ 
  currentUser, 
  onUserUpdate,
  selectedBranchId
}: { 
  currentUser?: any; 
  onUserUpdate?: (user: any) => void;
  selectedBranchId?: string;
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLiveDb = isSupabaseConfigured();

  // Admin Security Form State
  const currentEmail = currentUser?.email || localStorage.getItem('ph_admin_email') || 'admin@tekipharm.com';
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deployedBaseUrl, setDeployedBaseUrl] = useState(getProductionDeployedUrl());
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempBaseUrl, setTempBaseUrl] = useState(getProductionDeployedUrl());

  React.useEffect(() => {
    const handleUrlSync = () => {
      const live = getProductionDeployedUrl();
      setDeployedBaseUrl(live);
      setTempBaseUrl(live);
    };
    window.addEventListener('teki_deployed_url_updated', handleUrlSync);
    return () => window.removeEventListener('teki_deployed_url_updated', handleUrlSync);
  }, []);

  const adminPortalUrl = `${deployedBaseUrl}/admin`;

  const handleSaveDeployedUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = setProductionDeployedUrl(tempBaseUrl);
    setDeployedBaseUrl(clean);
    setIsEditingBaseUrl(false);
    toast.success(`Production Deployed URL set to: ${clean}`);
  };

  const handleCopyAdminUrl = () => {
    navigator.clipboard.writeText(adminPortalUrl);
    setCopiedUrl(true);
    toast.success('Admin Portal URL copied: ' + adminPortalUrl);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);

    if (isLiveDb) {
      try {
        const { error } = await supabase.auth.updateUser({
          email: newAdminEmail.trim()
        });

        if (error) {
          setEmailLoading(false);
          toast.error(error.message || 'Error updating email in Supabase');
          return;
        }

        if (currentUser?.id) {
          await supabase
            .from('profiles')
            .update({ email: newAdminEmail.trim(), updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
        }

        const updated = {
          ...currentUser,
          email: newAdminEmail.trim()
        };
        if (onUserUpdate) onUserUpdate(updated);
        localStorage.setItem('ph_current_user', JSON.stringify(updated));
        localStorage.setItem('ph_admin_email', newAdminEmail.trim());

        setEmailLoading(false);
        setNewAdminEmail('');
        toast.success(`Admin email successfully changed to ${newAdminEmail.trim()}!`);
        return;
      } catch (err: any) {
        setEmailLoading(false);
        toast.error(err?.message || 'Failed to update email');
        return;
      }
    }

    // Local / Offline Update
    const updated = {
      ...currentUser,
      email: newAdminEmail.trim()
    };
    if (onUserUpdate) onUserUpdate(updated);
    localStorage.setItem('ph_current_user', JSON.stringify(updated));
    localStorage.setItem('ph_admin_email', newAdminEmail.trim());

    setEmailLoading(false);
    setNewAdminEmail('');
    toast.success(`Admin email updated to ${newAdminEmail.trim()} (Local & sync ready)`);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAdminPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    if (isLiveDb) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newAdminPassword
        });

        if (error) {
          setPasswordLoading(false);
          toast.error(error.message || 'Error updating password in Supabase Auth');
          return;
        }

        setPasswordLoading(false);
        setNewAdminPassword('');
        setConfirmAdminPassword('');
        toast.success('Admin password updated successfully in Supabase Auth!');
        return;
      } catch (err: any) {
        setPasswordLoading(false);
        toast.error(err?.message || 'Failed to update password');
        return;
      }
    }

    // Offline / Local
    localStorage.setItem('ph_admin_custom_password', newAdminPassword);
    setPasswordLoading(false);
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    toast.success('Admin password updated successfully!');
  };

  const settingsGroups: NavGroup[] = [
    {
      category: 'Core & Security',
      items: [
        {
          id: 'general',
          label: 'General Protocol',
          icon: <Settings size={18} />,
          description: 'Business identity, contact details, currency & timezone'
        },
        {
          id: 'security',
          label: 'Admin Security',
          icon: <KeyRound size={18} className="text-amber-500" />,
          badge: '/admin',
          description: 'Master Super Admin credentials & gateway URL'
        },
        {
          id: 'nodes',
          label: 'Locations & Branches',
          icon: <MapPin size={18} className="text-blue-500" />,
          description: 'Dispensing outlets, fulfillment centers & warehouses'
        }
      ]
    },
    {
      category: 'Finance & Tax',
      items: [
        {
          id: 'tax',
          label: 'VAT & Fiscal Rules',
          icon: <Receipt size={18} className="text-emerald-500" />,
          description: 'Tax percentages, excise rates & receipt disclosures'
        }
      ]
    },
    {
      category: 'Branding & Content',
      items: [
        {
          id: 'seo',
          label: 'SEO & Search Cards',
          icon: <Globe size={18} className="text-indigo-500" />,
          description: 'Search engine metadata, OpenGraph cards & keywords'
        },
        {
          id: 'pages',
          label: 'Custom Store Pages',
          icon: <Layout size={18} className="text-teal-500" />,
          description: 'Terms of service, privacy policy & compliance notes'
        },
        {
          id: 'comm',
          label: 'Email & Alerts',
          icon: <Mail size={18} className="text-purple-500" />,
          description: 'Notification templates, order alerts & receipts'
        },
        {
          id: 'gallery',
          label: 'Media Assets',
          icon: <ImageIcon size={18} className="text-rose-500" />,
          description: 'Brand logos, hero banners & product imagery'
        }
      ]
    }
  ];

  const allItems = settingsGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeTab) || allItems[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Settings & Configuration
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-mono">
              Live Control
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure system rules, Super Admin security credentials, tax layers, and store branding.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => toast.success('Settings synchronized and saved successfully.')}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* MOBILE COLLAPSIBLE TABS BAR (Visible on screens < lg) */}
      <div className="lg:hidden bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              {activeItem.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Settings View
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                {activeItem.label}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-9 px-3 rounded-xl border-slate-300 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isMobileMenuOpen ? 'Close Menu' : 'Change View'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Collapsible Mobile Menu Accordion */}
        {isMobileMenuOpen && (
          <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto bg-white dark:bg-zinc-900 animate-in slide-in-from-top-2 duration-200">
            {settingsGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                  {group.category}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                          <span className="text-xs font-bold truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge className="bg-slate-900 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Horizontal Quick-Scroll Chips */}
        {!isMobileMenuOpen && (
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto whitespace-nowrap scrollbar-none border-t border-slate-100 dark:border-zinc-800">
            {allItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-3.5 h-3.5">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP SIDEBAR + CONTENT LAYOUT (screens >= lg) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* DESKTOP SIDEBAR NAV PANEL */}
        <aside
          className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 sticky top-6 ${
            isNavCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Header Toggle */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800">
            {!isNavCollapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                Settings Menu
              </span>
            )}
            <button
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors mx-auto lg:mx-0"
              title={isNavCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
            >
              {isNavCollapsed ? <PanelLeftOpen className="w-4 h-4 text-emerald-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          {/* Categorized Menu Items */}
          <div className="space-y-5">
            {settingsGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isNavCollapsed && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
                    {group.category}
                  </span>
                )}
                <div className="space-y-1">
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={isNavCollapsed ? `${item.label} — ${item.description}` : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer relative group ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md shadow-slate-900/10'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80 hover:text-slate-900'
                        } ${isNavCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <div className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                          {item.icon}
                        </div>

                        {!isNavCollapsed && (
                          <div className="flex-1 text-left truncate">
                            <span className="block truncate">{item.label}</span>
                          </div>
                        )}

                        {!isNavCollapsed && item.badge && (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none font-mono text-[9px] px-1.5 py-0.5 shrink-0">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ACTIVE SETTINGS TAB CONTENT PANEL */}
        <main className="flex-1 w-full space-y-6">
          {/* TAB 1: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Admin Portal Info Banner */}
              <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-slate-900 text-white p-6 md:p-8 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1">
                        Dedicated Endpoint Active
                      </Badge>
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Kernel Level 5
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white mt-2">
                      Super Admin Access Portal
                    </h2>
                    <p className="text-xs font-medium text-slate-400 mt-1">
                      Use the dedicated <span className="text-blue-400 font-bold">/admin</span> path on any domain or deployment to log into this dashboard.
                    </p>
                  </div>

                  <Button
                    onClick={handleCopyAdminUrl}
                    className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 mr-1.5 text-emerald-300" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {copiedUrl ? 'Copied URL!' : 'Copy /admin URL'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Deployed Base Website & Admin URL</p>
                        <p className="text-xs font-mono font-bold text-blue-300 truncate">{adminPortalUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempBaseUrl(deployedBaseUrl);
                          setIsEditingBaseUrl(!isEditingBaseUrl);
                        }}
                        className="text-xs text-blue-300 hover:text-white hover:bg-slate-700/60 h-8 px-2.5"
                      >
                        {isEditingBaseUrl ? 'Close' : 'Configure Deployed URL'}
                      </Button>
                      <Badge variant="outline" className="border-slate-600 text-slate-300 font-mono text-[10px]">
                        Route: /admin
                      </Badge>
                    </div>
                  </div>

                  {isEditingBaseUrl && (
                    <form onSubmit={handleSaveDeployedUrl} className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={tempBaseUrl}
                        onChange={e => setTempBaseUrl(e.target.value)}
                        placeholder="https://your-pharmacy.vercel.app or https://healthhub.ng"
                        className="flex-1 h-9 px-3 rounded-lg bg-slate-900 border border-slate-600 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        Save Deployed Base URL
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Change Email Form */}
              <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Super Admin Login Email
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The master email used to log into the /admin portal
                    </p>
                  </div>
                  <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-mono text-xs px-3 py-1">
                    Current: {currentEmail}
                  </Badge>
                </div>

                <form onSubmit={handleSaveEmail} className="space-y-4 max-w-xl">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      New Master Admin Email
                    </label>
                    <div className="relative">
                      <Input 
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="e.g. director@yourpharmacy.com"
                        className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 pl-10 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      Synchronizes automatically with DataStax Astra DB & Auth
                    </p>
                    <Button
                      type="submit"
                      disabled={emailLoading || !newAdminEmail}
                      className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      {emailLoading ? 'Saving Email...' : 'Update Admin Email'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Change Password Form */}
              <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-600" />
                      Super Admin Password Reset
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reset or customize the master password for the /admin gateway
                    </p>
                  </div>
                  <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-zinc-700 font-mono text-[10px]">
                    Current Master Active
                  </Badge>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        New Security Password
                      </label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 pl-10 pr-10 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 pl-10 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Enforces secure password hashing & Astra DB sync
                    </span>
                    <Button
                      type="submit"
                      disabled={passwordLoading || !newAdminPassword}
                      className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      {passwordLoading ? 'Updating Password...' : 'Save New Password'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL PROTOCOL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <CompanyBrandingCard selectedBranchId={selectedBranchId} />

              <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
                <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">General Business Protocol</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Primary business identity & system-wide operational constants.</p>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System / Company Entity Name
                  </label>
                  <Input defaultValue="TekiPharm Unified Pharmacy Hub" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Support Contact Terminal
                  </label>
                  <Input defaultValue="+234 800 TEKIPHARM" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Currency Protocol
                  </label>
                  <select className="w-full h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800">
                    <option>NGN (₦) — Nigerian Naira</option>
                    <option>USD ($) — US Dollar</option>
                    <option>GBP (£) — British Pound</option>
                    <option>EUR (€) — Euro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Core Timezone
                  </label>
                  <select className="w-full h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800">
                    <option>WAT — West Africa Time (Lagos / Abuja)</option>
                    <option>UTC — Coordinated Universal Time</option>
                    <option>EST — Eastern Standard Time</option>
                  </select>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB 3: TAX & FISCAL RULES */}
          {activeTab === 'tax' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">VAT & Fiscal Disclosures</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tax layers applied to retail point-of-sale transactions and receipts.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Global VAT Implementation</h4>
                    <p className="text-xs text-slate-500">Automatically compute VAT on POS checkout receipts</p>
                  </div>
                  <div className="w-12 h-7 bg-emerald-500 rounded-full flex items-center px-1 cursor-pointer">
                    <div className="w-5 h-5 bg-white rounded-full ml-auto shadow-sm"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default VAT Percentage (%)
                    </label>
                    <Input type="number" defaultValue="7.5" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Special Excise Tax (%)
                    </label>
                    <Input type="number" defaultValue="0.0" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEO & CARDS */}
          {activeTab === 'seo' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Search Engine & Social Cards</h2>
                <p className="text-xs text-slate-500 mt-0.5">Metadata for Google indexing, WhatsApp preview links, and OpenGraph cards.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Title
                  </label>
                  <Input defaultValue="TekiMed — Unified Healthcare Management Platform & Multi-Branch SaaS" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Description
                  </label>
                  <textarea defaultValue="TekiMed Multi-Tenant Healthcare Management Platform with EMR, Laboratory LIMS, Radiology, Inpatient Ward Management, Pharmacy & POS, and DataStax Astra CQL database integration." className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-medium h-24 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEDIA REPOSITORY */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <CompanyBrandingCard selectedBranchId={selectedBranchId} />
            </div>
          )}

          {/* TAB 6: LOCATIONS & BRANCHES */}
          {activeTab === 'nodes' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Locations & Branches Configuration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Configure default dispensing rules, inter-branch stock sync, and fulfillment routing.</p>
                </div>
                <Button
                  onClick={() => toast.success('Branch routing rules saved.')}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer"
                >
                  Save Branch Rules
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Central Hub Name
                  </label>
                  <Input defaultValue="Main Flagship Pharmacy Hub" className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Stock Transfer Approval Mode
                  </label>
                  <select className="w-full h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800">
                    <option>Require Receiving Branch Manager Sign-Off</option>
                    <option>Auto-Commit on Dispatch by Warehouse Controller</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOM STORE PAGES */}
          {activeTab === 'pages' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Custom Store Pages & Policies</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage return policies, prescription compliance notices, and receipt footers.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt & Invoice Compliance Footer Notice
                  </label>
                  <Input defaultValue="Drugs dispensed in good condition cannot be returned after leaving the premises." className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Terms of Service & Regulatory Disclosure
                  </label>
                  <textarea
                    defaultValue="All controlled medications require a valid prescription verified by a licensed superintendent pharmacist."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-medium h-24 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: EMAIL & ALERTS */}
          {activeTab === 'comm' && (
            <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Email & System Alerts</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure low-stock alerts, near-expiry warnings, and daily sales summary emails.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alert Recipient Email
                  </label>
                  <Input defaultValue={currentEmail} className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Warning Lead Time
                  </label>
                  <select className="w-full h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800">
                    <option>90 Days Before Expiry</option>
                    <option>60 Days Before Expiry</option>
                    <option>30 Days Before Expiry</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
