import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { NetworkBanner } from './ui/NetworkBanner';

interface LayoutProps {
  children: React.ReactNode;
  /** Set to false on the homepage to render full-bleed hero. */
  contained?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, contained = true }) => {
  return (
    <div className="flex flex-col min-h-screen app-backdrop">
      <Header />
      <NetworkBanner />
      <main className={`flex-1 w-full ${contained ? 'container-page py-8 sm:py-12' : ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
