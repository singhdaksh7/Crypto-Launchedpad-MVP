import React from 'react';
import { PresaleStatus, STATUS_LABEL } from '@/lib/presale';

const STYLE: Record<PresaleStatus, string> = {
  upcoming: 'badge-info',
  active: 'badge-success',
  ended: 'badge-neutral',
  finalized: 'badge-purple',
};

export const StatusBadge: React.FC<{ status: PresaleStatus }> = ({ status }) => {
  return (
    <span className={STYLE[status]}>
      {status === 'active' && <span className="pulse-dot mr-0.5" />}
      {STATUS_LABEL[status]}
    </span>
  );
};
