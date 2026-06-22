import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collectPaymentStorageDiagnostics,
  type PaymentStorageDiagnostics,
} from '@/lib/server/payments/diagnostics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentStorageDiagnostics | { error: string }>,
) {
  if (process.env.DEBUG_PAYMENT_STORAGE !== 'true') {
    return res.status(404).json({ error: 'Not enabled' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const diagnostics = await collectPaymentStorageDiagnostics();
    return res.status(200).json(diagnostics);
  } catch {
    return res.status(200).json({
      paymentStorage: (process.env.PAYMENT_STORAGE || '').trim().toLowerCase() || 'missing',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      databaseHostType: process.env.DATABASE_URL ? 'other' : 'missing',
      hasMockPaymentSecret: Boolean(process.env.MOCK_PAYMENT_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      prismaClientLoad: 'failed',
      dbConnection: 'failed',
      tables: {
        paymentOrder: 'failed',
        walletAccess: 'failed',
        consumedPayment: 'failed',
      },
      safeError: 'Diagnostics failed to run.',
    });
  }
}
