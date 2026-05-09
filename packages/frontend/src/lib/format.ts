/** Compact number formatter (1.2K, 3.4M). */
export function compactNumber(n: number, digits = 1): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) < 1000) return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  return Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(n);
}

/** BNB amount formatter — keeps small amounts readable, trims trailing zeros. */
export function formatBnb(amount: number, digits = 4): string {
  if (!isFinite(amount)) return '—';
  if (amount === 0) return '0';
  const fixed = amount.toFixed(digits);
  return fixed.replace(/\.?0+$/, '');
}

/** Friendly transaction error mapper (MetaMask / ethers errors). */
export function friendlyError(err: any): string {
  if (!err) return 'Something went wrong.';
  // User rejected
  if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
    return 'Transaction rejected in wallet.';
  }
  // Insufficient funds
  if (
    err.code === -32603 ||
    /insufficient funds/i.test(err.message || '') ||
    err.code === 'INSUFFICIENT_FUNDS'
  ) {
    return 'Insufficient funds for this transaction.';
  }
  // Contract revert reason
  if (err.reason) return capitalize(err.reason);
  // Generic shortMessage from ethers v6
  if (err.shortMessage) return capitalize(err.shortMessage);
  // Fallback
  const msg = (err.message || 'Transaction failed').split('\n')[0];
  return capitalize(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
