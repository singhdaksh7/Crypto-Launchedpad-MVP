import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';
import { getContractAddresses, formatAddress, getChainId } from '@/lib/web3';
import { addressUrl, networkLabel } from '@/lib/links';

const ZERO = '0x0000000000000000000000000000000000000000';

export const Footer: React.FC = () => {
  const { launchpad, tokenFactory } = getContractAddresses();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 mt-20 bg-[#070A12]/80">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-glow">
                <Icon name="rocket" size={16} className="text-black" />
              </span>
              <span className="font-semibold text-white">LaunchBNB</span>
            </div>
            <p className="text-sm text-ink-400 max-w-md">
              A decentralized token launch platform on BNB Chain. Create ERC20
              tokens, run presales with built-in safeguards, and let your community
              participate transparently on-chain.
            </p>
            <p className="text-xs text-ink-500 mt-3 font-semibold">
              Network: <span className="text-bnb-text">{networkLabel(getChainId())}</span>
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-ink-500 mb-3 font-bold">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/launchpads" className="text-ink-400 hover:text-white transition">
                  Browse presales
                </Link>
              </li>
              <li>
                <Link href="/create-token" className="text-ink-400 hover:text-white transition">
                  Create a token
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-ink-400 hover:text-white transition">
                  Launch dashboard
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-ink-400 hover:text-white transition">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-ink-400 hover:text-white transition">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="text-ink-400 hover:text-white transition">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>

          {/* Contract Addresses */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-ink-500 mb-3 font-bold">
              Contracts
            </h4>
            <ul className="space-y-2 text-sm font-mono">
              {launchpad !== ZERO ? (
                <li>
                  <a
                    href={addressUrl(launchpad)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-400 hover:text-white inline-flex items-center gap-1 transition"
                  >
                    <span className="text-[10px] font-sans uppercase tracking-wider text-ink-500 mr-1">
                      Launchpad
                    </span>
                    {formatAddress(launchpad)}
                    <Icon name="external" size={12} />
                  </a>
                </li>
              ) : (
                <li className="text-ink-500 text-xs">Launchpad: not deployed</li>
              )}
              {tokenFactory !== ZERO ? (
                <li>
                  <a
                    href={addressUrl(tokenFactory)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-400 hover:text-white inline-flex items-center gap-1 transition"
                  >
                    <span className="text-[10px] font-sans uppercase tracking-wider text-ink-500 mr-1">
                      Factory
                    </span>
                    {formatAddress(tokenFactory)}
                    <Icon name="external" size={12} />
                  </a>
                </li>
              ) : (
                <li className="text-ink-500 text-xs">Factory: not deployed</li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs text-ink-500">© {year} LaunchBNB. All rights reserved.</p>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap gap-3 text-xs text-ink-500">
              <Link href="/terms" className="hover:text-white transition">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy
              </Link>
              <Link href="/risk-disclosure" className="hover:text-white transition">
                Risk Disclosure
              </Link>
            </div>
            <p className="text-xs text-ink-500 max-w-md sm:text-right">
              Token sales carry significant risk. Always verify the contract, do your
              own research, and never invest more than you can afford to lose. No returns are guaranteed.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
