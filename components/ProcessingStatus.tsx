"use client";

import React from 'react';

export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  icon: React.ReactNode;
}

interface ProcessingStatusProps {
  steps: Step[];
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ steps }) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-10" />
        
        <div className="flex justify-between items-start">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center gap-3 relative px-4">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${
                  step.status === 'completed' 
                    ? 'bg-emerald-500 text-white' 
                    : step.status === 'processing'
                      ? 'bg-white border-2 border-emerald-500 text-emerald-500 animate-pulse'
                      : step.status === 'error'
                        ? 'bg-rose-500 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-300'
                }`}
              >
                {step.status === 'completed' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : step.status === 'processing' ? (
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-widest ${
                  step.status === 'completed' || step.status === 'processing' ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {step.status === 'completed' ? 'Done' : step.status === 'processing' ? 'Working...' : 'Waiting'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
