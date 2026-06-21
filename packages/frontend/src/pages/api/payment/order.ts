import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ error: string }>,
) {
  res.setHeader('Allow', 'POST');
  return res.status(410).json({
    error: 'This payment endpoint was replaced. Use POST /api/payment/create-order.',
  });
}
