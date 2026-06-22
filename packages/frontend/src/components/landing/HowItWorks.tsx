import React from 'react';

const STEPS = [
  {
    n: 1,
    title: 'Deploy Token',
    desc: 'Mint a standard BEP-20 token in under a minute with custom supply.',
  },
  {
    n: 2,
    title: 'Configure Presale',
    desc: 'Set softcap, hardcap, token price, and custom sale durations.',
  },
  {
    n: 3,
    title: 'Accept Contributions',
    desc: 'Share the link and let buyers contribute BNB directly.',
  },
  {
    n: 4,
    title: 'Finalize & Claim',
    desc: 'If softcap is hit, claim tokens. If it fails, buyers get fully refunded.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-12 border-t border-white/5">
      <h2 className="text-xl sm:text-2xl font-bold mb-8 text-center text-white select-none uppercase tracking-wide">
        How it works
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card relative flex flex-col justify-between pt-8 pb-5 select-none">
            <span className="absolute -top-3 left-5 px-3 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold text-bnb-text uppercase tracking-wider">
              Step {s.n}
            </span>
            <h3 className="font-semibold text-white mb-2 text-sm">{s.title}</h3>
            <p className="text-xs text-ink-400 leading-relaxed font-semibold">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
export default HowItWorks;
