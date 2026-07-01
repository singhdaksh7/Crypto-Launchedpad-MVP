import React, { useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useWeb3Store } from '@/store';
import { getChainId } from '@/lib/web3';
import { networkLabel } from '@/lib/links';
import type { OrderResponse } from '@/lib/access';
import { Icon } from './ui/Icon';
import { Alert } from './ui/Alert';

interface AccessGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

type PaymentStep = 'idle' | 'pending' | 'verifying';

export const AccessGate: React.FC<AccessGateProps> = ({
  children,
  title = 'Creator launch access required',
  description = 'Verify your wallet and complete the ₹1000 platform access fee before creating tokens or presales.',
}) => {
  const { account, chainId } = useWeb3Store();
  const requiredChainId = getChainId();
  const access = useAccess();
  const [paymentOrder, setPaymentOrder] = useState<OrderResponse | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const handlerLock = useRef(false);
  const isMockConfigured = access.mockPaymentMode;

  useEffect(() => {
    if (access.unlocked) {
      setPaymentError(null);
      setPaymentOrder(null);
      setPaymentStep('idle');
    }
  }, [access.unlocked]);

  if (access.unlocked) {
    return (
      <>
        {access.bypassActive && (
          <div className="card mb-6 border-amber-500/20 bg-amber-500/[0.04]">
            <div className="flex items-start gap-3">
              <span className="h-8 w-8 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <Icon name="alert" size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-200">
                  Testnet demo mode — creator access fee is disabled
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  The ₹1000 platform access fee is bypassed for BSC Testnet.
                  This gate will be enforced on mainnet launch.
                </p>
              </div>
            </div>
          </div>
        )}
        {!access.bypassActive && (
          <div className="card mb-6 border-emerald-500/20 bg-emerald-500/[0.04]">
            <div className="flex items-start gap-3">
              <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
                <Icon name="check" size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-emerald-200">
                  {access.reason === 'exempt'
                    ? 'Creator launch access approved — payment skipped for this wallet.'
                    : 'Payment verified — creator launch access approved.'}
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
        )}
        {children}
      </>
    );
  }

  if (access.loading) {
    return (
      <div className="card text-center py-12">
        <Icon name="spinner" size={20} className="mx-auto text-gray-400" />
        <p className="text-sm text-gray-400 mt-3">Checking creator access…</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card text-center py-14">
        <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-300 mb-3">
          <Icon name="wallet" size={20} />
        </div>
        <p className="text-lg font-medium mb-1">Connect a wallet</p>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Buyers can browse and participate without this gate. Creator actions
          require wallet verification and launch access.
        </p>
      </div>
    );
  }

  if (chainId != null && chainId !== requiredChainId) {
    return (
      <div className="card max-w-xl mx-auto">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
            <Icon name="alert" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Wrong network</h2>
            <p className="text-sm text-gray-400 mt-1">
              Switch to {networkLabel(requiredChainId)} before creating tokens or
              presales. Creator payment access is checked against your verified
              wallet on the configured BSC network.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              <p className="font-medium">Verify wallet ownership</p>
              <p className="text-gray-500 text-xs">
                Free, off-chain signature. This links creator access to your wallet.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-white/5 text-gray-400 text-xs font-semibold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="font-medium">Pay the ₹1000 platform access fee</p>
              <p className="text-gray-500 text-xs">
                The backend creates and verifies the payment through the configured
                provider. Demo payment mode may be active in staging.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-white/5 text-gray-400 text-xs font-semibold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="font-medium">Create tokens and presales</p>
              <p className="text-gray-500 text-xs">
                Buyers never need this platform fee; it only gates creator actions.
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

  const createOrder = async () => {
    if (!account) return;
    setPaymentError(null);
    setPaymentStep('pending');
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account.toLowerCase() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to create payment order.');
      setPaymentOrder(body as OrderResponse);
    } catch (err: any) {
      setPaymentStep('idle');
      setPaymentError(err?.message || 'Payment order failed.');
    }
  };

  const verifyPayment = async () => {
    if (!account || !paymentOrder || handlerLock.current) return;
    handlerLock.current = true;
    setPaymentError(null);
    setPaymentStep('verifying');
    try {
      const providerPaymentId = paymentOrder.providerSessionId;
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account.toLowerCase(),
          providerOrderId: paymentOrder.providerOrderId,
          providerPaymentId,
          providerTransactionId: providerPaymentId,
          providerSignature: paymentOrder.devProviderSignature,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Payment verification failed.');
      await access.refresh();
    } catch (err: any) {
      setPaymentStep('pending');
      setPaymentError(err?.message || 'Payment failed.');
    } finally {
      handlerLock.current = false;
    }
  };

  const isMock = paymentOrder?.paymentProvider === 'mock';

  return (
    <div className="card max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
          <Icon name="check" size={14} />
        </span>
        <p className="text-sm">
          Wallet verified ·{' '}
          <span className="font-mono text-xs text-gray-400">
            {account.slice(0, 6)}…{account.slice(-4)}
          </span>
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-1">₹1000 platform access fee</h2>
      <p className="text-sm text-gray-400 mb-5">
        Creator access is approved only after the backend verifies a successful
        INR payment from the configured provider. Live money collection is not enabled when demo payment mode is active.
      </p>

      {isMockConfigured && (
        <Alert tone="warning" title="Demo payment mode" className="mb-4">
          Mock payment verification is active for staging. Keep the ₹1000 creator access fee flow for testing, but do not treat this as a live payment checkout.
        </Alert>
      )}

      <div className="bg-surface-2 border border-white/5 rounded-lg p-4 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Platform access fee</span>
          <span className="font-semibold text-lg">₹1000</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Billed once per creator wallet</span>
          <span>{paymentOrder?.paymentProvider || access.configuredPaymentProvider || 'Payment provider'}</span>
        </div>
      </div>

      {paymentOrder && (
        <Alert tone="info" className="mb-4" title="Payment pending">
          {isMock
            ? 'Demo payment mode is active. Complete the mock payment to test server-side verification without implying a live INR charge.'
            : 'Continue with the payment provider checkout, then return here for verification.'}
        </Alert>
      )}

      {paymentError && (
        <Alert tone="error" onDismiss={() => setPaymentError(null)} className="mb-4">
          {paymentError}
        </Alert>
      )}

      <div className="flex gap-2">
        {!paymentOrder ? (
          <button
            onClick={createOrder}
            disabled={paymentStep === 'pending'}
            className="btn-primary flex-1 justify-center"
          >
            {paymentStep === 'pending' ? (
              <>
                <Icon name="spinner" size={14} /> Creating payment…
              </>
            ) : (
              <>
                <Icon name="lock" size={14} />
                Start payment
              </>
            )}
          </button>
        ) : (
          <button
            onClick={verifyPayment}
            disabled={paymentStep === 'verifying'}
            className="btn-primary flex-1 justify-center"
          >
            {paymentStep === 'verifying' ? (
              <>
                <Icon name="spinner" size={14} /> Verifying payment…
              </>
            ) : (
              <>
                <Icon name="check" size={14} />
                {isMock ? 'Complete mock payment' : 'Verify payment'}
              </>
            )}
          </button>
        )}
        <button onClick={access.logout} className="btn-ghost" title="Sign out of this device">
          <Icon name="close" size={14} />
        </button>
      </div>

      {paymentOrder && (
        <button
          onClick={() => {
            setPaymentOrder(null);
            setPaymentStep('idle');
            setPaymentError(null);
          }}
          className="btn-secondary w-full justify-center mt-2"
        >
          Retry payment
        </button>
      )}

      <p className="text-[11px] text-gray-500 mt-3 text-center">
        We never trust frontend payment success alone. Launch access is granted
        only after server-side provider verification.
      </p>
    </div>
  );
};
