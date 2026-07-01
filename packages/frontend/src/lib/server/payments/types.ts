export type PaymentProviderName = 'mock' | 'smepay' | 'bypass';
export type PaymentStatus = 'pending' | 'successful' | 'failed';

export const PLATFORM_ACCESS_AMOUNT_INR = 1000;
export const PLATFORM_ACCESS_CURRENCY = 'INR';

export interface CreatePaymentOrderInput {
  walletAddress: string;
  amount: number;
  currency: 'INR';
}

export interface ProviderOrder {
  paymentProvider: PaymentProviderName;
  providerOrderId: string;
  providerSessionId?: string;
  checkoutUrl?: string;
  amount: number;
  currency: 'INR';
  providerStatus: PaymentStatus;
  devProviderSignature?: string;
}

export interface VerifyPaymentInput {
  walletAddress: string;
  providerOrderId: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerSignature?: string;
  providerChecksum?: string;
}

export interface ProviderVerification {
  paymentProvider: PaymentProviderName;
  providerOrderId: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerSignature?: string;
  providerStatus: PaymentStatus;
  amount: number;
  currency: 'INR';
  paidAt?: string;
}

export interface PaymentProvider {
  getProviderName(): PaymentProviderName;
  createOrder(input: CreatePaymentOrderInput): Promise<ProviderOrder>;
  verifyPayment(input: VerifyPaymentInput): Promise<ProviderVerification>;
  handleWebhook(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
  }): Promise<ProviderVerification | null>;
}

export interface PaymentOrderRecord {
  paymentProvider: PaymentProviderName;
  providerOrderId: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerSignature?: string;
  providerStatus: PaymentStatus;
  walletAddress: string;
  amount: number;
  currency: 'INR';
  status: PaymentStatus;
  createdAt: string;
  paidAt?: string;
  consumedAt?: string;
}

export interface LaunchAccessRecord {
  walletAddress: string;
  hasLaunchAccess: boolean;
  paymentProvider?: PaymentProviderName;
  paidAt?: string;
}
