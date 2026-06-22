import type { LaunchAccessRecord, PaymentOrderRecord } from './types';
import { getPrisma } from '../prisma';

type MaybePromise<T> = T | Promise<T>;

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
  createPaymentOrder(order: PaymentOrderRecord): MaybePromise<void>;
  getPaymentOrderByProviderOrderId(providerOrderId: string): MaybePromise<PaymentOrderRecord | null>;
  updatePaymentOrderStatus(
    providerOrderId: string,
    patch: Partial<PaymentOrderRecord>,
  ): MaybePromise<PaymentOrderRecord>;
  markPaymentConsumed(
    providerOrderId: string,
    input: {
      providerPaymentId?: string;
      providerTransactionId?: string;
      consumedAt: string;
    },
  ): MaybePromise<PaymentOrderRecord>;
  checkPaymentConsumed(providerPaymentId?: string, providerTransactionId?: string): MaybePromise<boolean>;
  approveWalletAccess(walletAddress: string, provider: string, paidAt: string, providerOrderId?: string): MaybePromise<void>;
  getWalletAccess(walletAddress: string): MaybePromise<LaunchAccessRecord>;
  listPaymentOrders(): MaybePromise<PaymentOrderSummary[]>;
  listWalletAccessApprovals(): MaybePromise<LaunchAccessSummary[]>;
  reset(): MaybePromise<void>;
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
  const db = getPrisma();
  function requireDatabaseUrl() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when PAYMENT_STORAGE=database.');
    }
  }

  function toDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  function toIso(value?: Date | null): string | undefined {
    return value ? value.toISOString() : undefined;
  }

  function consumeKey(providerPaymentId?: string, providerTransactionId?: string): string {
    if (providerPaymentId) return `payment:${providerPaymentId}`;
    if (providerTransactionId) return `transaction:${providerTransactionId}`;
    throw new Error('Cannot consume payment without provider payment or transaction id.');
  }

  function consumeKeys(providerPaymentId?: string, providerTransactionId?: string): string[] {
    const keys = [
      providerPaymentId ? `payment:${providerPaymentId}` : null,
      providerTransactionId ? `transaction:${providerTransactionId}` : null,
    ].filter(Boolean) as string[];
    if (keys.length === 0) {
      throw new Error('Cannot consume payment without provider payment or transaction id.');
    }
    return keys;
  }

  function mapOrder(order: any): PaymentOrderRecord {
    const consumedAt = order.consumedPayments?.[0]?.createdAt;
    return {
      paymentProvider: order.paymentProvider,
      providerOrderId: order.providerOrderId,
      providerPaymentId: order.providerPaymentId || undefined,
      providerTransactionId: order.providerTransactionId || undefined,
      providerStatus: order.providerStatus || 'pending',
      walletAddress: order.walletAddress,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      paidAt: toIso(order.paidAt),
      consumedAt: toIso(consumedAt),
    };
  }

  function mapAccess(access: any, walletAddress?: string): LaunchAccessRecord {
    return {
      walletAddress: access?.walletAddress || normalize(walletAddress || ''),
      hasLaunchAccess: !!access?.hasLaunchAccess,
      paymentProvider: access?.paymentProvider || undefined,
      paidAt: toIso(access?.approvedAt),
    };
  }

  function summary(order: any): PaymentOrderSummary {
    const consumedAt = order.consumedPayments?.[0]?.createdAt;
    return {
      paymentProvider: order.paymentProvider,
      providerOrderId: order.providerOrderId,
      walletAddress: order.walletAddress,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      providerStatus: order.providerStatus || 'pending',
      createdAt: order.createdAt.toISOString(),
      paidAt: toIso(order.paidAt),
      consumedAt: toIso(consumedAt),
    };
  }

  const includeConsumed = {
    consumedPayments: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
    },
  };

  return {
    async createPaymentOrder(order) {
      requireDatabaseUrl();
      await db.paymentOrder.upsert({
        where: { providerOrderId: order.providerOrderId },
        create: {
          paymentProvider: order.paymentProvider,
          providerOrderId: order.providerOrderId,
          providerPaymentId: order.providerPaymentId,
          providerTransactionId: order.providerTransactionId,
          walletAddress: normalize(order.walletAddress),
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          providerStatus: order.providerStatus,
          createdAt: toDate(order.createdAt),
          paidAt: toDate(order.paidAt),
        },
        update: {},
      });
    },
    async getPaymentOrderByProviderOrderId(providerOrderId) {
      requireDatabaseUrl();
      const order = await db.paymentOrder.findUnique({
        where: { providerOrderId },
        include: includeConsumed,
      });
      return order ? mapOrder(order) : null;
    },
    async updatePaymentOrderStatus(providerOrderId, patch) {
      requireDatabaseUrl();
      const order = await db.paymentOrder.update({
        where: { providerOrderId },
        data: {
          providerPaymentId: patch.providerPaymentId,
          providerTransactionId: patch.providerTransactionId,
          walletAddress: patch.walletAddress ? normalize(patch.walletAddress) : undefined,
          amount: patch.amount,
          currency: patch.currency,
          status: patch.status,
          providerStatus: patch.providerStatus,
          paidAt: toDate(patch.paidAt),
        },
        include: includeConsumed,
      });
      return mapOrder(order);
    },
    async markPaymentConsumed(providerOrderId, input) {
      requireDatabaseUrl();
      const order = await db.paymentOrder.findUnique({
        where: { providerOrderId },
      });
      if (!order) throw new Error('Payment order not found.');

      const consumedPayments = consumeKeys(input.providerPaymentId, input.providerTransactionId).map((key) =>
        db.consumedPayment.upsert({
          where: { consumeKey: key },
          create: {
            paymentProvider: order.paymentProvider,
            providerPaymentId: input.providerPaymentId,
            providerTransactionId: input.providerTransactionId,
            consumeKey: key,
            providerOrderId,
            walletAddress: order.walletAddress,
            createdAt: toDate(input.consumedAt),
          },
          update: {},
        }),
      );
      await db.$transaction(consumedPayments);

      const updated = await db.paymentOrder.update({
        where: { providerOrderId },
        data: {
          providerPaymentId: input.providerPaymentId,
          providerTransactionId: input.providerTransactionId,
        },
        include: includeConsumed,
      });
      return mapOrder(updated);
    },
    async checkPaymentConsumed(providerPaymentId, providerTransactionId) {
      requireDatabaseUrl();
      if (!providerPaymentId && !providerTransactionId) return false;
      const keys = consumeKeys(providerPaymentId, providerTransactionId);
      const count = await db.consumedPayment.count({
        where: { consumeKey: { in: keys } },
      });
      return count > 0;
    },
    async approveWalletAccess(walletAddress, paymentProvider, paidAt, providerOrderId) {
      requireDatabaseUrl();
      const wallet = normalize(walletAddress);
      await db.walletAccess.upsert({
        where: { walletAddress: wallet },
        create: {
          walletAddress: wallet,
          hasLaunchAccess: true,
          paymentProvider,
          providerOrderId,
          approvedAt: toDate(paidAt),
        },
        update: {
          hasLaunchAccess: true,
          paymentProvider,
          providerOrderId,
          approvedAt: toDate(paidAt),
        },
      });
    },
    async getWalletAccess(walletAddress) {
      requireDatabaseUrl();
      const wallet = normalize(walletAddress);
      const access = await db.walletAccess.findUnique({
        where: { walletAddress: wallet },
      });
      return mapAccess(access, wallet);
    },
    async listPaymentOrders() {
      requireDatabaseUrl();
      const orders = await db.paymentOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: includeConsumed,
      });
      return orders.map(summary);
    },
    async listWalletAccessApprovals() {
      requireDatabaseUrl();
      const approvals = await db.walletAccess.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
      return approvals.map((record) => ({
        walletAddress: record.walletAddress,
        hasLaunchAccess: record.hasLaunchAccess,
        paymentProvider: record.paymentProvider || undefined,
        paidAt: toIso(record.approvedAt),
      }));
    },
    async reset() {
      requireDatabaseUrl();
      await db.$transaction([
        db.consumedPayment.deleteMany(),
        db.walletAccess.deleteMany(),
        db.paymentOrder.deleteMany(),
      ]);
    },
  };
}

const globalForPayments = globalThis as typeof globalThis & {
  __launchpadPaymentStorage?: PaymentStorage;
};

export function getPaymentStorage(): PaymentStorage {
  if (!globalForPayments.__launchpadPaymentStorage) {
    const selected = (process.env.PAYMENT_STORAGE || '').trim().toLowerCase();
    if (process.env.NODE_ENV === 'production' && selected !== 'database') {
      throw new Error(
        'PAYMENT_STORAGE=database is required in production. Configure DATABASE_URL and persistent payment storage.',
      );
    }
    if (selected === 'database') {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when PAYMENT_STORAGE=database.');
      }
      globalForPayments.__launchpadPaymentStorage = createDatabasePaymentStorage();
    } else if (!selected || selected === 'memory') {
      globalForPayments.__launchpadPaymentStorage = createMemoryPaymentStorage();
    } else {
      throw new Error(
        `Unsupported PAYMENT_STORAGE="${selected}". Use "memory" locally or "database" with DATABASE_URL.`,
      );
    }
  }
  return globalForPayments.__launchpadPaymentStorage;
}

export function resetPaymentStorageForTests(): void {
  delete globalForPayments.__launchpadPaymentStorage;
}
