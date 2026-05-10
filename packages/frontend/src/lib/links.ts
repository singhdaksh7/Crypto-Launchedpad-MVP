import { getChainId } from './web3';

const EXPLORERS: Record<number, { name: string; base: string }> = {
  56: { name: 'BscScan', base: 'https://bscscan.com' },
  97: { name: 'BscScan Testnet', base: 'https://testnet.bscscan.com' },
};

const FALLBACK = { name: 'BscScan Testnet', base: 'https://testnet.bscscan.com' };

function explorer() {
  return EXPLORERS[getChainId()] || FALLBACK;
}

export function explorerName(): string {
  return explorer().name;
}

export function addressUrl(address: string): string {
  return `${explorer().base}/address/${address}`;
}

export function txUrl(hash: string): string {
  return `${explorer().base}/tx/${hash}`;
}

export function tokenUrl(address: string): string {
  return `${explorer().base}/token/${address}`;
}

export const NETWORK_LABEL: Record<number, string> = {
  56: 'BNB Chain',
  97: 'BSC Testnet',
};

export function networkLabel(chainId: number | null): string {
  if (chainId == null) return 'Unknown';
  return NETWORK_LABEL[chainId] || `Chain ${chainId}`;
}
