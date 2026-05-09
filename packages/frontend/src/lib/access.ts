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
  /** Whether the address has paid (server-truth, useful for UI). */
  paid?: boolean;
  exempt?: boolean;
}

export interface OrderResponse {
  orderId: string;
  amountInPaise: number;
  amountInr: number;
  keyId: string;
  /** Display currency code, always "INR". */
  currency: 'INR';
}

export interface PaymentVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}
