import type {
  CreatePaymentOrderInput,
  PaymentProvider,
  ProviderOrder,
  ProviderVerification,
  VerifyPaymentInput,
} from './types';

export class SmepayPaymentProvider implements PaymentProvider {
  getProviderName() {
    return 'smepay' as const;
  }

  async createOrder(_input: CreatePaymentOrderInput): Promise<ProviderOrder> {
    throw new Error('SMEPay provider is not configured yet. Add official credentials and API docs before enabling it.');
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<ProviderVerification> {
    throw new Error('SMEPay verification is not configured yet.');
  }

  async handleWebhook(): Promise<ProviderVerification | null> {
    // TODO: Implement after SMEPay provides official webhook payload and checksum docs.
    throw new Error('SMEPay webhook verification is not configured yet.');
  }
}
