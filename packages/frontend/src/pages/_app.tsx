import React from 'react';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { QueryClient, QueryClientProvider } from 'react-query';
import { initWalletDiscovery } from '@/lib/wallets';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Shared client for all data-fetching. Reads now flow through cached
// `/api/*` routes, so a short staleTime + no refetch-on-focus is plenty.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  React.useEffect(() => {
    initWalletDiscovery();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
        <Analytics />
      </div>
    </QueryClientProvider>
  );
}
