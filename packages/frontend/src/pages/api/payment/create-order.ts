import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { isExempt } from '@/lib/server/access';
import { createLaunchAccessOrder } from '@/lib/server/payments/service';
import type { OrderResponse } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Verify your wallet first.' });
  }

  const walletAddress = String(req.body?.walletAddress || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address.' });
  }
  if (walletAddress !== session.address) {
    return res.status(403).json({ error: 'Payment wallet does not match verified session.' });
  }
  if (isExempt(session.address)) {
    return res.status(409).json({ error: 'Access already granted for this wallet.' });
  }

  try {
    const order = await createLaunchAccessOrder(walletAddress);
    return res.status(200).json(order);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Failed to create payment order.' });
  }
}
