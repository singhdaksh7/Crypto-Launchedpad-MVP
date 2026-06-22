import React from 'react';
import { ProgressBar } from '../ui';

interface VestingScheduleBarProps {
  total: number | string;
  claimed: number | string;
  className?: string;
}

export const VestingScheduleBar: React.FC<VestingScheduleBarProps> = ({
  total,
  claimed,
  className = '',
}) => {
  const tot = parseFloat(String(total)) || 0;
  const cld = parseFloat(String(claimed)) || 0;
  const pct = tot > 0 ? (cld / tot) * 100 : 0;

  return (
    <div className={`space-y-2 bg-black/10 rounded-2xl p-4 border border-white/5 ${className}`}>
      <div className="flex justify-between text-xs text-ink-400 font-medium">
        <span>Vesting Schedule Release</span>
        <span className="text-white font-semibold">{pct.toFixed(0)}% Unlocked</span>
      </div>
      
      <ProgressBar value={cld} max={tot} showMarker={false} />

      <div className="flex justify-between text-[10px] text-ink-500 font-semibold font-mono">
        <span>Claimed: {cld.toLocaleString()} Tokens</span>
        <span>Total: {tot.toLocaleString()} Tokens</span>
      </div>
    </div>
  );
};
export default VestingScheduleBar;
