import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  clearNonce,
  clearNonceAlongsideSession,
  issueSession,
  readNonce,
} from '@/lib/server/session';
import { isExempt, isKycVerified, siweMessage } from '@/lib/server/access';
import { getLaunchAccess } from '@/lib/server/payments/service';
import {
  getPaymentStorageDiagnosticCode,
  getPaymentStorageSafeError,
} from '@/lib/server/payments/diagnostics';
import type { AccessResponse, VerifyRequest } from '@/lib/access';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as VerifyRequest;
    const address = String(body?.address || '').toLowerCase();
    const signature = String(body?.signature || '');

    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address format.' });
    }
    if (!signature.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid signature format.' });
    }

    const noncePayload = readNonce(req);
    if (!noncePayload) {
      return res.status(400).json({ error: 'Nonce missing or expired. Please click Verify again.' });
    }

    const message = siweMessage(address, noncePayload.nonce);
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature).toLowerCase();
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Verify API] verifyMessage failed:', err);
      }
      return res.status(400).json({ error: 'Could not verify signature format.' });
    }

    if (recovered !== address) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Verify API] Address mismatch: recovered=${recovered} expected=${address}`);
      }
      return res.status(401).json({ error: 'Wallet address mismatch. The signed address does not match the active wallet.' });
    }

    // Single-use nonce — burn it after successful verify.
    clearNonce(res);

    const exempt = isExempt(address);
    const kyc = isKycVerified(address);
    const launchAccess = await getLaunchAccess(address);

    const session = issueSession(res, {
      address,
      exempt,
      paid: launchAccess.hasLaunchAccess,
      kyc,
    });
    // Re-attach the nonce-clear cookie alongside the session cookie.
    clearNonceAlongsideSession(res);

    const paymentSatisfied = session.exempt || launchAccess.hasLaunchAccess;
    const unlocked = paymentSatisfied;
    return res.status(200).json({
      unlocked,
      reason: paymentSatisfied ? (session.exempt ? 'exempt' : 'paid') : undefined,
      address: session.address,
      exempt: session.exempt,
      paid: launchAccess.hasLaunchAccess,
      hasLaunchAccess: paymentSatisfied,
      kyc: session.kyc,
      paymentProvider: session.exempt ? 'exempt' : launchAccess.paymentProvider,
      paidAt: launchAccess.paidAt,
    });
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    if (process.env.NODE_ENV === 'development') {
      console.error('[Verify API] Uncaught handler exception:', err);
    }
    
    // Check if the error is database or configuration related
    const isStorageError = 
      /database_url|payment_storage|prisma|payment storage/i.test(errMsg);
      
    if (isStorageError) {
      const diagnosticCode = getPaymentStorageDiagnosticCode(err);
      console.error(`[Verify API] ${diagnosticCode}`);
      return res.status(500).json({ 
        error: 'Server payment storage is not configured. Please contact support.' 
      });
    }

    const fallbackCode = getPaymentStorageDiagnosticCode(err);
    if (process.env.NODE_ENV === 'production') {
      console.error(`[Verify API] ${fallbackCode}`);
      return res.status(500).json({ error: getPaymentStorageSafeError(fallbackCode) });
    }

    return res.status(500).json({ error: errMsg || 'Verification failed' });
  }
}
