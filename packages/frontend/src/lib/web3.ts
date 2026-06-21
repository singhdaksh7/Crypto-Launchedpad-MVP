import { ethers } from 'ethers';

// Default to BSC Testnet so local dev / preview deployments still work without
// any env config. Mainnet is opt-in via NEXT_PUBLIC_NETWORK=56.
const DEFAULT_CHAIN_ID = 97;
const DEFAULT_RPC_BY_CHAIN: Record<number, string> = {
  56: 'https://bsc-dataseed.binance.org',
  97: 'https://bsc-testnet-rpc.publicnode.com',
};

export const getChainId = () => {
  const raw = (process.env.NEXT_PUBLIC_NETWORK || '').trim();
  if (!raw) return DEFAULT_CHAIN_ID;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_CHAIN_ID;
};

export const getRpcUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_RPC_URL || '').trim();
  if (configured) return configured;
  return DEFAULT_RPC_BY_CHAIN[getChainId()] || DEFAULT_RPC_BY_CHAIN[DEFAULT_CHAIN_ID];
};

export const getProvider = () => {
  return new ethers.JsonRpcProvider(getRpcUrl());
};

export const getContractAddresses = () => {
  return {
    launchpad: process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS || '0x0000000000000000000000000000000000000000',
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    vesting: process.env.NEXT_PUBLIC_VESTING_ADDRESS || '0x0000000000000000000000000000000000000000',
  };
};

export const isZeroAddress = (address: string) =>
  /^0x0+$/i.test(address);

export const isValidAddress = (address: string) => {
  return ethers.isAddress(address);
};

export const formatAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const parseEther = (value: string) => {
  return ethers.parseEther(value);
};

export const formatEther = (value: bigint) => {
  return ethers.formatEther(value);
};
