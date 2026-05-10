import React from 'react';

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  loading?: boolean;
  align?: 'left' | 'center';
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  hint,
  loading,
  align = 'left',
}) => {
  return (
    <div
      className={`bg-surface-2 border border-white/5 rounded-2xl p-4 shadow-soft ${
        align === 'center' ? 'text-center' : ''
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-20 rounded bg-white/5 animate-pulse" />
      ) : (
        <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
      )}
      {hint && !loading && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
};
