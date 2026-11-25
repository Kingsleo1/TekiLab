import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  User as UserIcon,
  Sparkles,
  KeyRound,
  ArrowLeft,
  AlertCircle,
  UserX,
  CheckCircle2,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserRole, Pharmacy, Tenant } from '../types/pharmacy';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { 
  detectUrlCompanySlug, 
  matchTenantBySlug,
  applyDynamicFavicon
} from '../lib/saas-pricing';

export function LoginPage({ 
  onLogin, 
  onBack,
  isAdminRoute = false,
  activeTenantSlug = null,
  onNavigateToAdmin,
  onNavigateToStaff
}: { 
  onLogin: (role: UserRole, userDetails?: any, branchId?: string) => void; 
  onBack: () => void;
  isAdminRoute?: boolean;
  activeTenantSlug?: string | null;
  onNavigateToAdmin?: () => void;
  onNavigateToStaff?: () => void;
}) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'admin'>(
    isAdminRoute ? 'admin' : 'signin'
  );
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Authentication Status & Feedback State
  const [authNotice, setAuthNotice] = useState<{
    status: 'idle' | 'loading' | 'wrong_password' | 'account_not_found' | 'success' | 'error';
    message: string;
    subMessage?: string;
  }>({ status: 'idle', message: '' });
  
  // Default Admin Credentials
  const defaultAdminEmail = localStorage.getItem('ph_admin_email') || 'kingsleyagu92@gmail.com';
  const defaultAdminPassword = localStorage.getItem('ph_admin_custom_password') || 'TEKI.pharm@1';

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [branches, setBranches] = useState<Pharmacy[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (isAdminRoute) {
      setAuthMode('admin');
    }
  }, [isAdminRoute]);

  useEffect(() => {
    const loadTenant = async () => {
      const detectedSlug = activeTenantSlug || detectUrlCompanySlug();
      if (detectedSlug) {
        apiService.tenants.setActiveContext(detectedSlug);
        const loadedTenants = await apiService.tenants.list();
        const found = matchTenantBySlug(loadedTenants, detectedSlug);
        if (found) {
          setCurrentTenant(found);
          applyDynamicFavicon(found.logo);
        }
      }
      const list = await apiService.pharmacies.list();
      const activeOnly = list.filter(p => p.status === 'active' && !p.id.includes('warehouse'));
      setBranches(activeOnly);
    };

    loadTenant();
  }, [activeTenantSlug]);

  // Clear notice when inputs change
  const handleInputChange = (field: 'email' | 'password' | 'fullName' | 'confirmPassword', val: string) => {
    setAuthNotice({ status: 'idle', message: '' });
    if (field === 'email') setEmail(val);
    if (field === 'password') setPassword(val);
    if (field === 'fullName') setFullName(val);
    if (field === 'confirmPassword') setConfirmPassword(val);
  };

  // Autofill Admin credentials
  const handleAutofillAdmin = () => {
    setEmail(defaultAdminEmail);
    setPassword(defaultAdminPassword);
    setAuthNotice({ status: 'idle', message: '' });
    toast.success('Default admin credentials filled', {
      description: `Email: ${defaultAdminEmail}`
    });
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setAuthNotice({
        status: 'error',
        message: 'Missing Fields',
        subMessage: 'Please enter both your email address and password.'
      });
      toast.error('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setAuthNotice({
      status: 'loading',
      message: 'Verifying Credentials...',
      subMessage: 'Connecting to database and validating terminal session...'
    });

    const cleanEmail = email.trim().toLowerCase();
    const isLoggingAsAdmin = authMode === 'admin' || cleanEmail === defaultAdminEmail.toLowerCase();

    // Simulated short realistic loading delay for visible animation
    await new Promise(r => setTimeout(r, 600));

    try {
      const authResult = await apiService.staff.authenticate(cleanEmail, password);

      if (!authResult.success) {
        setLoading(false);
        const errLower = (authResult.error || '').toLowerCase();

        if (errLower.includes('password') || errLower.includes('incorrect password')) {
          setAuthNotice({
            status: 'wrong_password',
            message: 'Wrong Password',
            subMessage: 'The password you entered is incorrect. Please check your spelling and try again.'
          });
          toast.error('Wrong password entered. Please try again.');
        } else if (errLower.includes('not exist') || errLower.includes('account') || errLower.includes('not found')) {
          setAuthNotice({
            status: 'account_not_found',
            message: 'Account or Email Does Not Exist',
            subMessage: `No registered account found for "${cleanEmail}". Check for typos or click Sign Up below.`
          });
          toast.error('Account or email does not exist.');
        } else {
          setAuthNotice({
            status: 'error',
            message: 'Login Failed',
            subMessage: authResult.error || 'Authentication error occurred.'
          });
          toast.error(authResult.error || 'Login failed.');
        }
        return;
      }

      if (authResult.user) {
        const staffUser = authResult.user;
        const roleName = staffUser.role || (isLoggingAsAdmin ? 'Kernel Admin' : 'Store Manager');

        let systemRole: UserRole = 'cashier';
        if (roleName === 'Kernel Admin' || roleName === 'admin' || isLoggingAsAdmin) {
          systemRole = 'admin';
          apiService.tenants.setActiveContext(null);
        } else if (
          roleName === 'Company Admin' ||
          roleName === 'Store Manager' ||
          roleName === 'Terminal Manager' ||
          roleName === 'merchant'
        ) {
          systemRole = 'merchant';
          if (staffUser.tenantSlug || staffUser.tenantId) {
            apiService.tenants.setActiveContext(staffUser.tenantSlug || staffUser.tenantId || null);
          } else if (currentTenant) {
            apiService.tenants.setActiveContext(currentTenant.slug);
          }
        } else {
          systemRole = 'cashier';
        }

        const userBranchId = staffUser.branchId || 'pharma-1';
        const userObj = {
          id: staffUser.id,
          name: staffUser.name,
          role: roleName,
          email: staffUser.email,
          level: staffUser.level || (systemRole === 'admin' ? 5 : 4),
          tenantId: staffUser.tenantId || currentTenant?.id,
          tenantSlug: staffUser.tenantSlug || currentTenant?.slug,
          branchId: userBranchId,
          permissions: staffUser.permissions || [
            'canAccessPOS', 
            'canApplyDiscounts', 
            'canManageInventory', 
            'canManageStaff',
            ...(systemRole === 'admin' ? ['canManageBranches', 'canAccessAdminPanel'] : [])
          ]
        };

        setAuthNotice({
          status: 'success',
          message: 'Login Successful!',
          subMessage: `Welcome back, ${userObj.name}. Authorizing clinical session...`
        });
        toast.success(`Login Successful! Welcome back, ${userObj.name}.`);

        setTimeout(() => {
          setLoading(false);
          onLogin(systemRole, userObj, userBranchId);
        }, 500);
        return;
      }
    } catch (err: any) {
      setLoading(false);
      setAuthNotice({
        status: 'error',
        message: 'Login Failed',
        subMessage: err?.message || 'Unexpected authentication error.'
      });
      toast.error(err?.message || 'Authentication error occurred.');
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setAuthNotice({
        status: 'error',
        message: 'Missing Full Name',
        subMessage: 'Please enter your full name.'
      });
      toast.error('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setAuthNotice({
        status: 'error',
        message: 'Invalid Email Address',
        subMessage: 'Please enter a valid email address.'
      });
      toast.error('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setAuthNotice({
        status: 'error',
        message: 'Weak Password',
        subMessage: 'Password must be at least 6 characters long.'
      });
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setAuthNotice({
        status: 'error',
        message: 'Passwords Do Not Match',
        subMessage: 'Please make sure both password fields match.'
      });
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    setAuthNotice({
      status: 'loading',
      message: 'Creating Staff Account...',
      subMessage: 'Saving account profile to secure database...'
    });

    await new Promise(r => setTimeout(r, 600));

    try {
      const cleanEmail = email.trim().toLowerCase();
      const defaultBranchId = branches[0]?.id || 'pharma-1';

      const newStaffRecord: any = {
        id: `ST-${Date.now().toString().slice(-6)}`,
        name: fullName.trim(),
        email: cleanEmail,
        role: 'Store Manager',
        branchId: defaultBranchId,
        status: 'online',
        level: 4,
        password: password,
        permissions: [
          'canAccessPOS', 
          'canManageStaff', 
          'canManageCustomers', 
          'canManageInventory', 
          'canAccessSuppliers', 
          'canAccessExpenses', 
          'canAccessTransfers', 
          'canViewReports'
        ],
        createdAt: new Date().toISOString()
      };

      await apiService.staff.add(newStaffRecord);

      const userObj = {
        id: newStaffRecord.id,
        name: newStaffRecord.name,
        role: 'Store Manager',
        email: cleanEmail,
        level: 4,
        branchId: defaultBranchId,
        permissions: newStaffRecord.permissions
      };

      setAuthNotice({
        status: 'success',
        message: 'Registration Successful!',
        subMessage: `Account created for ${userObj.name}. Signing you in...`
      });
      toast.success(`Account created successfully! Welcome, ${userObj.name}.`);

      setTimeout(() => {
        setLoading(false);
        onLogin('merchant', userObj, defaultBranchId);
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setAuthNotice({
        status: 'error',
        message: 'Registration Failed',
        subMessage: err?.message || 'Could not complete registration.'
      });
      toast.error(err?.message || 'Could not create account.');
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: 'url(/stethoscope_bg.jpg)' }}
    ><a href="/book" className="fixed top-4 right-4 z-50 bg-white border rounded-lg px-4 py-2 font-bold text-blue-700">Book laboratory tests</a>
      {/* Dark overlay for rich contrast and legibility */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />

      {/* Main Floating Glassmorphic Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl text-white"
      >
        {/* Header: Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-36 flex items-center justify-center p-2 mb-3 rounded-2xl bg-white/90 shadow-lg border border-white/20">
            <img 
              src={currentTenant?.logo && !currentTenant.logo.startsWith('/logo.png') ? currentTenant.logo : '/logo.png?v=4'} 
              alt="Logo" 
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            {authMode === 'admin' ? 'System Administrator' : authMode === 'signup' ? 'Create Account' : (currentTenant ? currentTenant.companyName : 'TekiPharm EMR & Clinical Suite')}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {authMode === 'admin' ? 'Enter master admin credentials' : authMode === 'signup' ? 'Fill details to register' : 'Enter your email and password'}
          </p>
        </div>

        {/* FEEDBACK & STATUS ALERT BANNER */}
        <AnimatePresence mode="wait">
          {authNotice.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className={`mb-5 p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                authNotice.status === 'loading'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                  : authNotice.status === 'wrong_password'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200 animate-shake'
                  : authNotice.status === 'account_not_found'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : authNotice.status === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {authNotice.status === 'loading' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                {authNotice.status === 'wrong_password' && <ShieldAlert className="w-5 h-5 text-rose-400" />}
                {authNotice.status === 'account_not_found' && <UserX className="w-5 h-5 text-amber-400" />}
                {authNotice.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />}
                {authNotice.status === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              </div>

              <div className="space-y-0.5 text-xs">
                <span className={`font-bold block ${
                  authNotice.status === 'loading' ? 'text-blue-300' :
                  authNotice.status === 'wrong_password' ? 'text-rose-300' :
                  authNotice.status === 'account_not_found' ? 'text-amber-300' :
                  authNotice.status === 'success' ? 'text-emerald-300' :
                  'text-rose-300'
                }`}>
                  {authNotice.message}
                </span>
                {authNotice.subMessage && (
                  <p className="text-[11px] text-slate-300/90 leading-relaxed font-normal">
                    {authNotice.subMessage}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Body */}
        <AnimatePresence mode="wait">
          {authMode === 'signup' ? (
            /* --- SIGN UP FORM --- */
            <motion.form 
              key="signup-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleSignUp} 
              className="space-y-4"
            >
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Full Name</label>
                <div className="relative">
                  <Input 
                    type="text"
                    required
                    disabled={loading}
                    value={fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="e.g. Dr. Evelyn Vance"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Input 
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 pr-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Confirm Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg mt-2 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Sign Up</span>
                )}
              </Button>

              {/* Toggle to Sign In */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthNotice({ status: 'idle', message: '' });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors cursor-pointer"
                >
                  Already have an account? <span className="text-emerald-400 font-bold underline">Sign In</span>
                </button>
              </div>
            </motion.form>
          ) : authMode === 'admin' ? (
            /* --- ADMIN LOGIN FORM --- */
            <motion.form 
              key="admin-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleSignIn} 
              className="space-y-4"
            >
              {/* Quick Autofill Badge */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-mono text-[11px] truncate">{defaultAdminEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutofillAdmin}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
                >
                  Autofill
                </button>
              </div>

              {/* Admin Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Admin Email</label>
                <div className="relative">
                  <Input 
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="kingsleyagu92@gmail.com"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-amber-500 text-white pl-10 rounded-xl text-xs font-medium placeholder:text-slate-500 font-mono"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-amber-500 text-white pl-10 pr-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Admin Button */}
              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg mt-2 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Admin...</span>
                  </>
                ) : (
                  <span>Sign In as Admin</span>
                )}
              </Button>

              {/* Switch back to standard login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthNotice({ status: 'idle', message: '' });
                    if (onNavigateToStaff) onNavigateToStaff();
                  }}
                  className="text-xs text-slate-400 hover:text-white font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  <span>Back to User Login</span>
                </button>
              </div>
            </motion.form>
          ) : (
            /* --- STANDARD USER / STAFF SIGN IN FORM --- */
            <motion.form 
              key="signin-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleSignIn} 
              className="space-y-4"
            >
              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Input 
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-slate-950/70 border-slate-700/80 focus:border-emerald-500 text-white pl-10 pr-10 rounded-xl text-xs font-medium placeholder:text-slate-500"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg mt-2 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>

              {/* Toggle to Sign Up */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthNotice({ status: 'idle', message: '' });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors cursor-pointer"
                >
                  Don't have an account? <span className="text-emerald-400 font-bold underline">Sign Up</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Dedicated Role Dashboard Quick Sign-In Bar */}
        {authMode !== 'admin' && (
          <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick Access — Dedicated User Dashboards
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Patient Portal', role: 'Patient (Portal Account)', name: 'Chinedu Okafor', email: 'chinedu.okafor@tekilab.io', dept: 'Patient Portal', primary: true },
                { label: 'Lab Scientist', role: 'Medical Lab Scientist', name: 'Tunde Adeyemi', email: 'tunde@tekilab.io', dept: 'Laboratory' },
                { label: 'Lead Scientist', role: 'Lead Lab Scientist / Pathologist', name: 'MLS Ibrahim Musa', email: 'ibrahim@tekilab.io', dept: 'Laboratory' },
                { label: 'Receptionist', role: 'Front Desk / Receptionist', name: 'Grace Olatunji', email: 'grace@tekilab.io', dept: 'Reception' },
                { label: 'Doctor Consult', role: 'Consulting Doctor', name: 'Dr. Zainab Mohammed', email: 'zainab@tekilab.io', dept: 'Doctor Consultation' },
                { label: 'Branch Manager', role: 'Branch Lab Manager', name: 'Chidinma Nwosu', email: 'chidinma@tekilab.io', dept: 'Laboratory' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onLogin(preset.role.includes('Manager') ? 'merchant' : 'cashier', {
                      id: `demo-${preset.label.toLowerCase().replace(/\s+/g, '-')}`,
                      name: preset.name,
                      email: preset.email,
                      role: preset.role,
                      department: preset.dept,
                      mrn: preset.label === 'Patient Portal' ? 'TK-PAT-10421' : undefined
                    });
                    toast.success(`Signed in to ${preset.label} Dashboard`);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    preset.primary
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 col-span-2'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('admin');
                  setAuthNotice({ status: 'idle', message: '' });
                  if (onNavigateToAdmin) onNavigateToAdmin();
                }}
                className="text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Executive CEO / Admin Portal</span>
              </button>
            </div>
          </div>
        )}

        {/* Return to Landing */}
        {onBack && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
