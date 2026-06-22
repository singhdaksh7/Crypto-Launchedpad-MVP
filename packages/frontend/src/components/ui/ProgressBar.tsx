import React from 'react';

interface ProgressBarProps {
  value: number | bigint;
  max: number | bigint;
  softCap?: number | bigint;
  tone?: 'yellow' | 'gray';
  showMarker?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  softCap,
  tone = 'yellow',
  showMarker = true,
  size = 'md',
}) => {
  const valNum = Number(value);
  const maxNum = Number(max) || 1;
  const pct = Math.min(100, Math.max(0, (valNum / maxNum) * 100));

  const softCapNum = softCap ? Number(softCap) : undefined;
  const softPct = softCapNum ? Math.min(100, Math.max(0, (softCapNum / maxNum) * 100)) : undefined;

  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  const barColor = tone === 'yellow' ? 'bg-gradient-to-r from-bnb-light to-bnb' : 'bg-ink-400';

  return (
    <div className="w-full">
      <div className={`relative w-full bg-white/5 rounded-full overflow-hidden ${h}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        {/* Softcap tick marker */}
        {showMarker && softPct !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-0.5 z-10 bg-white/40 border-r border-black/50"
            style={{ left: `${softPct}%` }}
            title={`Softcap: ${softPct.toFixed(0)}%`}
          />
        )}

        {/* Progress Fill */}
        <div
          className={`${h} rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      
      {showMarker && softPct !== undefined && (
        <div className="flex justify-between text-[10px] text-ink-500 mt-1 font-semibold">
          <span>{pct.toFixed(1)}% Raised</span>
          <span style={{ marginRight: `${100 - softPct}%` }} className="text-bnb-text text-right select-none">
            ▲ Softcap
          </span>
        </div>
      )}
    </div>
  );
};
export default ProgressBar;
