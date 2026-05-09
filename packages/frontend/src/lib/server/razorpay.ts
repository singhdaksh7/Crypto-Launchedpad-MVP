import crypto from 'crypto';

/**
 * Minimal Razorpay integration. We use the REST API directly via fetch and
 * verify checkout signatures with HMAC-SHA256 — no SDK dependency required.
 * Docs: https://razorpay.com/docs/api/orders/ and /payments/
 */

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

interface CreateOrderArgs {
  amountInPaise: number;
  /** A short opaque reference returned by Razorpay alongside the order. */
  receipt: string;
  notes?: Record<string, string>;
}

export async function createOrder(
  cfg: RazorpayConfig,
  args: CreateOrderArgs,
): Promise<{ id: string; amount: number; currency: 'INR' }> {
  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: args.amountInPaise,
      currency: 'INR',
      receipt: args.receipt,
      notes: args.notes,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Razorpay order creation failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string; amount: number; currency: 'INR' };
  return data;
}

/**
 * Verify the signature returned by Razorpay's checkout success callback.
 * Razorpay computes: HMAC_SHA256(orderId + "|" + paymentId, keySecret).
 */
export function verifyPaymentSignature(
  cfg: RazorpayConfig,
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', cfg.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signature, 'utf8'),
  );
}
