import React from 'react';

export type WalletId = 'metamask' | 'trust' | 'coinbase' | 'math' | 'walletconnect';

export interface WalletMeta {
  id: WalletId;
  label: string;
  /** Returns the matching EIP-1193 provider, or undefined if not detected. */
  detect: () => any | undefined;
  /** Where to install the browser extension if not detected on desktop. */
  installUrl?: string;
  /** Deeplink that opens the wallet's in-app browser pointed at the current page. */
  mobileDeeplink?: (currentUrl: string) => string;
  icon: React.ReactNode;
  /** Always-available connector — surfaces in the picker even on desktop with no extension. */
  alwaysShow?: boolean;
}

const isClient = () => typeof window !== 'undefined';

/**
 * Picks the matching provider out of `window.ethereum.providers` (EIP-5749 style
 * multi-injection used when several wallet extensions are installed) or the
 * single `window.ethereum` if it matches the predicate.
 */
function pickInjected(predicate: (p: any) => boolean): any | undefined {
  if (!isClient()) return undefined;
  const eth: any = (window as any).ethereum;
  if (!eth) return undefined;
  if (Array.isArray(eth.providers)) {
    const match = eth.providers.find(predicate);
    if (match) return match;
  }
  return predicate(eth) ? eth : undefined;
}

const cleanUrl = (u: string) => u.replace(/^https?:\/\//, '');

const MetaMaskIcon = (
  <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden>
    <path
      d="M27.5 4 17.7 11.3l1.8-4.3 8-3Zm-23 0 9.7 7.4-1.7-4.4L4.5 4Zm19.6 17.4-2.6 4 5.6 1.5 1.6-5.4-4.6-.1ZM3 21.5l1.6 5.4 5.6-1.5-2.6-4-4.6.1Zm5.4-7L7 17.6l5.4.3-.2-5.8-3.8 2.4Zm15.2 0-3.9-2.4-.1 5.8 5.4-.3-1.4-3.1Zm-13.4 11 3.4-1.6L10.7 21l-.5 4.5Zm8.2-1.6 3.4 1.6L21 21l-2.6 1.9Z"
      fill="#E2761B"
      stroke="#E2761B"
    />
  </svg>
);

const TrustIcon = (
  <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden>
    <path
      d="M16 3 5 7v9c0 6.5 4.6 11.4 11 13 6.4-1.6 11-6.5 11-13V7L16 3Z"
      fill="#3375BB"
    />
    <path d="M16 7v18.5c4.7-1.4 8-5.3 8-9.5V8.6L16 7Z" fill="#fff" opacity="0.85" />
  </svg>
);

const CoinbaseIcon = (
  <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden>
    <circle cx="16" cy="16" r="13" fill="#0052FF" />
    <rect x="11" y="11" width="10" height="10" rx="2" fill="#fff" />
  </svg>
);

const MathIcon = (
  <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden>
    <rect x="3" y="3" width="26" height="26" rx="6" fill="#1A1A1A" />
    <path
      d="M10 22V10h2.5l3.5 6 3.5-6H22v12h-2.4v-7.6L16 21l-3.6-6.6V22H10Z"
      fill="#fff"
    />
  </svg>
);

const WalletConnectIcon = (
  <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden>
    <circle cx="16" cy="16" r="14" fill="#3B99FC" />
    <path
      d="M9.6 13c3.5-3.4 9.3-3.4 12.8 0l.4.4c.2.2.2.4 0 .6l-1.4 1.4c-.1.1-.2.1-.3 0l-.6-.6c-2.5-2.4-6.5-2.4-9 0l-.6.6c-.1.1-.2.1-.3 0L9.2 14c-.2-.2-.2-.4 0-.6l.4-.4Zm15.8 2.9 1.3 1.3c.2.2.2.4 0 .6l-5.7 5.5c-.2.2-.4.2-.6 0l-4-3.9c0 0-.1 0-.2 0l-4 3.9c-.2.2-.4.2-.6 0L5.9 17.8c-.2-.2-.2-.4 0-.6l1.3-1.3c.2-.2.4-.2.6 0L11.7 20c0 0 .1 0 .2 0l4-3.9c.2-.2.4-.2.6 0l4 3.9c0 0 .1 0 .2 0l3.9-3.9c.2-.2.4-.2.6 0Z"
      fill="#fff"
    />
  </svg>
);

export const WALLETS: WalletMeta[] = [
  {
    id: 'metamask',
    label: 'MetaMask',
    detect: () =>
      pickInjected(
        (p) => p.isMetaMask && !p.isCoinbaseWallet && !p.isTrust && !p.isTrustWallet,
      ),
    installUrl: 'https://metamask.io/download',
    mobileDeeplink: (url) => `https://metamask.app.link/dapp/${cleanUrl(url)}`,
    icon: MetaMaskIcon,
  },
  {
    id: 'trust',
    label: 'Trust Wallet',
    detect: () => pickInjected((p) => p.isTrust || p.isTrustWallet),
    installUrl: 'https://trustwallet.com/browser-extension',
    mobileDeeplink: (url) =>
      `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(url)}`,
    icon: TrustIcon,
  },
  {
    id: 'coinbase',
    label: 'Coinbase Wallet',
    detect: () => pickInjected((p) => p.isCoinbaseWallet),
    installUrl: 'https://www.coinbase.com/wallet/downloads',
    mobileDeeplink: (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
    icon: CoinbaseIcon,
  },
  {
    id: 'math',
    label: 'MathWallet',
    detect: () => pickInjected((p) => p.isMathWallet),
    installUrl: 'https://mathwallet.org/en-us/',
    icon: MathIcon,
  },
  {
    id: 'walletconnect',
    label: 'WalletConnect',
    detect: () => undefined,
    icon: WalletConnectIcon,
    alwaysShow: true,
  },
];

export function getWalletMeta(id: WalletId): WalletMeta | undefined {
  return WALLETS.find((w) => w.id === id);
}
