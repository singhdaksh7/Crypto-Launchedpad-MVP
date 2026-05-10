import { ethers } from 'ethers';

const DEFAULT_TESTNET_RPC = 'https://bsc-testnet-rpc.publicnode.com';
const DEFAULT_TESTNET_CHAIN_ID = 97;

export const getProvider = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_TESTNET_RPC;
  return new ethers.JsonRpcProvider(rpcUrl);
};

export const getChainId = () => {
  return parseInt(process.env.NEXT_PUBLIC_NETWORK || String(DEFAULT_TESTNET_CHAIN_ID));
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
