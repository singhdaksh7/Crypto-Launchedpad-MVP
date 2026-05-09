import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '@/lib/server/session';
import { getPaymentAmountInr, isExempt } from '@/lib/server/access';
import { createOrder, getRazorpayConfig } from '@/lib/server/razorpay';
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
  if (isExempt(session.address) || session.paid) {
    return res.status(409).json({ error: 'Access already granted.' });
  }

  const cfg = getRazorpayConfig();
  if (!cfg) {
    return res.status(503).json({
      error:
        'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
    });
  }

  const amountInr = getPaymentAmountInr();
  const amountInPaise = amountInr * 100;

  try {
    const order = await createOrder(cfg, {
      amountInPaise,
      receipt: `lp_${session.address.slice(2, 10)}_${Date.now()}`.slice(0, 40),
      notes: { address: session.address },
    });
    return res.status(200).json({
      orderId: order.id,
      amountInPaise,
      amountInr,
      keyId: cfg.keyId,
      currency: 'INR',
    });
  } catch (err: any) {
    return res.status(502).json({
      error: err?.message || 'Failed to create payment order',
    });
  }
}
