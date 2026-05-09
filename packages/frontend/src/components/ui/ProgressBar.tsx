import React from 'react';
import { progressPct } from '@/lib/presale';

interface ProgressBarProps {
  raised: bigint;
  hardcap: bigint;
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ raised, hardcap, size = 'md' }) => {
  const pct = progressPct(raised, hardcap);
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div
      className={`w-full bg-white/5 rounded-full overflow-hidden ${h}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${h} rounded-full transition-all duration-500`}
        style={{
          width: `${pct}%`,
          background:
            pct >= 100
              ? 'linear-gradient(90deg, #10b981, #22c55e)'
              : 'linear-gradient(90deg, #6366f1, #a855f7)',
        }}
      />
    </div>
  );
};
