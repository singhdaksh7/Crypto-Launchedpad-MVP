import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { isExempt, isKycVerified } from '@/lib/server/access';
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

  // Re-evaluate exempt + kyc lists on every read so admins can flip env vars
  // without forcing every user to re-verify.
  const currentlyExempt = isExempt(session.address);
  const currentlyKyc = isKycVerified(session.address);
  const paymentSatisfied = currentlyExempt || session.paid;
  const unlocked = paymentSatisfied && currentlyKyc;
  return res.status(200).json({
    unlocked,
    reason: paymentSatisfied
      ? currentlyExempt
        ? 'exempt'
        : 'paid'
      : undefined,
    address: session.address,
    exempt: currentlyExempt,
    paid: session.paid,
    kyc: currentlyKyc,
  });
}
