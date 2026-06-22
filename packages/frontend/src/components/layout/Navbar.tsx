import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';
import { WalletButton } from '../WalletButton';
import { Icon } from '../ui/Icon';

const links = [
  { href: '/launchpads', label: 'Launchpads' },
  { href: '/create-token', label: 'Create Token' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/vesting', label: 'Vesting' },
];

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();
  const { account, chainId } = useWeb3Store();

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const required = getChainId();
  const networkOk = !account || chainId == null || chainId === required;
  const dotClass = networkOk ? 'bg-emerald-500' : 'bg-danger-500';

  return (
    <nav className="sticky top-4 z-40 mx-auto max-w-7xl backdrop-blur-lg bg-surface/80 border border-white/10 rounded-full shadow-soft transition-all duration-300 w-[calc(100%-2rem)] px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-glow">
            <Icon name="rocket" size={16} className="text-black" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-white">LaunchBNB</p>
            <p className="text-[10px] uppercase tracking-wider text-bnb-text -mt-0.5 font-semibold">
              BSC Hub
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 text-sm rounded-full transition-all duration-150 ${
                isActive(href)
                  ? 'text-white bg-white/10 font-semibold'
                  : 'text-ink-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet connection actions */}
        <div className="flex items-center gap-2">
          {account && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-ink-300">
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
              {networkLabel(chainId)}
            </span>
          )}
          <WalletButton />
          
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-ink-300 hover:text-white"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <Icon name={open ? 'close' : 'menu'} size={18} />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div className="md:hidden absolute top-[calc(100%+0.5rem)] left-0 w-full border border-white/10 rounded-3xl bg-surface/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-1 shadow-glow animate-slide-up">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`px-4 py-3 rounded-xl text-sm transition ${
                isActive(href)
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-ink-300 hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
          {account && (
            <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between px-2">
              <span className="text-xs text-ink-500">Network</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-ink-300">
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                {networkLabel(chainId)}
              </span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
