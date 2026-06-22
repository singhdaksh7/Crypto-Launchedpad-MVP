import React from 'react';
import Link from 'next/link';
import { useAccess } from '@/hooks/useAccess';
import { Icon } from '../ui/Icon';
import { PaymentStatusBadge } from '../ui/Badge';

export const AccessBanner: React.FC = () => {
  const access = useAccess();

  if (access.loading) {
    return (
      <div className="card animate-pulse py-4 px-6 flex items-center justify-between">
        <div className="h-4 bg-white/5 rounded w-1/3" />
        <div className="h-8 bg-white/5 rounded w-20" />
      </div>
    );
  }

  const isUnlocked = access.unlocked;

  return (
    <div className={`card py-4 px-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${
      isUnlocked 
        ? 'border-emerald-500/20 bg-emerald-500/[0.03]' 
        : 'border-amber-500/20 bg-amber-500/[0.03]'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          <Icon name={isUnlocked ? 'check' : 'lock'} size={14} />
        </span>
        <div>
          <h4 className="font-semibold text-sm text-white">
            {isUnlocked 
              ? 'Creator Launch Access Approved' 
              : 'Launch Access Payment Required'}
          </h4>
          <p className="text-xs text-ink-400 mt-0.5 font-medium">
            {isUnlocked 
              ? 'You have complete permission to deploy tokens and create presales.' 
              : 'Verify your wallet and complete the one-time ₹1000 fee to unlock launch capability.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <PaymentStatusBadge status={isUnlocked ? 'success' : 'idle'} />
        {!isUnlocked && (
          <Link
            href="/create-token"
            className="px-4.5 py-2 bg-bnb text-[#1A1500] hover:brightness-110 font-bold rounded-full text-xs transition inline-flex items-center gap-1 shrink-0"
          >
            Unlock Now <Icon name="arrow-right" size={10} />
          </Link>
        )}
      </div>
    </div>
  );
};
export default AccessBanner;
