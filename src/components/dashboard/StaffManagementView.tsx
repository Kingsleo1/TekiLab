import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  ShieldCheck,
  Building2,
  Mail,
  Trash2,
  Sliders,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import {
  TEKILAB_ROLES,
  LIMS_PERMISSIONS_CATALOG,
  getRoleDefinition
} from '../../config/roles';

const STAFF_ROLES_ONLY = TEKILAB_ROLES.filter((r) => r.id !== 'patient');

const DEFAULT_TEKILAB_BRANCHES = [
  { id: 'branch-lagos-hq', name: 'TekiLab Victoria Island (HQ)' },
  { id: 'branch-ikeja', name: 'TekiLab Ikeja Diagnostic Hub' },
  { id: 'branch-abuja', name: 'TekiLab Abuja Wuse II Branch' }
];

const DEFAULT_TEKILAB_STAFF = [
  {
    id: 'st-ceo-1',
    name: 'Dr. Kingsley Agu',
    email: 'kingsleyagu92@gmail.com',
    role: 'CEO / Executive Director',
    department: 'Executive',
    branchId: 'branch-lagos-hq',
    status: 'active',
    permissions: TEKILAB_ROLES[0].permissions,
    joinDate: '2026-01-10'
  },
  {
    id: 'st-mgr-1',
    name: 'Chidinma Nwosu',
    email: 'chidinma@tekilab.io',
    role: 'Branch Lab Manager',
    department: 'Laboratory',
    branchId: 'branch-lagos-hq',
    status: 'active',
    permissions: TEKILAB_ROLES[1].permissions,
    joinDate: '2026-02-14'
  },
  {
    id: 'st-lead-1',
    name: 'MLS Ibrahim Musa',
    email: 'ibrahim@tekilab.io',
    role: 'Lead Lab Scientist / Pathologist',
    department: 'Laboratory',
    branchId: 'branch-lagos-hq',
    status: 'active',
    permissions: TEKILAB_ROLES[2].permissions,
    joinDate: '2026-02-20'
  },
  {
    id: 'st-sci-1',
    name: 'Tunde Adeyemi',
    email: 'tunde@tekilab.io',
    role: 'Medical Lab Scientist',
    department: 'Laboratory',
    branchId: 'branch-ikeja',
    status: 'active',
    permissions: TEKILAB_ROLES[3].permissions,
    joinDate: '2026-03-04'
  },
  {
    id: 'st-doc-1',
    name: 'Dr. Zainab Mohammed',
    email: 'zainab@tekilab.io',
    role: 'Consulting Doctor',
    department: 'Doctor Consultation',
    branchId: 'branch-lagos-hq',
    status: 'active',
    permissions: TEKILAB_ROLES[6].permissions,
    joinDate: '2026-03-18'
  },
  {
    id: 'st-rec-1',
    name: 'Grace Olatunji',
    email: 'grace@tekilab.io',
    role: 'Front Desk / Receptionist',
    department: 'Reception',
    branchId: 'branch-lagos-hq',
    status: 'active',
    permissions: TEKILAB_ROLES[5].permissions,
    joinDate: '2026-04-02'
  }
];

const STORAGE_KEY = 'tekilab_staff_directory_v2';

export function StaffManagementView({
  selectedBranchId,
  currentUser
}: {
  selectedBranchId?: string;
  currentUser?: any;
}) {
  const [staffList, setStaffList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEKILAB_STAFF;
  });

  const [branches, setBranches] = useState<any[]>(DEFAULT_TEKILAB_BRANCHES);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Detail modal
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<string>('');
  const [editBranchId, setEditBranchId] = useState<string>('');

  // Add new staff modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('TekiLab@2026');
  const [newRoleLabel, setNewRoleLabel] = useState(STAFF_ROLES_ONLY[3].label);
  const [newBranchId, setNewBranchId] = useState(selectedBranchId || DEFAULT_TEKILAB_BRANCHES[0].id);
  const [newPerms, setNewPerms] = useState<string[]>(STAFF_ROLES_ONLY[3].permissions);

  const activeUserRoleDef = getRoleDefinition(currentUser?.role);
  const isMultiBranchExecutive = activeUserRoleDef.isMultiBranch || !currentUser;

  useEffect(() => {
    apiService.pharmacies
      .list()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map((b: any) => ({
            id: b.id,
            name: b.name.replace(/Pharma|Pharmacy/gi, 'TekiLab Branch')
          }));
          setBranches(mapped);
          if (!mapped.some((m: any) => m.id === newBranchId)) {
            setNewBranchId(mapped[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const persistStaff = (next: any[]) => {
    setStaffList(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return staffList.filter((s) => {
      if (!isMultiBranchExecutive && currentUser?.branchId && s.branchId !== currentUser.branchId) {
        return false;
      }
      if (branchFilter !== 'ALL' && s.branchId !== branchFilter) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    });
  }, [staffList, searchTerm, branchFilter, isMultiBranchExecutive, currentUser]);

  const getBranchName = (bid: string) =>
    branches.find((b) => b.id === bid)?.name || 'TekiLab Branch';

  const handleOpenDetail = (member: any) => {
    setSelectedStaff(member);
    setEditRole(member.role);
    setEditBranchId(member.branchId || branches[0]?.id || 'branch-lagos-hq');
    setEditPerms(Array.isArray(member.permissions) ? member.permissions : getRoleDefinition(member.role).permissions);
  };

  const handleRoleSelectionOnCreate = (roleLabel: string) => {
    setNewRoleLabel(roleLabel);
    const def = STAFF_ROLES_ONLY.find((r) => r.label === roleLabel);
    if (def) setNewPerms([...def.permissions]);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Name and email are required.');
      return;
    }

    const roleDef = STAFF_ROLES_ONLY.find((r) => r.label === newRoleLabel) || STAFF_ROLES_ONLY[3];
    const assignedBranch = isMultiBranchExecutive
      ? newBranchId
      : currentUser?.branchId || newBranchId;

    const record = {
      id: `st-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
      role: roleDef.label,
      department: roleDef.department,
      level: roleDef.level,
      branchId: assignedBranch,
      status: 'active',
      permissions: newPerms,
      joinDate: new Date().toISOString().slice(0, 10)
    };

    try {
      await apiService.staff.add(record as any);
    } catch {
      // Local persistence still succeeds seamlessly
    }

    persistStaff([record, ...staffList]);
    setIsAddOpen(false);
    setNewName('');
    setNewEmail('');
    toast.success(`Added ${record.name} (${roleDef.shortLabel}) to ${getBranchName(assignedBranch)}`);
  };

  const handleSaveDetailUpdates = () => {
    if (!selectedStaff) return;
    const roleDef = getRoleDefinition(editRole);
    const next = staffList.map((s) =>
      s.id === selectedStaff.id
        ? {
            ...s,
            role: editRole,
            department: roleDef.department,
            branchId: editBranchId,
            permissions: editPerms
          }
        : s
    );
    persistStaff(next);
    setSelectedStaff(null);
    toast.success(`Updated role & permissions for ${selectedStaff.name}`);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    persistStaff(staffList.filter((s) => s.id !== id));
    setSelectedStaff(null);
    toast.success(`Removed ${name} from staff directory`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 font-sans text-neutral-950">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Staff &amp; Branch Roles
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filteredStaff.length} staff members · Independent multi-branch LIMS permissions. Click any name for full details.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Search, Branch Filter & List/Grid Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, role, or email..."
            className="pl-10 h-11 bg-white border-neutral-200 rounded-xl text-sm"
          />
        </div>

        {isMultiBranchExecutive && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-800"
          >
            <option value="ALL">All Independent Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
        </div>
      </div>

      {/* Clean List View (Default: Just Name) or Grid View */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-200 rounded-2xl py-16 text-center text-sm text-neutral-400">
          No staff members found for this filter.
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-xs">
          {filteredStaff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleOpenDetail(member)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors cursor-pointer group"
            >
              <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700">
                {member.name}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleOpenDetail(member)}
              className="p-4 bg-white border border-neutral-200 rounded-2xl text-left hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700 truncate">
                {member.name}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* STAFF DETAIL & PERMISSIONS MODAL                                    */}
      {/* =================================================================== */}
      <Dialog open={Boolean(selectedStaff)} onOpenChange={(o) => !o && setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl bg-white border border-neutral-200 rounded-2xl p-0 overflow-hidden">
          {selectedStaff && (
            <>
              <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-600">{selectedStaff.department || 'Laboratory'}</div>
                  <h2 className="text-xl font-bold text-neutral-950">{selectedStaff.name}</h2>
                  <p className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {selectedStaff.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteStaff(selectedStaff.id, selectedStaff.name)}
                  className="rounded-xl border-neutral-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>

              <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">TekiLab LIMS Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => {
                        setEditRole(e.target.value);
                        const def = STAFF_ROLES_ONLY.find((r) => r.label === e.target.value);
                        if (def) setEditPerms([...def.permissions]);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                    >
                      {STAFF_ROLES_ONLY.map((r) => (
                        <option key={r.id} value={r.label}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Assigned Independent Branch</label>
                    <select
                      value={editBranchId}
                      disabled={!isMultiBranchExecutive}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white disabled:bg-neutral-50"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Granular TekiLab Permissions ({editPerms.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LIMS_PERMISSIONS_CATALOG.map((perm) => {
                      const active = editPerms.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() =>
                            setEditPerms((prev) =>
                              prev.includes(perm.key)
                                ? prev.filter((k) => k !== perm.key)
                                : [...prev, perm.key]
                            )
                          }
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            active
                              ? 'bg-blue-50/70 border-blue-500 text-neutral-950'
                              : 'bg-white border-neutral-200 text-neutral-500'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                              active ? 'bg-blue-600 text-white' : 'border border-neutral-300'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-neutral-950">{perm.label}</div>
                            <div className="text-[11px] text-neutral-500 leading-snug">{perm.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <Button variant="outline" onClick={() => setSelectedStaff(null)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDetailUpdates}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* ADD NEW STAFF MEMBER MODAL (TEKILAB LIMS ROLES)                     */}
      {/* =================================================================== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl bg-white border border-neutral-200 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-950">Add TekiLab Staff Member</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Assign a LIMS role, independent branch, and custom permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name *</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. MLS Samuel Obi" className="h-10 rounded-xl" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Work Email *</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="samuel@tekilab.io" className="h-10 rounded-xl" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">LIMS Role</label>
                <select
                  value={newRoleLabel}
                  onChange={(e) => handleRoleSelectionOnCreate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                >
                  {STAFF_ROLES_ONLY.map((r) => (
                    <option key={r.id} value={r.label}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Branch</label>
                <select
                  value={newBranchId}
                  disabled={!isMultiBranchExecutive}
                  onChange={(e) => setNewBranchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white disabled:bg-neutral-50"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 rounded-xl pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-700">Role Permissions (Customizable)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {LIMS_PERMISSIONS_CATALOG.map((perm) => {
                  const active = newPerms.includes(perm.key);
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() =>
                        setNewPerms((prev) =>
                          prev.includes(perm.key)
                            ? prev.filter((k) => k !== perm.key)
                            : [...prev, perm.key]
                        )
                      }
                      className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center gap-2 ${
                        active ? 'bg-blue-50 border-blue-500' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${active ? 'bg-blue-600 text-white' : 'border border-neutral-300'}`}>
                        {active && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-medium text-neutral-900 truncate">{perm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
                Create Staff Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
