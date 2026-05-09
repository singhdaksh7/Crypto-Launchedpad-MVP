import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { WalletButton } from './WalletButton';
import { Icon } from './ui/Icon';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';

const links = [
  { href: '/launchpads', label: 'Launchpads' },
  { href: '/create-token', label: 'Create Token' },
  { href: '/dashboard', label: 'Dashboard' },
];

const Logo: React.FC = () => (
  <Link href="/" className="flex items-center gap-2 shrink-0 group">
    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
      <Icon name="rocket" size={16} className="text-white" />
    </span>
    <div className="leading-tight">
      <p className="font-semibold tracking-tight">Launchpad</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 -mt-0.5">
        BNB Chain
      </p>
    </div>
  </Link>
);

export const Header: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-surface/80 border-b border-white/5">
      <div className="container-page py-3 flex items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                isActive(href)
                  ? 'text-white bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex badge-neutral">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {networkLabel(getChainId())}
          </span>
          <WalletButton />
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <Icon name={open ? 'close' : 'menu'} size={18} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden border-t border-white/5 bg-surface-1 px-4 py-3 flex flex-col gap-1 animate-slide-up">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm transition ${
                isActive(href)
                  ? 'bg-white/5 text-white font-medium'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">Network</span>
            <span className="badge-neutral">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {networkLabel(getChainId())}
            </span>
          </div>
        </nav>
      )}
    </header>
  );
};
