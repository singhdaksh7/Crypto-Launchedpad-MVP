import React from 'react';
import { Icon } from '../ui/Icon';

const BENEFITS = [
  {
    icon: 'shield' as const,
    title: 'Ultra-Low Gas Cost',
    desc: 'Perform deployments, claims, and refunds at a fraction of the cost of other EVM networks.',
  },
  {
    icon: 'gauge' as const,
    title: 'Rapid Confirmations',
    desc: 'BSC blocks confirm every 3 seconds, enabling instant presale contributions and token updates.',
  },
  {
    icon: 'lock' as const,
    title: 'Secure On-Chain Logic',
    desc: 'Smart contracts lock funds until conditions are met. Fully decentralised and trustless.',
  },
];

export const BscBenefits: React.FC = () => {
  return (
    <section className="py-12 border-t border-white/5 select-none">
      <h2 className="text-xl sm:text-2xl font-bold mb-8 text-center text-white uppercase tracking-wide">
        BSC Smart Protocol Benefits
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BENEFITS.map((b, idx) => (
          <div key={idx} className="card card-hover flex flex-col items-center text-center p-6">
            <span className="h-10 w-10 rounded-full bg-primary-500/10 text-bnb-text flex items-center justify-center mb-4 border border-primary-500/20 shadow-soft">
              <Icon name={b.icon} size={16} />
            </span>
            <h3 className="font-semibold text-white mb-2 text-sm">{b.title}</h3>
            <p className="text-xs text-ink-400 leading-relaxed font-semibold">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
export default BscBenefits;
