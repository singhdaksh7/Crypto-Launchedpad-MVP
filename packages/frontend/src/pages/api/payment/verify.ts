import type { NextApiRequest, NextApiResponse } from 'next';
import { issueSession, readSession } from '@/lib/server/session';
import { isExempt, isKycVerified } from '@/lib/server/access';
import { getRazorpayConfig, verifyPaymentSignature } from '@/lib/server/razorpay';
import type { AccessResponse, PaymentVerifyRequest } from '@/lib/access';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Verify your wallet first.' });
  }

  const cfg = getRazorpayConfig();
  if (!cfg) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }

  const body = req.body as PaymentVerifyRequest;
  const orderId = String(body?.orderId || '');
  const paymentId = String(body?.paymentId || '');
  const signature = String(body?.signature || '');

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'Missing payment fields.' });
  }

  const ok = verifyPaymentSignature(cfg, orderId, paymentId, signature);
  if (!ok) {
    return res.status(400).json({ error: 'Invalid payment signature.' });
  }

  // Mark this address as paid. Reissue the cookie so subsequent requests pass.
  const reissued = issueSession(res, {
    address: session.address,
    exempt: isExempt(session.address),
    paid: true,
    kyc: isKycVerified(session.address),
  });

  // Payment is now satisfied, but the gate also requires KYC.
  const unlocked = reissued.kyc;
  return res.status(200).json({
    unlocked,
    reason: reissued.exempt ? 'exempt' : 'paid',
    address: reissued.address,
    exempt: reissued.exempt,
    paid: reissued.paid,
    kyc: reissued.kyc,
  });
}
