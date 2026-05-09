import React, { useEffect, useRef, useState } from 'react';
import { useWeb3Store } from '@/store';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { formatAddress, getChainId } from '@/lib/web3';
import { addressUrl, networkLabel } from '@/lib/links';
import { Icon } from './ui/Icon';

export const WalletButton: React.FC = () => {
  const { account, chainId, isConnecting } = useWeb3Store();
  const { connectWallet, disconnectWallet, error } = useWalletConnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const copy = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!account) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="btn-primary"
        title={error || undefined}
      >
        {isConnecting ? (
          <>
            <Icon name="spinner" size={14} />
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <Icon name="wallet" size={14} />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </>
        )}
      </button>
    );
  }

  const required = getChainId();
  const wrongNetwork = chainId !== null && chainId !== required;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn-secondary ${
          wrongNetwork ? 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20' : ''
        }`}
      >
        {wrongNetwork ? (
          <Icon name="alert" size={14} />
        ) : (
          <span className="pulse-dot" />
        )}
        <span className="font-mono text-xs sm:text-sm">{formatAddress(account)}</span>
        <Icon name="arrow-down" size={12} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 z-50 origin-top-right animate-slide-up">
          <div className="bg-surface-1 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Network</p>
              <p
                className={`text-sm font-medium ${
                  wrongNetwork ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {networkLabel(chainId)} {wrongNetwork && '(wrong)'}
              </p>
            </div>
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Account</p>
              <p className="text-sm font-mono break-all">{account}</p>
            </div>
            <div className="py-1">
              <button
                onClick={copy}
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                {copied ? 'Copied!' : 'Copy address'}
              </button>
              <a
                href={addressUrl(account)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
              >
                <Icon name="external" size={14} />
                View on explorer
              </a>
              <button
                onClick={() => {
                  setOpen(false);
                  disconnectWallet();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 text-red-300 flex items-center gap-2"
              >
                <Icon name="close" size={14} />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
