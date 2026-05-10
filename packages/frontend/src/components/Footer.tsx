import React from 'react';
import Link from 'next/link';
import { Icon } from './ui/Icon';
import { getContractAddresses, formatAddress, getChainId } from '@/lib/web3';
import { addressUrl, networkLabel } from '@/lib/links';

const ZERO = '0x0000000000000000000000000000000000000000';

export const Footer: React.FC = () => {
  const { launchpad, tokenFactory } = getContractAddresses();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-glow">
                <Icon name="rocket" size={16} className="text-black" />
              </span>
              <span className="font-semibold">Launchpad</span>
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              A decentralized token launch platform on BNB Chain. Create ERC20
              tokens, run presales with built-in safeguards, and let your community
              participate transparently on-chain.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Network: <span className="text-gray-300">{networkLabel(getChainId())}</span>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/launchpads" className="text-gray-400 hover:text-white">
                  Browse presales
                </Link>
              </li>
              <li>
                <Link href="/create-token" className="text-gray-400 hover:text-white">
                  Create a token
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white">
                  Launch dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contracts */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Contracts
            </h4>
            <ul className="space-y-2 text-sm font-mono">
              {launchpad !== ZERO ? (
                <li>
                  <a
                    href={addressUrl(launchpad)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500 mr-1">
                      Launchpad
                    </span>
                    {formatAddress(launchpad)}
                    <Icon name="external" size={12} />
                  </a>
                </li>
              ) : (
                <li className="text-gray-500 text-xs">Launchpad: not deployed</li>
              )}
              {tokenFactory !== ZERO ? (
                <li>
                  <a
                    href={addressUrl(tokenFactory)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500 mr-1">
                      Factory
                    </span>
                    {formatAddress(tokenFactory)}
                    <Icon name="external" size={12} />
                  </a>
                </li>
              ) : (
                <li className="text-gray-500 text-xs">Factory: not deployed</li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs text-gray-500">© {year} Launchpad. All rights reserved.</p>
          <p className="text-xs text-gray-500 max-w-md sm:text-right">
            Token sales carry significant risk. Always verify the contract, do your
            own research, and never invest more than you can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  );
};
