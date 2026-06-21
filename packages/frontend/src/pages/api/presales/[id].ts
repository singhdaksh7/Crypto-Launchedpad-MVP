import type { NextApiRequest, NextApiResponse } from 'next';
import { getPresale } from '@/lib/server/launchpad';
import type { SerializedPresale } from '@/lib/api';

type Data = SerializedPresale | { error: string };

/**
 * Cached single-presale read. Shorter TTL than the list since detail pages
 * want fresher `totalRaised`; still absorbs polling traffic at the CDN.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id < 0) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Invalid presale id' });
  }

  try {
    const presale = await getPresale(id);
    if (!presale) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'Presale not found' });
    }
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=15, stale-while-revalidate=30',
    );
    return res.status(200).json(presale);
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store');
    return res
      .status(502)
      .json({ error: e?.message || 'Failed to load presale' });
  }
}
