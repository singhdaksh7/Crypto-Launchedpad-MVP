import React from 'react';
import { FundingStatus } from '@/hooks/usePresaleFunding';
import { Icon } from './Icon';

interface FundingBadgeProps {
  status: FundingStatus;
  loading?: boolean;
}

const STYLES: Record<FundingStatus, { wrap: string; label: string; icon: 'check' | 'alert' | 'gauge' }> = {
  funded: {
    wrap: 'badge-success',
    label: 'Funded',
    icon: 'check',
  },
  partial: {
    wrap: 'badge-warn',
    label: 'Partially funded',
    icon: 'gauge',
  },
  unfunded: {
    wrap: 'bg-red-500/10 text-red-300 border-red-500/30 badge',
    label: 'Not funded',
    icon: 'alert',
  },
};

export const FundingBadge: React.FC<FundingBadgeProps> = ({ status, loading }) => {
  if (loading) {
    return <span className="badge-neutral">Checking funding…</span>;
  }
  const s = STYLES[status];
  return (
    <span className={s.wrap}>
      <Icon name={s.icon} size={12} />
      {s.label}
    </span>
  );
};
