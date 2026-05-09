import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWalletConnect = () => {
  const {
    setAccount,
    setSigner,
    setProvider,
    setChainId,
    setIsConnecting,
    reset,
  } = useWeb3Store();
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(
    async (selected?: string) => {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const account = selected || (await signer.getAddress());

      setAccount(account);
      setSigner(signer);
      setProvider(provider);
      setChainId(Number(network.chainId));
    },
    [setAccount, setChainId, setProvider, setSigner],
  );

  const connectWallet = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error(
          'No Web3 wallet detected. Install MetaMask to continue.',
        );
      }

      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const required = getChainId();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const current = Number((await provider.getNetwork()).chainId);

      if (current !== required) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${required.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            throw new Error('Please add BSC Testnet to your wallet first.');
          }
          // If user rejected, continue connecting; banner will warn.
          if (switchError.code !== 4001) throw switchError;
        }
      }

      await hydrate(accounts[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [hydrate, setIsConnecting]);

  const disconnectWallet = useCallback(() => {
    reset();
  }, [reset]);

  // Auto-reconnect if previously connected.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const accounts: string[] = await window.ethereum.request({
          method: 'eth_accounts',
        });
        if (!cancelled && accounts.length > 0) {
          await hydrate(accounts[0]);
        }
      } catch {
        /* silent */
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // React to wallet account / chain changes.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        reset();
      } else {
        hydrate(accounts[0]);
      }
    };
    const onChainChanged = () => {
      // Easiest correct path: reload, fresh provider/network.
      window.location.reload();
    };

    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    window.ethereum.on?.('chainChanged', onChainChanged);
    return () => {
      window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', onChainChanged);
    };
  }, [hydrate, reset]);

  return { connectWallet, disconnectWallet, error };
};
