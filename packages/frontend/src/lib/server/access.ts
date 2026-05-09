/**
 * Server-only access logic: who's exempt and what message we ask wallets to sign.
 * Never imported from client code — the exempt list is a server secret.
 */

export function getExemptAddresses(): Set<string> {
  const raw = process.env.EXEMPT_ADDRESSES || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^0x[0-9a-f]{40}$/.test(s)),
  );
}

export function isExempt(address: string): boolean {
  return getExemptAddresses().has(address.toLowerCase());
}

export function getPaymentAmountInr(): number {
  const raw = parseInt(process.env.PAYMENT_AMOUNT_INR || '1000', 10);
  if (!Number.isFinite(raw) || raw <= 0) return 1000;
  return raw;
}

/** The exact message users sign to prove wallet ownership. Embedded with a
 *  per-request nonce to stop replay across sessions. */
export function siweMessage(address: string, nonce: string): string {
  const checksum = address; // already lowercased upstream
  return [
    'Sign in to Crypto Launchpad',
    '',
    `Address: ${checksum}`,
    `Nonce: ${nonce}`,
    'Statement: Authorize this device to access Create Token.',
  ].join('\n');
}
