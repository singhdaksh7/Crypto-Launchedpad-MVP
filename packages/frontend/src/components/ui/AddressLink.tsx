import React from 'react';
import { addressUrl, tokenUrl } from '@/lib/links';
import { formatAddress } from '@/lib/web3';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

interface AddressLinkProps {
  address: string;
  variant?: 'address' | 'token';
  /** Show full vs truncated address. */
  truncate?: boolean;
  className?: string;
  showCopy?: boolean;
  showExplorer?: boolean;
}

export const AddressLink: React.FC<AddressLinkProps> = ({
  address,
  variant = 'address',
  truncate = true,
  className = '',
  showCopy = true,
  showExplorer = true,
}) => {
  const url = variant === 'token' ? tokenUrl(address) : addressUrl(address);
  const display = truncate ? formatAddress(address) : address;

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-sm ${className}`}>
      {showExplorer ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-white inline-flex items-center gap-1 transition-colors"
        >
          {display}
          <Icon name="external" size={12} className="opacity-60" />
        </a>
      ) : (
        <span className="text-gray-300">{display}</span>
      )}
      {showCopy && <CopyButton text={address} />}
    </span>
  );
};
