import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  LogOut, 
  Settings, 
  Users, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Sparkles, 
  Smartphone, 
  Mail, 
  Building, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  Shield,
  BadgeCheck,
  Phone,
  Fingerprint
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { UserRole } from '../../types/pharmacy';
import { evaluatePasswordStrength, generateSafePassword } from '../../lib/passwordUtils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UserAccountMenuProps {
  currentUser: any;
  role: UserRole;
  selectedBranchId: string;
  branches: any[];
  onLogout: () => void;
  onUserUpdate: (updatedUser: any) => void;
  onNavigate: (view: string) => void;
  onOpenAdminSecurity?: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Alex', 'Evelyn', 'Liam', 'Marcus', 'Sophia', 'Zack', 'David', 'Sarah'
];

export function UserAccountMenu({
  currentUser,
  role,
  selectedBranchId,
  branches,
  onLogout,
  onUserUpdate,
  onNavigate,
  onOpenAdminSecurity,
  onSwitchRole
}: UserAccountMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Current user information fallbacks
  const isAdmin = role === 'admin' || currentUser?.role === 'Kernel Admin' || currentUser?.role === 'admin';
  const displayName = currentUser?.name || (isAdmin ? 'Super Administrator' : 'Staff Member');
  const userEmail = currentUser?.email || (isAdmin ? 'admin@tekipharm.com' : 'staff@tekipharm.com');
  const userRoleLabel = currentUser?.role || (role === 'admin' ? 'Kernel Admin' : role === 'merchant' ? 'Store Manager' : 'Cashier');
  const currentBranch = branches.find(b => b.id === selectedBranchId)?.name || 'Central Hub';
  const avatarSeed = currentUser?.avatarSeed || currentUser?.name || role || 'Admin';
  const avatarSrc = currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  // Form states for Profile Editing
  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '+234 800 000 0000');
  const [selectedSeed, setSelectedSeed] = useState(avatarSeed);
  const [profileSaving, setProfileSaving] = useState(false);

  // Reset profile form when opening modal
  useEffect(() => {
    if (isProfileModalOpen) {
      setEditName(currentUser?.name || displayName);
      setEditEmail(currentUser?.email || userEmail);
      setEditPhone(currentUser?.phone || '+234 800 000 0000');
      setSelectedSeed(currentUser?.avatarSeed || avatarSeed);
    }
  }, [isProfileModalOpen, currentUser, displayName, userEmail, avatarSeed]);

  // Form states for Password Reset
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const pwStrength = evaluatePasswordStrength(newPassword);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setProfileSaving(true);
    try {
      const updatedUser = {
        ...(currentUser || {}),
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        avatarSeed: selectedSeed,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedSeed}`,
        role: userRoleLabel
      };

      // Persist in localStorage
      localStorage.setItem('ph_current_user', JSON.stringify(updatedUser));
      if (isAdmin) {
        localStorage.setItem('ph_admin_email', editEmail.trim());
      }

      // Update in staff list if applicable
      const savedStaff = localStorage.getItem('ph_staff_list');
      if (savedStaff) {
        try {
          const list = JSON.parse(savedStaff);
          const idx = list.findIndex((s: any) => s.id === currentUser?.id || s.email === currentUser?.email);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedUser };
            localStorage.setItem('ph_staff_list', JSON.stringify(list));
          }
        } catch {
          // Ignore parse errors
        }
      }

      // If Supabase configured, update profile record
      if (isSupabaseConfigured() && currentUser?.id) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: editName.trim(),
              email: editEmail.trim(),
              phone: editPhone.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        } catch {
          // Non-blocking
        }
      }

      onUserUpdate(updatedUser);
      toast.success('Account profile updated successfully');
      setIsProfileModalOpen(false);
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (error) {
          toast.error(error.message || 'Supabase password update failed.');
          setPasswordSaving(false);
          return;
        }
      }

      // Update local storage credentials
      if (isAdmin) {
        localStorage.setItem('ph_admin_custom_password', newPassword);
      }

      // If user is staff, update staff password in stored list
      const savedStaff = localStorage.getItem('ph_staff_list');
      if (savedStaff) {
        try {
          const list = JSON.parse(savedStaff);
          const idx = list.findIndex((s: any) => s.id === currentUser?.id || s.email === currentUser?.email);
          if (idx !== -1) {
            list[idx].password = newPassword;
            localStorage.setItem('ph_staff_list', JSON.stringify(list));
          }
        } catch {
          // Ignore parse error
        }
      }

      toast.success('Password updated successfully! Keep your new credentials safe.');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsPasswordModalOpen(false);
    } catch {
      toast.error('An error occurred while updating the password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleGeneratePassword = () => {
    const generated = generateSafePassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    navigator.clipboard.writeText(generated);
    toast.success('Generated strong password & copied to clipboard!');
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Avatar Trigger Button with Persona image & online status */}
      <button
        id="user-account-menu-trigger"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer group"
        title="Account & User Management Menu"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="relative shrink-0">
          <Avatar className="w-8 h-8 rounded-full border border-slate-100 group-hover:scale-105 transition-transform">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs"
            title="User Online & Authenticated"
          />
        </div>

        {/* Compact User Identity Pill on wider screens */}
        <div className="hidden xl:flex flex-col text-left min-w-0 pr-0.5">
          <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
            {displayName.split(' ')[0]}
          </span>
          <span className="text-[10px] text-slate-500 font-medium leading-tight truncate max-w-[110px]">
            {userRoleLabel}
          </span>
        </div>

        <ChevronDown 
          size={14} 
          className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
            isDropdownOpen ? 'rotate-180 text-blue-600' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div 
          id="user-account-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right text-slate-900 overflow-hidden"
        >
          {/* Header with Account Information */}
          <div className="px-4 py-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden -mt-2 mb-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex items-start gap-3 relative z-10">
              <Avatar className="w-11 h-11 rounded-xl border-2 border-white/20 shadow-md shrink-0">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-sm text-white truncate max-w-[160px]" title={displayName}>
                    {displayName}
                  </h4>
                  <Badge className="bg-blue-500/30 text-blue-200 border-none text-[9px] font-bold px-1.5 py-0 uppercase tracking-wider">
                    {userRoleLabel}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5" title={userEmail}>
                  {userEmail}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
                  <Building size={11} className="text-slate-400 shrink-0" />
                  <span className="truncate">{currentBranch}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account & Profile Actions */}
          <div className="px-2 py-1 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Account Management
            </div>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsProfileModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <UserIcon size={14} />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-slate-900">Account Information</span>
                  <span className="block text-[10px] text-slate-500">Edit name, email, phone & avatar</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsPasswordModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                  <KeyRound size={14} />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-slate-900">Change Password</span>
                  <span className="block text-[10px] text-slate-500">Reset password & security keys</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsClearanceModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <ShieldCheck size={14} />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-slate-900">Clearance & Permissions</span>
                  <span className="block text-[10px] text-slate-500">View active terminal privileges</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="border-t border-slate-100 my-1"></div>

          {/* Administrative Shortcuts */}
          <div className="px-2 py-1 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Administration & System
            </div>

            {(isAdmin || userRoleLabel === 'Store Manager') && (
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onNavigate(isAdmin ? 'admin_users' : 'staff');
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <Users size={14} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-slate-900">User Setup & Staff</span>
                    <span className="block text-[10px] text-slate-500">Manage user accounts & roles</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {isAdmin && onOpenAdminSecurity && (
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenAdminSecurity();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                    <Shield size={14} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-slate-900">Admin Security Portal</span>
                    <span className="block text-[10px] text-slate-500">Root credentials & /admin route</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onNavigate('admin_settings');
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                  <Settings size={14} />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-slate-900">System & Terminal Settings</span>
                  <span className="block text-[10px] text-slate-500">Store parameters & tax rates</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Role Switching for testing/management */}
          {onSwitchRole && (
            <>
              <div className="border-t border-slate-100 my-1"></div>
              <div className="px-3 py-1.5 bg-slate-50/70 mx-2 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRightLeft size={11} /> Switch Terminal Mode
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Active: {role}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => onSwitchRole('admin')}
                    className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      role === 'admin' 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => onSwitchRole('merchant')}
                    className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      role === 'merchant' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    Manager
                  </button>
                  <button
                    onClick={() => onSwitchRole('cashier')}
                    className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      role === 'cashier' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    Cashier
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-slate-100 my-1.5"></div>

          {/* Log Out & Switch Account */}
          <div className="px-2 py-1 space-y-1">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                <LogOut size={14} />
              </div>
              <div className="text-left flex-1">
                <span className="block font-semibold">Sign Out</span>
                <span className="block text-[10px] text-rose-400 font-normal">End terminal session and lock system</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Account Information & Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-md w-full bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserIcon size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">Account Information</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Manage your personal details, workstation assignment and avatar profile
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 mt-2">
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Choose Profile Avatar
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                {AVATAR_SEEDS.map((seed) => {
                  const isSelected = selectedSeed === seed;
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedSeed(seed)}
                      className={`relative shrink-0 rounded-full p-0.5 border-2 transition-all cursor-pointer ${
                        isSelected ? 'border-blue-600 scale-110 shadow-sm' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <Avatar className="w-10 h-10 rounded-full">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} />
                        <AvatarFallback>{seed[0]}</AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white border border-white">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Dr. Evelyn Vance"
                className="h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="user@tekipharm.com"
                className="h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                required
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+234 800 123 4567"
                className="h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
              />
            </div>

            {/* Terminal Details (Read-only metadata) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium text-slate-500">Assigned Branch:</span>
                <span className="font-semibold text-slate-900">{currentBranch}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium text-slate-500">Security Clearance:</span>
                <span className="font-semibold text-blue-600 capitalize">{userRoleLabel}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium text-slate-500">Account ID:</span>
                <span className="font-mono text-[11px] text-slate-700">{currentUser?.id || 'USR-ROOT-001'}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileModalOpen(false)}
                className="h-10 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={profileSaving}
                className="h-10 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {profileSaving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset / Change Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-md w-full bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">Change Password</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update terminal credentials to safeguard your pharmacy POS and inventory records
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
            {/* New Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} /> Suggest Strong Password
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter secure password (min 6 characters)"
                  className="h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-xl pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-bold ${pwStrength.color}`}>{pwStrength.level}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      pwStrength.score >= 1 ? 'bg-rose-500 w-1/4' : 'bg-transparent w-1/4'
                    }`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      pwStrength.score >= 2 ? 'bg-amber-500 w-1/4' : 'bg-transparent w-1/4'
                    }`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      pwStrength.score >= 3 ? 'bg-blue-500 w-1/4' : 'bg-transparent w-1/4'
                    }`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      pwStrength.score >= 4 ? 'bg-emerald-500 w-1/4' : 'bg-transparent w-1/4'
                    }`} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-xl font-mono"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Notice */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/70 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Changing your password will take effect immediately for this account across all POS stations and administrative login portals.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="h-10 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={passwordSaving || (newPassword.length > 0 && newPassword !== confirmPassword)}
                className="h-10 text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clearance & Permissions Inspector Modal */}
      <Dialog open={isClearanceModalOpen} onOpenChange={setIsClearanceModalOpen}>
        <DialogContent className="max-w-md w-full bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">Security Clearance</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Active access control privileges configured for your terminal session
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Clearance Level</span>
                <span className="text-sm font-bold text-slate-900">{userRoleLabel}</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-xs px-2.5 py-1">
                Active & Verified
              </Badge>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Granted System Capabilities:
              </span>
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {(currentUser?.permissions && currentUser.permissions.length > 0 
                  ? currentUser.permissions 
                  : ['canAccessPOS', 'canManageInventory', 'canViewReports', 'canManageCustomers']
                ).map((perm: string) => (
                  <div key={perm} className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg text-xs text-slate-700">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span className="font-mono text-[11px]">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsClearanceModalOpen(false)}
                className="w-full h-10 text-xs rounded-xl bg-slate-900 text-white font-semibold hover:bg-black"
              >
                Close Clearance Window
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
