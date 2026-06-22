import React from 'react';
import Link from 'next/link';
import { PresaleCard } from '../presale/PresaleCard';
import { EmptyState } from '../ui/EmptyState';

interface FeaturedPresalesProps {
  presales: any[];
  loading: boolean;
  onView: (id: string | number) => void;
}

export const FeaturedPresales: React.FC<FeaturedPresalesProps> = ({
  presales,
  loading,
  onView,
}) => {
  const livePresales = presales.filter((p) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now >= p.startTime && now < p.endTime && p.isActive && !p.isFinalized;
  }).slice(0, 3);

  return (
    <section className="py-12 border-t border-white/5 select-none">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wide">
          Featured Live Launches
        </h2>
        {livePresales.length > 0 && (
          <Link
            href="/launchpads"
            className="text-xs text-bnb-text hover:text-white font-bold transition flex items-center gap-1"
          >
            View All Presales <span>→</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse h-[340px] space-y-4">
              <div className="h-6 bg-white/5 rounded w-1/3" />
              <div className="h-4 bg-white/5 rounded" />
              <div className="h-2 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : livePresales.length === 0 ? (
        <EmptyState
          icon="rocket"
          title="No live launches active"
          body="There are currently no active live presales on-chain. Deploy a new token and create your presale to be the first featured launch!"
          CTA={
            <Link href="/create-token" className="btn-primary">
              Create your token
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {livePresales.map((p) => (
            <PresaleCard key={p.id} presale={p} onView={onView} />
          ))}
        </div>
      )}
    </section>
  );
};
export default FeaturedPresales;
