import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { getContractAddresses, getProvider } from '@/lib/web3';

const FALLBACK_BPS = 250; // 2.5% — matches Launchpad constructor default.

let cached: number | null = null;
let inflight: Promise<number> | null = null;

const fetchFeeBps = async (): Promise<number> => {
  const provider = getProvider();
  const { launchpad } = getContractAddresses();
  const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
  const bps: bigint = await contract.platformFee();
  return Number(bps);
};

/**
 * Reads the on-chain platform fee (basis points) and exposes it formatted as a
 * percentage string. Cached at module level — the value only changes when the
 * contract owner calls setPlatformFee, which is rare.
 */
export const useProtocolFee = () => {
  const [bps, setBps] = useState<number>(cached ?? FALLBACK_BPS);

  useEffect(() => {
    if (cached != null) return;
    if (!inflight) inflight = fetchFeeBps().catch(() => FALLBACK_BPS);
    let cancelled = false;
    inflight.then((v) => {
      cached = v;
      if (!cancelled) setBps(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = bps / 100;
  // Drop the ".0" for whole-number percentages so "2.5%" stays "2.5%" but "3%"
  // doesn't render as "3.0%".
  const label = `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  return { bps, percent, label };
};
