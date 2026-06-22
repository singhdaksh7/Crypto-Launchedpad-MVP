import React from 'react';
import { Icon } from '../ui/Icon';
import { AddressLink } from '../ui';

interface TokenCardProps {
  token: {
    name: string;
    symbol: string;
    supply: string;
    decimals: number | string;
    address: string;
  };
  onCreatePresale?: (address: string) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, onCreatePresale }) => {
  const initials = token.name.substring(0, 2).toUpperCase();

  return (
    <div className="card bg-surface border border-white/5 p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-bnb-text text-xs shrink-0 select-none">
          {initials}
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-white truncate flex items-center gap-1.5">
            {token.name}
            <span className="text-xs text-ink-400 font-normal uppercase tracking-wider">
              ({token.symbol})
            </span>
          </h4>
          <div className="text-xs text-ink-500 mt-1 font-semibold flex items-center gap-1 font-mono">
            Addr: <AddressLink address={token.address} variant="token" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block text-right">
          <p className="text-[10px] text-ink-500 uppercase tracking-wider font-bold">Total Supply</p>
          <p className="text-sm font-mono text-white font-semibold">
            {parseFloat(token.supply).toLocaleString()}
          </p>
        </div>
        
        {onCreatePresale && (
          <button
            onClick={() => onCreatePresale(token.address)}
            className="px-3.5 py-1.5 bg-primary-500/10 hover:bg-primary-500 text-primary-500 hover:text-black border border-primary-500/20 rounded-full text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            Create Presale <Icon name="arrow-right" size={10} />
          </button>
        )}
      </div>
    </div>
  );
};
export default TokenCard;
