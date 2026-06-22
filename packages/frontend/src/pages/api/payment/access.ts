import type { NextApiRequest, NextApiResponse } from 'next';
import { isExempt } from '@/lib/server/access';
import { getLaunchAccess } from '@/lib/server/payments/service';
import { toJsonError } from '@/lib/server/logging';
import type { PaymentAccessResponse } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentAccessResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json(toJsonError('Method not allowed'));
  }

  const walletAddress = String(req.query.walletAddress || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    return res.status(400).json(toJsonError('Invalid wallet address.'));
  }

  const access = await getLaunchAccess(walletAddress);
  if (isExempt(walletAddress)) {
    return res.status(200).json({
      walletAddress,
      hasLaunchAccess: true,
      paymentProvider: 'exempt',
    });
  }

  return res.status(200).json(access);
}
