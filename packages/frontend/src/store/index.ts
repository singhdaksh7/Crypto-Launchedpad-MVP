import { create } from 'zustand';
import { ethers } from 'ethers';
import type { WalletId } from '@/lib/wallets';

interface Web3Store {
  account: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  /** Underlying EIP-1193 provider — used to wire wallet event listeners. */
  rawProvider: any | null;
  chainId: number | null;
  isConnecting: boolean;
  /** Which wallet powered the active connection — drives reconnect + display. */
  lastWalletId: WalletId | null;
  setAccount: (account: string) => void;
  setSigner: (signer: ethers.Signer) => void;
  setProvider: (provider: ethers.BrowserProvider, raw: any) => void;
  setChainId: (chainId: number) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setLastWalletId: (id: WalletId | null) => void;
  reset: () => void;
}

export const useWeb3Store = create<Web3Store>((set) => ({
  account: null,
  signer: null,
  provider: null,
  rawProvider: null,
  chainId: null,
  isConnecting: false,
  lastWalletId: null,
  setAccount: (account) => set({ account }),
  setSigner: (signer) => set({ signer }),
  setProvider: (provider, raw) => set({ provider, rawProvider: raw }),
  setChainId: (chainId) => set({ chainId }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setLastWalletId: (lastWalletId) => set({ lastWalletId }),
  reset: () => set({
    account: null,
    signer: null,
    provider: null,
    rawProvider: null,
    chainId: null,
    isConnecting: false,
    lastWalletId: null,
  }),
}));

interface LaunchpadStore {
  presales: any[];
  userContributions: Record<string, any>;
  setPresales: (presales: any[]) => void;
  setUserContributions: (id: string, contribution: any) => void;
}

export const useLaunchpadStore = create<LaunchpadStore>((set) => ({
  presales: [],
  userContributions: {},
  setPresales: (presales) => set({ presales }),
  setUserContributions: (id, contribution) => set((state) => ({
    userContributions: {
      ...state.userContributions,
      [id]: contribution,
    },
  })),
}));
