import { ethers } from 'ethers';
import { getServerProvider } from './chain';
import { getContractAddresses } from '@/lib/web3';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import type { SerializedPresale } from '@/lib/api';

/**
 * Server-side presale reads. This is the single chokepoint that does the
 * `presaleCounter` + per-presale `getPresaleDetails` + per-token
 * `name()/symbol()` fan-out. Moving it here (from the browser) means the work
 * happens once per cache window instead of once per visitor.
 *
 * When the Ponder indexer lands (Phase 1 step 2), only the internals of these
 * functions change to query Postgres — the API routes and frontend keep their
 * exact contract.
 */

function getContract() {
  const provider = getServerProvider();
  const { launchpad } = getContractAddresses();
  return new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
}

async function tokenMeta(
  tokenAddress: string,
): Promise<{ tokenName: string; tokenSymbol: string }> {
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, getServerProvider());
    const [tokenName, tokenSymbol] = await Promise.all([token.name(), token.symbol()]);
    return { tokenName, tokenSymbol };
  } catch {
    // Token may not be ERC20 metadata-compliant.
    return { tokenName: '', tokenSymbol: '' };
  }
}

function serialize(
  id: number,
  d: any,
  tokenName: string,
  tokenSymbol: string,
): SerializedPresale {
  return {
    id,
    tokenAddress: d.tokenAddress,
    owner: d.owner,
    tokenPrice: d.tokenPrice.toString(),
    softcap: d.softcap.toString(),
    hardcap: d.hardcap.toString(),
    startTime: d.startTime.toString(),
    endTime: d.endTime.toString(),
    maxBuyPerUser: d.maxBuyPerUser.toString(),
    totalRaised: d.totalRaised.toString(),
    isActive: d.isActive,
    isFinalized: d.isFinalized,
    tokenName,
    tokenSymbol,
  };
}

export async function getAllPresales(): Promise<SerializedPresale[]> {
  const contract = getContract();
  const counter: bigint = await contract.presaleCounter();
  const total = Number(counter);
  if (total === 0) return [];

  const ids = Array.from({ length: total }, (_, i) => i);
  const details = await Promise.all(ids.map((id) => contract.getPresaleDetails(id)));

  return Promise.all(
    details.map(async (d, id) => {
      const { tokenName, tokenSymbol } = await tokenMeta(d.tokenAddress);
      return serialize(id, d, tokenName, tokenSymbol);
    }),
  );
}

export async function getPresale(id: number): Promise<SerializedPresale | null> {
  const contract = getContract();
  const counter: bigint = await contract.presaleCounter();
  if (id < 0 || id >= Number(counter)) return null;

  const d = await contract.getPresaleDetails(id);
  const { tokenName, tokenSymbol } = await tokenMeta(d.tokenAddress);
  return serialize(id, d, tokenName, tokenSymbol);
}
