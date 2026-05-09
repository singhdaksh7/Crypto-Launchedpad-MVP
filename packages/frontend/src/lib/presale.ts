import { ethers } from 'ethers';

export interface PresaleConfig {
  tokenAddress: string;
  owner: string;
  tokenPrice: bigint;
  softcap: bigint;
  hardcap: bigint;
  startTime: bigint;
  endTime: bigint;
  maxBuyPerUser: bigint;
  totalRaised: bigint;
  isActive: boolean;
  isFinalized: boolean;
}

export type PresaleStatus = 'upcoming' | 'active' | 'ended' | 'finalized';

export function getPresaleStatus(p: PresaleConfig): PresaleStatus {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (p.isFinalized) return 'finalized';
  if (now < p.startTime) return 'upcoming';
  if (now >= p.startTime && now < p.endTime) return 'active';
  return 'ended';
}

export const STATUS_LABEL: Record<PresaleStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Live',
  ended: 'Ended',
  finalized: 'Finalized',
};

export function progressPct(raised: bigint, hardcap: bigint): number {
  if (hardcap === 0n) return 0;
  return Math.min(Number((raised * 10000n) / hardcap) / 100, 100);
}

export function softcapReached(p: PresaleConfig): boolean {
  return p.totalRaised >= p.softcap;
}

/** Tokens per 1 BNB. Calculated entirely in bigint to avoid Number precision loss. */
export function tokensPerBnb(tokenPriceWei: bigint): number {
  if (tokenPriceWei <= 0n) return 0;
  // 1 BNB / tokenPrice (both 18-decimal). Multiply num by 1e6 for display precision.
  const ONE = 10n ** 18n;
  const SCALE = 1_000_000n;
  const scaled = (ONE * SCALE) / tokenPriceWei;
  return Number(scaled) / Number(SCALE);
}

export function formatTimeLeft(targetSec: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(targetSec) - now;
  if (diff <= 0) return '0s';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export const formatEther = (value: bigint) => ethers.formatEther(value);
