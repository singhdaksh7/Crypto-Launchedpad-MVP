import {
  PLATFORM_ACCESS_AMOUNT_INR,
  PLATFORM_ACCESS_CURRENCY,
  type LaunchAccessRecord,
  type PaymentOrderRecord,
  type PaymentProvider,
  type VerifyPaymentInput,
} from './types';
import { getPaymentProvider } from './provider';
import { getPaymentStorage, type PaymentStorage } from './storage';

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

function normalizeWallet(address: string): string {
  const normalized = String(address || '').trim().toLowerCase();
  if (!ADDRESS_RE.test(normalized)) throw new Error('Invalid wallet address.');
  return normalized;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createLaunchAccessOrder(
  walletAddress: string,
  deps?: { provider?: PaymentProvider; storage?: PaymentStorage },
) {
  const wallet = normalizeWallet(walletAddress);
  const provider = deps?.provider || getPaymentProvider();
  const storage = deps?.storage || getPaymentStorage();
  const existingAccess = storage.getAccess(wallet);
  if (existingAccess.hasLaunchAccess) {
    throw new Error('Launch access is already approved for this wallet.');
  }

  const providerOrder = await provider.createOrder({
    walletAddress: wallet,
    amount: PLATFORM_ACCESS_AMOUNT_INR,
    currency: PLATFORM_ACCESS_CURRENCY,
  });

  const record: PaymentOrderRecord = {
    paymentProvider: providerOrder.paymentProvider,
    providerOrderId: providerOrder.providerOrderId,
    walletAddress: wallet,
    amount: providerOrder.amount,
    currency: providerOrder.currency,
    providerStatus: providerOrder.providerStatus,
    status: 'pending',
    createdAt: nowIso(),
  };
  storage.saveOrder(record);

  return providerOrder;
}

export async function verifyLaunchAccessPayment(
  input: VerifyPaymentInput,
  deps?: { provider?: PaymentProvider; storage?: PaymentStorage },
): Promise<LaunchAccessRecord> {
  const wallet = normalizeWallet(input.walletAddress);
  const provider = deps?.provider || getPaymentProvider();
  const storage = deps?.storage || getPaymentStorage();
  const order = storage.getOrder(input.providerOrderId);

  if (!order) throw new Error('Payment order not found.');
  if (order.walletAddress !== wallet) throw new Error('Payment order does not belong to this wallet.');
  if (order.consumedAt || order.status === 'successful') {
    throw new Error('Payment verification has already been consumed.');
  }

  const verified = await provider.verifyPayment({ ...input, walletAddress: wallet });
  const providerPaymentId = verified.providerPaymentId || input.providerPaymentId;
  const providerTransactionId = verified.providerTransactionId || input.providerTransactionId;

  if (verified.paymentProvider !== order.paymentProvider) {
    throw new Error('Payment provider mismatch.');
  }
  if (verified.providerOrderId !== order.providerOrderId) {
    throw new Error('Payment order mismatch.');
  }
  if (verified.amount !== PLATFORM_ACCESS_AMOUNT_INR || order.amount !== PLATFORM_ACCESS_AMOUNT_INR) {
    throw new Error('Payment amount mismatch.');
  }
  if (verified.currency !== PLATFORM_ACCESS_CURRENCY || order.currency !== PLATFORM_ACCESS_CURRENCY) {
    throw new Error('Payment currency mismatch.');
  }
  if (verified.providerStatus !== 'successful') {
    throw new Error('Payment is not successful.');
  }
  if (storage.hasConsumedProviderPayment(providerPaymentId, providerTransactionId)) {
    throw new Error('Payment has already been used.');
  }

  const paidAt = verified.paidAt || nowIso();
  const updated: PaymentOrderRecord = {
    ...order,
    providerPaymentId,
    providerTransactionId,
    providerSignature: verified.providerSignature || input.providerSignature || input.providerChecksum,
    providerStatus: verified.providerStatus,
    status: 'successful',
    paidAt,
    consumedAt: nowIso(),
  };
  storage.updateOrder(updated);
  storage.approveAccess(wallet, order.paymentProvider, paidAt);
  return storage.getAccess(wallet);
}

export function getLaunchAccess(walletAddress: string, storage = getPaymentStorage()) {
  return storage.getAccess(normalizeWallet(walletAddress));
}
