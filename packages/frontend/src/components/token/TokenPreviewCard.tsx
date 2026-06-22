import React from 'react';
import { Icon } from '../ui/Icon';

interface TokenPreviewCardProps {
  name: string;
  symbol: string;
  supply: string;
  decimals: number | string;
  logoURI?: string;
  owner?: string;
}

export const TokenPreviewCard: React.FC<TokenPreviewCardProps> = ({
  name,
  symbol,
  supply,
  decimals,
  logoURI,
  owner,
}) => {
  const previewName = name || 'My Awesome Token';
  const previewSymbol = symbol || 'MAT';
  const previewSupply = supply ? parseFloat(supply).toLocaleString() : '0';
  const previewDecimals = decimals || '18';

  const previewSrc = (() => {
    const v = logoURI?.trim();
    if (!v) return '';
    if (v.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${v.slice('ipfs://'.length)}`;
    return v;
  })();

  return (
    <div className="card bg-gradient-to-b from-surface to-black border border-white/10 shadow-glow sticky top-24 space-y-6">
      <div className="flex justify-between items-start">
        <h3 className="text-xs uppercase tracking-wider text-ink-500 font-bold">Token Preview</h3>
        <span className="text-[10px] uppercase font-bold text-bnb-text bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded-full">
          Draft Card
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-ink-400 overflow-hidden">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Token logo"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Icon name="rocket" size={18} className="text-bnb-text" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base text-white truncate">{previewName}</p>
          <p className="text-xs text-bnb-text font-mono font-bold uppercase tracking-wider">{previewSymbol}</p>
        </div>
      </div>

      <div className="space-y-3 pt-2 text-xs font-semibold">
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-ink-500">Decimals</span>
          <span className="text-white font-mono">{previewDecimals}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-ink-500">Total Supply</span>
          <span className="text-white font-mono">{previewSupply}</span>
        </div>
        {owner && (
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-ink-500">Owner Wallet</span>
            <span className="text-white font-mono text-[10px]">
              {owner.substring(0, 6)}...{owner.substring(owner.length - 4)}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-[11px] text-ink-500 leading-relaxed font-semibold">
        🛡️ Standard BEP-20 token layout verified for deployment on BNB Smart Chain.
      </div>
    </div>
  );
};
export default TokenPreviewCard;
