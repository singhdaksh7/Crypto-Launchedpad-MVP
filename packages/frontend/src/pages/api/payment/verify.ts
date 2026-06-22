import type { NextApiRequest, NextApiResponse } from 'next';
import { issueSession, readSession } from '@/lib/server/session';
import { isExempt, isKycVerified } from '@/lib/server/access';
import { getPaymentStorageDiagnosticCode } from '@/lib/server/payments/diagnostics';
import { verifyLaunchAccessPayment } from '@/lib/server/payments/service';
import { logDiagnosticCode, toJsonError } from '@/lib/server/logging';
import type { AccessResponse, PaymentVerifyRequest } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(toJsonError('Method not allowed'));
  }

  const session = readSession(req);
  if (!session) {
    return res.status(401).json(toJsonError('Verify your wallet first.'));
  }

  const body = req.body as PaymentVerifyRequest;
  const walletAddress = String(body?.walletAddress || '').toLowerCase();
  const providerOrderId = String(body?.providerOrderId || '');
  const providerPaymentId = body?.providerPaymentId
    ? String(body.providerPaymentId)
    : undefined;
  const providerTransactionId = body?.providerTransactionId
    ? String(body.providerTransactionId)
    : undefined;
  const providerSignature = body?.providerSignature
    ? String(body.providerSignature)
    : undefined;
  const providerChecksum = body?.providerChecksum
    ? String(body.providerChecksum)
    : undefined;

  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    return res.status(400).json(toJsonError('Invalid wallet address.'));
  }
  if (walletAddress !== session.address) {
    return res.status(403).json(toJsonError('Payment wallet does not match verified session.'));
  }
  if (!providerOrderId || (!providerPaymentId && !providerTransactionId)) {
    return res.status(400).json(toJsonError('Missing payment fields.'));
  }

  try {
    const access = await verifyLaunchAccessPayment({
      walletAddress,
      providerOrderId,
      providerPaymentId,
      providerTransactionId,
      providerSignature,
      providerChecksum,
    });

    const reissued = issueSession(res, {
      address: session.address,
      exempt: isExempt(session.address),
      paid: access.hasLaunchAccess,
      kyc: isKycVerified(session.address),
    });

    return res.status(200).json({
      unlocked: access.hasLaunchAccess || reissued.exempt,
      reason: reissued.exempt ? 'exempt' : 'paid',
      address: reissued.address,
      exempt: reissued.exempt,
      paid: access.hasLaunchAccess,
      hasLaunchAccess: access.hasLaunchAccess,
      kyc: reissued.kyc,
      paymentProvider: access.paymentProvider,
      paidAt: access.paidAt,
    });
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      logDiagnosticCode('PAYMENT_VERIFY', getPaymentStorageDiagnosticCode(err));
    }
    return res.status(400).json(toJsonError(err?.message || 'Payment verification failed.'));
  }
}
