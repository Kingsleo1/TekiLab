import {ownReleasedResults} from '../../lib/patient-results';
import {qrRequest} from '../../services/qr';
import { OnlineBooking } from '../ClinicalPublicPages';
import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Calendar,
  History,
  Gift,
  User as UserIcon,
  CreditCard,
  FileDown,
  Printer,
  CheckCircle2,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Check,
  Clock,
  ShieldCheck,
  Building2,
  Copy,
  Share2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Phone,
  Mail,
  Sparkles,
  UserPlus,
  ExternalLink
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
import { LabOrder } from '../../types/pharmacy';
import { generateLabReportPDF } from '../../lib/reporting-utils';
import { normalizeNigerianWhatsAppPhone } from '../../config/roles';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';

interface PatientPortalViewProps {
  currentUser: any;
  labOrders: LabOrder[];
  standalone?: boolean;
  onLogout?: () => void;
  onUserUpdate?: (updatedUser: any) => void;
  onOnlineBookingCreated?: (booking: {
    id: string;
    patientName: string;
    patientEmail: string;
    branchName: string;
    tests: { name: string; priceNaira: number }[];
    totalNaira: number;
    appointmentDate: string;
    appointmentTime: string;
    paymentRef: string;
    orderSource: 'ONLINE';
  }) => void;
}

type PatientTab = 'overview' | 'results' | 'book' | 'history' | 'referrals' | 'profile';

const BOOKABLE_LAB_SERVICES = [
  { id: 'srv-mp', name: 'Malaria RDT (P. falciparum / Pan)', priceNaira: 3500, tat: '5 mins' },
  { id: 'srv-cbc', name: 'Complete Blood Count (CBC) Rapid', priceNaira: 6000, tat: '5 mins' },
  { id: 'srv-glu', name: 'Fasting Blood Glucose & HbA1c', priceNaira: 7500, tat: '5 mins' },
  { id: 'srv-typ', name: 'Typhoid Rapid IgM / Widal', priceNaira: 4000, tat: '6 mins' },
  { id: 'srv-lip', name: 'Lipid Profile Rapid', priceNaira: 12000, tat: '7 mins' },
  { id: 'srv-uri', name: 'Urine Dipstick 10-Parameter', priceNaira: 3000, tat: '5 mins' },
  { id: 'srv-hep', name: 'Hepatitis B & C Rapid Screening', priceNaira: 8500, tat: '6 mins' },
  { id: 'srv-sti', name: 'Comprehensive STI Rapid Panel', priceNaira: 15000, tat: '8 mins' }
];

const BRANCH_OPTIONS = [
  'TekiLab Victoria Island (HQ)',
  'TekiLab Ikeja Diagnostic Hub',
  'TekiLab Abuja Wuse II Branch'
];

const BOOKINGS_STORAGE_KEY = 'tekilab_patient_online_bookings_v1';
const REFERRALS_STORAGE_KEY = 'tekilab_patient_referrals_v1';
const PROFILE_STORAGE_KEY = 'tekilab_patient_profile_v1';

interface ReferralItem {
  id: string;
  friendName: string;
  friendPhone: string;
  note?: string;
  status: 'Completed' | 'Invited';
  rewardNaira: number;
  createdAt: string;
}

const DEFAULT_REFERRALS: ReferralItem[] = [];

export function PatientPortalView({
  currentUser,
  labOrders,
  standalone = false,
  onLogout,
  onUserUpdate,
  onOnlineBookingCreated
}: PatientPortalViewProps) {
  const { notifyOrderArrival } = useNotifications();
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedResult, setSelectedResult] = useState<LabOrder | null>(null);

  // Patient Profile State
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY+':'+(currentUser?.id||'anonymous'));
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      mrn: currentUser?.mrn || '',
      gender: currentUser?.gender||'',
      dob: currentUser?.dob||'',
      bloodGroup: currentUser?.bloodGroup||'',
      address: currentUser?.address||'',
      allergies: currentUser?.allergies||'',
      emergencyContact: currentUser?.emergencyContact||''
    };
  });

  // Change Password State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Booking & Online Payment State
  const [selectedBranch, setSelectedBranch] = useState(BRANCH_OPTIONS[0]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([BOOKABLE_LAB_SERVICES[0].id]);
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointmentTime, setAppointmentTime] = useState('10:00 AM');
  const [applyReferralCredit, setApplyReferralCredit] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Bank Transfer' | 'USSD'>('Card');
  const [isPaying, setIsPaying] = useState(false);

  const [myBookings, setMyBookings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY+':'+(currentUser?.id||'anonymous'));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Referrals State
  const [referrals, setReferrals] = useState<ReferralItem[]>(() => {
    try {
      const saved = localStorage.getItem(REFERRALS_STORAGE_KEY+':'+(currentUser?.id||'anonymous'));
      return saved ? JSON.parse(saved) : DEFAULT_REFERRALS;
    } catch {
      return DEFAULT_REFERRALS;
    }
  });
  const [refFriendName, setRefFriendName] = useState('');
  const [refFriendPhone, setRefFriendPhone] = useState('');
  const [refNote, setRefNote] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const referralCode = useMemo(() => {
    const first = (profile.fullName || 'PATIENT').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7);
    return `TK-REF-${first || 'LAB'}`;
  }, [profile.fullName]);

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://tekilab.io'}/?ref=${referralCode}`;
  const availableCreditNaira = referrals.reduce((sum, r) => sum + (r.rewardNaira || 0), 0);
  const phoneMeta = normalizeNigerianWhatsAppPhone(profile.phone);

  const [portalRecords,setPortalRecords]=useState<any[]>([]);
  const [portalError,setPortalError]=useState('');
  const linkedPatientId=currentUser?.id||'';
  useEffect(()=>{let active=true;setPortalRecords([]);const refresh=()=>{if(!linkedPatientId)return;qrRequest('/portal/results',undefined,{tenantId:currentUser?.tenantId||'tenant-tekilab-01',branchId:currentUser?.branchId||'pharma-1'},{...currentUser,id:linkedPatientId}).then(data=>{if(active){setPortalRecords(data.orders||[]);setPortalError('');}}).catch(()=>{if(active)setPortalError('Shared result refresh is unavailable. Only locally saved results are shown.');});};refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[linkedPatientId,currentUser?.tenantId,currentUser?.branchId]);
  const myResults=useMemo(()=>{const records=new Map([...ownReleasedResults(labOrders,linkedPatientId),...portalRecords.filter(order=>['RELEASED','Released'].includes(order.orderStatus)&&order.reportApproval&&order.verification?.token)].map(order=>[order.id,order]));return Array.from(records.values());},[labOrders,portalRecords,linkedPatientId]);

  // Unified Chronological Interaction History with the Lab
  const interactionHistory = useMemo(() => {
    const items: {
      id: string;
      date: string;
      type: 'Lab Result' | 'Online Booking' | 'Referral';
      title: string;
      detail: string;
      badge: string;
    }[] = [];

    myResults.forEach((r) => {
      items.push({
        id: `res-${r.id}`,
        date: r.validatedAt || r.createdAt || new Date().toISOString(),
        type: 'Lab Result',
        title: `${r.testName} (${r.accessionNumber})`,
        detail: r.likelyIssue || r.clinicalInterpretation || 'Diagnostic result validated and archived.',
        badge: r.orderStatus || 'RELEASED'
      });
    });

    myBookings.forEach((b) => {
      items.push({
        id: `bk-${b.id}`,
        date: b.createdAt || new Date().toISOString(),
        type: 'Online Booking',
        title: `Online Lab Booking — ${b.branchName}`,
        detail: `${b.tests.map((t: any) => t.name).join(', ')} · Paid ₦${Number(b.totalNaira).toLocaleString()} (${b.paymentRef})`,
        badge: `${b.appointmentDate} ${b.appointmentTime}`
      });
    });

    referrals.forEach((ref) => {
      items.push({
        id: `rf-${ref.id}`,
        date: ref.createdAt,
        type: 'Referral',
        title: `Referred ${ref.friendName}`,
        detail: ref.note || `Invited via ${referralCode}`,
        badge: ref.status === 'Completed' ? `+₦${ref.rewardNaira.toLocaleString()}` : 'Invited'
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [myResults, myBookings, referrals, referralCode]);

  const selectedServices = useMemo(
    () => BOOKABLE_LAB_SERVICES.filter((s) => selectedServiceIds.includes(s.id)),
    [selectedServiceIds]
  );
  const subtotalNaira = selectedServices.reduce((sum, s) => sum + s.priceNaira, 0);
  const appliedDiscount = applyReferralCredit ? Math.min(availableCreditNaira, subtotalNaira) : 0;
  const totalNaira = Math.max(0, subtotalNaira - appliedDiscount);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmOnlinePayment = () => {
    if (selectedServices.length === 0) {
      toast.error('Select at least one laboratory test.');
      return;
    }
    setIsPaying(true);
    setTimeout(() => {
      const paymentRef = `TK-PAY-${Date.now().toString(36).toUpperCase()}`;
      const booking = {
        id: `bk-${Date.now()}`,
        patientName: profile.fullName,
        patientEmail: profile.email,
        branchName: selectedBranch,
        tests: selectedServices.map((s) => ({ name: s.name, priceNaira: s.priceNaira })),
        totalNaira,
        appointmentDate,
        appointmentTime,
        paymentRef,
        paymentMethod,
        paymentStatus: 'PAID_ONLINE',
        orderSource: 'ONLINE' as const,
        createdAt: new Date().toISOString()
      };

      const next = [booking, ...myBookings];
      setMyBookings(next);
      localStorage.setItem(BOOKINGS_STORAGE_KEY+':'+(currentUser?.id||'anonymous'), JSON.stringify(next));

      onOnlineBookingCreated?.(booking);
      notifyOrderArrival({
        orderSource: 'ONLINE',
        patientName: booking.patientName,
        testSummary: `${selectedServices.map((s) => s.name).join(', ')} (Paid ₦${totalNaira.toLocaleString()})`,
        branchName: selectedBranch
      });

      setIsPaying(false);
      setIsCheckoutOpen(false);
      setActiveTab('history');
      toast.success(`Online Payment Confirmed (${paymentRef})`, {
        description: `Appointment booked for ${appointmentDate} at ${appointmentTime}.`
      });
    }, 600);
  };

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refFriendName.trim()) {
      toast.error("Enter your friend's full name.");
      return;
    }
    const norm = normalizeNigerianWhatsAppPhone(refFriendPhone);
    const newRef: ReferralItem = {
      id: `ref-${Date.now()}`,
      friendName: refFriendName.trim(),
      friendPhone: norm.display || refFriendPhone.trim() || 'Not provided',
      note: refNote.trim() || 'Invited to TekiLab Rapid Diagnostics',
      status: 'Invited',
      rewardNaira: 0,
      createdAt: new Date().toISOString()
    };
    const next = [newRef, ...referrals];
    setReferrals(next);
    localStorage.setItem(REFERRALS_STORAGE_KEY+':'+(currentUser?.id||'anonymous'), JSON.stringify(next));
    setRefFriendName('');
    setRefFriendPhone('');
    setRefNote('');
    toast.success(`Referral sent to ${newRef.friendName}!`, {
      description: 'You earn ₦1,500 lab credit once they complete their first test.'
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(PROFILE_STORAGE_KEY+':'+(currentUser?.id||'anonymous'), JSON.stringify(profile));
    if (onUserUpdate && currentUser) {
      const updated = { ...currentUser, name: profile.fullName, email: profile.email, phone: profile.phone };
      localStorage.setItem('ph_current_user', JSON.stringify(updated));
      onUserUpdate(updated);
    }
    toast.success('Personal profile updated successfully.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    toast.error('Password changes require the configured account service. No password was changed.');
  };

  const handleDownloadResultPDF = async(order:LabOrder) => {
    try{await generateLabReportPDF(order,{id:order.patientId,fullName:order.patientName,mrn:order.mrn});toast.success('Verified result PDF downloaded.');}catch(error:any){toast.error(error.message||'The verified result could not be downloaded.');}
  };
  const handlePrintResult = () => {
    if(!selectedResult?.verification?.url){toast.error('Open a saved verified result before printing.');return;}
    window.open(selectedResult.verification.url,'_blank','noopener,noreferrer');
    toast.info('Use Print verified result on the result verification page.');
  };

  const navItems: { id: PatientTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'My Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'results', label: 'My Lab Results', icon: <FlaskConical className="w-4 h-4" />, badge: myResults.length },
    { id: 'book', label: 'Book Lab & Pay', icon: <Calendar className="w-4 h-4" /> },
    { id: 'history', label: 'Lab History', icon: <History className="w-4 h-4" />, badge: interactionHistory.length },
    { id: 'referrals', label: 'Referrals & Rewards', icon: <Gift className="w-4 h-4" />, badge: referrals.length },
    { id: 'profile', label: 'Profile & Password', icon: <UserIcon className="w-4 h-4" /> }
  ];

  const content = (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans text-neutral-950">{portalError&&<p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">{portalError}</p>}
      {/* Top Tabs when embedded inside Staff App */}
      {!standalone && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-2 flex flex-wrap items-center gap-1.5 shadow-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: PATIENT OVERVIEW DASHBOARD                                   */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                <ShieldCheck className="w-4 h-4" />
                <span>TekiLab Personal Patient Dashboard</span>
                <span className="text-neutral-300">·</span>
                <span className="font-mono text-neutral-500">{profile.mrn}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
                Welcome back, {profile.fullName}
              </h1>
              <p className="text-sm text-neutral-500">
                View &amp; print your private lab results, book tests online, track visits, and earn referral rewards.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                onClick={() => setActiveTab('book')}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Lab Test
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab('referrals')}
                className="h-10 px-4 rounded-xl border-neutral-200 font-semibold"
              >
                <Gift className="w-4 h-4 mr-2 text-blue-600" />
                Refer &amp; Earn
              </Button>
            </div>
          </div>

          {/* 4 Clean KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className="p-5 rounded-2xl bg-white border border-neutral-200 text-left hover:border-blue-500 transition-all cursor-pointer shadow-xs"
            >
              <div className="text-xs font-semibold text-neutral-500">My Lab Results</div>
              <div className="text-2xl font-bold font-mono text-neutral-950 mt-1">{myResults.length}</div>
              <div className="text-[11px] text-blue-600 font-semibold mt-1">View &amp; Download PDF →</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="p-5 rounded-2xl bg-white border border-neutral-200 text-left hover:border-blue-500 transition-all cursor-pointer shadow-xs"
            >
              <div className="text-xs font-semibold text-neutral-500">Online Bookings</div>
              <div className="text-2xl font-bold font-mono text-neutral-950 mt-1">{myBookings.length}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Appointments &amp; receipts</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('referrals')}
              className="p-5 rounded-2xl bg-white border border-neutral-200 text-left hover:border-blue-500 transition-all cursor-pointer shadow-xs"
            >
              <div className="text-xs font-semibold text-neutral-500">Referral Rewards</div>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
                ₦{availableCreditNaira.toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">{referrals.length} people referred</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="p-5 rounded-2xl bg-white border border-neutral-200 text-left hover:border-blue-500 transition-all cursor-pointer shadow-xs"
            >
              <div className="text-xs font-semibold text-neutral-500">WhatsApp Delivery</div>
              <div className="text-sm font-bold text-neutral-950 mt-2">
                {phoneMeta.isWhatsAppQualified ? '+234 Active' : 'Update Number'}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 truncate">{phoneMeta.display}</div>
            </button>
          </div>

          {/* Latest Result Quick Card */}
          {myResults[0] && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Latest Laboratory Report
                </div>
                <div className="text-lg font-bold text-neutral-950">{myResults[0].testName}</div>
                <div className="text-xs text-neutral-500">
                  {myResults[0].accessionNumber} · {myResults[0].likelyIssue || 'Verified Reference Result'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedResult(myResults[0])}
                  className="rounded-xl border-neutral-200 text-xs font-semibold"
                >
                  Inspect Result
                </Button>
                <Button
                  onClick={() => handleDownloadResultPDF(myResults[0])}
                  className="rounded-xl bg-neutral-950 hover:bg-blue-600 text-white text-xs font-semibold"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY LAB RESULTS (CLEAN LIST DEFAULT + PRINT & DOWNLOAD)       */}
      {/* =================================================================== */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-neutral-950">My Laboratory Results</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Private diagnostic reports belonging only to your account. Click any test to inspect, print, or download PDF.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search your lab results by test name..."
                className="pl-10 h-11 bg-white border-neutral-200 rounded-xl text-sm"
              />
            </div>
            <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden shadow-xs">
              {myResults
                .filter((r) => !searchTerm.trim() || r.testName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedResult(order)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-blue-50/40 cursor-pointer group"
                  >
                    <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700">
                      {order.testName}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600" />
                  </button>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myResults
                .filter((r) => !searchTerm.trim() || r.testName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedResult(order)}
                    className="p-4 bg-white border border-neutral-200 rounded-2xl text-left hover:border-blue-500 cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <span className="text-sm font-semibold text-neutral-950 group-hover:text-blue-700">
                      {order.testName}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BOOK LAB SERVICES ONLINE & PAY                               */}
      {/* =================================================================== */}
      {activeTab === 'book' && <OnlineBooking initialPatient={profile}/>}

      {/* =================================================================== */}
      {/* TAB 4: LAB INTERACTION HISTORY                                      */}
      {/* =================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-neutral-950">My Lab Interaction History</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Complete chronological log of all your tests, online appointments, payments, and referrals with TekiLab.
            </p>
          </div>

          <div className="space-y-2.5">
            {interactionHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        item.type === 'Online Booking'
                          ? 'bg-blue-600 text-white'
                          : item.type === 'Referral'
                            ? 'bg-neutral-950 text-white'
                            : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-sm font-bold text-neutral-950">{item.title}</span>
                  </div>
                  <p className="text-xs text-neutral-600">{item.detail}</p>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(item.date).toLocaleString()}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold self-start sm:self-center shrink-0">
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: REFERRALS & REWARDS                                          */}
      {/* =================================================================== */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="bg-neutral-950 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Gift className="w-4 h-4" />
                TekiLab Referral Program
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Refer Friends &amp; Earn ₦1,500 Credit</h2>
              <p className="text-xs text-neutral-400 max-w-xl">
                Share your personal referral code or invite friends directly. Every friend who completes a lab test earns you ₦1,500 toward your next diagnostic test.
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2.5 shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Your Referral Code</div>
              <div className="text-xl font-mono font-bold text-white tracking-wider">{referralCode}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(referralLink);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1800);
                    toast.success('Referral link copied!');
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  Copy Link
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Book fast 5–10 minute lab tests at TekiLab using my referral code ${referralCode}: ${referralLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Direct Refer a Friend Form */}
            <form onSubmit={handleCreateReferral} className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-neutral-950">Refer Someone Directly</h3>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Friend&apos;s Full Name *</label>
                <Input
                  value={refFriendName}
                  onChange={(e) => setRefFriendName(e.target.value)}
                  placeholder="e.g. Chuka Obi"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Friend&apos;s Phone (+234 WhatsApp)</label>
                <Input
                  value={refFriendPhone}
                  onChange={(e) => setRefFriendPhone(e.target.value)}
                  placeholder="+234 803 000 1111"
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Recommended Test / Note (Optional)</label>
                <Input
                  value={refNote}
                  onChange={(e) => setRefNote(e.target.value)}
                  placeholder="e.g. Full Body Checkup / Rapid Malaria"
                  className="h-10 rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Send Referral Invite
              </Button>
            </form>

            {/* Referral History List */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-950">My Referrals ({referrals.length})</h3>
                <span className="text-xs font-mono font-bold text-blue-600">
                  Total Earned: ₦{availableCreditNaira.toLocaleString()}
                </span>
              </div>
              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
                {referrals.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-3 bg-white">
                    <div>
                      <div className="text-sm font-semibold text-neutral-950">{r.friendName}</div>
                      <div className="text-xs text-neutral-500">{r.friendPhone} · {r.note}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                        r.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {r.status === 'Completed' ? `+₦${r.rewardNaira.toLocaleString()} Credited` : 'Invited'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PERSONAL PROFILE & CHANGE PASSWORD                           */}
      {/* =================================================================== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Personal Information Form */}
          <form onSubmit={handleSaveProfile} className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-950">My Personal Information</h2><p className="text-sm break-all">Portal account reference: <strong>{currentUser?.id||'Not signed in'}</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                <Input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">WhatsApp Phone (+234)</label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Blood Group</label>
                <Input
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Date of Birth</label>
                <Input
                  type="date"
                  value={profile.dob}
                  onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Known Allergies</label>
                <Input
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Residential Address</label>
                <Input
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Emergency Contact</label>
                <Input
                  value={profile.emergencyContact}
                  onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Save Profile Changes
              </Button>
            </div>
          </form>

          {/* Change Password Security Card */}
          <form onSubmit={handleChangePassword} className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs self-start">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <h2 className="text-lg font-bold text-neutral-950">Change Password</h2>
            </div>
            <p className="text-xs text-neutral-500">
              Keep your private medical results protected with a strong password.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Current Password</label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">New Password</label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-10 rounded-xl pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Confirm New Password</label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter new password"
                className="h-10 rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full h-10 rounded-xl bg-neutral-950 hover:bg-blue-600 text-white font-semibold">
              Update Password
            </Button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* RESULT DETAIL, PRINT & DOWNLOAD MODAL                               */}
      {/* =================================================================== */}
      <Dialog open={Boolean(selectedResult)} onOpenChange={(o) => !o && setSelectedResult(null)}>
        <DialogContent className="sm:max-w-2xl bg-white border border-neutral-200 rounded-2xl">
          {selectedResult && (
            <>
              <DialogHeader>
                <div className="font-mono text-xs text-blue-600 font-semibold">{selectedResult.accessionNumber}</div>
                <DialogTitle className="text-xl font-bold text-neutral-950">{selectedResult.testName}</DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Patient: {profile.fullName} · Sample: {selectedResult.sampleType} · Status: {selectedResult.orderStatus}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="text-xs font-bold text-neutral-700">Diagnostic Summary</div>
                  <div className="text-sm text-neutral-900">
                    {selectedResult.likelyIssue || selectedResult.clinicalInterpretation || 'Verified within biological reference range.'}
                  </div>
                </div>

                {selectedResult.results && Object.keys(selectedResult.results).length > 0 && (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Parameter</th>
                          <th className="py-2.5 px-4 font-semibold">Result</th>
                          <th className="py-2.5 px-4 font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {Object.entries(selectedResult.results).map(([k, v]: [string, any]) => (
                          <tr key={k}>
                            <td className="py-2.5 px-4 font-medium text-neutral-900">{k}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-neutral-950">{v?.value || String(v)}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                {v?.flag || 'Normal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handlePrintResult}
                    className="h-10 rounded-xl border-neutral-300 font-semibold"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Result
                  </Button>
                  <Button
                    onClick={() => handleDownloadResultPDF(selectedResult)}
                    className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ONLINE PAYMENT CHECKOUT MODAL */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-neutral-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-950">TekiLab Online Payment</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Instant confirmation &amp; priority check-in at {selectedBranch}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-neutral-950 text-white flex items-center justify-between">
              <span className="text-xs text-neutral-400">Amount Due</span>
              <span className="text-xl font-mono font-bold">₦{totalNaira.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Card', 'Bank Transfer', 'USSD'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                    paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-neutral-700 border-neutral-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button
              onClick={handleConfirmOnlinePayment}
              disabled={isPaying}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isPaying ? 'Processing Payment...' : `Pay ₦${totalNaira.toLocaleString()} Now`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // If standalone (logged in as Patient), render dedicated Patient-Only App Shell!
  if (standalone) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans">
        <aside className="w-full md:w-68 bg-neutral-950 text-white flex flex-col shrink-0 border-r border-neutral-800">
          <div className="p-4 border-b border-neutral-800">
            <div className="h-14 rounded-xl bg-white px-3 py-1.5 flex items-center justify-center">
              <img src="/logo.png?v=5" alt="TekiLab" className="h-full object-contain" />
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-neutral-800 space-y-2">
            <div className="px-3 py-2 rounded-xl bg-neutral-900">
              <div className="text-xs font-bold text-white truncate">{profile.fullName}</div>
              <div className="text-[11px] font-mono text-neutral-400">{profile.mrn}</div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8 overflow-y-auto">{content}</main>
      </div>
    );
  }

  return content;
}
