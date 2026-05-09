import React, { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { usePresaleFunding } from '@/hooks/usePresaleFunding';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses } from '@/lib/web3';
import { compactNumber, formatBnb, friendlyError } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from './ui/Icon';
import { Alert } from './ui/Alert';
import { FundingBadge } from './ui/FundingBadge';

interface FundingPanelProps {
  presaleId: number;
  tokenAddress: string;
  tokenSymbol?: string;
  /** When true, renders the full deposit/approval form. When false, only the read-only stats. */
  isOwner: boolean;
  /** Called after a successful approval or deposit so parents can refresh. */
  onChange?: () => void;
  className?: string;
}

function fmtTokens(amount: bigint, digits = 2): string {
  if (amount === 0n) return '0';
  const asNumber = Number(ethers.formatEther(amount));
  return compactNumber(asNumber, digits);
}

export const FundingPanel: React.FC<FundingPanelProps> = ({
  presaleId,
  tokenAddress,
  tokenSymbol,
  isOwner,
  onChange,
  className = '',
}) => {
  const { signer, account } = useWeb3Store();
  const funding = usePresaleFunding(presaleId, tokenAddress);

  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<'idle' | 'approving' | 'depositing'>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<{ msg: string; hash?: string } | null>(null);

  const amountWei: bigint | null = useMemo(() => {
    if (!amount) return null;
    try {
      return ethers.parseEther(amount);
    } catch {
      return null;
    }
  }, [amount]);

  const needsApproval =
    isOwner && amountWei !== null && amountWei > 0n && amountWei > funding.allowance;

  const exceedsBalance =
    isOwner && amountWei !== null && amountWei > 0n && amountWei > funding.balance;

  const exceedsRemaining =
    amountWei !== null && amountWei > 0n && amountWei > funding.remaining;

  const fillRemaining = () => {
    if (funding.remaining === 0n) return;
    const cap = funding.remaining < funding.balance ? funding.remaining : funding.balance;
    setAmount(ethers.formatEther(cap));
  };

  const refreshAll = async () => {
    await funding.refresh();
    onChange?.();
  };

  const handleApprove = async () => {
    if (!signer || amountWei === null || amountWei <= 0n) return;
    try {
      setBusy('approving');
      setTxError(null);
      setTxSuccess(null);
      const { launchpad } = getContractAddresses();
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const tx = await token.approve(launchpad, amountWei);
      const receipt = await tx.wait();
      setTxSuccess({
        msg: `Approved ${tokenSymbol || 'tokens'} for deposit.`,
        hash: receipt?.hash || tx.hash,
      });
      await refreshAll();
    } catch (err: any) {
      setTxError(friendlyError(err));
    } finally {
      setBusy('idle');
    }
  };

  const handleDeposit = async () => {
    if (!signer || amountWei === null || amountWei <= 0n) return;
    try {
      setBusy('depositing');
      setTxError(null);
      setTxSuccess(null);
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);
      const tx = await contract.fundPresale(presaleId, amountWei);
      const receipt = await tx.wait();
      setTxSuccess({
        msg: `Deposited ${tokenSymbol || 'tokens'} into the presale.`,
        hash: receipt?.hash || tx.hash,
      });
      setAmount('');
      await refreshAll();
    } catch (err: any) {
      setTxError(friendlyError(err));
    } finally {
      setBusy('idle');
    }
  };

  const pct =
    funding.required === 0n
      ? 0
      : Math.min(
          Number((funding.funded * 10000n) / funding.required) / 100,
          100,
        );

  const symbolLabel = tokenSymbol || 'tokens';

  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-base">Token funding</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isOwner
              ? 'Deposit tokens so buyers can claim after the sale.'
              : 'Tokens deposited by the owner so buyers can claim after the sale.'}
          </p>
        </div>
        <FundingBadge status={funding.status} loading={funding.loading} />
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{pct.toFixed(1)}% funded</span>
          <span className="text-gray-300 tabular-nums">
            {fmtTokens(funding.funded)} / {fmtTokens(funding.required)} {symbolLabel}
          </span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background:
                funding.status === 'funded'
                  ? 'linear-gradient(90deg, #10b981, #22c55e)'
                  : funding.status === 'partial'
                    ? 'linear-gradient(90deg, #f59e0b, #fb923c)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface-2 border border-white/5 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Required</p>
          <p className="text-sm font-medium tabular-nums">
            {fmtTokens(funding.required)}
          </p>
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Funded</p>
          <p className="text-sm font-medium tabular-nums text-emerald-300">
            {fmtTokens(funding.funded)}
          </p>
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Remaining</p>
          <p className="text-sm font-medium tabular-nums">
            {fmtTokens(funding.remaining)}
          </p>
        </div>
      </div>

      {/* Public-side warnings */}
      {!isOwner && funding.status !== 'funded' && (
        <Alert tone={funding.status === 'unfunded' ? 'error' : 'warning'}>
          {funding.status === 'unfunded'
            ? 'This presale has not been funded yet — buys will be blocked until the owner deposits tokens.'
            : `Only ${fmtTokens(funding.funded)} of ${fmtTokens(
                funding.required,
              )} ${symbolLabel} are deposited so far.`}
        </Alert>
      )}

      {/* Owner-only: approve + deposit */}
      {isOwner && (
        <>
          {txError && (
            <Alert tone="error" onDismiss={() => setTxError(null)} className="mb-3">
              {txError}
            </Alert>
          )}
          {txSuccess && (
            <Alert
              tone="success"
              title={txSuccess.msg}
              onDismiss={() => setTxSuccess(null)}
              className="mb-3"
            >
              {txSuccess.hash && (
                <a
                  href={txUrl(txSuccess.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 text-sm inline-flex items-center gap-1 mt-1"
                >
                  View transaction <Icon name="external" size={12} />
                </a>
              )}
            </Alert>
          )}

          {funding.status === 'funded' ? (
            <Alert tone="success" title={`This presale is fully funded.`}>
              Buyers will be able to claim their {symbolLabel} after the sale ends.
            </Alert>
          ) : funding.remaining === 0n ? null : (
            <div>
              <label className="label-text text-xs">
                Amount to deposit ({symbolLabel})
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={ethers.formatEther(funding.remaining).replace(/\.?0+$/, '')}
                  step="any"
                  min="0"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={fillRemaining}
                  className="btn-secondary px-3 text-xs"
                >
                  Max
                </button>
              </div>

              <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                <span>
                  Wallet balance: {fmtTokens(funding.balance)} {symbolLabel}
                </span>
                <span>
                  Approved: {fmtTokens(funding.allowance)} {symbolLabel}
                </span>
              </div>

              {exceedsRemaining && (
                <p className="field-error">
                  Amount exceeds the remaining required ({fmtTokens(funding.remaining)}).
                </p>
              )}
              {exceedsBalance && !exceedsRemaining && (
                <p className="field-error">
                  Amount exceeds your wallet balance ({fmtTokens(funding.balance)}).
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {needsApproval ? (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={
                      !account ||
                      busy !== 'idle' ||
                      amountWei === null ||
                      amountWei <= 0n ||
                      exceedsBalance ||
                      exceedsRemaining
                    }
                    className="btn-primary flex-1 justify-center"
                  >
                    {busy === 'approving' ? (
                      <>
                        <Icon name="spinner" size={14} /> Approving…
                      </>
                    ) : (
                      <>
                        <Icon name="lock" size={14} />
                        1. Approve {symbolLabel}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={
                      !account ||
                      busy !== 'idle' ||
                      amountWei === null ||
                      amountWei <= 0n ||
                      exceedsBalance ||
                      exceedsRemaining
                    }
                    className="btn-primary flex-1 justify-center"
                  >
                    {busy === 'depositing' ? (
                      <>
                        <Icon name="spinner" size={14} /> Depositing…
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={14} />
                        2. Deposit {symbolLabel}
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-[11px] text-gray-500 mt-2">
                Funding takes two transactions: approve once for the amount you want
                to deposit, then deposit. Tokens stay locked in the contract for
                buyers to claim.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
