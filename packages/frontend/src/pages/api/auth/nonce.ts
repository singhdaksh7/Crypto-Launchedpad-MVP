import type { NextApiRequest, NextApiResponse } from 'next';
import { issueNonce } from '@/lib/server/session';
import { siweMessage } from '@/lib/server/access';
import type { NonceResponse } from '@/lib/access';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<NonceResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const address = String(req.body?.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  try {
    const { nonce } = issueNonce(res);
    return res.status(200).json({
      nonce,
      message: siweMessage(address, nonce),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to issue nonce' });
  }
}
