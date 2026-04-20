import React from 'react';
import { useWeb3Store } from '@/store';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { formatAddress } from '@/lib/web3';

export const WalletButton: React.FC = () => {
  const { account } = useWeb3Store();
  const { connectWallet, disconnectWallet } = useWalletConnect();

  if (account) {
    return (
      <button
        onClick={disconnectWallet}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
      >
        {formatAddress(account)}
      </button>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
    >
      Connect Wallet
    </button>
  );
};
