import type { LaunchAccessRecord, PaymentOrderRecord } from './types';

export interface PaymentOrderSummary {
  paymentProvider: string;
  providerOrderId: string;
  walletAddress: string;
  amount: number;
  currency: string;
  status: string;
  providerStatus: string;
  createdAt: string;
  paidAt?: string;
  consumedAt?: string;
}

export interface LaunchAccessSummary {
  walletAddress: string;
  hasLaunchAccess: boolean;
  paymentProvider?: string;
  paidAt?: string;
}

export interface PaymentStorage {
  createPaymentOrder(order: PaymentOrderRecord): void;
  getPaymentOrderByProviderOrderId(providerOrderId: string): PaymentOrderRecord | null;
  updatePaymentOrderStatus(
    providerOrderId: string,
    patch: Partial<PaymentOrderRecord>,
  ): PaymentOrderRecord;
  markPaymentConsumed(
    providerOrderId: string,
    input: {
      providerPaymentId?: string;
      providerTransactionId?: string;
      consumedAt: string;
    },
  ): PaymentOrderRecord;
  checkPaymentConsumed(providerPaymentId?: string, providerTransactionId?: string): boolean;
  approveWalletAccess(walletAddress: string, provider: string, paidAt: string): void;
  getWalletAccess(walletAddress: string): LaunchAccessRecord;
  listPaymentOrders(): PaymentOrderSummary[];
  listWalletAccessApprovals(): LaunchAccessSummary[];
  reset(): void;
}

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

export function createMemoryPaymentStorage(): PaymentStorage {
  const orders = new Map<string, PaymentOrderRecord>();
  const access = new Map<string, LaunchAccessRecord>();

  return {
    createPaymentOrder(order) {
      orders.set(order.providerOrderId, { ...order, walletAddress: normalize(order.walletAddress) });
    },
    getPaymentOrderByProviderOrderId(providerOrderId) {
      const order = orders.get(providerOrderId);
      return order ? { ...order } : null;
    },
    updatePaymentOrderStatus(providerOrderId, patch) {
      const existing = orders.get(providerOrderId);
      if (!existing) throw new Error('Payment order not found.');
      const updated = {
        ...existing,
        ...patch,
        providerOrderId,
        walletAddress: normalize(patch.walletAddress || existing.walletAddress),
      };
      orders.set(providerOrderId, updated);
      return { ...updated };
    },
    markPaymentConsumed(providerOrderId, input) {
      return this.updatePaymentOrderStatus(providerOrderId, {
        providerPaymentId: input.providerPaymentId,
        providerTransactionId: input.providerTransactionId,
        consumedAt: input.consumedAt,
      });
    },
    getWalletAccess(walletAddress) {
      const key = normalize(walletAddress);
      return (
        access.get(key) || {
          walletAddress: key,
          hasLaunchAccess: false,
        }
      );
    },
    approveWalletAccess(walletAddress, paymentProvider, paidAt) {
      const key = normalize(walletAddress);
      access.set(key, {
        walletAddress: key,
        hasLaunchAccess: true,
        paymentProvider: paymentProvider as any,
        paidAt,
      });
    },
    checkPaymentConsumed(providerPaymentId, providerTransactionId) {
      for (const order of orders.values()) {
        if (!order.consumedAt) continue;
        if (providerPaymentId && order.providerPaymentId === providerPaymentId) return true;
        if (providerTransactionId && order.providerTransactionId === providerTransactionId) return true;
      }
      return false;
    },
    listPaymentOrders() {
      return Array.from(orders.values()).map((order) => ({
        paymentProvider: order.paymentProvider,
        providerOrderId: order.providerOrderId,
        walletAddress: order.walletAddress,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        providerStatus: order.providerStatus,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        consumedAt: order.consumedAt,
      }));
    },
    listWalletAccessApprovals() {
      return Array.from(access.values()).map((record) => ({ ...record }));
    },
    reset() {
      orders.clear();
      access.clear();
    },
  };
}

export function createDatabasePaymentStorage(): PaymentStorage {
  const fail = () => {
    throw new Error(
      'Database payment storage is not configured. Set up a persistent DB adapter before using PAYMENT_STORAGE=database.',
    );
  };

  return {
    createPaymentOrder: fail,
    getPaymentOrderByProviderOrderId: fail,
    updatePaymentOrderStatus: fail,
    markPaymentConsumed: fail,
    checkPaymentConsumed: fail,
    approveWalletAccess: fail,
    getWalletAccess: fail,
    listPaymentOrders: fail,
    listWalletAccessApprovals: fail,
    reset: fail,
  };
}

const globalForPayments = globalThis as typeof globalThis & {
  __launchpadPaymentStorage?: PaymentStorage;
};

export function getPaymentStorage(): PaymentStorage {
  if (!globalForPayments.__launchpadPaymentStorage) {
    const selected = (process.env.PAYMENT_STORAGE || 'memory').trim().toLowerCase();
    if (selected === 'database') {
      globalForPayments.__launchpadPaymentStorage = createDatabasePaymentStorage();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'PAYMENT_STORAGE=memory is local-development only. Configure PAYMENT_STORAGE=database with a persistent DB adapter before production.',
        );
      }
      globalForPayments.__launchpadPaymentStorage = createMemoryPaymentStorage();
    }
  }
  return globalForPayments.__launchpadPaymentStorage;
}

export function resetPaymentStorageForTests(): void {
  delete globalForPayments.__launchpadPaymentStorage;
}
