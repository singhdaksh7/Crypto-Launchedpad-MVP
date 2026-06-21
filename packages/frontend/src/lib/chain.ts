import { getChainId } from './web3';

type EthereumChainParams = {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

/**
 * Per-chain metadata used to add the configured network to an EIP-1193 wallet
 * via `wallet_addEthereumChain`. Both BSC mainnet (56) and BSC testnet (97) are
 * supported — the active one is chosen by NEXT_PUBLIC_NETWORK.
 */
const CHAIN_PARAMS: Record<number, EthereumChainParams> = {
  56: {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-rpc.publicnode.com',
    ],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  97: {
    chainId: '0x61',
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: [
      'https://bsc-testnet-rpc.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
    ],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
};

export const TESTNET_FAUCET_URL = 'https://testnet.bnbchain.org/faucet-smart';

export function isTestnet(): boolean {
  return getChainId() === 97;
}

/** Faucet URL for the active network, or null on mainnet. */
export function faucetUrl(): string | null {
  return isTestnet() ? TESTNET_FAUCET_URL : null;
}

function getAddChainParams(): EthereumChainParams {
  const id = getChainId();
  return CHAIN_PARAMS[id] ?? CHAIN_PARAMS[97];
}

/**
 * Try to switch the wallet to the configured chain. If the wallet rejects with
 * 4902 (chain not added), follow up with `wallet_addEthereumChain` so the user
 * can complete switching in a single confirmation.
 *
 * Returns `true` if the switch happened (or was already on the right chain),
 * `false` if the user rejected, and throws for unexpected errors.
 */
export async function switchOrAddChain(provider: any): Promise<boolean> {
  if (!provider?.request) return false;
  const required = getChainId();
  const hex = `0x${required.toString(16)}`;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hex }],
    });
    return true;
  } catch (err: any) {
    if (err?.code === 4902 || err?.code === -32603) {
      // Chain not in the wallet — add it, which on success leaves the wallet
      // on that chain too.
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [getAddChainParams()],
        });
        return true;
      } catch (addErr: any) {
        if (addErr?.code === 4001) return false;
        throw addErr;
      }
    }
    if (err?.code === 4001) return false;
    throw err;
  }
}
