import React from 'react';
import { Icon } from '../ui/Icon';

interface PresaleTimelineProps {
  startTime: bigint;
  endTime: bigint;
  status: 'upcoming' | 'active' | 'ended' | 'finalized';
}

export const PresaleTimeline: React.FC<PresaleTimelineProps> = ({
  startTime,
  endTime,
  status,
}) => {
  const formatDate = (sec: bigint) => {
    return new Date(Number(sec) * 1000).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const steps = [
    {
      label: 'Presale Created',
      desc: 'All parameters locked on-chain.',
      completed: true,
    },
    {
      label: 'Presale Active',
      desc: `Starts: ${formatDate(startTime)}`,
      completed: status === 'active' || status === 'ended' || status === 'finalized',
      active: status === 'upcoming',
    },
    {
      label: 'Presale Ends',
      desc: `Closes: ${formatDate(endTime)}`,
      completed: status === 'ended' || status === 'finalized',
      active: status === 'active',
    },
    {
      label: 'Token Claim Release',
      desc: 'Claim tokens immediately if softcap is met.',
      completed: status === 'finalized',
      active: status === 'ended',
    },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500 mb-2">Presale Timeline</h3>
      <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start relative z-10 select-none">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                step.completed
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : step.active
                  ? 'bg-primary-500/10 border-primary-500 text-primary-500 shadow-glow animate-pulse'
                  : 'bg-white/5 border-white/5 text-ink-500'
              }`}
            >
              {step.completed ? (
                <Icon name="check" size={14} />
              ) : (
                <span className="text-xs font-bold">{idx + 1}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-semibold ${step.active ? 'text-primary-500' : 'text-white'}`}>
                {step.label}
              </h4>
              <p className="text-xs text-ink-400 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PresaleTimeline;
