import crypto from 'crypto';
import {
  PLATFORM_ACCESS_CURRENCY,
  type CreatePaymentOrderInput,
  type PaymentProvider,
  type ProviderOrder,
  type ProviderVerification,
  type VerifyPaymentInput,
} from './types';

function secret(): string {
  return process.env.MOCK_PAYMENT_SECRET || 'dev-only-mock-payment-secret';
}

export function createMockPaymentSignature(input: {
  providerOrderId: string;
  providerPaymentId: string;
  walletAddress: string;
  amount: number;
  currency: string;
  providerStatus: string;
}): string {
  return crypto
    .createHmac('sha256', secret())
    .update(
      [
        input.providerOrderId,
        input.providerPaymentId,
        input.walletAddress.toLowerCase(),
        String(input.amount),
        input.currency,
        input.providerStatus,
      ].join('|'),
    )
    .digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export class MockPaymentProvider implements PaymentProvider {
  getProviderName() {
    return 'mock' as const;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<ProviderOrder> {
    const providerOrderId = `mock_order_${crypto.randomUUID()}`;
    const providerPaymentId = `mock_payment_${crypto.randomUUID()}`;
    const providerStatus = 'successful' as const;
    return {
      paymentProvider: 'mock',
      providerOrderId,
      providerSessionId: providerPaymentId,
      amount: input.amount,
      currency: PLATFORM_ACCESS_CURRENCY,
      providerStatus: 'pending',
      devProviderSignature: createMockPaymentSignature({
        providerOrderId,
        providerPaymentId,
        walletAddress: input.walletAddress,
        amount: input.amount,
        currency: input.currency,
        providerStatus,
      }),
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<ProviderVerification> {
    const providerPaymentId = input.providerPaymentId || input.providerTransactionId || '';
    if (!providerPaymentId || !input.providerSignature) {
      throw new Error('Missing mock payment verification fields.');
    }

    const amount = Number(process.env.PAYMENT_AMOUNT_INR || '1000');
    const providerStatus = 'successful' as const;
    const expected = createMockPaymentSignature({
      providerOrderId: input.providerOrderId,
      providerPaymentId,
      walletAddress: input.walletAddress,
      amount,
      currency: PLATFORM_ACCESS_CURRENCY,
      providerStatus,
    });
    if (!timingSafeEqual(expected, input.providerSignature)) {
      throw new Error('Invalid payment signature.');
    }

    return {
      paymentProvider: 'mock',
      providerOrderId: input.providerOrderId,
      providerPaymentId,
      providerTransactionId: input.providerTransactionId,
      providerSignature: input.providerSignature,
      providerStatus,
      amount,
      currency: PLATFORM_ACCESS_CURRENCY,
      paidAt: new Date().toISOString(),
    };
  }

  async handleWebhook(): Promise<ProviderVerification | null> {
    return null;
  }
}
