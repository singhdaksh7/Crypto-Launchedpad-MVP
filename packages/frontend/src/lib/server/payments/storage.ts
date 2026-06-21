import type { LaunchAccessRecord, PaymentOrderRecord } from './types';

export interface PaymentStorage {
  saveOrder(order: PaymentOrderRecord): void;
  getOrder(providerOrderId: string): PaymentOrderRecord | null;
  updateOrder(order: PaymentOrderRecord): void;
  getAccess(walletAddress: string): LaunchAccessRecord;
  approveAccess(walletAddress: string, provider: string, paidAt: string): void;
  hasConsumedProviderPayment(providerPaymentId?: string, providerTransactionId?: string): boolean;
  reset(): void;
}

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

export function createMemoryPaymentStorage(): PaymentStorage {
  const orders = new Map<string, PaymentOrderRecord>();
  const access = new Map<string, LaunchAccessRecord>();

  return {
    saveOrder(order) {
      orders.set(order.providerOrderId, { ...order, walletAddress: normalize(order.walletAddress) });
    },
    getOrder(providerOrderId) {
      const order = orders.get(providerOrderId);
      return order ? { ...order } : null;
    },
    updateOrder(order) {
      orders.set(order.providerOrderId, { ...order, walletAddress: normalize(order.walletAddress) });
    },
    getAccess(walletAddress) {
      const key = normalize(walletAddress);
      return (
        access.get(key) || {
          walletAddress: key,
          hasLaunchAccess: false,
        }
      );
    },
    approveAccess(walletAddress, paymentProvider, paidAt) {
      const key = normalize(walletAddress);
      access.set(key, {
        walletAddress: key,
        hasLaunchAccess: true,
        paymentProvider: paymentProvider as any,
        paidAt,
      });
    },
    hasConsumedProviderPayment(providerPaymentId, providerTransactionId) {
      for (const order of orders.values()) {
        if (!order.consumedAt) continue;
        if (providerPaymentId && order.providerPaymentId === providerPaymentId) return true;
        if (providerTransactionId && order.providerTransactionId === providerTransactionId) return true;
      }
      return false;
    },
    reset() {
      orders.clear();
      access.clear();
    },
  };
}

const globalForPayments = globalThis as typeof globalThis & {
  __launchpadPaymentStorage?: PaymentStorage;
};

export function getPaymentStorage(): PaymentStorage {
  if (!globalForPayments.__launchpadPaymentStorage) {
    globalForPayments.__launchpadPaymentStorage = createMemoryPaymentStorage();
  }
  return globalForPayments.__launchpadPaymentStorage;
}
