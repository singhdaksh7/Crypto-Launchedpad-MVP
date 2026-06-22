import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { isExempt } from '@/lib/server/access';
import { getPaymentStorageDiagnosticCode } from '@/lib/server/payments/diagnostics';
import { createLaunchAccessOrder } from '@/lib/server/payments/service';
import { logDiagnosticCode, toJsonError } from '@/lib/server/logging';
import type { OrderResponse } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(toJsonError('Method not allowed'));
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json(toJsonError('Verify your wallet first.'));
  }

  const walletAddress = String(req.body?.walletAddress || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    return res.status(400).json(toJsonError('Invalid wallet address.'));
  }
  if (walletAddress !== session.address) {
    return res.status(403).json(toJsonError('Payment wallet does not match verified session.'));
  }
  if (isExempt(session.address)) {
    return res.status(409).json(toJsonError('Access already granted for this wallet.'));
  }

  try {
    const order = await createLaunchAccessOrder(walletAddress);
    return res.status(200).json(order);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      logDiagnosticCode('PAYMENT_CREATE_ORDER', getPaymentStorageDiagnosticCode(err));
    }
    return res.status(400).json(toJsonError(err?.message || 'Failed to create payment order.'));
  }
}
