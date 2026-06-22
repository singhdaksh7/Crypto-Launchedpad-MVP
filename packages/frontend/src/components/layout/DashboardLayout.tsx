import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { WalletButton } from '../WalletButton';
import { Icon } from '../ui/Icon';
import { NetworkBanner } from '../ui/NetworkBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-base text-ink-100 relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar overlay/drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 bg-surface flex flex-col z-50 animate-slide-up">
            <div className="absolute top-4 right-4 lg:hidden">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-full bg-white/5 text-ink-400 hover:text-white"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Dashboard Topbar */}
        <header className="h-16 border-b border-white/5 bg-surface/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white"
              aria-label="Open sidebar"
            >
              <Icon name="menu" size={18} />
            </button>
            <span className="text-xs uppercase tracking-wider font-semibold text-bnb-text bg-primary-500/5 border border-primary-500/10 px-2.5 py-1 rounded-full">
              Mainnet Ready Config
            </span>
          </div>

          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </header>

        <NetworkBanner />

        {/* Inner Content scroll area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
