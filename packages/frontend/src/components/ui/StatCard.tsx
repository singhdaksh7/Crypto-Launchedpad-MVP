import React from 'react';
import { Icon } from './Icon';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'A' | 'B';
  tone?: 'yellow' | 'green' | 'plain';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  variant = 'B',
  tone = 'plain',
  loading = false,
}) => {
  const cardStyle = variant === 'A' ? 'card-glass' : 'card-flat';

  const toneClasses = {
    yellow: 'text-bnb-text drop-shadow-[0_0_8px_rgba(240,185,11,0.2)]',
    green: 'text-emerald-400',
    plain: 'text-white',
  };

  return (
    <div className={`${cardStyle} flex flex-col justify-between py-5 px-6 min-h-[110px]`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-white/5 animate-pulse rounded mt-1" />
        ) : (
          <p className={`text-2xl font-bold font-mono mt-1 ${toneClasses[tone]}`}>{value}</p>
        )}
      </div>
      {sub && (
        <p className="text-xs text-ink-400 mt-2 flex items-center gap-1 font-medium">
          {sub}
        </p>
      )}
    </div>
  );
};
export default StatCard;
