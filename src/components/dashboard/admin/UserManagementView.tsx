import React, { useState, useEffect } from 'react';
import { apiService, isSupabaseConfigured, supabase } from '../../../services/api';
import { 
  Users, 
  UserPlus, 
  Shield, 
  MoreHorizontal, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Lock, 
  Key,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  ShoppingCart,
  Package,
  ArrowRightLeft,
  Truck,
  CreditCard,
  Settings,
  Sliders,
  Check,
  UserCheck,
  RefreshCw,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generateSafePassword, SAMPLE_PASSWORDS, evaluatePasswordStrength } from '@/src/lib/passwordUtils';

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
    description: 'Access Point of Sale, process customer orders, and view sales and owing records.',
    icon: <ShoppingCart size={14} className="text-blue-600" />
  },
  {
    key: 'canManageStaff',
    title: 'Manage Staff',
    description: 'Add personnel, authenticate credentials, and configure access permissions.',
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
    description: 'Manage medicine catalogs, adjust stock counts, batch numbers, and prices.',
    icon: <Package size={14} className="text-amber-600" />
  },
  {
    key: 'canAccessSuppliers',
    title: 'Supply & Procurement',
    description: 'Onboard distributors, manage supply records, and register new supplies.',
    icon: <Truck size={14} className="text-orange-600" />
  },
  {
    key: 'canAccessExpenses',
    title: 'Expenses Ledger',
    description: 'Log operating expenditures, verify bills, and monitor branch expenditures.',
    icon: <CreditCard size={14} className="text-rose-600" />
  },
  {
    key: 'canAccessTransfers',
    title: 'Stock Transfers',
    description: 'Initiate and receive stock transfers between branches and central warehouse.',
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
    description: 'Grant price discounts or customize unit pricing directly on POS checkout.',
    icon: <Check size={14} className="text-amber-600" />
  },
  {
    key: 'canDispenseControlled',
    title: 'Dispense Controlled Meds',
    description: 'Dispense regulated, prescription-only, or restricted pharmaceuticals.',
    icon: <ShieldCheck size={14} className="text-blue-600" />
  }
];

const DEFAULT_STAFF = [
  { id: 'ST-01', name: 'James Wilson', role: 'Store Manager', email: 'james@tekipharm.com', status: 'online', level: 4, permissions: ['canAccessPOS', 'canManageInventory', 'canAccessTransfers', 'canAccessSuppliers', 'canAccessExpenses'] },
  { id: 'ST-02', name: 'Sarah Chen', role: 'Terminal Manager', email: 'sarah@tekipharm.com', status: 'online', level: 3, permissions: ['canAccessPOS', 'canManageInventory', 'canAccessTransfers'] },
  { id: 'ST-03', name: 'David Okafor', role: 'Certified Dispenser', email: 'david@tekipharm.com', status: 'online', level: 2, permissions: ['canAccessPOS', 'canManageInventory'] },
  { id: 'ST-04', name: 'Elena Rodriguez', role: 'POS operator', email: 'elena@tekipharm.com', status: 'dormant', level: 1, permissions: ['canAccessPOS'] },
  { id: 'ST-05', name: 'Kingsley Agu', role: 'Logistics Coordinator', email: 'kingsley@tekipharm.com', status: 'online', level: 1, permissions: ['canAccessTransfers'] }
];

export function UserManagementView({ selectedBranchId }: { selectedBranchId?: string } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Terminal Manager',
    email: '',
    password: '',
    branchId: selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : 'pharma-1'
  });

  // Permissions adjustments modal state
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const loadStaffData = async () => {
    try {
      const data = await apiService.staff.list(selectedBranchId);
      if (data && data.length > 0) {
        const upgraded = data.map((s: any) => ({
          ...s,
          permissions: s.permissions || DEFAULT_PERMISSIONS_BY_ROLE[s.role] || ['canAccessPOS']
        }));
        setStaffList(upgraded);
      } else {
        setStaffList(DEFAULT_STAFF);
      }
    } catch (e) {
      console.error('Failed to load staff list', e);
    }
  };

  // Load staff and active branches on mount and when branch selection shifts
  useEffect(() => {
    apiService.pharmacies.list().then(list => {
      const activeOnly = list.filter((p: any) => p.status === 'active' && !p.id.includes('warehouse'));
      setBranches(activeOnly);
      if (activeOnly.length > 0) {
        setFormData(prev => ({
          ...prev,
          branchId: selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : activeOnly[0].id
        }));
      }
    });

    loadStaffData();

    const handleUpdate = () => loadStaffData();
    window.addEventListener('pharmacy_staff_updated', handleUpdate);
    window.addEventListener('database_synced', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let subscription: any = null;
    if (isSupabaseConfigured() && supabase) {
      subscription = supabase
        .channel('public:staff_admin_sync')
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
      toast.error('Please enter the personnel full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Please enter a valid work email address.');
      return;
    }
    if (!formData.password.trim() || formData.password.length < 4) {
      toast.error('Please enter a password of at least 4 characters.');
      return;
    }

    setIsSubmitting(true);

    const levelsMap: Record<string, number> = {
      'Terminal Manager': 4,
      'Store Manager': 3,
      'Certified Dispenser': 2,
      'POS operator': 2,
      'Logistics Coordinator': 1,
      'Kernel Admin': 5
    };

    const targetBranch = formData.branchId || (selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : (branches[0]?.id || 'pharma-1'));
    const targetBranchObj = branches.find(b => b.id === targetBranch);
    const branchName = targetBranchObj ? targetBranchObj.name : 'Branch Node';

    const newStaff = {
      id: `ST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
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
      toast.success(`Personnel "${newStaff.name}" registered and authenticated!`, {
        description: `Credentials active for ${branchName}. User can log in immediately.`
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
      console.error('Error registering staff:', err);
      toast.error(err?.message || 'Failed to register personnel to database');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    try {
      await apiService.staff.delete(id);
      await loadStaffData();
      toast.success(`Record for ${name} terminated successfully`);
    } catch (err) {
      toast.error(`Failed to terminate record for ${name}`);
    }
  };

  // Open Permissions adjustment dialog
  const handleOpenAdjustPermissions = (staff: any) => {
    setSelectedStaffForPermissions(staff);
    setEditRole(staff.role);
    setEditLevel(staff.level || 1);
    setEditPermissions(staff.permissions || DEFAULT_PERMISSIONS_BY_ROLE[staff.role] || ['canAccessPOS']);
  };

  // Toggle dynamic capability
  const togglePermission = (perm: string) => {
    if (editPermissions.includes(perm)) {
      setEditPermissions(editPermissions.filter(p => p !== perm));
    } else {
      setEditPermissions([...editPermissions, perm]);
    }
  };

  // Save changes to state & database
  const handleSavePermissions = async () => {
    if (!selectedStaffForPermissions) return;
    try {
      await apiService.staff.update(selectedStaffForPermissions.id, {
        role: editRole,
        level: editLevel,
        permissions: editPermissions
      });
      await loadStaffData();
      toast.success(`Access permissions for ${selectedStaffForPermissions.name} updated on database!`);
      setSelectedStaffForPermissions(null);
    } catch (err) {
      toast.error('Failed to update access permissions on database');
    }
  };

  const getBranchName = (bId: string) => {
    const found = branches.find(b => b.id === bId);
    return found ? found.name : bId || 'Central Hub';
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.status === 'online' || s.status === 'active' || s.status === 'break').length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Staff Management</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage users, roles, and access permissions</p>
        </div>
        
        <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
           <DialogTrigger asChild>
              <Button className="h-12 md:h-13 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 inline-flex items-center justify-center cursor-pointer transition-all">
                 <UserPlus className="mr-2 w-4 h-4" /> Add New Staff Member
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
                            className="w-full h-12 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl px-3.5 font-medium text-sm text-slate-900 shadow-2xs outline-none transition-all cursor-pointer"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <SecurityMetric label="Total Staff" value={totalStaff.toString()} icon={<Users size={20} />} />
         <SecurityMetric label="Active Users" value={activeStaff.toString()} icon={<ShieldCheck size={20} className="text-emerald-500" />} />
         <SecurityMetric label="Security Alerts" value="0" icon={<ShieldAlert size={20} className="text-slate-300" />} />
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
        <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              <Input 
                placeholder="Search index..." 
                className="pl-12 h-14 w-full bg-slate-50 border-none rounded-2xl font-bold shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <Button 
             variant="ghost" 
             onClick={() => toast.info('Advanced filtering requires elevated clearance')}
             className="h-14 px-6 rounded-2xl bg-slate-50 font-black text-[10px] uppercase tracking-widest"
           >
              <Filter size={16} className="mr-2" /> Tier Filter
           </Button>
        </CardHeader>
        <CardContent className="p-0">
           <Table>
              <TableHeader className="bg-slate-50/50">
                 <TableRow className="border-none">
                    <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Personnel Node</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Access Permissions</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Security Index</TableHead>
                    <TableHead className="px-10"></TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredStaff.map((person, index) => {
                   const currentPerms = person.permissions || DEFAULT_PERMISSIONS_BY_ROLE[person.role] || ['canAccessPOS'];
                   return (
                     <TableRow key={person.id || index} className="border-slate-50 hover:bg-slate-50 group transition-all">
                        <TableCell className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                                 <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`} />
                                 <AvatarFallback>{person.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                 <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic">{person.name}</p>
                                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mt-1">
                                     {person.branchId ? getBranchName(person.branchId) : (person.branch || 'Central Hub')}
                                  </p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{person.email}</p>
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="space-y-1.5">
                              <Badge className={`border-none font-black text-[8px] uppercase tracking-widest px-3 ${
                                person.role === 'Terminal Manager' || person.role === 'Kernel Admin' ? 'bg-slate-900 text-white' : person.role === 'Store Manager' ? 'bg-indigo-600 text-white' : person.role === 'Certified Dispenser' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                              }`}>
                                {person.role}
                              </Badge>
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {currentPerms.map((pKey: string) => {
                                   const cap = GRANULAR_CAPABILITIES.find(c => c.key === pKey);
                                   if (!cap) return null;
                                   return (
                                      <span key={pKey} className="text-[7.5px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100 rounded px-1.5 py-0.5">
                                         {cap.title.replace(' Sales Engine', '').replace('Medicinal ', '').replace('Stock ', '').replace('Wholesale ', '').replace('Financial ', '').replace(' Console', '')}
                                      </span>
                                   );
                                })}
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${person.status === 'dormant' || person.status === 'offline' ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}`}></div>
                              <span className={`text-[10px] font-black uppercase ${person.status === 'dormant' || person.status === 'offline' ? 'text-slate-400' : 'text-emerald-500'}`}>
                                 {person.status}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <Lock size={12} className="text-slate-300" />
                              <span className="text-xs font-bold text-slate-900 tracking-tight">Level {person.level || 1}</span>
                           </div>
                        </TableCell>
                        <TableCell className="px-10">
                           <DropdownMenu>
                              <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
                                 <MoreHorizontal />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-56">
                                 <DropdownMenuGroup>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 pointer-events-none select-none">Security Ops</div>
                                    <DropdownMenuItem 
                                       onClick={() => handleOpenAdjustPermissions(person)}
                                       className="rounded-xl px-3 py-2.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                       <Edit size={16} className="mr-3 text-slate-400" /> Adjust Permissions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                                       <Key size={16} className="mr-3 text-slate-400" /> Reset Auth Token
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                       onClick={() => handleDeleteStaff(person.id, person.name)}
                                       className="rounded-xl px-3 py-2.5 font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                                    >
                                       <Trash2 size={16} className="mr-3" /> Terminate Record
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
        </CardContent>
     </Card>

     {/* Adjust User Permissions Real-Time Dialog */}
     <Dialog open={selectedStaffForPermissions !== null} onOpenChange={(open) => { if (!open) setSelectedStaffForPermissions(null); }}>
        <DialogContent className="rounded-[2.5rem] border-none p-8 md:p-10 max-w-2xl bg-white shadow-3xl">
           <DialogHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4 mb-2">
                 <Avatar className="w-14 h-14 border-2 border-blue-600/20 shadow-sm">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStaffForPermissions?.name}`} />
                    <AvatarFallback>{selectedStaffForPermissions?.name?.[0] || 'ST'}</AvatarFallback>
                 </Avatar>
                 <div>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                       {selectedStaffForPermissions?.name}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                       Identity Vector: {selectedStaffForPermissions?.email}
                     </DialogDescription>
                 </div>
              </div>
           </DialogHeader>

           <div className="space-y-6 py-4">
              {/* Role & Level Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                       <Shield size={12} className="text-blue-600" /> Operational Role
                    </label>
                    <select 
                      className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-bold text-slate-900 text-sm focus:outline-none focus:border-blue-600/50 transition-all"
                      value={editRole}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setEditRole(newRole);
                        // Presets levels & permissions based on default mappings
                        const defaultLvl = newRole === 'Store Manager' ? 4 : newRole === 'Terminal Manager' ? 3 : newRole === 'Certified Dispenser' ? 2 : newRole === 'POS operator' ? 2 : 1;
                        setEditLevel(defaultLvl);
                        setEditPermissions(DEFAULT_PERMISSIONS_BY_ROLE[newRole] || ['canAccessPOS']);
                      }}
                    >
                       <option>Terminal Manager</option>
                       <option>Store Manager</option>
                       <option>Certified Dispenser</option>
                       <option>POS operator</option>
                       <option>Logistics Coordinator</option>
                       <option>Kernel Admin</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-1.5">
                       <Lock size={12} className="text-blue-600" /> Security Clearance Index
                    </label>
                    <div className="grid grid-cols-5 gap-2 h-14 items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-3">
                       {[1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setEditLevel(lvl)}
                            className={`h-9 font-black text-xs rounded-xl uppercase tracking-widest transition-all cursor-pointer ${
                              editLevel === lvl 
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                             L{lvl}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Granular Capabilities Checklist */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                       <Sliders size={12} className="text-blue-600" /> Granular Access Capabilities
                    </label>
                    <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                       Real-time Propagation Active
                    </span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                    {GRANULAR_CAPABILITIES.map((cap) => {
                       const isGranted = editPermissions.includes(cap.key);
                       return (
                          <div 
                            key={cap.key}
                            onClick={() => togglePermission(cap.key)}
                            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all ${
                              isGranted 
                                ? 'bg-blue-50/50 border-blue-500/30 shadow-sm shadow-blue-100/20' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                             <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                               isGranted 
                                 ? 'bg-blue-600 border-blue-600 text-white' 
                                 : 'bg-slate-50 border-slate-200 text-transparent'
                             }`}>
                                <Check size={12} className="stroke-[3]" />
                             </div>
                             <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                   <span className="text-slate-400 shrink-0">{cap.icon}</span>
                                   <span className="font-black text-xs text-slate-950 uppercase italic leading-none">{cap.title}</span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-tight tracking-wide">{cap.description}</p>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>

           <DialogFooter className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row gap-3 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedStaffForPermissions(null)}
                className="h-14 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-transparent hover:bg-slate-50 cursor-pointer"
              >
                 Cancel
              </Button>
              <Button 
                onClick={handleSavePermissions}
                className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 cursor-pointer"
              >
                 Apply Real-Time Changes
              </Button>
           </DialogFooter>
        </DialogContent>
     </Dialog>
   </div>
 );
}

function SecurityMetric({ label, value, icon }: any) {
   return (
      <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white p-8">
         <div className="flex items-center gap-4 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400`}>
               {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
         </div>
         <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{value}</h4>
      </Card>
   );
}
