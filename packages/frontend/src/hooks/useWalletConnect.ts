import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';
import { switchOrAddChain } from '@/lib/chain';
import { WALLETS, getWalletMeta, type WalletId } from '@/lib/wallets';
import { getWalletConnectProvider } from '@/lib/walletConnect';

const STORAGE_KEY = 'lastWalletId';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const friendlyConnectError = (err: any, fallback: string): string => {
  // EIP-1193 user rejection.
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
    return 'Connection rejected.';
  }
  if (err?.code === -32002) {
    return 'A connection request is already pending in your wallet.';
  }
  return err?.shortMessage || err?.message || fallback;
};

export const useWalletConnect = () => {
  const {
    setAccount,
    setSigner,
    setProvider,
    setChainId,
    setIsConnecting,
    setLastWalletId,
    rawProvider,
    reset,
  } = useWeb3Store();
  const [error, setError] = useState<string | null>(null);

  const hydrateFromProvider = useCallback(
    async (raw: any, walletId: WalletId, selected?: string) => {
      const provider = new ethers.BrowserProvider(raw);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const account = selected || (await signer.getAddress());

      setAccount(account);
      setSigner(signer);
      setProvider(provider, raw);
      setChainId(Number(network.chainId));
      setLastWalletId(walletId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, walletId);
      }
    },
    [setAccount, setChainId, setLastWalletId, setProvider, setSigner],
  );

  const switchToRequiredChain = useCallback(async (raw: any) => {
    const required = getChainId();
    const probe = new ethers.BrowserProvider(raw);
    const current = Number((await probe.getNetwork()).chainId);
    if (current === required) return;
    // Falls back to wallet_addEthereumChain on 4902 — the banner still warns
    // visually if the user rejects everything.
    await switchOrAddChain(raw);
  }, []);

  const connectWallet = useCallback(
    async (walletId: WalletId) => {
      try {
        setIsConnecting(true);
        setError(null);

        let raw: any;
        if (walletId === 'walletconnect') {
          const wc = await getWalletConnectProvider();
          if (!wc.session) {
            await wc.connect();
          } else if (!wc.accounts || wc.accounts.length === 0) {
            await wc.enable();
          }
          raw = wc;
        } else {
          const meta = getWalletMeta(walletId);
          const inj = meta?.detect();
          if (!inj) {
            throw new Error(
              `${meta?.label ?? 'Wallet'} not detected. Install the extension or use WalletConnect.`,
            );
          }
          await inj.request({ method: 'eth_requestAccounts' });
          raw = inj;
        }

        await switchToRequiredChain(raw);
        await hydrateFromProvider(raw, walletId);
      } catch (err: any) {
        setError(friendlyConnectError(err, 'Failed to connect wallet'));
      } finally {
        setIsConnecting(false);
      }
    },
    [hydrateFromProvider, setIsConnecting, switchToRequiredChain],
  );

  const disconnectWallet = useCallback(async () => {
    const walletId = useWeb3Store.getState().lastWalletId;
    if (walletId === 'walletconnect') {
      try {
        const wc = await getWalletConnectProvider();
        if (wc.session) await wc.disconnect();
      } catch {
        /* If WC tear-down fails, still clear local state. */
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    reset();
  }, [reset]);

  // Auto-reconnect on mount, branching on the persisted wallet id.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const lastId = localStorage.getItem(STORAGE_KEY) as WalletId | null;
    if (!lastId) return;

    const reconnect = async () => {
      try {
        if (lastId === 'walletconnect') {
          const wc = await getWalletConnectProvider();
          if (wc.session && wc.accounts && wc.accounts.length > 0) {
            if (!cancelled) await hydrateFromProvider(wc, 'walletconnect', wc.accounts[0]);
          }
          return;
        }
        const meta = getWalletMeta(lastId);
        const inj = meta?.detect();
        if (!inj) return;
        const accounts: string[] = await inj.request({ method: 'eth_accounts' });
        if (!cancelled && accounts.length > 0) {
          await hydrateFromProvider(inj, lastId, accounts[0]);
        }
      } catch {
        /* silent — user can reconnect manually */
      }
    };
    reconnect();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromProvider]);

  // Wire account/chain/disconnect events to whichever provider is active.
  useEffect(() => {
    if (!rawProvider) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        reset();
        return;
      }
      const lastId =
        typeof window !== 'undefined'
          ? (localStorage.getItem(STORAGE_KEY) as WalletId | null)
          : null;
      if (lastId) {
        void hydrateFromProvider(rawProvider, lastId, accounts[0]);
      }
    };
    const onChainChanged = () => {
      // Reload is the simplest correct path — fresh provider/network/signer.
      window.location.reload();
    };
    const onDisconnect = () => {
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
      reset();
    };

    rawProvider.on?.('accountsChanged', onAccountsChanged);
    rawProvider.on?.('chainChanged', onChainChanged);
    rawProvider.on?.('disconnect', onDisconnect);
    return () => {
      rawProvider.removeListener?.('accountsChanged', onAccountsChanged);
      rawProvider.removeListener?.('chainChanged', onChainChanged);
      rawProvider.removeListener?.('disconnect', onDisconnect);
    };
  }, [rawProvider, reset, hydrateFromProvider]);

  return { connectWallet, disconnectWallet, error, wallets: WALLETS };
};
