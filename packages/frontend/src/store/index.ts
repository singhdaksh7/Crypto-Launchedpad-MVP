import { create } from 'zustand';
import { ethers } from 'ethers';

interface Web3Store {
  account: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  chainId: number | null;
  isConnecting: boolean;
  setAccount: (account: string) => void;
  setSigner: (signer: ethers.Signer) => void;
  setProvider: (provider: ethers.BrowserProvider) => void;
  setChainId: (chainId: number) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  reset: () => void;
}

export const useWeb3Store = create<Web3Store>((set) => ({
  account: null,
  signer: null,
  provider: null,
  chainId: null,
  isConnecting: false,
  setAccount: (account) => set({ account }),
  setSigner: (signer) => set({ signer }),
  setProvider: (provider) => set({ provider }),
  setChainId: (chainId) => set({ chainId }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  reset: () => set({
    account: null,
    signer: null,
    provider: null,
    chainId: null,
    isConnecting: false,
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
