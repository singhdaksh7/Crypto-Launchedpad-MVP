import type { PaymentAccessResponse } from './access';

export async function fetchCreatorAccessStatus(walletAddress: string): Promise<PaymentAccessResponse> {
  const res = await fetch(`/api/payment/access?walletAddress=${encodeURIComponent(walletAddress)}`, {
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to check creator access.');
  }
  return body as PaymentAccessResponse;
}

export async function assertCreatorAccess(walletAddress: string): Promise<PaymentAccessResponse> {
  if (!walletAddress) throw new Error('Wallet missing.');
  const access = await fetchCreatorAccessStatus(walletAddress.toLowerCase());
  if (!access.hasLaunchAccess) {
    throw new Error('Payment required: complete the ₹1000 platform access fee before continuing.');
  }
  return access;
}
