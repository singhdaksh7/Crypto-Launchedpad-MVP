import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'info' | 'warn' | 'neutral' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    info: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    warn: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    neutral: 'bg-white/5 text-gray-300 border-white/10',
    danger: 'bg-red-500/10 text-red-300 border-red-500/20',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: 'live' | 'upcoming' | 'ended'; className?: string }> = ({
  status,
  className = '',
}) => {
  const map = {
    live: { variant: 'success' as const, label: 'Live' },
    upcoming: { variant: 'info' as const, label: 'Upcoming' },
    ended: { variant: 'neutral' as const, label: 'Ended' },
  };

  const item = map[status] || { variant: 'neutral', label: status };

  return (
    <Badge variant={item.variant} className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : status === 'upcoming' ? 'bg-sky-400' : 'bg-gray-400'}`} />
      {item.label}
    </Badge>
  );
};

export const PaymentStatusBadge: React.FC<{ status: 'success' | 'pending' | 'failed' | 'idle'; className?: string }> = ({
  status,
  className = '',
}) => {
  const map = {
    success: { variant: 'success' as const, label: 'Verified' },
    pending: { variant: 'warn' as const, label: 'Pending Verification' },
    failed: { variant: 'danger' as const, label: 'Failed' },
    idle: { variant: 'neutral' as const, label: 'Unpaid' },
  };

  const item = map[status] || { variant: 'neutral', label: status };

  return (
    <Badge variant={item.variant} className={className}>
      {item.label}
    </Badge>
  );
};
