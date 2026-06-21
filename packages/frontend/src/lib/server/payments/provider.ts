import type { PaymentProvider, PaymentProviderName } from './types';
import { MockPaymentProvider } from './mockProvider';
import { SmepayPaymentProvider } from './smepayProvider';

export function getConfiguredPaymentProviderName(): PaymentProviderName {
  const raw = (process.env.PAYMENT_PROVIDER || 'mock').trim().toLowerCase();
  return raw === 'smepay' ? 'smepay' : 'mock';
}

export function getPaymentProvider(): PaymentProvider {
  const name = getConfiguredPaymentProviderName();
  if (name === 'smepay') return new SmepayPaymentProvider();
  return new MockPaymentProvider();
}
