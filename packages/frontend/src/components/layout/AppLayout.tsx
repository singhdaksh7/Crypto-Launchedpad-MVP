import React from 'react';
import { Navbar } from './Navbar';
import { NetworkBanner } from '../ui/NetworkBanner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen app-backdrop text-ink-100 pb-20">
      <div className="py-4">
        <Navbar />
      </div>
      <NetworkBanner />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
