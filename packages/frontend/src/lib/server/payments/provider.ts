import type { PaymentProvider, PaymentProviderName } from './types';
import { MockPaymentProvider } from './mockProvider';
import { SmepayPaymentProvider } from './smepayProvider';

export function getConfiguredPaymentProviderName(): PaymentProviderName {
  const raw = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYMENT_PROVIDER must be explicitly set to "mock" or "smepay" in production.');
    }
    return 'mock';
  }
  if (raw === 'mock' || raw === 'smepay') return raw;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Unsupported PAYMENT_PROVIDER="${raw}". Use "mock" or "smepay".`);
  }
  return 'mock';
}

export function isMockPaymentProvider(): boolean {
  return getConfiguredPaymentProviderName() === 'mock';
}

export function getPaymentProvider(): PaymentProvider {
  const name = getConfiguredPaymentProviderName();
  if (name === 'smepay') return new SmepayPaymentProvider();
  return new MockPaymentProvider();
}
