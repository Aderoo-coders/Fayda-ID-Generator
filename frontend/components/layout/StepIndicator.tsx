import { Check, Upload, ScanSearch, Edit, Eye, Download } from 'lucide-react';
import type { WorkflowStep } from '@/types/id-card';

const steps: { key: WorkflowStep; label: string; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'extract', label: 'Extract', icon: ScanSearch },
  { key: 'edit', label: 'Edit', icon: Edit },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'download', label: 'Download', icon: Download },
];

interface Props {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
}

export function StepIndicator({ currentStep, completedSteps }: Props) {
  const currentIdx = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted ? 'step-completed' : isCurrent ? 'step-active shadow-lg shadow-primary/30' : 'step-inactive'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 mt-[-18px] transition-colors ${
                  i < currentIdx ? 'bg-primary/40' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
