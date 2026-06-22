import React from 'react';
import Link from 'next/link';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';
import { Icon } from '../ui/Icon';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 text-center select-none">
      {/* Glow Backdrops */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(240, 185, 11, 0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(60% 60% at 50% 0%, #000 50%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(60% 60% at 50% 0%, #000 50%, transparent 100%)',
        }}
      />
      
      {/* Live Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-ink-300 mb-8 animate-fade-in font-semibold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live on {networkLabel(getChainId())}
      </div>

      {/* Main Copy */}
      <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-extrabold tracking-tight leading-[1.05] mb-6 text-white max-w-4xl mx-auto">
        Launch Your Tokens on{' '}
        <span className="text-gradient drop-shadow-[0_0_20px_rgba(240,185,11,0.25)]">BNB Chain</span>
        <br className="hidden sm:block" /> Without Writing Code.
      </h1>
      <p className="text-base sm:text-lg text-ink-400 max-w-2.5xl mx-auto mb-10 leading-relaxed font-semibold">
        Deploy a BEP-20 token, configure a fully decentralized presale, and accept contributions directly from wallets. Built-in on-chain refunds secure buyer safety.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
        <Link
          href="/create-token"
          className="btn-primary px-8 py-3.5 text-sm font-bold w-full sm:w-auto shadow-glow flex items-center justify-center gap-2"
        >
          Start Launch
          <Icon name="arrow-right" size={14} />
        </Link>
        <Link
          href="/launchpads"
          className="btn-secondary px-8 py-3.5 text-sm font-semibold w-full sm:w-auto flex items-center justify-center gap-2"
        >
          Explore Presales
        </Link>
      </div>

      <p className="text-xs text-ink-500 mt-6 font-semibold">
        Transparent Access Gate · Pay Only BNB Gas · Verify on BscScan
      </p>
    </section>
  );
};
export default Hero;
