import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3Store } from '@/store';
import { WALLETS, type WalletId, type WalletMeta } from '@/lib/wallets';
import { isWalletConnectConfigured } from '@/lib/walletConnect';
import { Icon } from './ui/Icon';
import { Alert } from './ui/Alert';

interface WalletPickerProps {
  open: boolean;
  onClose: () => void;
  onConnect: (id: WalletId) => Promise<void> | void;
  error?: string | null;
}

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface WalletRow {
  meta: WalletMeta;
  detected: boolean;
  disabled: boolean;
  hint?: string;
  installUrl?: string;
  deeplinkUrl?: string;
}

export const WalletPicker: React.FC<WalletPickerProps> = ({
  open,
  onClose,
  onConnect,
  error,
}) => {
  const { isConnecting, lastWalletId } = useWeb3Store();
  const [busyId, setBusyId] = useState<WalletId | null>(null);
  const wcConfigured = isWalletConnectConfigured();

  // Recompute rows each open so detection re-runs (extensions can be installed
  // mid-session; SSR also returns undefined for `window` on first render).
  const rows = useMemo<WalletRow[]>(() => {
    if (!open) return [];
    const mobile = isMobile();
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return WALLETS.map((meta) => {
      if (meta.id === 'walletconnect') {
        return {
          meta,
          detected: false,
          disabled: !wcConfigured,
          hint: wcConfigured ? 'Scan with any mobile wallet' : 'Not configured',
        };
      }
      const provider = meta.detect();
      if (provider) {
        return { meta, detected: true, disabled: false };
      }
      // Not detected. On mobile, offer a deeplink to open in the wallet's
      // in-app browser. On desktop, offer the install link.
      if (mobile && meta.mobileDeeplink) {
        return {
          meta,
          detected: false,
          disabled: false,
          hint: 'Open in app',
          deeplinkUrl: meta.mobileDeeplink(currentUrl),
        };
      }
      return {
        meta,
        detected: false,
        disabled: true,
        hint: 'Not detected',
        installUrl: meta.installUrl,
      };
    });
  }, [open, wcConfigured]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const handleClick = async (row: WalletRow) => {
    if (row.disabled) return;
    if (row.deeplinkUrl) {
      window.location.href = row.deeplinkUrl;
      return;
    }
    setBusyId(row.meta.id);
    try {
      await onConnect(row.meta.id);
    } finally {
      setBusyId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Connect a wallet"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative min-h-full flex items-start sm:items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-sm bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h2 className="text-base font-semibold">Connect a wallet</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose how you want to sign in
              </p>
            </div>
            <button
              onClick={onClose}
              className="opacity-60 hover:opacity-100"
              aria-label="Close"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {error && (
            <div className="px-4 pt-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <ul className="p-2">
            {rows.map((row) => {
              const busy = busyId === row.meta.id || (isConnecting && busyId === row.meta.id);
              return (
                <li key={row.meta.id}>
                  <button
                    onClick={() => handleClick(row)}
                    disabled={row.disabled || busy}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
                      row.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-white/5 active:bg-white/10'
                    }`}
                  >
                    <span className="h-10 w-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      {row.meta.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium">
                        {row.meta.label}
                        {lastWalletId === row.meta.id && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-400">
                            last used
                          </span>
                        )}
                      </span>
                      {row.hint && (
                        <span className="block text-xs text-gray-500 mt-0.5">{row.hint}</span>
                      )}
                    </span>
                    {busy ? (
                      <Icon name="spinner" size={14} />
                    ) : row.installUrl ? (
                      <a
                        href={row.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-sky-300 hover:text-sky-200 inline-flex items-center gap-1"
                      >
                        Install <Icon name="external" size={12} />
                      </a>
                    ) : row.detected ? (
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">
                        Detected
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="px-5 py-3 border-t border-white/5 text-[11px] text-gray-500">
            By connecting, you agree to sign messages from this site. We never see your
            private keys.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
