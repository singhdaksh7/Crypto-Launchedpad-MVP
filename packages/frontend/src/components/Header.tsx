import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { WalletButton } from './WalletButton';

const links = [
  { href: '/', label: 'Home' },
  { href: '/create-token', label: 'Create Token' },
  { href: '/launchpads', label: 'Launchpads' },
  { href: '/dashboard', label: 'Dashboard' },
];

export const Header: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();

  return (
    <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary shrink-0">
          🚀 Launchpad
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 items-center">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`transition ${
                pathname === href ? 'text-primary font-semibold' : 'hover:text-primary'
              }`}
            >
              {label}
            </Link>
          ))}
          <WalletButton />
        </nav>

        {/* Mobile: wallet + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <WalletButton />
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden border-t border-gray-800 bg-gray-900 px-4 py-3 flex flex-col gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 rounded-lg transition ${
                pathname === href
                  ? 'bg-gray-800 text-primary font-semibold'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
