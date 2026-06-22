import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWeb3Store } from '@/store';
import { Icon } from '../ui/Icon';
import { formatAddress } from '@/lib/web3';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { account } = useWeb3Store();

  const menuItems = [
    { href: '/dashboard', label: 'Overview', icon: 'gauge' as const },
    { href: '/create-token', label: 'Create Token', icon: 'plus' as const },
    { href: '/launchpads/create', label: 'Create Presale', icon: 'rocket' as const },
    { href: '/vesting', label: 'Vesting Center', icon: 'lock' as const },
  ];

  const isActive = (href: string) => router.pathname === href;

  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-white/5 flex flex-col min-h-screen text-white">
      {/* Top Header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-glow shrink-0">
          <Icon name="rocket" size={16} className="text-black" />
        </span>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight text-white">LaunchBNB</p>
          <p className="text-[10px] uppercase tracking-wider text-bnb-text -mt-0.5 font-bold">
            Creator Hub
          </p>
        </div>
      </div>

      {/* Menu links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-3">
          Navigation
        </p>
        {menuItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(href)
                ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20'
                : 'text-ink-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon name={icon} size={16} />
            {label}
          </Link>
        ))}

        <div className="pt-6 border-t border-white/5 mt-6">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 text-xs text-ink-500 hover:text-white transition"
          >
            <Icon name="arrow-right" size={12} className="rotate-180" />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Bottom Profile */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        {account ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-primary-500">
              <Icon name="wallet" size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink-400 font-mono truncate">{formatAddress(account)}</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-ink-500">Wallet disconnected</p>
          </div>
        )}
      </div>
    </aside>
  );
};
