import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { isExempt, isKycVerified } from '@/lib/server/access';
import { getConfiguredPaymentProviderName } from '@/lib/server/payments/provider';
import { getLaunchAccess } from '@/lib/server/payments/service';
import type { AccessResponse } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse>,
) {
  // Disable any framework / CDN caching — this is per-user state.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const session = readSession(req);
  if (!session) {
    return res.status(200).json({
      unlocked: false,
      configuredPaymentProvider: getConfiguredPaymentProviderName(),
    });
  }

  // Re-evaluate exempt + kyc lists on every read so admins can flip env vars
  // without forcing every user to re-verify.
  const currentlyExempt = isExempt(session.address);
  const currentlyKyc = isKycVerified(session.address);
  const launchAccess = await getLaunchAccess(session.address);
  const paymentSatisfied = currentlyExempt || launchAccess.hasLaunchAccess;
  const unlocked = paymentSatisfied;
  return res.status(200).json({
    unlocked,
    reason: paymentSatisfied
      ? currentlyExempt
        ? 'exempt'
        : 'paid'
      : undefined,
    address: session.address,
    configuredPaymentProvider: getConfiguredPaymentProviderName(),
    exempt: currentlyExempt,
    paid: launchAccess.hasLaunchAccess,
    hasLaunchAccess: paymentSatisfied,
    kyc: currentlyKyc,
    paymentProvider: currentlyExempt ? 'exempt' : launchAccess.paymentProvider,
    paidAt: launchAccess.paidAt,
  });
}
