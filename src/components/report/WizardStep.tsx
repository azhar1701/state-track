import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, MapPin, FileText, Camera, User } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Lokasi', desc: 'Pilih lokasi kejadian', icon: MapPin },
  { id: 2, title: 'Detail', desc: 'Informasi laporan', icon: FileText },
  { id: 3, title: 'Bukti', desc: 'Upload foto (opsional)', icon: Camera },
  { id: 4, title: 'Kontak', desc: 'Data pelapor', icon: User },
];

interface WizardStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  canProceed?: boolean;
}

export const WizardStep = ({ 
  currentStep, 
  totalSteps, 
  onNext, 
  onBack, 
  onSubmit,
  children,
  canProceed = true 
}: WizardStepProps) => {
  const progress = (currentStep / totalSteps) * 100;
  const step = STEPS[currentStep - 1];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6 page-transition">
      <div className="container max-w-2xl px-4">
        <Card className="mb-6 p-4 shadow-float">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {currentStep}/{totalSteps}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </Card>

        <Card className="p-6 md:p-8 shadow-lifted mb-6">
          {children}
        </Card>

        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 btn-haptic"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          )}
          <Button
            onClick={currentStep === totalSteps ? onSubmit : onNext}
            className="flex-1 btn-haptic"
            disabled={!canProceed}
          >
            {currentStep === totalSteps ? 'Kirim Laporan' : 'Lanjut'}
            {currentStep < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { STEPS };
