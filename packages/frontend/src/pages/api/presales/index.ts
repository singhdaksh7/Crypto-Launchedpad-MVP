import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllPresales } from '@/lib/server/launchpad';
import type { SerializedPresale } from '@/lib/api';

type Data = { presales: SerializedPresale[] } | { error: string };

/**
 * Cached presale list. The chain fan-out runs server-side once per cache
 * window; Vercel's edge serves every visitor from the CDN, so RPC load is
 * O(1) regardless of traffic.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    const presales = await getAllPresales();
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60',
    );
    return res.status(200).json({ presales });
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store');
    return res
      .status(502)
      .json({ error: e?.message || 'Failed to load presales' });
  }
}
