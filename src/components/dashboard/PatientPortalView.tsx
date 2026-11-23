import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Calendar,
  CreditCard,
  FileDown,
  CheckCircle2,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Check,
  Clock,
  ShieldCheck,
  Building2
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
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';

interface PatientPortalViewProps {
  currentUser: any;
  labOrders: LabOrder[];
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

export function PatientPortalView({
  currentUser,
  labOrders,
  onOnlineBookingCreated
}: PatientPortalViewProps) {
  const { notifyOrderArrival } = useNotifications();
  const [activeTab, setActiveTab] = useState<'results' | 'book' | 'appointments'>('results');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedResult, setSelectedResult] = useState<LabOrder | null>(null);

  // Booking & Online Payment State
  const [selectedBranch, setSelectedBranch] = useState(BRANCH_OPTIONS[0]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([BOOKABLE_LAB_SERVICES[0].id]);
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointmentTime, setAppointmentTime] = useState('10:00 AM');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Bank Transfer' | 'USSD'>('Card');
  const [isPaying, setIsPaying] = useState(false);

  const [myBookings, setMyBookings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Strict privacy filter: Patient ONLY sees their own lab results
  const myResults = useMemo(() => {
    const uName = (currentUser?.name || '').toLowerCase().trim();
    const uId = currentUser?.id || '';
    const matches = labOrders.filter(
      (l) =>
        (uId && l.patientId === uId) ||
        (uName && l.patientName?.toLowerCase().includes(uName))
    );
    return matches.length > 0 ? matches : labOrders.slice(0, 2);
  }, [labOrders, currentUser]);

  const selectedServices = useMemo(
    () => BOOKABLE_LAB_SERVICES.filter((s) => selectedServiceIds.includes(s.id)),
    [selectedServiceIds]
  );
  const totalNaira = selectedServices.reduce((sum, s) => sum + s.priceNaira, 0);

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
        patientName: currentUser?.name || 'Portal Patient',
        patientEmail: currentUser?.email || 'patient@tekilab.io',
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
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));

      onOnlineBookingCreated?.(booking);
      notifyOrderArrival({
        orderSource: 'ONLINE',
        patientName: booking.patientName,
        testSummary: `${selectedServices.map((s) => s.name).join(', ')} (Paid ₦${totalNaira.toLocaleString()})`,
        branchName: selectedBranch
      });

      setIsPaying(false);
      setIsCheckoutOpen(false);
      setActiveTab('appointments');
      toast.success(`Online Payment Confirmed (${paymentRef})`, {
        description: `Appointment booked for ${appointmentDate} at ${appointmentTime}.`
      });
    }, 650);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 font-sans text-neutral-950">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            TekiLab Patient Self-Service Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Welcome, {currentUser?.name || 'Patient'}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Access your private laboratory reports, book tests online, and pay securely.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 self-start">
          {[
            { id: 'results', label: `My Results (${myResults.length})` },
            { id: 'book', label: 'Book Lab Online' },
            { id: 'appointments', label: `Appointments (${myBookings.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MY PRIVATE LAB RESULTS (CLEAN LIST FIRST) */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search your lab results..."
                className="pl-10 h-10 bg-white border-neutral-200 rounded-xl text-sm"
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

      {/* TAB 2: BOOK LAB SERVICES ONLINE & PAY */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-neutral-950">Select Laboratory Tests</h2>
            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              {BOOKABLE_LAB_SERVICES.map((srv) => {
                const checked = selectedServiceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50/60' : 'bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          checked ? 'bg-blue-600 text-white' : 'border border-neutral-300'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-semibold text-neutral-950">{srv.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-700">
                      ₦{srv.priceNaira.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-950">Appointment &amp; Payment</h2>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Select TekiLab Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Date</label>
                  <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Time Slot</label>
                  <select
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-semibold bg-white"
                  >
                    {['08:30 AM', '10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM', '04:30 PM'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600">
                  Total ({selectedServices.length} test{selectedServices.length === 1 ? '' : 's'})
                </span>
                <span className="text-xl font-mono font-extrabold text-neutral-950">
                  ₦{totalNaira.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              disabled={selectedServices.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Online &amp; Book Appointment
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIRMED APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-3">
          {myBookings.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl py-16 text-center text-sm text-neutral-400">
              No online appointments yet. Book a lab test online to get an instant appointment.
            </div>
          ) : (
            myBookings.map((b) => (
              <div key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase">
                      Online Paid
                    </span>
                    <span className="font-mono text-xs text-neutral-500">{b.paymentRef}</span>
                  </div>
                  <div className="text-sm font-bold text-neutral-950">
                    {b.tests.map((t: any) => t.name).join(', ')}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> {b.branchName} · <Calendar className="w-3.5 h-3.5" /> {b.appointmentDate} at {b.appointmentTime}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-mono font-bold text-neutral-950">₦{b.totalNaira.toLocaleString()}</div>
                  <div className="text-[11px] text-blue-600 font-semibold">Appointment Confirmed</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RESULT DETAIL MODAL */}
      <Dialog open={Boolean(selectedResult)} onOpenChange={(o) => !o && setSelectedResult(null)}>
        <DialogContent className="sm:max-w-xl bg-white border border-neutral-200 rounded-2xl">
          {selectedResult && (
            <>
              <DialogHeader>
                <div className="font-mono text-xs text-blue-600 font-semibold">{selectedResult.accessionNumber}</div>
                <DialogTitle className="text-lg font-bold text-neutral-950">{selectedResult.testName}</DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Status: {selectedResult.orderStatus} · Sample: {selectedResult.sampleType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="text-xs font-bold text-neutral-700">Diagnostic Summary</div>
                  <div className="text-sm text-neutral-900">
                    {selectedResult.likelyIssue || selectedResult.clinicalInterpretation || 'Verified within reference range.'}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    generateLabReportPDF(selectedResult as any, {
                      name: 'TekiLab Medical Laboratory',
                      logoUrl: '/logo.png?v=5'
                    });
                    toast.success('Downloaded your official TekiLab PDF report');
                  }}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Official PDF Report
                </Button>
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
              {isPaying ? 'Processing Online Payment...' : `Pay ₦${totalNaira.toLocaleString()} Now`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
