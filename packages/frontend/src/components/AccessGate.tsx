import React, { useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useWeb3Store } from '@/store';
import { Icon } from './ui/Icon';
import { Alert } from './ui/Alert';

interface AccessGateProps {
  children: React.ReactNode;
  /** Title shown on the gate ("To create a token..."). Optional copy override. */
  title?: string;
  description?: string;
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export const AccessGate: React.FC<AccessGateProps> = ({
  children,
  title = 'Unlock Create Token',
  description = 'Verify your wallet, then either bypass payment if your address is exempt or complete a one-time ₹1000 payment.',
}) => {
  const { account } = useWeb3Store();
  const access = useAccess();

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const handlerLock = useRef(false);

  // Reset payment-error state when access changes.
  useEffect(() => {
    if (access.unlocked) setPayError(null);
  }, [access.unlocked]);

  /* ── Already unlocked ────────────────────────────── */
  if (access.unlocked) {
    return (
      <>
        <div className="card mb-6 border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="flex items-start gap-3">
            <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
              <Icon name="check" size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-emerald-200">
                {access.reason === 'exempt'
                  ? 'Exempt wallet — payment not required.'
                  : 'Payment complete — Create Token unlocked.'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 break-all font-mono">
                {access.serverAddress}
              </p>
            </div>
            <button
              onClick={access.logout}
              className="btn-ghost text-xs"
              title="Sign out of this device"
            >
              <Icon name="close" size={14} />
              Sign out
            </button>
          </div>
        </div>
        {children}
      </>
    );
  }

  /* ── Loading ─────────────────────────────────────── */
  if (access.loading) {
    return (
      <div className="card text-center py-12">
        <Icon name="spinner" size={20} className="mx-auto text-gray-400" />
        <p className="text-sm text-gray-400 mt-3">Checking access…</p>
      </div>
    );
  }

  /* ── No wallet connected ─────────────────────────── */
  if (!account) {
    return (
      <div className="card text-center py-14">
        <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-300 mb-3">
          <Icon name="wallet" size={20} />
        </div>
        <p className="text-lg font-medium mb-1">Connect a wallet</p>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          You’ll verify wallet ownership before creating a token. No tokens are
          moved during this step.
        </p>
      </div>
    );
  }

  /* ── Need wallet sign-in (SIWE) ──────────────────── */
  if (!access.walletMatchesSession) {
    return (
      <div className="card max-w-xl mx-auto">
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-5">{description}</p>

        <ol className="space-y-3 mb-5 text-sm">
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-primary-500/15 text-primary-300 text-xs font-semibold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="font-medium">Sign a verification message</p>
              <p className="text-gray-500 text-xs">
                Free, off-chain. Proves your wallet ownership to our server.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-white/5 text-gray-400 text-xs font-semibold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="font-medium">Pay ₹1000 — or skip if exempt</p>
              <p className="text-gray-500 text-xs">
                Server checks the exempt list automatically after step 1.
              </p>
            </div>
          </li>
        </ol>

        {access.error && (
          <Alert tone="error" className="mb-4">
            {access.error}
          </Alert>
        )}

        <button
          onClick={access.verify}
          disabled={access.verifying}
          className="w-full btn-primary"
        >
          {access.verifying ? (
            <>
              <Icon name="spinner" size={14} /> Waiting for signature…
            </>
          ) : (
            <>
              <Icon name="shield" size={14} />
              Verify wallet
            </>
          )}
        </button>
      </div>
    );
  }

  /* ── Wallet verified, payment required ───────────── */
  const handlePay = async () => {
    if (paying || handlerLock.current) return;
    handlerLock.current = true;
    setPayError(null);
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Couldn't load the payment SDK. Check your network.");

      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        credentials: 'include',
      });
      if (!orderRes.ok) {
        const j = await orderRes.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create payment order');
      }
      const order = (await orderRes.json()) as {
        orderId: string;
        amountInPaise: number;
        amountInr: number;
        keyId: string;
      };

      // Open Razorpay modal. Resolve when checkout completes (success or fail).
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amountInPaise,
          currency: 'INR',
          name: 'Crypto Launchpad',
          description: 'Create-Token access (one-time)',
          order_id: order.orderId,
          prefill: {},
          theme: { color: '#6366f1' },
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) {
                const j = await verifyRes.json().catch(() => ({}));
                throw new Error(j.error || 'Payment verification failed');
              }
              await access.refresh();
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });
        rzp.on?.('payment.failed', (resp: any) => {
          reject(new Error(resp?.error?.description || 'Payment failed'));
        });
        rzp.open();
      });
    } catch (err: any) {
      setPayError(err?.message || 'Payment failed');
    } finally {
      setPaying(false);
      handlerLock.current = false;
    }
  };

  return (
    <div className="card max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
          <Icon name="check" size={14} />
        </span>
        <p className="text-sm">
          Wallet verified ·{' '}
          <span className="font-mono text-xs text-gray-400">{account?.slice(0, 6)}…{account?.slice(-4)}</span>
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-1">One-time ₹1000 to unlock</h2>
      <p className="text-sm text-gray-400 mb-5">
        Pays for ongoing gas, RPC, and protocol fees. Charged once per wallet.
        Refundable within 24 hours if you change your mind.
      </p>

      <div className="bg-surface-2 border border-white/5 rounded-lg p-4 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Access fee</span>
          <span className="font-semibold text-lg">₹1000</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Billed once per wallet</span>
          <span>via Razorpay</span>
        </div>
      </div>

      {payError && (
        <Alert tone="error" onDismiss={() => setPayError(null)} className="mb-4">
          {payError}
        </Alert>
      )}

      <div className="flex gap-2">
        <button
          onClick={handlePay}
          disabled={paying}
          className="btn-primary flex-1 justify-center"
        >
          {paying ? (
            <>
              <Icon name="spinner" size={14} /> Opening checkout…
            </>
          ) : (
            <>
              <Icon name="lock" size={14} />
              Pay ₹1000 to continue
            </>
          )}
        </button>
        <button onClick={access.logout} className="btn-ghost" title="Sign out of this device">
          <Icon name="close" size={14} />
        </button>
      </div>

      <p className="text-[11px] text-gray-500 mt-3 text-center">
        Payments are processed securely by Razorpay. We never see your card details.
      </p>
    </div>
  );
};
