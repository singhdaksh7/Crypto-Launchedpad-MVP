import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { NetworkBanner } from '../ui/NetworkBanner';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen app-backdrop text-ink-100">
      <div className="py-4">
        <Navbar />
      </div>
      <NetworkBanner />
      <main className="flex-1 w-full container-page py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
};
