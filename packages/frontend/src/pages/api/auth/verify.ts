import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  clearNonce,
  clearNonceAlongsideSession,
  issueSession,
  readNonce,
} from '@/lib/server/session';
import { isExempt, siweMessage } from '@/lib/server/access';
import type { AccessResponse, VerifyRequest } from '@/lib/access';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as VerifyRequest;
  const address = String(body?.address || '').toLowerCase();
  const signature = String(body?.signature || '');

  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  if (!signature.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const noncePayload = readNonce(req);
  if (!noncePayload) {
    return res.status(400).json({ error: 'Nonce missing or expired. Try again.' });
  }

  const message = siweMessage(address, noncePayload.nonce);
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature).toLowerCase();
  } catch {
    return res.status(400).json({ error: 'Could not verify signature' });
  }
  if (recovered !== address) {
    return res.status(401).json({ error: 'Signature does not match address' });
  }

  // Single-use nonce — burn it after successful verify.
  clearNonce(res);

  const exempt = isExempt(address);
  try {
    const session = issueSession(res, { address, exempt, paid: false });
    // Re-attach the nonce-clear cookie alongside the session cookie.
    clearNonceAlongsideSession(res);

    return res.status(200).json({
      unlocked: session.exempt,
      reason: session.exempt ? 'exempt' : undefined,
      address: session.address,
      exempt: session.exempt,
      paid: session.paid,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to issue session' });
  }
}
