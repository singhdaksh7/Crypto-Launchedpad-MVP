import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import type { AccessResponse } from '@/lib/access';
import { useWeb3Store } from '@/store';

export type AccessReason = 'exempt' | 'paid';

interface UseAccessState {
  loading: boolean;
  unlocked: boolean;
  reason?: AccessReason;
  /** Address last seen by the server for this session, lowercase. */
  serverAddress?: string;
  configuredPaymentProvider?: string;
  exempt: boolean;
  paid: boolean;
  hasLaunchAccess: boolean;
  kyc: boolean;
  paymentProvider?: string;
  paidAt?: string;
  /** True when the server has bypassed the creator access gate for testnet. */
  bypassActive: boolean;
  error: string | null;
}

const INITIAL: UseAccessState = {
  loading: true,
  unlocked: false,
  exempt: false,
  paid: false,
  hasLaunchAccess: false,
  kyc: false,
  bypassActive: false,
  error: null,
};

export function useAccess() {
  const { account, signer, rawProvider } = useWeb3Store();
  const [state, setState] = useState<UseAccessState>(INITIAL);
  const [verifying, setVerifying] = useState(false);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/access', { credentials: 'include' });
      const data = (await res.json()) as AccessResponse;
      setState({
        loading: false,
        unlocked: !!data.unlocked,
        reason: data.reason,
        serverAddress: data.address,
        configuredPaymentProvider: data.configuredPaymentProvider,
        exempt: !!data.exempt,
        paid: !!data.paid,
        hasLaunchAccess: !!data.hasLaunchAccess,
        kyc: !!data.kyc,
        paymentProvider: data.paymentProvider,
        paidAt: data.paidAt,
        bypassActive: !!data.bypassActive,
        error: null,
      });
    } catch (err: any) {
      setState({
        ...INITIAL,
        loading: false,
        error: err?.message || 'Failed to check access',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // If the connected wallet doesn't match the server's session, drop the
  // server session so we can't accidentally show "exempt" to the wrong wallet.
  useEffect(() => {
    if (!account) return;
    if (state.serverAddress && state.serverAddress !== account.toLowerCase()) {
      // Logout silently and refresh.
      void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(refresh);
    }
  }, [account, state.serverAddress, refresh]);

  const verify = useCallback(async () => {
    if (!signer || !account) return;
    setVerifying(true);
    setState((s) => ({ ...s, error: null }));
    try {
      // 1. Ask the server for a fresh nonce + the message to sign.
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address: account.toLowerCase() }),
      });
      if (!nonceRes.ok) {
        const j = await nonceRes.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to get nonce');
      }
      const { message } = (await nonceRes.json()) as { message: string };

      // 2. Wallet signs the message — proves ownership of the address.
      let signature: string;
      if (rawProvider && typeof rawProvider.request === 'function') {
        const hexMessage = ethers.hexlify(ethers.toUtf8Bytes(message));
        signature = await rawProvider.request({
          method: 'personal_sign',
          params: [hexMessage, account.toLowerCase()],
        });
      } else if (signer) {
        signature = await signer.signMessage(message);
      } else {
        throw new Error('No wallet provider available.');
      }

      // 3. Server verifies and issues the session cookie.
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address: account.toLowerCase(), signature }),
      });
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}));
        throw new Error(j.error || 'Server verification failed. Please try again or contact support.');
      }
      await refresh();
    } catch (err: any) {
      setState((s) => ({
        ...s,
        error: err?.shortMessage || err?.message || 'Verification failed',
      }));
    } finally {
      setVerifying(false);
    }
  }, [signer, account, rawProvider, refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await refresh();
  }, [refresh]);

  return {
    ...state,
    verifying,
    verify,
    logout,
    refresh,
    /** Convenience: true once we know the server's answer. */
    ready: !state.loading,
    /** Convenience: connected wallet matches the server's verified address. */
    walletMatchesSession:
      !!account &&
      !!state.serverAddress &&
      state.serverAddress === account.toLowerCase(),
    mockPaymentMode: state.configuredPaymentProvider === 'mock',
  };
}
