import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Lock, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Database,
  CheckCircle2,
  Globe
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
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { getProductionDeployedUrl } from '../../../lib/saas-pricing';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserUpdate: (updatedUser: any) => void;
}

export function AdminSecurityModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate
}: AdminSecurityModalProps) {
  const isLiveDb = isSupabaseConfigured();
  const currentEmail = currentUser?.email || 'admin@tekipharm.com';

  // Email form state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  const adminUrl = `${getProductionDeployedUrl()}/admin`;

  const handleCopyAdminUrl = () => {
    navigator.clipboard.writeText(adminUrl);
    setCopiedLink(true);
    toast.success('Admin Portal URL copied to clipboard: ' + adminUrl);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.info('New email is the same as current email.');
      return;
    }

    setEmailLoading(true);

    if (isLiveDb) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          email: newEmail.trim()
        });

        if (error) {
          setEmailLoading(false);
          toast.error(error.message || 'Failed to update email in Supabase');
          return;
        }

        // Also update profiles table
        if (currentUser?.id) {
          await supabase
            .from('profiles')
            .update({ email: newEmail.trim(), updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
        }

        const updated = {
          ...currentUser,
          email: newEmail.trim()
        };
        onUserUpdate(updated);
        localStorage.setItem('ph_current_user', JSON.stringify(updated));
        localStorage.setItem('ph_admin_email', newEmail.trim());

        setEmailLoading(false);
        setNewEmail('');
        toast.success(`Admin email successfully updated to ${newEmail.trim()}! Please check your new inbox for verification if email confirmation is active.`);
        return;
      } catch (err: any) {
        setEmailLoading(false);
        toast.error(err?.message || 'Error updating email');
        return;
      }
    }

    // Local update
    const updated = {
      ...currentUser,
      email: newEmail.trim()
    };
    onUserUpdate(updated);
    localStorage.setItem('ph_current_user', JSON.stringify(updated));
    localStorage.setItem('ph_admin_email', newEmail.trim());

    setEmailLoading(false);
    setNewEmail('');
    toast.success(`Admin email updated to ${updated.email} (Local / Cloud sync ready).`);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    if (isLiveDb) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          setPasswordLoading(false);
          toast.error(error.message || 'Failed to update password');
          return;
        }

        setPasswordLoading(false);
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Admin password updated successfully in Supabase Auth!');
        return;
      } catch (err: any) {
        setPasswordLoading(false);
        toast.error(err?.message || 'Error updating password');
        return;
      }
    }

    // Local / Offline store
    localStorage.setItem('ph_admin_custom_password', newPassword);
    setPasswordLoading(false);
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Admin password updated successfully!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-6 md:p-8 rounded-[2.5rem] bg-white border-none shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                <ShieldCheck size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                  Super Admin Credentials
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Manage dedicated /admin portal URL, login email & security password
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
              Kernel Level 5
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dedicated URL Info Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-400" /> Dedicated Admin Portal URL
              </span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded-md">
                Always Accessible
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <code className="font-mono text-xs text-blue-300 select-all truncate">
                {adminUrl}
              </code>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyAdminUrl}
                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider shrink-0"
              >
                {copiedLink ? <Check size={12} className="mr-1 text-emerald-400" /> : <Copy size={12} className="mr-1" />}
                {copiedLink ? 'Copied' : 'Copy URL'}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              Bookmark or share this URL: entering <strong className="text-white">/admin</strong> on any domain directs straight to the Super Admin login terminal.
            </p>
          </div>

          {/* Update Email Form */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                  Super Admin Email
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                Current: {currentEmail}
              </span>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-3">
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new admin email (e.g. master@yourdomain.com)"
                  className="h-12 bg-white rounded-xl font-bold text-xs pl-10 border-slate-200"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={emailLoading || !newEmail}
                  className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-wider"
                >
                  {emailLoading ? 'Updating Email...' : 'Save New Email'}
                </Button>
              </div>
            </form>
          </div>

          {/* Update Password Form */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-amber-600" />
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                  Change Security Password
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Default: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono">Admin@Pharma2025!</code>
              </span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="h-12 bg-white rounded-xl font-bold text-xs pl-10 pr-10 border-slate-200"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-12 bg-white rounded-xl font-bold text-xs pl-10 border-slate-200"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Database size={12} className="text-emerald-500" />
                  Direct sync with Supabase Auth & PostgreSQL
                </span>
                <Button
                  type="submit"
                  disabled={passwordLoading || !newPassword}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider"
                >
                  {passwordLoading ? 'Updating Password...' : 'Save New Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
          <span className="text-[10px] font-bold text-slate-400">
            Teki Pharm Kernel Security v4.8
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 px-6 rounded-xl font-black text-xs uppercase tracking-wider"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
