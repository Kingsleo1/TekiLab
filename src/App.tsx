import { useState, useEffect, lazy, Suspense } from 'react';
import { WorkflowDashboard } from './components/dashboard/WorkflowDashboard';
import { routePatient, transferTicket, completeDiagnostic, chargeForOrder } from './lib/workflow';
import { clearSignatureVault } from './lib/report-approval';
import { getLocalPharmacyHandoffQueue } from './lib/cross-module-handoff';
import { Toaster, toast } from 'sonner';
import { syncOfflineCache, registerSyncListener, startPeriodicSync } from './services/syncManager';
import { getPendingSales } from './services/offlineDB';
import { usePWA } from './hooks/usePWA';
import { PWAInstallModal } from './components/pwa/PWAInstallModal';
import { PWAStatusBanner } from './components/pwa/PWAStatusBanner';
import { SplashScreen } from './components/pwa/SplashScreen';

import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  LogOut,
  Store,
  User as UserIcon,
  Search,
  Bell,
  Menu,
  CreditCard,
  BarChart3,
  Truck,
  ShieldCheck,
  ArrowRightLeft,
  Globe,
  Users,
  Settings,
  Megaphone,
  Zap,
  X,
  Warehouse,
  FileText,
  ClipboardList,
  Sparkles,
  Lock,
  KeyRound,
  Download,
  HardDrive,
  Database,
  Building2,
  Link2,
  Copy,
  FlaskConical,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Components
const InventoryView = lazy(() => import('./components/dashboard/InventoryView').then(m => ({ default: m.InventoryView })));
const POSView = lazy(() => import('./components/dashboard/POSView').then(m => ({ default: m.POSView })));
const AdminAnalytics = lazy(() => import('./components/dashboard/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const OrderHistoryView = lazy(() => import('./components/dashboard/OrderHistoryView').then(m => ({ default: m.OrderHistoryView })));
const OwingRecordsView = lazy(() => import('./components/dashboard/OwingRecordsView').then(m => ({ default: m.OwingRecordsView })));
const B2BLogisticsView = lazy(() => import('./components/dashboard/B2BLogisticsView').then(m => ({ default: m.B2BLogisticsView })));
const StaffManagementView = lazy(() => import('./components/dashboard/StaffManagementView').then(m => ({ default: m.StaffManagementView })));
const OverviewView = lazy(() => import('./components/dashboard/OverviewView').then(m => ({ default: m.OverviewView })));
const WarehouseView = lazy(() => import('./components/dashboard/WarehouseView').then(m => ({ default: m.WarehouseView })));
const SupplyManager = lazy(() => import('./components/dashboard/SupplyManager').then(m => ({ default: m.SupplyManager })));
const ExpensesView = lazy(() => import('./components/dashboard/ExpensesView').then(m => ({ default: m.ExpensesView })));
import { LoginPage } from './components/LoginPage';
import TransferView from './components/dashboard/TransferView';

// Admin Components
const UserManagementView = lazy(() => import('./components/dashboard/admin/UserManagementView').then(m => ({ default: m.UserManagementView })));
const ProductCatalogView = lazy(() => import('./components/dashboard/admin/ProductCatalogView').then(m => ({ default: m.ProductCatalogView })));
const MarketingConsole = lazy(() => import('./components/dashboard/admin/MarketingConsole').then(m => ({ default: m.MarketingConsole })));
const ReportsAnalyticsView = lazy(() => import('./components/dashboard/admin/ReportsAnalyticsView').then(m => ({ default: m.ReportsAnalyticsView })));
const SystemSettingsView = lazy(() => import('./components/dashboard/admin/SystemSettingsView').then(m => ({ default: m.SystemSettingsView })));
const CustomerCentral = lazy(() => import('./components/dashboard/admin/CustomerCentral').then(m => ({ default: m.CustomerCentral })));
const IntegrationsView = lazy(() => import('./components/dashboard/admin/IntegrationsView').then(m => ({ default: m.IntegrationsView })));
const MerchantStoreView = lazy(() => import('./components/dashboard/admin/MerchantStoreView').then(m => ({ default: m.MerchantStoreView })));
const AdminSecurityModal = lazy(() => import('./components/dashboard/admin/AdminSecurityModal').then(m => ({ default: m.AdminSecurityModal })));
const SuperAdminSaaSView = lazy(() => import('./components/dashboard/admin/SuperAdminSaaSView').then(m => ({ default: m.SuperAdminSaaSView })));
const AstraDatabaseSetupModal = lazy(() => import('./components/dashboard/admin/AstraDatabaseSetupModal').then(m => ({ default: m.AstraDatabaseSetupModal })));
import { UserAccountMenu } from './components/dashboard/UserAccountMenu';

import { DashboardFooter } from './components/dashboard/DashboardFooter';

import { UserRole, Pharmacy, Tenant } from './types/pharmacy';
import { mockPharmacies } from './services/mockData';
import { apiService } from './services/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { isAstraConfigured } from './lib/astra';
import {
  buildCompanyPortalUrl,
  getSubscriptionDaysRemaining,
  generateShortCompanySlug,
  formatCompanyFirstShortUrl,
  applyDynamicFavicon,
  detectUrlCompanySlug,
  matchTenantBySlug
} from './lib/saas-pricing';

// Healthcare Components
const PatientCentral = lazy(() => import('./components/dashboard/PatientCentral').then(m => ({ default: m.PatientCentral })));
const ClinicalEMRView = lazy(() => import('./components/dashboard/ClinicalEMRView').then(m => ({ default: m.ClinicalEMRView })));
const LaboratoryLIMSView = lazy(() => import('./components/dashboard/LaboratoryLIMSView').then(m => ({ default: m.LaboratoryLIMSView })));
const RadiologyView = lazy(() => import('./components/dashboard/RadiologyView').then(m => ({ default: m.RadiologyView })));
const InpatientWardView = lazy(() => import('./components/dashboard/InpatientWardView').then(m => ({ default: m.InpatientWardView })));
const HospitalQueueManager = lazy(() => import('./components/dashboard/HospitalQueueManager').then(m => ({ default: m.HospitalQueueManager })));
const AppointmentsView = lazy(() => import('./components/dashboard/AppointmentsView').then(m => ({ default: m.AppointmentsView })));
const HospitalBillingView = lazy(() => import('./components/dashboard/HospitalBillingView').then(m => ({ default: m.HospitalBillingView })));
const AIHealthcareAssistant = lazy(() => import('./components/dashboard/AIHealthcareAssistant').then(m => ({ default: m.AIHealthcareAssistant })));
const FacilityOnboardingModal = lazy(() => import('./components/dashboard/FacilityOnboardingModal').then(m => ({ default: m.FacilityOnboardingModal })));
const RapidResultConsole = lazy(() => import('./components/dashboard/RapidResultConsole').then(m => ({ default: m.RapidResultConsole })));
const TenantModuleSettingsView = lazy(() => import('./components/dashboard/TenantModuleSettingsView').then(m => ({ default: m.TenantModuleSettingsView })));
const PatientPortalView = lazy(() => import('./components/dashboard/PatientPortalView').then(m => ({ default: m.PatientPortalView })));
import { DepartmentCommHub } from './components/dashboard/DepartmentCommHub';
import { TenantModuleProvider, useTenantModules } from './context/TenantModuleContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { getRoleDefinition } from './config/roles';

import { 
  DEFAULT_PATIENTS, 
  DEFAULT_CLINICAL_ENCOUNTERS, 
  DEFAULT_LAB_TEST_CATALOG, 
  DEFAULT_LAB_ORDERS, 
  DEFAULT_IMAGING_TEST_CATALOG, 
  DEFAULT_IMAGING_ORDERS, 
  DEFAULT_WARDS, 
  DEFAULT_BEDS, 
  DEFAULT_ADMISSIONS, 
  DEFAULT_QUEUE_TICKETS, 
  DEFAULT_HOSPITAL_APPOINTMENTS, 
  DEFAULT_PATIENT_CHARGES, 
  DEFAULT_HMO_CLAIMS,
  mockProducts 
} from './services/mockData';

type DashView = 
  | 'rapid_console'
  | 'module_config'
  | 'patient_portal'
  | 'overview' 
  | 'saas_control'
  | 'patients'
  | 'emr'
  | 'lab'
  | 'radiology'
  | 'inpatient'
  | 'queue'
  | 'appointments'
  | 'billing'
  | 'ai_assistant'
  | 'inventory' 
  | 'orders' 
  | 'sales' 
  | 'pos' 
  | 'history' 
  | 'owing_records' 
  | 'browse' 
  | 'prescriptions' 
  | 'staff'
  | 'warehouse'
  | 'transfer'
  | 'admin_users'
  | 'admin_products'
  | 'admin_marketing'
  | 'admin_reports'
  | 'admin_customers'
  | 'admin_settings'
  | 'admin_integrations'
  | 'admin_merchants'
  | 'new_supply'
  | 'supply_records'
  | 'new_supplier'
  | 'list_of_suppliers'
  | 'admin_orders';

export default function App() {
  return (
    <NotificationProvider>
      <TenantModuleProvider>
        <Suspense fallback={<div role="status" className="p-6 text-sm">Loading workspace…</div>}><AppShell /></Suspense>
      </TenantModuleProvider>
    </NotificationProvider>
  );
}

function AppShell() {
  const { isViewEnabled, mutedModulesCount, config: clinicalTenantConfig } = useTenantModules();
  const { unreadCount } = useNotifications();
  const [isCommHubOpen, setIsCommHubOpen] = useState(false);
  const pwa = usePWA();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'TekiLab — SaaS Laboratory Information Management System (LIMS)';
    }
  }, []);
  const getIsAdminUrl = () => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    const s = window.location.search.toLowerCase();
    return p === '/admin' || p.startsWith('/admin/') || p.includes('/admin') || h === '#admin' || h.includes('admin') || s.includes('portal=admin') || s.includes('mode=admin');
  };

  const [role, setRole] = useState<UserRole>(() => {
    const savedUser = localStorage.getItem('ph_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.role === 'Kernel Admin' ? 'admin' : (u.role === 'Store Manager' || u.role === 'Terminal Manager' ? 'merchant' : 'cashier');
      } catch (e) {}
    }
    return 'merchant';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const savedUser = localStorage.getItem('ph_current_user');
    if (!savedUser) return false;
    try {
      const u = JSON.parse(savedUser);
      // In the admin app / /admin URL, strictly require an authenticated Kernel Admin session
      if (typeof window !== 'undefined' && getIsAdminUrl()) {
        return u.role === 'Kernel Admin' || u.role === 'admin';
      }
      return true;
    } catch {
      return false;
    }
  });
  const [view, setView] = useState<DashView>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ph_current_user') || 'null');
      return stored ? getRoleDefinition(stored.role).defaultView as DashView : 'rapid_console';
    } catch { return 'rapid_console'; }
  });
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const savedUser = localStorage.getItem('ph_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.branchId) return u.branchId;
      } catch (e) {}
    }
    return 'pharma-1';
  });
  const [branches, setBranches] = useState<Pharmacy[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const savedUser = localStorage.getItem('ph_current_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => { clearSignatureVault(); }, [currentUser?.id]);

  // Healthcare Operational Datasets
  const [patients, setPatients] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_patients');
    return saved ? JSON.parse(saved) : DEFAULT_PATIENTS;
  });

  const [selectedConsultationPatientId, setSelectedConsultationPatientId] = useState<string>('');
  const [clinicalProducts, setClinicalProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!isLoggedIn || (view !== 'emr' && view !== 'ai_assistant')) return;
    let cancelled = false;
    apiService.products.list(selectedBranchId).then(items => { if (!cancelled) setClinicalProducts(items); }).catch(() => { if (!cancelled) setClinicalProducts([]); });
    return () => { cancelled = true; };
  }, [isLoggedIn, view, selectedBranchId]);

  const [encounters, setEncounters] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_encounters');
    return saved ? JSON.parse(saved) : DEFAULT_CLINICAL_ENCOUNTERS;
  });

  const [labCatalog, setLabCatalog] = useState<any[]>(DEFAULT_LAB_TEST_CATALOG);
  const [labOrders, setLabOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_lab_orders');
    return saved ? JSON.parse(saved) : DEFAULT_LAB_ORDERS;
  });

  const [imagingCatalog, setImagingCatalog] = useState<any[]>(DEFAULT_IMAGING_TEST_CATALOG);
  const [imagingOrders, setImagingOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_imaging_orders');
    return saved ? JSON.parse(saved) : DEFAULT_IMAGING_ORDERS;
  });

  const [wards, setWards] = useState<any[]>(DEFAULT_WARDS);
  const [beds, setBeds] = useState<any[]>(DEFAULT_BEDS);
  const [admissions, setAdmissions] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_admissions');
    return saved ? JSON.parse(saved) : DEFAULT_ADMISSIONS;
  });

  const [queueTickets, setQueueTickets] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_queue_tickets');
    return saved ? JSON.parse(saved) : DEFAULT_QUEUE_TICKETS;
  });

  const [appointments, setAppointments] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_appointments');
    return saved ? JSON.parse(saved) : DEFAULT_HOSPITAL_APPOINTMENTS;
  });

  const [charges, setCharges] = useState<any[]>(() => {
    const saved = localStorage.getItem('tm_charges');
    return saved ? JSON.parse(saved) : DEFAULT_PATIENT_CHARGES;
  });

  const [hmoClaims, setHmoClaims] = useState<any[]>(DEFAULT_HMO_CLAIMS);
  useEffect(() => { localStorage.setItem('tm_encounters', JSON.stringify(encounters)); }, [encounters]);
  useEffect(() => {
    const syncDispensing = () => {
      const handoffs = getLocalPharmacyHandoffQueue(clinicalTenantConfig.tenantId);
      setEncounters(prev => prev.map(enc => {
        if (!enc.prescriptions?.length) return enc;
        return { ...enc, prescriptions: enc.prescriptions.map((rx: any) =>
          handoffs.some(h => h.handoffId === 'RX-' + enc.id + '-' + rx.id && h.status === 'DISPENSED') ? { ...rx, status: 'Dispensed' } : rx) };
      }));
      setQueueTickets(prev => prev.map(ticket => {
        const requests = handoffs.filter(h => h.labResultId === ticket.sourceOrderId);
        return ticket.department === 'Pharmacy' && requests.length > 0 && requests.every(h => h.status === 'DISPENSED') ? { ...ticket, status: 'Completed' } : ticket;
      }));
    };
    window.addEventListener('tekilab_pharmacy_queue_updated', syncDispensing);
    return () => window.removeEventListener('tekilab_pharmacy_queue_updated', syncDispensing);
  }, [clinicalTenantConfig.tenantId]);
  useEffect(() => { localStorage.setItem('tm_queue_tickets', JSON.stringify(queueTickets)); }, [queueTickets]);
  useEffect(() => { localStorage.setItem('tm_charges', JSON.stringify(charges)); }, [charges]);
  useEffect(() => { localStorage.setItem('tm_lab_orders', JSON.stringify(labOrders)); }, [labOrders]);
  useEffect(() => { localStorage.setItem('tm_imaging_orders', JSON.stringify(imagingOrders)); }, [imagingOrders]);
  const queueDiagnostic = (order: any, imaging = false) => {
    setQueueTickets(prev => routePatient(prev, { id: order.patientId, fullName: order.patientName, mrn: order.mrn }, imaging ? 'Radiology' : 'Laboratory', order.testName, order.id));
    setCharges(prev => prev.some(c => c.id === 'charge-' + order.id) ? prev : [chargeForOrder(order, imaging), ...prev]);
  };
  const returnReleasedDiagnostic = (order: any, imaging = false) => {
    if (order.orderStatus === (imaging ? 'Released' : 'RELEASED')) setQueueTickets(prev => completeDiagnostic(prev, order, imaging ? 'Radiology' : 'Laboratory'));
  };
  const [isFacilityOnboardingOpen, setIsFacilityOnboardingOpen] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  const [isAdminSecurityOpen, setIsAdminSecurityOpen] = useState(false);
  const [isAstraModalOpen, setIsAstraModalOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (getIsAdminUrl()) return '/admin';
      return window.location.pathname.toLowerCase();
    }
    return '/';
  });

  // Extract company slug from URL path (/medplus), ?c=medplus, ?company=medplus, or custom subdomain
  const getUrlTenantSlug = () => detectUrlCompanySlug();

  useEffect(() => {
    const syncTenants = async () => {
      const urlSlug = getUrlTenantSlug();
      if (urlSlug) {
        apiService.tenants.setActiveContext(urlSlug);
      }

      const list = await apiService.tenants.list();
      setAllTenants(list);
      const targetSlug = urlSlug || currentUser?.tenantSlug || currentUser?.tenantId;

      if (role === 'admin' && isAdminRoute && !urlSlug) {
        apiService.tenants.setActiveContext(null);
        setActiveTenant(null);
        return;
      }

      if (targetSlug) {
        const matched = matchTenantBySlug(list, String(targetSlug));
        if (matched) {
          setActiveTenant(matched);
          apiService.tenants.setActiveContext(matched.slug);

          // If a specific company URL was pasted in the browser, ensure branches and session match that company
          if (urlSlug) {
            // If a non-Super-Admin user from a DIFFERENT company is currently logged in, take them to this company's login portal
            if (
              isLoggedIn &&
              role !== 'admin' &&
              currentUser?.tenantSlug &&
              !matchTenantBySlug([matched], currentUser.tenantSlug)
            ) {
              setIsLoggedIn(false);
              setCurrentUser(null);
              localStorage.removeItem('ph_current_user');
              toast.info(`Switched to ${matched.companyName} portal.`);
            }

            // Refresh branches for the matched company
            const companyBranches = await apiService.pharmacies.list();
            setBranches(companyBranches);
            const activeCompanyBranches = companyBranches.filter(b => b.status === 'active' || !b.status);
            if (
              activeCompanyBranches.length > 0 &&
              !activeCompanyBranches.some(b => b.id === selectedBranchId)
            ) {
              setSelectedBranchId(activeCompanyBranches[0].id);
            }
          }
        }
      } else if (role !== 'admin' && list.length > 0) {
        setActiveTenant(list[0]);
        apiService.tenants.setActiveContext(list[0].slug);
      }
    };
    syncTenants();
    window.addEventListener('tenants_updated', syncTenants);
    window.addEventListener('popstate', syncTenants);
    return () => {
      window.removeEventListener('tenants_updated', syncTenants);
      window.removeEventListener('popstate', syncTenants);
    };
  }, [currentPath, isLoggedIn, role, currentUser?.tenantSlug]);

  useEffect(() => {
    const handleUrlChange = () => {
      const isAdm = getIsAdminUrl();
      setCurrentPath(isAdm ? '/admin' : window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      if (path === '/admin') {
        window.location.hash = 'admin';
      } else if (window.location.hash === '#admin') {
        window.location.hash = '';
      }
      setCurrentPath(path.toLowerCase());
    }
  };

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/') || (typeof window !== 'undefined' && getIsAdminUrl());

  // Dynamically sync manifest, page title, and company-specific favicon between staff/company portal and Super Admin mode
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let manifestEl = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestEl) {
      manifestEl = document.createElement('link');
      manifestEl.rel = 'manifest';
      document.head.appendChild(manifestEl);
    }
    if (isAdminRoute && !getUrlTenantSlug()) {
      manifestEl.href = '/admin-manifest.json';
      document.title = 'Teki Med — Consolidated Healthcare SaaS Super Admin';
      applyDynamicFavicon(null);
    } else if (activeTenant) {
      manifestEl.href = '/manifest.json';
      document.title = `${activeTenant.companyName} — Powered by Teki Med`;
      applyDynamicFavicon(activeTenant.logo);
    } else {
      manifestEl.href = '/manifest.json';
      document.title = 'Teki Med — Unified Healthcare Management Platform';
      applyDynamicFavicon(null);
    }
  }, [isAdminRoute, activeTenant, activeTenant?.logo, activeTenant?.companyName]);

  // Ensure non-admin sessions on /admin route show Admin Login rather than staff dashboard
  useEffect(() => {
    if (isAdminRoute) {
      if (currentUser && currentUser.role !== 'Kernel Admin' && currentUser.role !== 'admin') {
        setIsLoggedIn(false);
      }
    }
  }, [isAdminRoute, currentUser]);

  // Auto-hide welcome banner after 8 seconds, resetting when logged in, user or branch changes
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      setShowWelcome(true);
      const t = setTimeout(() => {
        setShowWelcome(false);
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [isLoggedIn, currentUser?.id, selectedBranchId]);

  // Synchronize active session permissions with staff list in real-time
  useEffect(() => {
    const syncCurrentSessionPermissions = () => {
      if (!currentUser) return;
      const savedStaff = localStorage.getItem('ph_staff_list');
      if (savedStaff) {
        try {
          const staffList = JSON.parse(savedStaff);
          const freshUser = staffList.find((s: any) => s.id === currentUser.id || (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()));
          if (freshUser) {
            const livePerms = freshUser.permissions || [];
            const currPerms = currentUser.permissions || [];
            const hasPermsChanged = JSON.stringify(livePerms) !== JSON.stringify(currPerms);
            const hasRoleChanged = freshUser.role !== currentUser.role;
            const hasBranchChanged = freshUser.branchId !== currentUser.branchId;

            if (hasPermsChanged || hasRoleChanged || hasBranchChanged) {
              setCurrentUser(freshUser);
              const systemRole = freshUser.role === 'Kernel Admin' ? 'admin' : (freshUser.role === 'Store Manager' || freshUser.role === 'Terminal Manager' ? 'merchant' : 'cashier');
              setRole(systemRole);
              if (freshUser.branchId) {
                setSelectedBranchId(freshUser.branchId);
              }
              localStorage.setItem('ph_current_user', JSON.stringify(freshUser));
              toast.info('Security Notice: Your access permissions and branch assignments have been synchronized in real-time.', {
                duration: 5000
              });
            }
          }
        } catch (e) {}
      }
    };

    syncCurrentSessionPermissions();
    window.addEventListener('pharmacy_staff_updated', syncCurrentSessionPermissions);
    window.addEventListener('storage', syncCurrentSessionPermissions);

    return () => {
      window.removeEventListener('pharmacy_staff_updated', syncCurrentSessionPermissions);
      window.removeEventListener('storage', syncCurrentSessionPermissions);
    };
  }, [view, isLoggedIn, currentUser]);

  useEffect(() => {
    const fetchBranches = () => {
      apiService.pharmacies.list().then(list => {
        setBranches(list);
        if (role !== 'admin' && currentUser?.branchId) {
          setSelectedBranchId(currentUser.branchId);
        } else {
          const activeBranches = list.filter(b => b.status === 'active' || !b.status);
          if (activeBranches.length > 0 && !activeBranches.some(b => b.id === selectedBranchId)) {
            setSelectedBranchId(activeBranches[0].id);
          }
        }
      });
    };

    fetchBranches();

    const handleBranchUpdate = () => fetchBranches();
    window.addEventListener('pharmacies_updated', handleBranchUpdate);
    window.addEventListener('storage', handleBranchUpdate);
    return () => {
      window.removeEventListener('pharmacies_updated', handleBranchUpdate);
      window.removeEventListener('storage', handleBranchUpdate);
    };
  }, [view, isLoggedIn, role, currentUser]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Automatically close mobile menu whenever navigation/view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [view]);


  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [customerCart, setCustomerCart] = useState<any[]>([]);

  useEffect(() => {
    // 1. Initialize 10-minute periodic background synchronization & Realtime live updates
    const stopSync = startPeriodicSync(selectedBranchId);

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Internet connection restored! Synchronizing local cache...', { id: 'conn-state-restored' });
      await syncOfflineCache(selectedBranchId);
      updateCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Working offline: sales will be securely queued.', { id: 'conn-state-lost' });
    };

    const updateCount = async () => {
      try {
        const queueList = await getPendingSales();
        setPendingCount(queueList.length);
      } catch {
        setPendingCount(0);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateCount();
    const unsubscribe = registerSyncListener(updateCount);
    const intervalId = setInterval(updateCount, 3000);

    return () => {
      stopSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [selectedBranchId]);

  // Supabase Auth session listener for seamless live authentication
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !currentUser) {
          supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
            const roleName = profile?.role || 'Store Manager';
            let systemRole: UserRole = 'cashier';
            if (roleName === 'Kernel Admin') systemRole = 'admin';
            else if (roleName === 'Store Manager' || roleName === 'Terminal Manager') systemRole = 'merchant';
            else systemRole = 'cashier';

            const userObj = {
              id: session.user.id,
              name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
              role: roleName,
              email: session.user.email,
              level: profile?.level || 4,
              branchId: profile?.branch_id || 'pharma-1',
              permissions: profile?.permissions || [
                'canAccessPOS', 
                'canApplyDiscounts', 
                'canDispenseControlled', 
                'canManageInventory', 
                'canAccessTransfers', 
                'canAccessSuppliers', 
                'canAccessExpenses', 
                'canManageStaff'
              ]
            };
            setCurrentUser(userObj);
            setRole(systemRole);
            if (userObj.branchId) setSelectedBranchId(userObj.branchId);
            setIsLoggedIn(true);
            localStorage.setItem('ph_current_user', JSON.stringify(userObj));
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setCurrentUser(null);
          localStorage.removeItem('ph_current_user');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('ph_current_user');
    toast.success("Successfully logged out from active secure terminal session.");
  };

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage 
          isAdminRoute={isAdminRoute}
          activeTenantSlug={getUrlTenantSlug()}
          onNavigateToAdmin={() => navigateTo('/admin')}
          onNavigateToStaff={() => navigateTo('/')}
          onLogin={(selectedRole, userDetails, branchId) => {
            setRole(selectedRole);
            setCurrentUser(userDetails);
            localStorage.setItem('ph_current_user', JSON.stringify(userDetails));
            if (branchId) {
              setSelectedBranchId(branchId);
            }
            setIsLoggedIn(true);
            // Sync URL if admin logged in or accessed from /admin
            if (selectedRole === 'admin' || isAdminRoute) {
              setView('saas_control');
              if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
                window.history.replaceState(null, '', '/admin');
                setCurrentPath('/admin');
              }
            } else {
              const roleDef = getRoleDefinition(userDetails?.role);
              setView((roleDef.defaultView as DashView) || 'rapid_console');
              const slugToUse = userDetails?.tenantSlug || getUrlTenantSlug();
              if (typeof window !== 'undefined') {
                const targetPath = slugToUse ? `/${slugToUse}` : '/';
                window.history.replaceState(null, '', targetPath);
                setCurrentPath(targetPath);
              }
            }
          }}
          onBack={() => {
            if (isAdminRoute) {
              navigateTo('/');
            }
          }}
        />
        <PWAInstallModal 
          open={pwa.showInstallModal}
          onClose={() => pwa.setShowInstallModal(false)}
          deviceOS={pwa.deviceOS}
          isInstallable={pwa.isInstallable}
          isInstalled={pwa.isInstalled}
          onTriggerNativeInstall={pwa.triggerNativeInstall}
          onMarkInstalled={pwa.markAsInstalledOrDownloaded}
          isAdmin={isAdminRoute}
        />
        <SplashScreen 
          show={pwa.showSplashScreen && !isLoggedIn}
          onFinish={pwa.dismissSplashScreen} 
          deviceOS={pwa.deviceOS}
          isStandalone={pwa.isStandalone}
        />
      </>
    );
  }

  // Dedicated Standalone Patient Dashboard Shell — Patients never see staff menus
  const activeRoleDef = getRoleDefinition(currentUser?.role);
  if (isLoggedIn && activeRoleDef.id === 'patient') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <PatientPortalView
          standalone={true}
          currentUser={currentUser}
          labOrders={labOrders}
          onLogout={handleLogout}
          onUserUpdate={(u) => setCurrentUser(u)}
          onOnlineBookingCreated={(booking) => {
            const newTicket: any = {
              id: `q-${Date.now()}`,
              ticketNumber: `ONL-${Math.floor(100 + Math.random() * 899)}`,
              patientId: currentUser?.id || `pat-${Date.now()}`,
              patientName: booking.patientName,
              mrn: currentUser?.mrn || `TK-${Math.floor(10000 + Math.random() * 89999)}`,
              department: 'Reception',
              orderSource: 'ONLINE',
              status: 'Waiting',
              priority: 'Priority',
              issuedAt: new Date().toISOString(),
              notes: `Online Paid (${booking.paymentRef}): ${booking.tests.map((t) => t.name).join(', ')}`
            };
            const nextQ = [newTicket, ...queueTickets];
            setQueueTickets(nextQ);
            localStorage.setItem('tm_queue_tickets', JSON.stringify(nextQ));
          }}
        />
      </>
    );
  }

  // TekiLab LIMS-First Master Navigation — Auxiliary modules dynamically muted via Feature Toggle Engine
  const masterSyncedSidebar = [
    { 
      icon: <Zap size={20} className="text-blue-400" />, 
      label: 'Rapid Workflow (5–10m)', 
      view: 'rapid_console' 
    },
    { 
      icon: <FlaskConical size={20} className="text-sky-400" />, 
      label: 'Lab Worklist & Samples', 
      view: 'lab' 
    },
    { 
      icon: <Users size={20} className="text-slate-300" />, 
      label: 'Registered Patients', 
      view: 'patients' 
    },
    { 
      icon: <ClipboardList size={20} className="text-blue-400" />, 
      label: 'Queue & Bookings', 
      view: 'queue' 
    },
    { 
      icon: <UserIcon size={20} className="text-sky-300" />, 
      label: 'Patient Portal', 
      view: 'patient_portal' 
    },
    { 
      icon: <Sparkles size={20} className="text-blue-300" />, 
      label: 'AI Lab Assistant', 
      view: 'ai_assistant' 
    },
    { 
      icon: <LayoutDashboard size={20} className="text-slate-400" />, 
      label: 'Lab Overview', 
      view: 'overview' 
    },
    { 
      icon: <Sliders size={20} className="text-blue-400" />, 
      label: 'Feature Visibility', 
      view: 'module_config',
      badge: mutedModulesCount > 0 ? `${mutedModulesCount} muted` : undefined
    },
    {
      icon: <Users size={20} className="text-sky-400" />,
      label: 'Clinical & EMR Suite',
      children: [
        { label: 'Doctor EMR & Consultations', view: 'emr' },
        { label: 'Radiology & Medical Imaging', view: 'radiology' },
        { label: 'Hospital Queue Engine', view: 'queue' },
        { label: 'Appointments & Schedules', view: 'appointments' }
      ]
    },
    {
      icon: <Warehouse size={20} className="text-amber-400" />,
      label: 'Inpatient & Wards',
      view: 'inpatient'
    },
    { 
      icon: <CreditCard size={20} className="text-emerald-400" />, 
      label: 'Finance & Billing', 
      children: [
        { label: 'Unified Charge Capture & HMO', view: 'billing' },
        { label: 'POS Cashier Checkout', view: 'pos' },
        { label: 'Sales Records', view: 'admin_orders' },
        { label: 'Owing & Debtors Ledger', view: 'owing_records' },
        { label: 'Operating Expenses', view: 'expenses' }
      ]
    },
    { 
      icon: <Package size={20} className="text-blue-400" />, 
      label: 'Pharmacy & Supply Chain', 
      children: [
        { label: 'Products & Drug Catalog', view: 'admin_products' },
        { label: 'Multi-Batch Inventory', view: 'inventory' },
        { label: 'Warehouse Depot', view: 'warehouse' },
        { label: 'Inter-Branch Stock Transfer', view: 'transfer' },
        { label: 'Supply Procurement', view: 'new_supply' }
      ]
    },
    { 
      icon: <Building2 size={20} className="text-slate-400" />, 
      label: (role === 'admin' || currentUser?.role === 'Kernel Admin')
        ? 'SaaS Tenants & Billing'
        : 'Subscription & Portal', 
      view: 'saas_control' 
    },
    { 
      icon: <Users size={20} className="text-slate-400" />, 
      label: 'Manage Staff', 
      view: (role === 'admin' || currentUser?.role === 'Kernel Admin') ? 'admin_users' : 'staff' 
    },
    { 
      icon: <Store size={20} className="text-slate-400" />, 
      label: 'Branches & Facilities', 
      view: 'admin_merchants' 
    },
    { 
      icon: <BarChart3 size={20} className="text-slate-400" />, 
      label: 'Analytics & Reports', 
      view: 'admin_reports' 
    },
    { 
      icon: <Settings size={20} className="text-slate-400" />, 
      label: 'System Settings', 
      view: 'admin_settings' 
    },
  ];

  const hasAccessToView = (v: string) => {
    if (role === 'admin' || currentUser?.role === 'Kernel Admin' || currentUser?.role === 'admin') return true;
    const permissions = [...new Set([...(currentUser?.permissions || []), ...getRoleDefinition(currentUser?.role).permissions])];
    const clinicalAccess: Record<string, string[]> = {
      rapid_console: ['canRunRapidLab','canCollectSamples'], lab: ['canRunRapidLab'], radiology: ['canReviewImaging'],
      emr: ['canConsultPatients'], queue: ['canManageQueue'], patients: ['canManagePatients'],
      billing: ['canManageBilling'], module_config: ['canManageModules'], ai_assistant: ['canRunRapidLab','canConsultPatients'],
      inpatient: ['canConsultPatients','canNursePatients'], nurse_station: ['canConsultPatients']
    };
    if (clinicalAccess[v]) return clinicalAccess[v].some(p => permissions.includes(p));

    // Dashboard overview & SaaS Subscription Tracker are accessible to authenticated company admins/managers
    if (v === 'overview') return true;
    if (v === 'saas_control') {
      const uRole = currentUser?.role || '';
      return (
        role === 'admin' ||
        role === 'merchant' ||
        uRole === 'Kernel Admin' ||
        uRole === 'Company Admin' ||
        uRole === 'Store Manager' ||
        uRole === 'Terminal Manager' ||
        permissions.includes('canManageSubscription') ||
        permissions.includes('canAdjustSettings')
      );
    }

    // Sales Hub and POS (POS terminal, sales records, owing records)
    if (v === 'pos' || v === 'history' || v === 'owing_records' || v === 'admin_orders') {
      const userRole = currentUser?.role || '';
      if (userRole === 'Store Manager' || userRole === 'Terminal Manager' || userRole === 'merchant') {
        return permissions.length === 0 || permissions.includes('canAccessPOS');
      }
      return permissions.includes('canAccessPOS') || permissions.includes('canAccessPharmacy');
    }
    // Customers
    if (v === 'admin_customers') {
      return permissions.includes('canManageCustomers') || permissions.includes('canAccessPOS');
    }
    // Financial Ledger and expenses
    if (v === 'expenses') {
      return permissions.includes('canAccessExpenses');
    }
    // Reports and analytics
    if (v === 'admin_reports' || v === 'sales') {
      return permissions.includes('canViewReports') || permissions.includes('canAccessExpenses');
    }
    // Suppliers & Supply
    if (v === 'new_supply' || v === 'supply_records' || v === 'new_supplier' || v === 'list_of_suppliers') {
      return permissions.includes('canAccessSuppliers');
    }
    // Stock Transfers & Logistics Orders
    if (v === 'transfer' || v === 'orders') {
      return permissions.includes('canAccessTransfers');
    }
    // Medicinal Inventory and Products
    if (v === 'inventory' || v === 'admin_products') {
      return permissions.includes('canManageInventory');
    }
    // Warehouse Controller
    if (v === 'warehouse') {
      return permissions.includes('canAccessWarehouse') || permissions.includes('canManageInventory');
    }
    // Staff & Personnel Administration (Store Manager and Admin)
    if (v === 'staff' || v === 'admin_users') {
      return permissions.includes('canManageStaff');
    }
    // Branch Management
    if (v === 'admin_merchants') {
      return permissions.includes('canManageBranches');
    }
    // Marketing Console
    if (v === 'admin_marketing') {
      return permissions.includes('canManageMarketing');
    }
    // Integrations
    if (v === 'admin_integrations') {
      return permissions.includes('canManageIntegrations');
    }
    // Settings
    if (v === 'admin_settings') {
      const uRole = currentUser?.role || '';
      return (
        role === 'admin' ||
        role === 'merchant' ||
        uRole === 'Kernel Admin' ||
        uRole === 'Company Admin' ||
        uRole === 'Store Manager' ||
        uRole === 'Terminal Manager' ||
        permissions.includes('canAdjustSettings') ||
        permissions.includes('canManageStaff') ||
        permissions.length === 0
      );
    }

    return true;
  };

  const getFilteredSidebar = () => {
    const isAdminUser = role === 'admin' || currentUser?.role === 'Kernel Admin';

    return masterSyncedSidebar.map((item: any) => {
      // Filter children by BOTH Feature Muting Engine and role permissions
      if (item.children) {
        const filteredChildren = item.children.filter((child: any) => {
          if (!isViewEnabled(child.view)) return false;
          return isAdminUser || hasAccessToView(child.view);
        });
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }

      // Check top-level view items against Feature Muting Engine first
      if (item.view && !isViewEnabled(item.view)) return null;
      if (!isAdminUser && item.view && !hasAccessToView(item.view)) return null;

      return item;
    }).filter(Boolean);
  };

  const currentSidebar = getFilteredSidebar();
  const currentBranchName = (branches.length > 0 ? branches : mockPharmacies).find(p => p.id === selectedBranchId)?.name || 'Central Hub';
  const hasCustomCompanyLogo =
    !isAdminRoute &&
    Boolean(activeTenant?.logo) &&
    !activeTenant?.logo?.startsWith('/logo.png') &&
    !activeTenant?.logo?.startsWith('/favicon.png') &&
    !activeTenant?.logo?.startsWith('/favicon-1.png');
  const activeDashboardLogo = hasCustomCompanyLogo ? activeTenant!.logo! : '/logo.png?v=5';
  const activeCollapsedIcon = hasCustomCompanyLogo ? activeTenant!.logo! : '/favicon.png?v=5';

  return (
    <div className="h-dvh w-full max-w-full overflow-hidden bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar Navigation */}
      <AnimatePresence>
        {true && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0, width: isSidebarOpen ? 248 : 72 }}
            className="bg-[#0F172A] hidden md:flex flex-col z-50 sticky top-0 h-dvh transition-all shadow-sm border-r border-slate-800 shrink-0"
          >
            <div className="p-3 shrink-0 border-b border-slate-800/80">
              {isSidebarOpen ? (
                <div 
                  onClick={() => setView(role === 'admin' ? 'saas_control' : 'overview')}
                  className="w-full h-18 rounded-2xl bg-white px-3 py-1.5 flex items-center justify-center shadow-lg cursor-pointer hover:opacity-95 transition-opacity overflow-hidden"
                  title={activeTenant ? `${activeTenant.companyName} (${formatCompanyFirstShortUrl(activeTenant.slug, activeTenant.customDomain)})` : 'Teki Pharm'}
                >
                  <img 
                    src={activeDashboardLogo} 
                    alt={activeTenant?.companyName || 'Teki Pharm Logo'} 
                    className="w-full h-full object-contain scale-105"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setSidebarOpen(true)}
                  className="mx-auto h-12 w-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-md cursor-pointer p-1"
                >
                  <img 
                    src={activeCollapsedIcon} 
                    alt={activeTenant?.companyName || 'Teki Pharm'} 
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 custom-sidebar-scrollbar">
              <nav className="space-y-0.5 py-2">
                {currentSidebar.map((item: any) => (
                  <SidebarItem 
                    key={item.label}
                    icon={item.icon} 
                    label={item.label} 
                    active={view === item.view} 
                    onClick={() => setView(item.view)} 
                    isOpen={isSidebarOpen}
                    children={item.children}
                    currentView={view}
                    setView={setView}
                    isExpanded={expandedItem === item.label}
                    onToggle={() => setExpandedItem(expandedItem === item.label ? null : item.label)}
                    onMouseEnter={() => setExpandedItem(item.label)}
                    badge={item.badgeKey === 'cart' ? customerCart.reduce((sum: number, it: any) => sum + it.quantity, 0) || null : null}
                  />
                ))}

                {/* Visual Divider Line */}
                <div className="border-t border-slate-800/80 my-3 mx-2"></div>

                {/* Beep Department / Live Alerts Button */}
                <button
                  onClick={() => setIsCommHubOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative text-blue-300 hover:text-white hover:bg-blue-600/20 font-medium text-xs cursor-pointer mb-1 border border-blue-500/25"
                >
                  <Bell size={16} className="text-blue-400 shrink-0" />
                  {isSidebarOpen && (
                    <span className="font-semibold text-xs truncate flex-1 text-left">
                      Beep Department
                    </span>
                  )}
                  {isSidebarOpen && unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Install App Link */}
                {!pwa.isInstalled && (
                  <button
                    onClick={() => pwa.setShowInstallModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative text-blue-400 hover:text-white hover:bg-blue-600/20 font-medium text-xs cursor-pointer mb-1 border border-blue-500/20"
                    title={`Download & Install ${pwa.deviceOS} App`}
                  >
                    <Download size={16} className="text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                    {isSidebarOpen && <span className="font-medium text-xs truncate flex-1 text-left">Install App ({pwa.deviceOS})</span>}
                  </button>
                )}

                {/* Sign Out equipped with subtle hover alert */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer"
                >
                  <div className="transition-colors shrink-0">
                    <LogOut size={18} className="group-hover:rotate-12 transition-transform duration-300 text-slate-400 group-hover:text-rose-400" />
                  </div>
                  {isSidebarOpen && <span className="font-medium text-sm tracking-normal truncate flex-1 text-left">Sign Out</span>}
                </button>
              </nav>
            </div>

            <div className="p-3 border-t border-slate-800/80 shrink-0 transition-all bg-[#0B0F19]">
              {isSidebarOpen ? (
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                      {activeRoleDef.shortLabel}
                    </p>
                    <span className="text-[10px] font-mono text-blue-400">{activeRoleDef.department}</span>
                  </div>
                  <p className="text-xs text-slate-400">Roles are assigned through staff management.</p>
                </div>
              ) : (
                <Button 
                    variant="ghost" 
                    className="w-full h-11 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-all shadow-sm"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu size={18} />
                </Button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 flex flex-col relative h-dvh max-w-full overflow-hidden">
        {/* PWA Network & Sync Status Banner */}
        <PWAStatusBanner onOpenInstallModal={() => pwa.setShowInstallModal(true)} />

        {/* Top Header Bar */}
        {true && (
          <header className="h-14 md:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2.5 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 w-full min-w-0 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 min-w-0 shrink">
              {true && (
                <>
                  {/* Mobile Menu */}
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger className="md:hidden h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer shrink-0">
                      <Menu size={18} />
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 bg-[#0F172A] border-none w-72 flex flex-col [&_[data-slot=sheet-close]]:text-slate-400 [&_[data-slot=sheet-close]]:hover:text-white">
                      <div 
                        className="p-3.5 pr-10 border-b border-slate-800 cursor-pointer"
                        onClick={() => {
                          setView(role === 'admin' ? 'saas_control' : 'overview');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="w-full h-16 rounded-2xl bg-white px-3 py-1.5 flex items-center justify-center shadow-lg overflow-hidden">
                          <img 
                            src={activeDashboardLogo} 
                            alt={activeTenant?.companyName || 'Teki Pharm Logo'} 
                            className="w-full h-full object-contain scale-105"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-4 custom-sidebar-scrollbar">
                        <nav className="space-y-0.5 py-3">
                          {currentSidebar.map((item: any) => (
                            <SidebarItem 
                              key={item.label}
                              icon={item.icon} 
                              label={item.label} 
                              active={view === item.view} 
                              onClick={() => { 
                                setView(item.view); 
                                setIsMobileMenuOpen(false);
                              }} 
                              isOpen={true}
                              children={item.children}
                              currentView={view}
                              setView={(v: any) => {
                                setView(v);
                                setIsMobileMenuOpen(false);
                              }}
                              isExpanded={expandedItem === item.label}
                              onToggle={() => setExpandedItem(expandedItem === item.label ? null : item.label)}
                              onMouseEnter={() => setExpandedItem(item.label)}
                              badge={item.badgeKey === 'cart' ? customerCart.reduce((sum: number, it: any) => sum + it.quantity, 0) || null : null}
                              onNavigate={() => setIsMobileMenuOpen(false)}
                            />
                          ))}

                          {/* Visual Divider */}
                          <div className="border-t border-slate-800/80 my-3 mx-1"></div>

                          {/* Beep Department / Live Alerts Button */}
                <button
                  onClick={() => setIsCommHubOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative text-blue-300 hover:text-white hover:bg-blue-600/20 font-medium text-xs cursor-pointer mb-1 border border-blue-500/25"
                >
                  <Bell size={16} className="text-blue-400 shrink-0" />
                  {isSidebarOpen && (
                    <span className="font-semibold text-xs truncate flex-1 text-left">
                      Beep Department
                    </span>
                  )}
                  {isSidebarOpen && unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Install App Link */}
                          {!pwa.isInstalled && (
                            <button
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                pwa.setShowInstallModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative text-blue-400 hover:text-white hover:bg-blue-600/20 font-medium text-xs cursor-pointer mb-1 border border-blue-500/20"
                            >
                              <Download size={16} className="text-blue-400 shrink-0" />
                              <span className="font-medium text-xs truncate flex-1 text-left">Install App ({pwa.deviceOS})</span>
                            </button>
                          )}

                          {/* Sign Out on Mobile Menu */}
                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer"
                          >
                            <LogOut size={18} className="text-slate-400 shrink-0" />
                            <span className="font-medium text-sm tracking-normal truncate flex-1 text-left">Sign Out</span>
                          </button>
                        </nav>
                      </div>

                      {/* Branch Info / Footer on Mobile Menu */}
                      <div className="p-3 border-t border-slate-800 shrink-0 bg-[#0B0F19]">
                        <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50">
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mb-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Terminal: <span className="text-white capitalize">{role}</span>
                          </p>
                          <p className="text-white text-xs font-semibold truncate">
                            {(branches.length > 0 ? branches : mockPharmacies).find(p => p.id === selectedBranchId)?.name || 'Central Hub'}
                          </p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                  {/* Desktop Toggle */}
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:flex hidden h-9 w-9 rounded-lg hover:bg-slate-100 bg-slate-50 text-slate-500 shrink-0">
                    <Menu size={18} />
                  </Button>
                </>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                <div className="hidden md:flex h-9 bg-slate-50 rounded-lg px-2 sm:px-2.5 border border-slate-200/80 items-center gap-1.5 min-w-0 shrink max-w-[140px] sm:max-w-[190px] lg:max-w-[240px]">
                  <span className="text-xs text-slate-500 font-medium shrink-0">Branch:</span>
                  {(role === 'admin' || role === 'merchant' || currentUser?.role === 'Company Admin' || currentUser?.role === 'Store Manager') ? (
                    <select 
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer truncate max-w-[95px] sm:max-w-[140px] lg:max-w-[185px]"
                    >
                      <option value="all">🏢 All Branches (Consolidated)</option>
                      {(branches.length > 0 ? branches : mockPharmacies)
                        .filter(p => p.status === 'active' && !p.id.includes('warehouse'))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      }
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {(branches.length > 0 ? branches : mockPharmacies).find(p => p.id === selectedBranchId)?.name || 'Central Hub'}
                    </span>
                  )}
                </div>
                {isOnline ? (
                  <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.4)] shrink-0"></div>
                    <span className="hidden xl:inline text-xs font-medium text-emerald-700 whitespace-nowrap">Master Sync Active</span>
                    <span className="xl:hidden text-[11px] font-medium text-emerald-700 whitespace-nowrap">Online</span>
                    {pendingCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-[10px] text-white font-medium px-1.5 py-0.2 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 px-2 sm:px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0"></div>
                    <span className="hidden xl:inline text-xs font-medium text-amber-800 whitespace-nowrap">Autonomous POS</span>
                    <span className="xl:hidden text-[11px] font-medium text-amber-800 whitespace-nowrap">Offline</span>
                    {pendingCount > 0 && (
                      <span className="ml-1 bg-amber-600 text-[10px] text-white font-medium px-1.5 py-0.2 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="relative group hidden 2xl:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <Input 
                  placeholder="Global search..." 
                  className="pl-9 pr-3 w-44 2xl:w-56 h-9 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-blue-600/10 text-slate-900 text-xs font-normal placeholder:text-slate-400 shadow-none"
                />
              </div>
              
              {!pwa.isInstalled && (
                <Button 
                  onClick={() => pwa.setShowInstallModal(true)}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                  title="Download or Install Teki Pharm App"
                >
                  <HardDrive size={13} className="text-white shrink-0" />
                  <span className="hidden xl:inline">Install App</span>
                </Button>
              )}

              <Button 
                onClick={() => setIsAstraModalOpen(true)}
                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer shrink-0"
                title="Open DataStax Astra CQL Database Code & .env Setup"
              >
                <Database size={13} className="text-white shrink-0" />
                <span className="hidden xl:inline">Astra CQL Setup</span>
              </Button>

              {(role === 'admin' || currentUser?.role === 'Kernel Admin') && (
                <Button 
                  onClick={() => setIsAdminSecurityOpen(true)}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-900 hover:bg-black text-amber-400 border border-amber-400/20 font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  title="Manage /admin credentials & endpoint"
                >
                  <KeyRound size={13} className="text-amber-400 shrink-0" />
                  <span className="hidden xl:inline">Admin Security</span>
                </Button>
              )}

              <Button variant="ghost" size="icon" className="h-8 sm:h-9 w-8 sm:w-9 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg relative shrink-0">
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </Button>

              {/* Enhanced User Account & Management Menu */}
              <UserAccountMenu
                currentUser={currentUser}
                role={role}
                selectedBranchId={selectedBranchId}
                branches={branches.length > 0 ? branches : mockPharmacies}
                onLogout={handleLogout}
                onUserUpdate={(u) => {
                  setCurrentUser(u);
                  localStorage.setItem('ph_current_user', JSON.stringify(u));
                }}
                onNavigate={(newView) => setView(newView as DashView)}
                onOpenAdminSecurity={() => setIsAdminSecurityOpen(true)}
                onSwitchRole={(r) => {
                  setRole(r);
                  localStorage.setItem('ph_user_role', r);
                }}
              />
            </div>
          </header>
        )}

        {/* View Port */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar bg-slate-50/50">
            <div className={`${view === 'pos' ? 'p-1.5 sm:p-2.5 lg:p-4 pb-2 sm:pb-4 min-h-full flex flex-col max-w-full' : 'p-3 sm:p-5 md:p-6 pb-8 md:pb-10 min-h-full flex flex-col max-w-full'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={view + role}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {!hasAccessToView(view) ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-xl border border-rose-100 text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in duration-300">
                      <div className="p-4 bg-rose-50 rounded-full text-rose-600">
                        <Lock size={48} className="stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-950">Security Access Violation</h2>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-wider leading-relaxed">
                        Your account ({currentUser?.name || 'Staff Member'}) does not possess the granular capability required to view the <span className="text-rose-600 font-black italic">{view.replace('admin_', '').toUpperCase()}</span> module.
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        Contact System Administrator to elevate your clearance level.
                      </p>
                      <Button onClick={() => setView('overview')} className="h-12 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                        Return to Safe Area
                      </Button>
                    </div>
                  ) : (
                    <>
                      {view === 'overview' && (<>
                        <WorkflowDashboard labs={labOrders} imaging={imagingOrders} tickets={queueTickets} charges={charges} user={currentUser} onNavigate={v => setView(v as DashView)} />
                        <OverviewView role={role} setView={(v) => setView(v as any)} selectedBranchId={selectedBranchId} />
                      </>)}
                      {view === 'saas_control' && (
                        <SuperAdminSaaSView
                          isSuperAdmin={role === 'admin' || currentUser?.role === 'Kernel Admin'}
                          activeTenantSlug={activeTenant?.slug || currentUser?.tenantSlug || null}
                          onSwitchToCompanyPortal={(slug) => {
                            if (!slug) {
                              apiService.tenants.setActiveContext(null);
                              setActiveTenant(null);
                              navigateTo('/admin');
                              toast.info('Switched to Consolidated All-Businesses Super Admin View');
                            } else {
                              apiService.tenants.setActiveContext(slug);
                              const found = allTenants.find(t => t.slug === slug);
                              if (found) setActiveTenant(found);
                              navigateTo(`/${slug}`);
                              setView('overview');
                              toast.success(`Entered dedicated company workspace: /${slug}`);
                            }
                          }}
                        />
                      )}
                      {view === 'inventory' && <InventoryView selectedBranchId={selectedBranchId} />}
                      {view === 'pos' && <POSView selectedBranchId={selectedBranchId} />}
                      {view === 'warehouse' && <WarehouseView />}
                      {view === 'transfer' && <TransferView />}
                      {view === 'sales' && <AdminAnalytics selectedBranchId={selectedBranchId} />}
                      {view === 'history' && <OrderHistoryView selectedBranchId={selectedBranchId} />}
                      {view === 'owing_records' && <OwingRecordsView selectedBranchId={selectedBranchId} />}
                      {view === 'orders' && <B2BLogisticsView />}
                      {view === 'staff' && <StaffManagementView selectedBranchId={selectedBranchId} />}
                      {view === 'expenses' && <ExpensesView selectedBranchId={selectedBranchId} />}
                      
                      {/* Supply & Logistics Sub-views */}
                      {view === 'new_supply' && <SupplyManager subView="new_supply" selectedBranchId={selectedBranchId} />}
                      {view === 'supply_records' && <SupplyManager subView="supply_records" selectedBranchId={selectedBranchId} />}
                      {view === 'new_supplier' && <SupplyManager subView="new_supplier" selectedBranchId={selectedBranchId} />}
                      {view === 'list_of_suppliers' && <SupplyManager subView="list_of_suppliers" selectedBranchId={selectedBranchId} />}
                      
                      {/* Unified Healthcare Views */}
                      {view === 'patients' && (
                        <PatientCentral 
                          patients={patients} 
                          onAddPatient={(p) => {
                            const newArr = [p, ...patients];
                            setPatients(newArr);
                            localStorage.setItem('tm_patients', JSON.stringify(newArr));
                          }}
                          encounters={encounters}
                          labOrders={labOrders}
                          imagingOrders={imagingOrders}
                          charges={charges}
                          onSelectPatientForConsultation={(p) => {
                            setSelectedConsultationPatientId(p.id);
                            setView('emr');
                          }}
                          onTransferPatient={(p, targetDept, notes) => {
                            const newTicket: any = {
                              id: `q-${Date.now()}`,
                              ticketNumber: `${targetDept.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                              patientId: p.id,
                              patientName: p.fullName,
                              mrn: p.mrn,
                              department: targetDept === 'Inpatient Ward' ? 'Triage' : targetDept,
                              status: 'Waiting',
                              priority: 'Normal',
                              issuedAt: new Date().toISOString(),
                              notes: notes || 'Transferred from Patient Central'
                            };
                            const updatedTickets = [newTicket, ...queueTickets];
                            setQueueTickets(updatedTickets);
                            localStorage.setItem('tm_queue_tickets', JSON.stringify(updatedTickets));
                            toast.success(`Patient ${p.fullName} routed to ${targetDept} Queue!`);
                          }}
                        />
                      )}
                      {view === 'emr' && (
                        <ClinicalEMRView 
                          patients={patients} 
                          products={clinicalProducts}
                          labCatalog={labCatalog} 
                          imagingCatalog={imagingCatalog}
                          encounters={encounters}
                          labOrders={labOrders}
                          imagingOrders={imagingOrders}
                          initialPatientId={selectedConsultationPatientId}
                          onSaveEncounter={(enc) => {
                            const existingIndex = encounters.findIndex(e => e.id === enc.id);
                            let newEnc;
                            if (existingIndex >= 0) {
                              newEnc = encounters.map((e, idx) => idx === existingIndex ? enc : e);
                            } else {
                              newEnc = [enc, ...encounters];
                            }
                            setEncounters(newEnc);
                            if (enc.status === 'Completed') {
                              setQueueTickets(prev => {
                                const completed = prev.map(t => t.patientId === enc.patientId && t.department === 'Doctor Consultation' && !['Completed','Cancelled'].includes(t.status) ? { ...t, status: 'Completed' } : t);
                                return enc.prescriptions?.length ? routePatient(completed, { id: enc.patientId, fullName: enc.patientName, mrn: enc.mrn }, 'Pharmacy', 'Signed consultation prescription', enc.id) : completed;
                              });
                            }
                            localStorage.setItem('tm_encounters', JSON.stringify(newEnc));
                          }}
                          onRequestLabTest={(testId, p, encId, customItem) => {
                            const cat = customItem || labCatalog.find(c => c.id === testId);
                            if (customItem && !labCatalog.some(c => c.id === customItem.id)) {
                              setLabCatalog(prev => [customItem, ...prev]);
                            }
                            const newLab: any = {
                              id: `labord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                              patientId: p.id,
                              patientName: p.fullName,
                              mrn: p.mrn,
                              encounterId: encId,
                              testId,
                              testName: cat?.name || testId,
                              category: cat?.category || 'Haematology',
                              accessionNumber: `ACC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                              sampleType: cat?.sampleType || 'Blood',
                              sampleStatus: 'Awaiting Collection',
                              orderStatus: 'ORDERED',
                              priceNaira: cat?.priceNaira || 2500,
                              billingStatus: 'Pending',
                              createdAt: new Date().toISOString()
                            };
                            setLabOrders(prev => [newLab, ...prev]);
                            queueDiagnostic(newLab);
                          }}
                          onRequestImagingScan={(testId, p, encId, customItem) => {
                            const cat = customItem || imagingCatalog.find(c => c.id === testId);
                            if (customItem && !imagingCatalog.some(c => c.id === customItem.id)) {
                              setImagingCatalog(prev => [customItem, ...prev]);
                            }
                            const newImg: any = {
                              id: `imgord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                              patientId: p.id,
                              patientName: p.fullName,
                              mrn: p.mrn,
                              encounterId: encId,
                              testId,
                              testName: cat?.name || testId,
                              modality: cat?.modality || 'X-Ray',
                              bodySite: cat?.bodySite || 'General',
                              orderStatus: 'Awaiting Scan',
                              priceNaira: cat?.priceNaira || 8000,
                              billingStatus: 'Pending',
                              createdAt: new Date().toISOString()
                            };
                            setImagingOrders(prev => [newImg, ...prev]);
                            queueDiagnostic(newImg, true);
                          }}
                          onTransferPatient={(p, targetDept, notes) => {
                            const newTicket: any = {
                              id: `q-${Date.now()}`,
                              ticketNumber: `${targetDept.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                              patientId: p.id,
                              patientName: p.fullName,
                              mrn: p.mrn,
                              department: targetDept === 'Inpatient Ward' ? 'Triage' : targetDept,
                              status: 'Waiting',
                              priority: 'Normal',
                              issuedAt: new Date().toISOString(),
                              notes: notes || 'Transferred from OPD Clinical Consultation'
                            };
                            const updatedTickets = [newTicket, ...queueTickets];
                            setQueueTickets(updatedTickets);
                            localStorage.setItem('tm_queue_tickets', JSON.stringify(updatedTickets));
                          }}
                          currentUser={currentUser}
                        />
                      )}
                      {view === 'rapid_console' && (
                        <RapidResultConsole
                          labOrders={labOrders}
                          labCatalog={labCatalog}
                          patients={patients}
                          onUpdateLabOrder={(updated) => {
                            const exists = labOrders.some(l => l.id === updated.id);
                            const newLabs = exists
                              ? labOrders.map(l => l.id === updated.id ? updated : l)
                              : [updated, ...labOrders];
                            setLabOrders(newLabs);
                            if (!exists && updated.pricingStatus === 'Quoted') setCharges(prev => prev.some(c => c.id === 'charge-' + updated.id) ? prev : [chargeForOrder(updated), ...prev]);
                            returnReleasedDiagnostic(updated);
                            localStorage.setItem('tm_lab_orders', JSON.stringify(newLabs));
                          }}
                          onRegisterPatient={(newPatient) => {
                            const exists = patients.some(p => p.id === newPatient.id);
                            if (!exists) {
                              const updatedPatients = [newPatient, ...patients];
                              setPatients(updatedPatients);
                              localStorage.setItem('tm_patients', JSON.stringify(updatedPatients));
                            }
                          }}
                          onNavigate={(targetView) => setView(targetView as DashView)}
                          currentUser={currentUser}
                          companyLogo={activeDashboardLogo}
                        />
                      )}
                      {view === 'module_config' && <TenantModuleSettingsView />}
                      {view === 'patient_portal' && (
                        <PatientPortalView
                          currentUser={currentUser}
                          labOrders={labOrders}
                          onOnlineBookingCreated={(booking) => {
                            const newTicket: any = {
                              id: `q-${Date.now()}`,
                              ticketNumber: `ONL-${Math.floor(100 + Math.random() * 899)}`,
                              patientId: currentUser?.id || `pat-${Date.now()}`,
                              patientName: booking.patientName,
                              mrn: currentUser?.mrn || `TK-${Math.floor(10000 + Math.random() * 89999)}`,
                              department: 'Reception',
                              orderSource: 'ONLINE',
                              status: 'Waiting',
                              priority: 'Priority',
                              issuedAt: new Date().toISOString(),
                              notes: `Online Paid (${booking.paymentRef}): ${booking.tests.map((t) => t.name).join(', ')}`
                            };
                            const nextQ = [newTicket, ...queueTickets];
                            setQueueTickets(nextQ);
                            localStorage.setItem('tm_queue_tickets', JSON.stringify(nextQ));
                          }}
                        />
                      )}
                      {view === 'lab' && (
                        <LaboratoryLIMSView 
                          labOrders={labOrders} 
                          labCatalog={labCatalog} 
                          patients={patients}
                          onUpdateLabOrder={(updated) => {
                            setLabOrders(prev => prev.map(l => l.id === updated.id ? updated : l));
                            returnReleasedDiagnostic(updated);
                          }}
                          currentUser={currentUser}
                        />
                      )}
                      {view === 'radiology' && (
                        <RadiologyView 
                          imagingOrders={imagingOrders} 
                          imagingCatalog={imagingCatalog} 
                          patients={patients}
                          onUpdateImagingOrder={(updated) => {
                            setImagingOrders(prev => prev.map(i => i.id === updated.id ? updated : i));
                            returnReleasedDiagnostic(updated, true);
                          }}
                          currentUser={currentUser}
                        />
                      )}
                      {view === 'inpatient' && (
                        <InpatientWardView 
                          wards={wards} 
                          beds={beds} 
                          admissions={admissions} 
                          patients={patients}
                          onAdmitPatient={(adm) => {
                            const newAdms = [adm, ...admissions];
                            setAdmissions(newAdms);
                            localStorage.setItem('tm_admissions', JSON.stringify(newAdms));
                            setBeds(prev => prev.map(b => b.id === adm.bedId ? { ...b, status: 'Occupied', patientId: adm.patientId, patientName: adm.patientName, admittedAt: adm.admittedAt } : b));
                          }}
                          onDischargePatient={(admId) => {
                            const target = admissions.find(a => a.id === admId);
                            setAdmissions(prev => prev.filter(a => a.id !== admId));
                            if (target) {
                              setBeds(prev => prev.map(b => b.id === target.bedId ? { ...b, status: 'Available', patientId: undefined, patientName: undefined } : b));
                            }
                          }}
                          currentUser={currentUser}
                        />
                      )}
                      {view === 'queue' && (
                        <HospitalQueueManager 
                          queueTickets={queueTickets} 
                          patients={patients}
                          onIssueTicket={(t) => {
                            const newQ = [t, ...queueTickets];
                            setQueueTickets(newQ);
                            localStorage.setItem('tm_queue_tickets', JSON.stringify(newQ));
                          }}
                          onTransferTicket={(tid, dept) => setQueueTickets(prev => transferTicket(prev, tid, dept))}
                          onUpdateTicketStatus={(tid, st) => {
                            setQueueTickets(prev => prev.map(q => q.id === tid ? { ...q, status: st } : q));
                          }}
                          currentUser={currentUser}
                        />
                      )}
                      {view === 'appointments' && (
                        <AppointmentsView 
                          appointments={appointments} 
                          patients={patients}
                          onBookAppointment={(apt) => {
                            const newApts = [apt, ...appointments];
                            setAppointments(newApts);
                            localStorage.setItem('tm_appointments', JSON.stringify(newApts));
                          }}
                        />
                      )}
                      {view === 'billing' && (
                        <HospitalBillingView 
                          charges={charges} 
                          hmoClaims={hmoClaims} 
                          patients={patients}
                          onAddCharge={(c) => {
                            const newChg = [c, ...charges];
                            setCharges(newChg);
                            localStorage.setItem('tm_charges', JSON.stringify(newChg));
                          }}
                          onPayCharge={(cid) => {
                            setCharges(prev => prev.map(c => c.id === cid ? { ...c, paymentStatus: 'Paid' } : c));
                            const charge = charges.find(c => c.id === cid);
                            if (charge?.sourceOrderId) {
                              setLabOrders(prev => prev.map(o => o.id === charge.sourceOrderId ? { ...o, billingStatus: 'Paid' } : o));
                              setImagingOrders(prev => prev.map(o => o.id === charge.sourceOrderId ? { ...o, billingStatus: 'Paid' } : o));
                            }
                          }}
                        />
                      )}
                      {view === 'ai_assistant' && (
                        <AIHealthcareAssistant 
                          patients={patients} 
                          encounters={encounters} 
                          labOrders={labOrders} 
                          products={clinicalProducts}
                        />
                      )}
                      {view === 'admin_users' && <UserManagementView selectedBranchId={selectedBranchId} />}
                      {view === 'admin_products' && <ProductCatalogView selectedBranchId={selectedBranchId} currentUser={currentUser} />}
                      {view === 'admin_marketing' && <MarketingConsole />}
                      {view === 'admin_reports' && <ReportsAnalyticsView selectedBranchId={selectedBranchId} />}
                      {view === 'admin_customers' && <CustomerCentral selectedBranchId={selectedBranchId} />}
                      {view === 'admin_settings' && (
                        <SystemSettingsView 
                          currentUser={currentUser} 
                          onUserUpdate={(u) => setCurrentUser(u)} 
                          selectedBranchId={selectedBranchId}
                        />
                      )}
                      {view === 'admin_integrations' && <IntegrationsView />}
                      {view === 'admin_merchants' && (
                        <MerchantStoreView 
                          onSelectBranch={(id) => {
                            setSelectedBranchId(id);
                            setView('admin_products');
                          }} 
                        />
                      )}
                      {view === 'admin_orders' && <OrderHistoryView selectedBranchId={selectedBranchId} />}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Static ground footer - permanently stationed at the bottom, never scrolls or blocks content */}
          <div className="shrink-0 bg-white z-20">
            <DashboardFooter
              logoUrl={hasCustomCompanyLogo ? activeTenant?.logo : undefined}
              companyName={!isAdminRoute ? activeTenant?.companyName : undefined}
            />
          </div>
        </div>
        
        {/* Floating welcome banner */}
        <AnimatePresence>
          {showWelcome && isLoggedIn && currentUser && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-6 right-6 z-[100] max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-[1.5rem] shadow-2xl shadow-slate-950/30 border border-slate-800 flex items-start gap-3.5"
            >
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="flex-1 pr-6 text-left">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 leading-none">Security Active Terminal</p>
                <h4 className="text-sm font-black text-white leading-snug">
                  Welcome to <span className="text-blue-300 font-black italic">{currentBranchName}</span>, <span className="text-blue-100 italic">{currentUser.name}</span>
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  Role: <span className="text-slate-300 font-extrabold">{currentUser.role || 'Staff'}</span>
                </p>
              </div>
              <button 
                onClick={() => setShowWelcome(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inter-Department Beep & Live Alert Hub */}
        <DepartmentCommHub
          open={isCommHubOpen}
          onOpenChange={setIsCommHubOpen}
          currentDepartment={getRoleDefinition(currentUser?.role).department}
          currentUserName={currentUser?.name || 'TekiLab Staff'}
        />

        {/* Super Admin Security Credentials Modal */}
        <AdminSecurityModal 
          isOpen={isAdminSecurityOpen} 
          onClose={() => setIsAdminSecurityOpen(false)} 
          currentUser={currentUser} 
          onUserUpdate={(u) => setCurrentUser(u)} 
        />

        {/* DataStax Astra CQL & Environment Variables Setup Modal */}
        <AstraDatabaseSetupModal
          isOpen={isAstraModalOpen}
          onClose={() => setIsAstraModalOpen(false)}
        />

        {/* PWA App Installation Modal */}
        <PWAInstallModal 
          open={pwa.showInstallModal}
          onClose={() => pwa.setShowInstallModal(false)}
          deviceOS={pwa.deviceOS}
          isInstallable={pwa.isInstallable}
          isInstalled={pwa.isInstalled}
          onTriggerNativeInstall={pwa.triggerNativeInstall}
          onMarkInstalled={pwa.markAsInstalledOrDownloaded}
          isAdmin={role === 'admin' || currentUser?.role === 'Kernel Admin' || isAdminRoute}
        />

        {/* Welcome Splash Screen for Installed App */}
        <SplashScreen 
          show={pwa.showSplashScreen && !isLoggedIn}
          onFinish={pwa.dismissSplashScreen} 
          deviceOS={pwa.deviceOS}
          isStandalone={pwa.isStandalone}
          logoUrl={hasCustomCompanyLogo ? activeTenant?.logo : undefined}
          companyName={!isAdminRoute ? activeTenant?.companyName : undefined}
        />
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, isOpen, children, currentView, setView, isExpanded, onToggle, onMouseEnter, badge, onNavigate }: any) {

  const getSubIcon = (child: any, isChildActive: boolean) => {
    if (child.type === 'new_supply') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-orange-500">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16,8 20,8 23,11 23,16 16,16" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
          <polygon points="12,2 14,5 18,5 15,7 16,11 12,9 8,11 9,7 6,5 10,5" fill="#F97316" stroke="#F97316" transform="scale(0.5) translate(16, 4)" />
        </svg>
      );
    }
    if (child.type === 'supply_records') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-amber-500">
          <path d="M14 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8" />
          <path d="M14 2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
          <line x1="16" y1="6" x2="20" y2="6" strokeWidth="1.5" />
          <line x1="16" y1="10" x2="20" y2="10" strokeWidth="1.5" />
          <circle cx="7" cy="20" r="2" />
          <circle cx="17" cy="20" r="2" />
        </svg>
      );
    }
    if (child.type === 'new_supplier') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-emerald-500">
          <rect x="2" y="3" width="13" height="12" rx="2" />
          <polygon points="15,7 19,7 22,10 22,15 15,15" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      );
    }
    if (child.type === 'list_of_suppliers') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-blue-500">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <polygon points="14,6 18,6 21,9 21,14 14,14" />
          <circle cx="6" cy="17" r="2" />
          <circle cx="16" cy="17" r="2" />
          <line x1="8" y1="7" x2="11" y2="7" strokeWidth="1.5" />
          <line x1="8" y1="10" x2="11" y2="10" strokeWidth="1.5" />
        </svg>
      );
    }
    return (
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isChildActive ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
    );
  };

  if (children && children.length > 0) {
    const isAnyChildActive = children.some((child: any) => currentView === child.view);
    return (
      <div className="space-y-0.5">
        <button
          onClick={onToggle}
          onMouseEnter={onMouseEnter}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative text-slate-300 hover:text-white hover:bg-slate-800/60`}
        >
          <div className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">
            {icon}
          </div>
          {isOpen && <span className="font-medium text-[13px] tracking-normal truncate flex-1 text-left">{label}</span>}
          {isOpen && (
            <span className="text-[10px] text-slate-500 font-mono transition-transform">
              {isExpanded ? '▼' : '►'}
            </span>
          )}
        </button>
        {isExpanded && isOpen && (
          <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-5 my-0.5">
            {children.map((child: any) => {
              const isChildActive = currentView === child.view;
              return (
                <button
                  key={child.label}
                  onClick={() => {
                    setView(child.view);
                    onNavigate?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all text-xs leading-none ${
                    isChildActive 
                      ? 'bg-blue-600/20 text-blue-400 font-medium' 
                      : 'text-slate-400 font-normal hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {getSubIcon(child, isChildActive)}
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        onClick?.(e);
        onNavigate?.();
      }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} transition-colors shrink-0`}>
        {icon}
      </div>
      {isOpen && <span className="font-medium text-[13px] tracking-normal truncate flex-grow text-left">{label}</span>}
      {isOpen && badge !== undefined && badge !== null && (
        <span className="ml-auto bg-blue-600 text-white text-[10px] font-medium h-4 min-w-[18px] px-1.5 rounded-full flex items-center justify-center shrink-0">
          {badge}
        </span>
      )}
      {active && isOpen && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-4 bg-white rounded-r-full"
        />
      )}
    </button>
  );
}


