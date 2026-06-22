import React from 'react';
import Link from 'next/link';
import { getPresaleStatus, progressPct, softcapReached, formatEther } from '@/lib/presale';
import { formatBnb } from '@/lib/format';
import { ProgressBar, StatusBadge } from '../ui';

interface PresaleCardProps {
  presale: {
    id: string | number;
    name?: string;
    ticker?: string;
    tokenAddress: string;
    owner: string;
    tokenPrice: bigint;
    softcap: bigint;
    hardcap: bigint;
    startTime: bigint;
    endTime: bigint;
    maxBuyPerUser: bigint;
    totalRaised: bigint;
    isActive: boolean;
    isFinalized: boolean;
  };
  onView?: (id: string | number) => void;
}

export const PresaleCard: React.FC<PresaleCardProps> = ({ presale, onView }) => {
  const status = getPresaleStatus(presale);
  const pct = progressPct(presale.totalRaised, presale.hardcap);
  const raisedBnb = parseFloat(formatEther(presale.totalRaised));
  const hardcapBnb = parseFloat(formatEther(presale.hardcap));
  const softcapBnb = parseFloat(formatEther(presale.softcap));
  const reached = softcapReached(presale);

  const tokenName = presale.name || 'Unknown Token';
  const tokenSymbol = presale.ticker || 'UNKNOWN';
  const initials = tokenName.substring(0, 2).toUpperCase();

  const handleCardClick = () => {
    if (onView) onView(presale.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="card card-hover flex flex-col justify-between h-[340px] cursor-pointer group select-none relative"
    >
      <div>
        {/* Top bar info */}
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-bnb-text text-sm shadow-soft shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <h4 className="font-semibold text-white group-hover:text-primary-500 transition-colors truncate">
                {tokenName}
              </h4>
              <p className="text-xs text-ink-400 font-medium uppercase tracking-wider">
                {tokenSymbol}
              </p>
            </div>
          </div>
          <StatusBadge status={status === 'active' ? 'live' : status === 'finalized' ? 'ended' : status} />
        </div>

        {/* Mid info */}
        <div className="space-y-4 my-6">
          <div>
            <div className="flex justify-between text-xs text-ink-400 mb-1.5 font-medium">
              <span>{pct.toFixed(1)}% Raised</span>
              <span className="text-white font-semibold font-mono">
                {formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB
              </span>
            </div>
            <ProgressBar value={presale.totalRaised} max={presale.hardcap} softCap={presale.softcap} showMarker={false} />
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs bg-black/15 rounded-xl p-3 border border-white/5 font-medium">
            <div>
              <p className="text-ink-500 mb-0.5">Soft Cap</p>
              <p className="text-white font-mono">{formatBnb(softcapBnb)} BNB</p>
            </div>
            <div>
              <p className="text-ink-500 mb-0.5">Min / Max Buy</p>
              <p className="text-white font-mono">0.1 / {formatBnb(parseFloat(formatEther(presale.maxBuyPerUser)))} BNB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="text-xs text-ink-500 font-medium">
          {status === 'upcoming' ? 'Starts soon' : status === 'active' ? 'Live now' : 'Ended'}
        </span>
        <Link
          href={`/presale/${presale.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-bnb-text group-hover:text-white font-bold inline-flex items-center gap-1 transition"
        >
          View Details
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
};
export default PresaleCard;
