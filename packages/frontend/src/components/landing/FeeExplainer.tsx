import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const FeeExplainer: React.FC = () => {
  return (
    <section className="py-12 border-t border-white/5 select-none">
      <div className="card max-w-4xl mx-auto bg-gradient-to-br from-surface to-black border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <span className="text-[10px] uppercase font-bold text-bnb-text bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full">
            India-First Gateway Support
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
            One-time ₹1000 Creator Launch Access Fee
          </h3>
          <p className="text-xs sm:text-sm text-ink-400 leading-relaxed font-semibold">
            To prevent spam and cover deployment routing, creators pay a one-time platform access fee of ₹1000 via our integrated gateway before launching tokens. Buyers and participants are never charged any gateway fees.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end justify-center shrink-0 w-full md:w-auto gap-3">
          <div className="text-center md:text-right bg-white/5 border border-white/5 p-4 rounded-2xl w-full md:w-44 shadow-soft">
            <span className="text-[10px] text-ink-500 uppercase tracking-wider font-bold">Access Fee</span>
            <p className="text-3xl font-extrabold text-white mt-1">₹1000</p>
          </div>
          <Link
            href="/create-token"
            className="btn-primary w-full md:w-auto px-5 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-1 shadow-glow"
          >
            Pay Fee & Start <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
};
export default FeeExplainer;
