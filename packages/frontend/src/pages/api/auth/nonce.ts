import type { NextApiRequest, NextApiResponse } from 'next';
import { issueNonce } from '@/lib/server/session';
import { siweMessage } from '@/lib/server/access';
import { logDiagnosticCode, toJsonError } from '@/lib/server/logging';
import type { NonceResponse } from '@/lib/access';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<NonceResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(toJsonError('Method not allowed'));
  }
  const address = String(req.body?.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    return res.status(400).json(toJsonError('Invalid address'));
  }
  try {
    const { nonce } = issueNonce(res);
    return res.status(200).json({
      nonce,
      message: siweMessage(address, nonce),
    });
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      logDiagnosticCode('AUTH_NONCE', 'AUTH_NONCE_ISSUE_FAILED');
    }
    return res.status(500).json(toJsonError(err?.message || 'Failed to issue nonce'));
  }
}
