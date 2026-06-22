import type { NextApiRequest, NextApiResponse } from 'next';
import { getPaymentProvider } from '@/lib/server/payments/provider';
import { getPaymentStorageDiagnosticCode } from '@/lib/server/payments/diagnostics';
import { logDiagnosticCode, toJsonError } from '@/lib/server/logging';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean } | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(toJsonError('Method not allowed'));
  }

  try {
    const provider = getPaymentProvider();
    const rawBody = await readRawBody(req);
    const verified = await provider.handleWebhook({
      headers: req.headers,
      rawBody,
    });

    if (!verified) {
      return res.status(202).json({ ok: true });
    }

    // TODO: Once SMEPay webhook payload/checksum docs are available, map the
    // verified webhook event into the payment storage idempotently here.
    return res.status(202).json({ ok: true });
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      logDiagnosticCode('PAYMENT_WEBHOOK', getPaymentStorageDiagnosticCode(err));
    }
    return res.status(400).json(toJsonError(err?.message || 'Payment webhook rejected.'));
  }
}
