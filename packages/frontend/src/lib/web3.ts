import { ethers } from 'ethers';

export const getProvider = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-b7c35c69bdb811ec.binance.org:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

export const getChainId = () => {
  return parseInt(process.env.NEXT_PUBLIC_NETWORK || '97');
};

export const getContractAddresses = () => {
  return {
    launchpad: process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS || '0x0000000000000000000000000000000000000000',
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
  };
};

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
