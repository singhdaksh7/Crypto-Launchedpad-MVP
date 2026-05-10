import React, { useState } from 'react';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';
import { switchOrAddChain, TESTNET_FAUCET_URL } from '@/lib/chain';
import { Icon } from './Icon';

export const NetworkBanner: React.FC = () => {
  const { account, chainId, rawProvider } = useWeb3Store();
  const required = getChainId();
  const [busy, setBusy] = useState(false);

  if (!account || chainId == null || chainId === required) return null;

  const handleSwitch = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await switchOrAddChain(rawProvider ?? (window as any).ethereum);
    } catch {
      /* surfaced by the warning banner remaining visible */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-100">
      <div className="container-page py-2.5 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="alert" size={16} />
          <span className="truncate">
            Wrong network — connected to <strong>{networkLabel(chainId)}</strong>. This app
            runs on <strong>{networkLabel(required)}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={TESTNET_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded border border-amber-500/30 hover:bg-amber-500/15 transition inline-flex items-center gap-1"
          >
            Faucet
            <Icon name="external" size={11} />
          </a>
          <button
            onClick={handleSwitch}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy && <Icon name="spinner" size={12} />}
            {busy ? 'Switching…' : 'Switch / Add network'}
          </button>
        </div>
      </div>
    </div>
  );
};
