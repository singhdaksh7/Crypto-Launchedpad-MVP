import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';

export const useWalletConnect = () => {
  const { setAccount, setSigner, setProvider, setChainId, setIsConnecting } = useWeb3Store();
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chainId = await provider.getNetwork().then((n) => Number(n.chainId));

      const requiredChainId = getChainId();
      if (chainId !== requiredChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            throw new Error(`Please add BSC Testnet to MetaMask`);
          }
          throw switchError;
        }
      }

      setAccount(accounts[0]);
      setSigner(signer);
      setProvider(provider);
      setChainId(chainId);
      setIsConnecting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    useWeb3Store.setState({
      account: null,
      signer: null,
      provider: null,
      chainId: null,
    });
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          if (accounts.length > 0) {
            connectWallet();
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  return { connectWallet, disconnectWallet, error };
};
