import type { EthereumProvider } from '@walletconnect/ethereum-provider';
import { getChainId } from './web3';

type WCProvider = InstanceType<typeof EthereumProvider>;

let wcPromise: Promise<WCProvider> | null = null;

/**
 * Lazy singleton — only loads `@walletconnect/ethereum-provider` if/when the
 * user picks WalletConnect, keeping it out of the initial bundle.
 */
export async function getWalletConnectProvider(): Promise<WCProvider> {
  if (typeof window === 'undefined') {
    throw new Error('WalletConnect can only be initialised in the browser.');
  }
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'WalletConnect not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.',
    );
  }
  if (!wcPromise) {
    wcPromise = import('@walletconnect/ethereum-provider').then((mod) =>
      mod.EthereumProvider.init({
        projectId,
        chains: [getChainId()],
        showQrModal: true,
        methods: [
          'eth_sendTransaction',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
          'wallet_switchEthereumChain',
          'wallet_addEthereumChain',
        ],
        events: ['chainChanged', 'accountsChanged'],
        metadata: {
          name: 'Crypto Launchpad',
          description: 'Token launchpad on BNB Chain',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
      }),
    );
  }
  return wcPromise;
}

export function isWalletConnectConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
}
