import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { isExempt } from '@/lib/server/access';
import type { AccessResponse } from '@/lib/access';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse>,
) {
  // Disable any framework / CDN caching — this is per-user state.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const session = readSession(req);
  if (!session) {
    return res.status(200).json({ unlocked: false });
  }

  // Re-evaluate exempt list on every read so admins can flip the env without
  // forcing every user to re-verify.
  const currentlyExempt = isExempt(session.address);
  const unlocked = currentlyExempt || session.paid;
  return res.status(200).json({
    unlocked,
    reason: currentlyExempt ? 'exempt' : session.paid ? 'paid' : undefined,
    address: session.address,
    exempt: currentlyExempt,
    paid: session.paid,
  });
}
