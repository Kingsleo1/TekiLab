import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  MoreHorizontal, 
  Lock, 
  Briefcase,
  Shield, 
  Edit, 
  Trash2, 
  Key,
  Sliders,
  Check,
  ShoppingCart,
  Package,
  ArrowRightLeft,
  Truck,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiService, isSupabaseConfigured, supabase } from '../../services/api';
import { DEFAULT_STAFF_MEMBERS as DEFAULT_STAFF } from '../../services/mockData';
import { generateSafePassword, SAMPLE_PASSWORDS, evaluatePasswordStrength } from '@/src/lib/passwordUtils';
import { 
  Sparkles, 
  Store, 
  User as UserIcon, 
  Warehouse, 
  BarChart3, 
  Megaphone, 
  Zap,
  Mail,
  Eye,
  EyeOff,
  BadgeCheck
} from 'lucide-react';

// Define DEFAULT permission sets per role
const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  'Kernel Admin': [
    'canAccessPOS', 
    'canManageStaff', 
    'canManageCustomers', 
    'canManageInventory', 
    'canAccessSuppliers', 
    'canAccessExpenses', 
    'canAccessTransfers', 
    'canAccessWarehouse', 
    'canViewReports', 
    'canManageBranches', 
    'canManageMarketing', 
    'canManageIntegrations', 
    'canAdjustSettings', 
    'canApplyDiscounts', 
    'canDispenseControlled'
  ],
  'Store Manager': [
    'canAccessPOS', 
    'canManageStaff', 
    'canManageCustomers', 
    'canManageInventory', 
    'canAccessSuppliers', 
    'canAccessExpenses', 
    'canAccessTransfers', 
    'canAccessWarehouse', 
    'canViewReports', 
    'canAdjustSettings', 
    'canApplyDiscounts', 
    'canDispenseControlled'
  ],
  'Terminal Manager': [
    'canAccessPOS', 
    'canManageCustomers', 
    'canManageInventory', 
    'canAccessTransfers', 
    'canAccessSuppliers', 
    'canApplyDiscounts', 
    'canDispenseControlled'
  ],
  'Certified Dispenser': [
    'canAccessPOS', 
    'canManageInventory', 
    'canDispenseControlled'
  ],
  'POS operator': [
    'canAccessPOS', 
    'canManageCustomers'
  ],
  'Logistics Coordinator': [
    'canManageInventory', 
    'canAccessTransfers', 
    'canAccessSuppliers', 
    'canAccessWarehouse'
  ]
};

// Define list of customizable granular capabilities
const GRANULAR_CAPABILITIES = [
  {
    key: 'canAccessPOS',
    title: 'Sales Hub & POS',
    description: 'Process transactions, log customer sales, & manage checkout carts.',
    icon: <ShoppingCart size={14} className="text-blue-600" />
  },
  {
    key: 'canManageStaff',
    title: 'Manage Staff',
    description: 'Add branch personnel, customize credentials, and configure permissions.',
    icon: <Users size={14} className="text-teal-600" />
  },
  {
    key: 'canManageCustomers',
    title: 'Customer Central',
    description: 'Manage patient profiles, customer debt accounts, and pharmacy credit records.',
    icon: <UserIcon size={14} className="text-indigo-600" />
  },
  {
    key: 'canManageInventory',
    title: 'Products & Inventory',
    description: 'Add, update or deplete stock levels and modify pricing catalog indices.',
    icon: <Package size={14} className="text-amber-600" />
  },
  {
    key: 'canAccessSuppliers',
    title: 'Supply & Procurement',
    description: 'Onboard distributors, file supplier invoices & record new supply batches.',
    icon: <Truck size={14} className="text-orange-600" />
  },
  {
    key: 'canAccessExpenses',
    title: 'Expenses Ledger',
    description: 'File branch expenditures, operational costs, & verify team payouts.',
    icon: <CreditCard size={14} className="text-rose-600" />
  },
  {
    key: 'canAccessTransfers',
    title: 'Stock Transfers',
    description: 'Initiate and receive inventory transfers between branch nodes & warehouse.',
    icon: <ArrowRightLeft size={14} className="text-emerald-600" />
  },
  {
    key: 'canAccessWarehouse',
    title: 'Warehouse Controller',
    description: 'Manage central warehouse bulk stocks, receiving docks, and distribution.',
    icon: <Warehouse size={14} className="text-purple-600" />
  },
  {
    key: 'canViewReports',
    title: 'Reports & Analytics',
    description: 'Access business intelligence, revenue metrics, and audit log analysis.',
    icon: <BarChart3 size={14} className="text-green-600" />
  },
  {
    key: 'canManageBranches',
    title: 'Branches Management',
    description: 'Configure and monitor multi-branch pharmacy nodes and stores.',
    icon: <Store size={14} className="text-cyan-600" />
  },
  {
    key: 'canManageMarketing',
    title: 'Marketing Console',
    description: 'Manage pharmacy campaigns, promotional broadcasts, and alerts.',
    icon: <Megaphone size={14} className="text-pink-600" />
  },
  {
    key: 'canManageIntegrations',
    title: 'Integrations & APIs',
    description: 'Manage ERP system connectors, hardware devices, and API credentials.',
    icon: <Zap size={14} className="text-yellow-600" />
  },
  {
    key: 'canAdjustSettings',
    title: 'System Settings',
    description: 'Configure system preferences, operational defaults, and receipt parameters.',
    icon: <Settings size={14} className="text-slate-600" />
  },
  {
    key: 'canApplyDiscounts',
    title: 'POS Markdowns & Discounts',
    description: 'Grant discounts or customize unit pricing directly on POS terminals.',
    icon: <Check size={14} className="text-amber-600" />
  },
  {
    key: 'canDispenseControlled',
    title: 'Dispense Controlled Meds',
    description: 'Dispense restricted, prescription-only, or controlled pharmaceuticals.',
    icon: <ShieldCheck size={14} className="text-indigo-600" />
  }
];

export function StaffManagementView({ selectedBranchId }: { selectedBranchId?: string }) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Terminal Manager',
    email: '',
    password: '',
    branchId: selectedBranchId || 'pharma-1'
  });

  // Permissions adjustments modal state
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTableScroll = () => {
    if (tableScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const handleTableScroll = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      const scrollAmount = 350;
      tableScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Keep branch ID field updated with prop changes
  useEffect(() => {
    if (selectedBranchId) {
      setFormData(prev => ({ ...prev, branchId: selectedBranchId }));
    }
  }, [selectedBranchId]);

  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      const [branchList, staff] = await Promise.all([
        apiService.pharmacies.list(),
        apiService.staff.list(selectedBranchId)
      ]);
      const activeOnly = branchList.filter((p: any) => p.status === 'active' && !p.id.includes('warehouse'));
      setBranches(activeOnly);
      if (!selectedBranchId && activeOnly.length > 0) {
        setFormData(prev => ({ ...prev, branchId: activeOnly[0].id }));
      }
      setStaffList(staff);
    } catch (err) {
      console.error('Failed to load staff list from database', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load staff and active branches on mount and branch change
  useEffect(() => {
    loadStaffData();

    const handleUpdate = () => loadStaffData();
    window.addEventListener('pharmacy_staff_updated', handleUpdate);
    window.addEventListener('database_synced', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let subscription: any = null;
    if (isSupabaseConfigured() && supabase) {
      subscription = supabase
        .channel('public:staff_dashboard_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
          loadStaffData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('pharmacy_staff_updated', handleUpdate);
      window.removeEventListener('database_synced', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (subscription && supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedBranchId]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter the staff member full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Please enter a valid work email address.');
      return;
    }
    if (!formData.password.trim() || formData.password.length < 4) {
      toast.error('Please create a password with at least 4 characters.');
      return;
    }

    setIsSubmitting(true);

    const levelsMap: Record<string, number> = {
      'Kernel Admin': 5,
      'Terminal Manager': 4,
      'Store Manager': 3,
      'Certified Dispenser': 2,
      'POS operator': 2,
      'Logistics Coordinator': 1
    };

    const targetBranch = formData.branchId || (selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : (branches[0]?.id || 'pharma-1'));
    const targetBranchObj = branches.find(b => b.id === targetBranch);
    const branchName = targetBranchObj ? targetBranchObj.name : 'Branch Dashboard';

    const newStaff = {
      id: `ST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: formData.name.trim(),
      role: formData.role,
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim(),
      status: 'online' as const,
      level: levelsMap[formData.role] || 1,
      branchId: targetBranch,
      permissions: DEFAULT_PERMISSIONS_BY_ROLE[formData.role] || ['canAccessPOS'],
      joinDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    try {
      await apiService.staff.add(newStaff);
      await loadStaffData();
      toast.success(`Staff member "${newStaff.name}" registered and authenticated!`, {
        description: `Credentials active for ${branchName}. Staff can log in immediately.`
      });
      setFormData({ 
        name: '', 
        role: 'Terminal Manager', 
        email: '', 
        password: '', 
        branchId: targetBranch
      });
      setIsAddingStaff(false);
    } catch (err: any) {
      console.error('Failed to add staff member', err);
      toast.error(err?.message || 'Failed to register staff to database');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    try {
      await apiService.staff.delete(id);
      await loadStaffData();
      toast.success(`Record for ${name} removed from database`);
    } catch (err) {
      console.error('Failed to delete staff member', err);
      toast.error('Failed to remove staff record');
    }
  };

  // Open Permissions adjustment dialog
  const handleOpenAdjustPermissions = (staff: any) => {
    setSelectedStaffForPermissions(staff);
    setEditRole(staff.role);
    setEditLevel(staff.level || 1);
    setEditPermissions(staff.permissions || DEFAULT_PERMISSIONS_BY_ROLE[staff.role] || ['canAccessPOS']);
  };

  // Toggle capability
  const togglePermission = (perm: string) => {
    if (editPermissions.includes(perm)) {
      setEditPermissions(editPermissions.filter(p => p !== perm));
    } else {
      setEditPermissions([...editPermissions, perm]);
    }
  };

  // Save changes to database in real time
  const handleSavePermissions = async () => {
    if (!selectedStaffForPermissions) return;
    try {
      await apiService.staff.update(selectedStaffForPermissions.id, {
        role: editRole,
        level: editLevel,
        permissions: editPermissions
      });
      await loadStaffData();
      toast.success(`Access permissions for ${selectedStaffForPermissions.name} updated and synced to database!`);
      setSelectedStaffForPermissions(null);
    } catch (err) {
      console.error('Failed to update permissions', err);
      toast.error('Failed to synchronize permissions with database');
    }
  };

  // Branch Isolation check - only display staff members within the current branch context
  const filteredStaff = selectedBranchId && selectedBranchId !== 'all'
    ? staffList.filter(s => s.branchId === selectedBranchId)
    : staffList;

  const totalStaffCount = filteredStaff.length;
  const activeStaffCount = filteredStaff.filter(s => s.status === 'online' || s.status === 'active').length;

  const getBranchName = (bId: string) => {
    const found = branches.find(b => b.id === bId);
    return found ? found.name : bId || 'Central Hub';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">RBAC Security Console</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Role-Based Access Control & Staff Orchestration</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
             <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none h-12 md:h-13 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
                   <UserPlus className="w-4 h-4 mr-2" /> Add New Staff Member
                </Button>
             </DialogTrigger>
             <DialogContent className="rounded-3xl border border-slate-200 p-0 max-w-xl w-[calc(100%-1.5rem)] max-h-[88vh] flex flex-col overflow-hidden bg-white text-slate-900 shadow-2xl font-['Roboto',sans-serif]">
                {/* Sticky Header */}
                <DialogHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-8 py-5 shrink-0">
                   <div className="flex items-center gap-3.5 pr-8">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 shrink-0">
                         <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                            <BadgeCheck className="w-3 h-3" /> Personnel Onboarding
                         </div>
                         <DialogTitle className="font-['Poppins',sans-serif] text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Add New Staff Member
                         </DialogTitle>
                         <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
                            Enter staff details, assign branch & role clearance, and configure login credentials.
                         </DialogDescription>
                      </div>
                   </div>
                </DialogHeader>

                {/* Scrollable Form Body */}
                <form onSubmit={handleAddStaff} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                   <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-5 max-h-[calc(88vh-165px)]">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                               <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                               Staff Full Name <span className="text-rose-500">*</span>
                            </span>
                            <span className="text-[11px] font-normal text-slate-400">Official Identity</span>
                         </label>
                         <div className="relative">
                            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input 
                              required 
                              placeholder="e.g. Pharm. Adaobi Nwachukwu" 
                              className="h-12 pl-10 pr-4 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl font-medium text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                         </div>
                      </div>

                      {/* Work Email */}
                      <div className="space-y-1.5">
                         <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                               <Mail className="w-3.5 h-3.5 text-blue-600" />
                               Work Email Address <span className="text-rose-500">*</span>
                            </span>
                            <span className="text-[11px] font-normal text-slate-400">Used for dashboard sign-in</span>
                         </label>
                         <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input 
                              required 
                              type="email" 
                              placeholder="e.g. adaobi@yourpharmacy.com" 
                              className="h-12 pl-10 pr-4 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl font-medium text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                         </div>
                      </div>

                      {/* Access Role & Branch Hub Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                               <Shield className="w-3.5 h-3.5 text-blue-600" />
                               Access Role / Tier <span className="text-rose-500">*</span>
                            </label>
                            <select 
                              className="w-full h-12 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl px-3.5 font-medium text-sm text-slate-900 shadow-2xs outline-none transition-all cursor-pointer"
                              value={formData.role}
                              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                               <option value="Terminal Manager">Terminal Manager</option>
                               <option value="Store Manager">Store Manager</option>
                               <option value="Certified Dispenser">Certified Dispenser</option>
                               <option value="POS operator">POS Operator</option>
                               <option value="Logistics Coordinator">Logistics Coordinator</option>
                            </select>
                         </div>

                         <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                               <Store className="w-3.5 h-3.5 text-blue-600" />
                               Assigned Branch <span className="text-rose-500">*</span>
                            </label>
                            <select 
                              className="w-full h-12 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-100 disabled:text-slate-600 rounded-xl px-3.5 font-medium text-sm text-slate-900 shadow-2xs outline-none transition-all cursor-pointer"
                              value={formData.branchId}
                              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                              disabled={!!selectedBranchId && selectedBranchId !== 'all'}
                            >
                               {branches.length === 0 ? (
                                 <option value="pharma-1">Central Pharmacy - Branch 01</option>
                               ) : (
                                 branches.map(b => (
                                   <option key={b.id} value={b.id}>{b.name}</option>
                                 ))
                               )}
                            </select>
                         </div>
                      </div>

                      {/* Role Capabilities Preview Box */}
                      <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-start gap-3">
                         <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                         <div className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">{formData.role} Default Clearance: </span>
                            Grants {(DEFAULT_PERMISSIONS_BY_ROLE[formData.role] || ['canAccessPOS']).length} active module permissions. You can customize individual permissions anytime after creation.
                         </div>
                      </div>

                      {/* Security Password Card */}
                      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                         <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                               <Key className="w-3.5 h-3.5 text-blue-600" />
                               Login Password <span className="text-rose-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const pwd = generateSafePassword();
                                setFormData({ ...formData, password: pwd });
                                setShowPassword(true);
                                toast.success(`Generated secure password: ${pwd}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Sparkles size={13} /> Auto-Generate Password
                            </button>
                         </div>

                         <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input 
                              required 
                              type={showPassword ? 'text' : 'password'} 
                              placeholder="Enter or generate a staff password" 
                              className="h-12 pl-10 pr-11 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl font-medium text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                         </div>

                         {formData.password && (
                           <div className="px-1">
                             {(() => {
                               const strength = evaluatePasswordStrength(formData.password);
                               return (
                                 <div className="flex items-center justify-between text-xs font-medium">
                                   <span className="text-slate-500">Password Security Strength:</span>
                                   <span className={`font-bold ${strength.color}`}>{strength.level}</span>
                                 </div>
                               );
                             })()}
                           </div>
                         )}

                         <div className="pt-1 border-t border-slate-200/80">
                           <p className="text-[11px] font-semibold text-slate-500 mb-2">
                             Quick-Select Sample Passwords (click to fill):
                           </p>
                           <div className="flex flex-wrap gap-1.5">
                             {SAMPLE_PASSWORDS.map((sample) => (
                               <button
                                 key={sample}
                                 type="button"
                                 onClick={() => {
                                   setFormData({ ...formData, password: sample });
                                   setShowPassword(true);
                                 }}
                                 className="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 shadow-2xs transition-all cursor-pointer"
                               >
                                 {sample}
                               </button>
                             ))}
                           </div>
                         </div>
                      </div>
                   </div>

                   {/* Sticky Footer */}
                   <div className="sticky bottom-0 z-20 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddingStaff(false)}
                        className="w-full sm:w-auto h-11 px-5 rounded-xl border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-white font-semibold text-xs tracking-wide shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Registering & Syncing...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Register & Authenticate Staff
                          </>
                        )}
                      </Button>
                   </div>
                </form>
             </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="rounded-[2rem] bg-indigo-600 p-8 text-white border-none shadow-2xl shadow-indigo-200">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Security Protocol</h4>
            <p className="text-2xl font-black italic tracking-tight mb-6">"Access is a privilege, not a right."</p>
            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
               <Lock className="w-5 h-5 text-indigo-300" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Last Audit: 2 Hours Ago</span>
            </div>
         </Card>
         <Card className="rounded-[2rem] bg-white p-8 border-none shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-6">
               <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Briefcase size={22} />
               </div>
               <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-3">Stable</Badge>
            </div>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Human Capital Yield</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{activeStaffCount} Active</h3>
         </Card>
         <Card className="rounded-[2rem] bg-white p-8 border-none shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-6">
               <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={22} />
               </div>
               <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3">High</Badge>
            </div>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Authorization Integrity</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">99.2%</h3>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
         <CardHeader className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <CardTitle className="text-xl font-black text-slate-900 tracking-tight leading-none">Personnel Directory</CardTitle>
               <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">
                 {isLoading ? 'Synchronizing with Supabase database...' : `Authenticated staff members (${filteredStaff.length} personnel)`}
               </CardDescription>
            </div>

            {/* Top Slider Navigation Controls */}
            <div className="flex items-center gap-2 self-end md:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Table Scroll</span>
               <button
                 type="button"
                 onClick={() => handleTableScroll('left')}
                 disabled={!canScrollLeft}
                 className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 transition shadow-2xs"
                 title="Scroll Table Left"
               >
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <button
                 type="button"
                 onClick={() => handleTableScroll('right')}
                 disabled={!canScrollRight}
                 className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 transition shadow-2xs"
                 title="Scroll Table Right"
               >
                 <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div 
              ref={tableScrollRef}
              onScroll={checkTableScroll}
              className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
            >
               <Table>
                  <TableHeader className="bg-slate-50/50">
                     <TableRow className="border-none">
                        <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Personnel</TableHead>
                        <TableHead className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Designated Role</TableHead>
                        <TableHead className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Hub Branch</TableHead>
                        <TableHead className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                        <TableHead className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Tenure Since</TableHead>
                        <TableHead className="px-6 py-4 text-right"></TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredStaff.map((person, index) => {
                       const currentPerms = person.permissions || DEFAULT_PERMISSIONS_BY_ROLE[person.role] || ['canAccessPOS'];
                       return (
                         <TableRow key={person.id || index} className="border-slate-50 hover:bg-slate-50/70 group transition-all">
                            <TableCell className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10 border-2 border-white shadow-2xs">
                                     <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`} />
                                     <AvatarFallback>{person.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                     <p className="font-black text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase italic text-sm">{person.name}</p>
                                     <p className="text-[10px] font-bold text-slate-400 mt-1">{person.email}</p>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                               <div className="space-y-1">
                                 <Badge variant="ghost" className="bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 border-none">
                                    {person.role}
                                 </Badge>
                                 <div className="flex flex-wrap gap-1 max-w-[260px]">
                                   {currentPerms.map((pKey: string) => {
                                      const cap = GRANULAR_CAPABILITIES.find(c => c.key === pKey);
                                      if (!cap) return null;
                                      return (
                                         <span key={pKey} className="text-[7.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60 rounded px-1.5 py-0.5">
                                            {cap.title.replace(' Sales Engine', '').replace('Medicinal ', '').replace('Stock ', '').replace('Wholesale ', '').replace('Financial ', '').replace(' Administration', '').replace('Markdowns', 'Discounts')}
                                         </span>
                                      );
                                   })}
                                 </div>
                               </div>
                            </TableCell>
                            <TableCell className="px-4 py-4 font-bold text-slate-700 text-xs">{person.branchId ? getBranchName(person.branchId) : (person.branch || 'Central Hub')}</TableCell>
                            <TableCell className="px-4 py-4">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${person.status === 'dormant' || person.status === 'offline' ? 'bg-slate-300' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{person.status || 'online'}</span>
                               </div>
                            </TableCell>
                            <TableCell className="px-4 py-4 font-bold text-slate-400 text-xs italic">{person.joinDate || '2026-01-01'}</TableCell>
                            <TableCell className="px-6 py-4 text-right">
                               <DropdownMenu>
                                  <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                                     <MoreHorizontal className="w-4 h-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-56 bg-white">
                                     <DropdownMenuGroup>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 pointer-events-none select-none">Security Ops</div>
                                        <DropdownMenuItem 
                                           onClick={() => handleOpenAdjustPermissions(person)}
                                           className="rounded-xl px-3 py-2.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                                        >
                                           <Edit size={16} className="text-slate-400" /> Adjust Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                           onClick={() => handleDeleteStaff(person.id, person.name)}
                                           className="rounded-xl px-3 py-2.5 font-bold text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                        >
                                           <Trash2 size={16} /> Terminate Record
                                        </DropdownMenuItem>
                                     </DropdownMenuGroup>
                                  </DropdownMenuContent>
                               </DropdownMenu>
                            </TableCell>
                         </TableRow>
                       );
                     })}
                  </TableBody>
               </Table>
            </div>

            {/* Bottom Slider Navigation Controls */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
               <span className="font-semibold">Showing {filteredStaff.length} Personnel records</span>
               <div className="flex items-center gap-2">
                 <button
                   type="button"
                   onClick={() => handleTableScroll('left')}
                   disabled={!canScrollLeft}
                   className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition"
                 >
                   <ChevronLeft className="w-3.5 h-3.5" /> Prev
                 </button>
                 <button
                   type="button"
                   onClick={() => handleTableScroll('right')}
                   disabled={!canScrollRight}
                   className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition"
                 >
                   Next <ChevronRight className="w-3.5 h-3.5" />
                 </button>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Adjust User Permissions Real-Time Dialog */}
      <Dialog open={selectedStaffForPermissions !== null} onOpenChange={(open) => { if (!open) setSelectedStaffForPermissions(null); }}>
         <DialogContent className="rounded-3xl border border-slate-200 p-0 max-w-2xl w-[calc(100%-1.5rem)] max-h-[88vh] flex flex-col overflow-hidden bg-white text-slate-900 shadow-2xl">
            <DialogHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-8 py-5 shrink-0">
               <div className="flex items-center gap-4 pr-8">
                  <Avatar className="w-12 h-12 border-2 border-blue-600/20 shadow-xs">
                     <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStaffForPermissions?.name}`} />
                     <AvatarFallback>{selectedStaffForPermissions?.name?.[0] || 'ST'}</AvatarFallback>
                  </Avatar>
                  <div>
                     <DialogTitle className="font-['Poppins',sans-serif] text-xl font-bold tracking-tight text-slate-900">
                        {selectedStaffForPermissions?.name}
                     </DialogTitle>
                     <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
                        Account Email: {selectedStaffForPermissions?.email}
                     </DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-6 max-h-[calc(88vh-165px)]">
               {/* Role Config */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                     <Shield size={14} className="text-blue-600" /> Operational Role
                  </label>
                  <select 
                    className="w-full h-12 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl px-4 font-medium text-slate-900 text-sm outline-none transition-all cursor-pointer"
                    value={editRole}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setEditRole(newRole);
                      setEditPermissions(DEFAULT_PERMISSIONS_BY_ROLE[newRole] || ['canAccessPOS']);
                    }}
                  >
                     <option>Terminal Manager</option>
                     <option>Store Manager</option>
                     <option>Certified Dispenser</option>
                     <option>POS operator</option>
                     <option>Logistics Coordinator</option>
                  </select>
               </div>

               {/* Granular Capabilities Checklist */}
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sliders size={14} className="text-blue-600" /> Granular Access Capabilities
                     </label>
                     <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        Real-Time Sync Active
                     </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {GRANULAR_CAPABILITIES.map((cap) => {
                        const isGranted = editPermissions.includes(cap.key);
                        return (
                           <div 
                             key={cap.key}
                             onClick={() => togglePermission(cap.key)}
                             className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all ${
                               isGranted 
                                 ? 'bg-blue-50/60 border-blue-500/50 shadow-2xs' 
                                 : 'bg-white border-slate-200 hover:border-slate-300'
                             }`}
                           >
                              <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                isGranted 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-slate-50 border-slate-300 text-transparent'
                              }`}>
                                 <Check size={12} className="stroke-[3]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 shrink-0">{cap.icon}</span>
                                    <span className="font-semibold text-xs text-slate-900 leading-none">{cap.title}</span>
                                 </div>
                                 <p className="text-[11px] text-slate-500 mt-1 leading-snug">{cap.description}</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row gap-3 justify-end shrink-0">
               <Button 
                 variant="outline" 
                 onClick={() => setSelectedStaffForPermissions(null)}
                 className="h-11 px-5 rounded-xl font-semibold text-xs border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
               >
                  Cancel
               </Button>
               <Button 
                 onClick={handleSavePermissions}
                 className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
               >
                  Save & Sync Permissions
               </Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
