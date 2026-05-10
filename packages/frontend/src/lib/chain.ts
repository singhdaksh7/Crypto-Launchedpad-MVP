import { getChainId } from './web3';

/**
 * Static metadata used to add BSC Testnet to an EIP-1193 wallet via
 * `wallet_addEthereumChain`. Kept testnet-only on purpose.
 */
export const BSC_TESTNET_PARAMS = {
  chainId: '0x61',
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: [
    'https://bsc-testnet-rpc.publicnode.com',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  ],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
};

export const TESTNET_FAUCET_URL = 'https://testnet.bnbchain.org/faucet-smart';

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
          params: [BSC_TESTNET_PARAMS],
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
