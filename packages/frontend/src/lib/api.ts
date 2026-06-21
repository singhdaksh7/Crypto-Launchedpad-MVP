import type { PresaleConfig } from './presale';

/**
 * Presale shape used by UI components. Bigint fields are real `bigint`s here
 * (revived from the API's string form via {@link revivePresale}).
 */
export interface PresaleData extends PresaleConfig {
  id: number;
  tokenName: string;
  tokenSymbol: string;
}

/**
 * JSON-safe presale shape returned by the cached `/api/presales*` routes.
 * `bigint` cannot be JSON-serialized, so numeric chain values travel as
 * decimal strings and are revived to `bigint` on the client.
 */
export interface SerializedPresale {
  id: number;
  tokenAddress: string;
  owner: string;
  tokenPrice: string;
  softcap: string;
  hardcap: string;
  startTime: string;
  endTime: string;
  maxBuyPerUser: string;
  totalRaised: string;
  isActive: boolean;
  isFinalized: boolean;
  tokenName: string;
  tokenSymbol: string;
}

export function revivePresale(s: SerializedPresale): PresaleData {
  return {
    id: s.id,
    tokenAddress: s.tokenAddress,
    owner: s.owner,
    tokenPrice: BigInt(s.tokenPrice),
    softcap: BigInt(s.softcap),
    hardcap: BigInt(s.hardcap),
    startTime: BigInt(s.startTime),
    endTime: BigInt(s.endTime),
    maxBuyPerUser: BigInt(s.maxBuyPerUser),
    totalRaised: BigInt(s.totalRaised),
    isActive: s.isActive,
    isFinalized: s.isFinalized,
    tokenName: s.tokenName,
    tokenSymbol: s.tokenSymbol,
  };
}

/** Fetch + revive all presales from the cached list endpoint. */
export async function fetchPresalesFromApi(): Promise<PresaleData[]> {
  const res = await fetch('/api/presales');
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Failed to load presales (${res.status})`);
  }
  const { presales } = (await res.json()) as { presales: SerializedPresale[] };
  return presales.map(revivePresale);
}

/** Fetch + revive a single presale from the cached detail endpoint. */
export async function fetchPresaleFromApi(id: number): Promise<PresaleData> {
  const res = await fetch(`/api/presales/${id}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Failed to load presale (${res.status})`);
  }
  return revivePresale((await res.json()) as SerializedPresale);
}
