/** Shared access types between server and client. */

export type AccessState =
  | { state: 'anonymous' }
  | { state: 'verified'; address: string; exempt: boolean; paid: boolean }
  | { state: 'unlocked'; address: string; reason: 'exempt' | 'paid' };

export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface VerifyRequest {
  address: string;
  signature: string;
}

export interface AccessResponse {
  unlocked: boolean;
  reason?: 'exempt' | 'paid';
  address?: string;
  /** Whether the address has launch access through the server-side payment store. */
  hasLaunchAccess?: boolean;
  /** Backwards-compatible alias for launch access. */
  paid?: boolean;
  exempt?: boolean;
  /** Whether the address is KYC-verified (server-truth). */
  kyc?: boolean;
  paymentProvider?: string;
  paidAt?: string;
}

export interface OrderResponse {
  paymentProvider: string;
  providerOrderId: string;
  providerSessionId?: string;
  checkoutUrl?: string;
  amount: number;
  currency: 'INR';
  providerStatus: 'pending' | 'successful' | 'failed';
  /** Present only for the mock/dev provider so local payment flow can be tested. */
  devProviderSignature?: string;
}

export interface PaymentVerifyRequest {
  walletAddress: string;
  providerOrderId: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerSignature?: string;
  providerChecksum?: string;
}

export interface PaymentAccessResponse {
  walletAddress: string;
  hasLaunchAccess: boolean;
  paymentProvider?: string;
  paidAt?: string;
}
