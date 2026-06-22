import React from 'react';
import { Icon } from './Icon';

interface StepperProps {
  steps: string[];
  current: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, current }) => {
  return (
    <div className="w-full flex items-center justify-between gap-2 py-4 mb-6">
      {steps.map((step, idx) => {
        const isDone = idx < current;
        const isActive = idx === current;
        return (
          <React.Fragment key={step}>
            {/* Step Bubble */}
            <div className="flex flex-col items-center gap-1.5 flex-1 relative">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center border font-semibold text-sm transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : isActive
                    ? 'bg-primary-500/10 border-primary-500 text-primary-500 shadow-glow'
                    : 'bg-white/5 border-white/10 text-ink-500'
                }`}
              >
                {isDone ? <Icon name="check" size={14} /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={`text-xs font-medium transition-all duration-300 ${
                  isActive ? 'text-primary-500 font-semibold' : 'text-ink-400'
                }`}
              >
                {step}
              </span>
            </div>
            {/* Connector Line */}
            {idx < steps.length - 1 && (
              <div className="h-0.5 flex-1 bg-white/5 relative">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-500"
                  style={{ width: isDone ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export default Stepper;
