import { ethers } from 'ethers';
import { getRpcUrl } from '@/lib/web3';

/**
 * Server-only RPC endpoint resolution.
 *
 * Prefers a non-public, dedicated provider via the server-only `RPC_URL`
 * (e.g. Alchemy / QuickNode — Phase 1 step 1 of the scaling roadmap). Falls
 * back to the same public resolution the browser uses (`getRpcUrl`) so the
 * app keeps working before a dedicated endpoint is provisioned.
 *
 * `RPC_URL` is intentionally NOT prefixed `NEXT_PUBLIC_` so the dedicated
 * endpoint (which may carry an API key) is never shipped to the client.
 */
function getServerRpcUrl(): string {
  const dedicated = (process.env.RPC_URL || '').trim();
  if (dedicated) return dedicated;
  return getRpcUrl();
}

let cached: ethers.JsonRpcProvider | null = null;

/**
 * Cached server-side read provider. Unlike the client `getProvider()` (which
 * builds a fresh provider per call), this is a singleton so all server reads
 * and the future indexer share one connection.
 */
export function getServerProvider(): ethers.JsonRpcProvider {
  if (!cached) {
    cached = new ethers.JsonRpcProvider(getServerRpcUrl());
  }
  return cached;
}
