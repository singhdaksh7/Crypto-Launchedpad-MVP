import React from 'react';
import Link from 'next/link';
import { WalletButton } from './WalletButton';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          🚀 Launchpad
        </Link>
        <nav className="flex gap-6 items-center">
          <Link href="/" className="hover:text-primary transition">
            Home
          </Link>
          <Link href="/create-token" className="hover:text-primary transition">
            Create Token
          </Link>
          <Link href="/launchpads" className="hover:text-primary transition">
            Launchpads
          </Link>
          <Link href="/dashboard" className="hover:text-primary transition">
            Dashboard
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
};
