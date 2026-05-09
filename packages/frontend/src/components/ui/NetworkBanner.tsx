import React from 'react';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';
import { Icon } from './Icon';

export const NetworkBanner: React.FC = () => {
  const { account, chainId } = useWeb3Store();
  const required = getChainId();

  if (!account || chainId == null || chainId === required) return null;

  const handleSwitch = async () => {
    try {
      await (window as any).ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${required.toString(16)}` }],
      });
    } catch {
      /* user rejected or chain not added */
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-100">
      <div className="container-page py-2.5 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon name="alert" size={16} />
          <span>
            Wrong network — connected to <strong>{networkLabel(chainId)}</strong>. This app
            runs on <strong>{networkLabel(required)}</strong>.
          </span>
        </div>
        <button
          onClick={handleSwitch}
          className="text-xs font-semibold px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition"
        >
          Switch network
        </button>
      </div>
    </div>
  );
};
