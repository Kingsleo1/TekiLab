import React, { useState } from 'react';
import { 
  Building2, 
  Building, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  Plus 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FacilityType } from '../../types/pharmacy';
import { toast } from 'sonner';

interface FacilityOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFacilityConfig: (config: any) => void;
}

const FACILITY_TYPES: { type: FacilityType; description: string; recommendedModules: string[] }[] = [
  {
    type: 'Pharmacy',
    description: 'Single or multi-branch retail pharmacy and dispensary.',
    recommendedModules: ['POS & Billing', 'Multi-Batch Inventory', 'Expenses & Debtors', 'Supplier Procurement']
  },
  {
    type: 'Laboratory',
    description: 'Standalone or integrated medical diagnostic laboratory.',
    recommendedModules: ['Patient Master Index', 'Laboratory LIMS', 'Specimen Accessioning', 'PDF Results & Verification']
  },
  {
    type: 'Clinic',
    description: 'Outpatient clinic or general medical practice.',
    recommendedModules: ['Patient Master Index', 'Doctor EMR & Consultations', 'Prescriptions', 'Billing']
  },
  {
    type: 'Hospital',
    description: 'Full-service inpatient & outpatient hospital system.',
    recommendedModules: [
      'Patient Master Index & EMR',
      'Doctor Consultations & Prescriptions',
      'Laboratory LIMS & Diagnostic Reporting',
      'Radiology & Medical Imaging',
      'Inpatient Wards & Bed Management',
      'Pharmacy POS & Inventory',
      'Unified Charge Capture & HMO Claims'
    ]
  }
];

export function FacilityOnboardingModal({
  isOpen,
  onClose,
  onSaveFacilityConfig
}: FacilityOnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [facilityName, setFacilityName] = useState('TekiMed General Hospital');
  const [selectedFacilityType, setSelectedFacilityType] = useState<FacilityType>('Hospital');
  const [address, setAddress] = useState('12 Commercial Avenue, Healthcare District, Abuja');
  const [phone, setPhone] = useState('+234 800 835 4742');

  const handleFinish = () => {
    const config = {
      facilityName,
      facilityType: selectedFacilityType,
      address,
      phone,
      activeModules: FACILITY_TYPES.find(f => f.type === selectedFacilityType)?.recommendedModules || []
    };
    onSaveFacilityConfig(config);
    toast.success(`Facility onboarded successfully as ${selectedFacilityType}!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-sky-600" /> TekiMed Healthcare Onboarding Wizard
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure your organisation profile and activate recommended clinical, diagnostic, and pharmacy modules.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 text-xs">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Step 1: Select Facility Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FACILITY_TYPES.map((fac) => {
                const isSelected = selectedFacilityType === fac.type;
                return (
                  <div
                    key={fac.type}
                    onClick={() => setSelectedFacilityType(fac.type)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-800 shadow-sm' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{fac.type}</span>
                      {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{fac.description}</p>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setStep(2)} className="bg-sky-600 text-white gap-2 text-xs">
                Next: Facility Details <ChevronRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Step 2: Organisation & Branch Identity</h3>
            <div className="space-y-3">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Healthcare Facility Name *</label>
                <Input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Physical Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                <Check className="w-4 h-4" /> Activate Facility Workspace
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
