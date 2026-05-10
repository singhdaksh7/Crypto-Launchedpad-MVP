import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider } from '@/lib/web3';
import {
  PresaleConfig,
  formatEther,
  getPresaleStatus,
  progressPct,
  softcapReached as softcapMet,
  tokensPerBnb as bnbToTokens,
} from '@/lib/presale';
import { friendlyError, formatBnb, compactNumber } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Countdown } from '@/components/ui/Countdown';
import { Stat } from '@/components/ui/Stat';
import { AddressLink } from '@/components/ui/AddressLink';
import { Alert } from '@/components/ui/Alert';
import { FundingBadge } from '@/components/ui/FundingBadge';
import { FundingPanel } from '@/components/FundingPanel';
import { usePresaleFunding } from '@/hooks/usePresaleFunding';
import { useProtocolFee } from '@/hooks/useProtocolFee';

interface UserContribution {
  amount: bigint;
  tokenAmount: bigint;
  claimed: boolean;
}

export default function PresaleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { account, signer } = useWeb3Store();
  const { label: feeLabel } = useProtocolFee();

  // Track whether the actions panel is on screen so the mobile floating CTA
  // can hide itself when it's redundant. Uses a callback ref so it rewires
  // automatically when the panel mounts/unmounts (e.g. error / loading states).
  const [panelInView, setPanelInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const setActionsRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setPanelInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(node);
    observerRef.current = io;
  }, []);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const [presale, setPresale] = useState<PresaleConfig | null>(null);
  const [contribution, setContribution] = useState<UserContribution | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenLogo, setTokenLogo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<{ msg: string; hash?: string } | null>(null);
  const [buyAmount, setBuyAmount] = useState('');

  const presaleId = id ? Number(id) : null;
  const funding = usePresaleFunding(presaleId, presale?.tokenAddress ?? null);

  const fetchData = useCallback(async () => {
    if (presaleId === null || isNaN(presaleId)) return;
    try {
      setError(null);
      const provider = getProvider();
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);

      const d = await contract.getPresaleDetails(presaleId);
      setPresale({
        tokenAddress: d.tokenAddress,
        owner: d.owner,
        tokenPrice: d.tokenPrice,
        softcap: d.softcap,
        hardcap: d.hardcap,
        startTime: d.startTime,
        endTime: d.endTime,
        maxBuyPerUser: d.maxBuyPerUser,
        totalRaised: d.totalRaised,
        isActive: d.isActive,
        isFinalized: d.isFinalized,
      });

      try {
        const token = new ethers.Contract(d.tokenAddress, ERC20_ABI, provider);
        const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
        setTokenName(name);
        setTokenSymbol(symbol);
        // logoURI is only present on tokens deployed via the launchpad factory; older
        // tokens or third-party ERC20s won't have it, so swallow the call independently.
        try {
          const logo: string = await token.logoURI();
          setTokenLogo(logo || '');
        } catch {
          setTokenLogo('');
        }
      } catch {
        /* token may not be ERC20 metadata-compliant */
      }

      if (account) {
        const c = await contract.getUserContribution(presaleId, account);
        setContribution({
          amount: c.amount,
          tokenAmount: c.tokenAmount,
          claimed: c.claimed,
        });
      } else {
        setContribution(null);
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [presaleId, account]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Live refresh while presale is active or in claim/refund window.
  useEffect(() => {
    if (!presale) return;
    const status = getPresaleStatus(presale);
    if (status === 'finalized') return;
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [presale, fetchData]);

  const runTx = async (
    action: () => Promise<ethers.TransactionResponse>,
    successMsg: string,
  ) => {
    if (!signer || !account) {
      setTxError('Connect your wallet first.');
      return;
    }
    try {
      setTxLoading(true);
      setTxError(null);
      setTxSuccess(null);
      const tx = await action();
      const receipt = await tx.wait();
      setTxSuccess({ msg: successMsg, hash: receipt?.hash || tx.hash });
      await fetchData();
    } catch (err: any) {
      setTxError(friendlyError(err));
    } finally {
      setTxLoading(false);
    }
  };

  const handleBuy = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      const tx = await contract.buyTokens(presaleId, {
        value: ethers.parseEther(buyAmount),
      });
      setBuyAmount('');
      return tx;
    }, 'Tokens purchased successfully.');

  const handleClaim = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      return contract.claimTokens(presaleId);
    }, 'Tokens claimed.');

  const handleRefund = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      return contract.refundContribution(presaleId);
    }, 'BNB refunded.');

  const handleWithdraw = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      return contract.withdrawFunds(presaleId);
    }, 'Funds withdrawn.');

  const derived = useMemo(() => {
    if (!presale) return null;
    const status = getPresaleStatus(presale);
    const raisedBnb = parseFloat(formatEther(presale.totalRaised));
    const hardcapBnb = parseFloat(formatEther(presale.hardcap));
    const softcapBnb = parseFloat(formatEther(presale.softcap));
    const pct = progressPct(presale.totalRaised, presale.hardcap);
    const reached = softcapMet(presale);
    const isOwner = account?.toLowerCase() === presale.owner.toLowerCase();
    const tokensPerBnb = bnbToTokens(presale.tokenPrice);
    const hasContrib = !!contribution && contribution.amount > 0n;
    const alreadyClaimed = contribution?.claimed ?? false;
    const remainingCap = presale.hardcap - presale.totalRaised;
    const userRemaining = hasContrib
      ? presale.maxBuyPerUser - contribution!.amount
      : presale.maxBuyPerUser;
    const effectiveMax = userRemaining < remainingCap ? userRemaining : remainingCap;
    const effectiveMaxBnb = parseFloat(formatEther(effectiveMax > 0n ? effectiveMax : 0n));
    return {
      status,
      raisedBnb,
      hardcapBnb,
      softcapBnb,
      pct,
      reached,
      isOwner,
      tokensPerBnb,
      hasContrib,
      alreadyClaimed,
      effectiveMax,
      effectiveMaxBnb,
    };
  }, [presale, contribution, account]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-40" />
          <div className="card space-y-4">
            <div className="h-7 bg-white/5 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="h-20 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !presale || !derived) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-16">
            <div className="mx-auto h-10 w-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
              <Icon name="alert" size={18} />
            </div>
            <p className="text-lg font-medium mb-1">Couldn’t load presale</p>
            <p className="text-sm text-gray-400 mb-6">{error || 'Presale not found.'}</p>
            <Link href="/launchpads" className="btn-secondary">
              Back to Launchpads
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const {
    status,
    raisedBnb,
    hardcapBnb,
    softcapBnb,
    pct,
    reached,
    isOwner,
    tokensPerBnb,
    hasContrib,
    alreadyClaimed,
    effectiveMax,
    effectiveMaxBnb,
  } = derived;

  const buyValue = parseFloat(buyAmount || '0');
  const previewTokens = isFinite(buyValue) && buyValue > 0 ? buyValue * tokensPerBnb : 0;
  // Tokens this buy would commit, in token-wei.
  const buyTokensWei =
    presale.tokenPrice > 0n && buyValue > 0
      ? (ethers.parseEther(buyValue.toString()) * 10n ** 18n) / presale.tokenPrice
      : 0n;
  const fundedHeadroom =
    funding.funded > funding.committed ? funding.funded - funding.committed : 0n;
  const buyExceedsFunding = buyTokensWei > 0n && buyTokensWei > fundedHeadroom;
  const buyDisabled =
    txLoading ||
    !buyAmount ||
    buyValue <= 0 ||
    buyValue > effectiveMaxBnb ||
    buyExceedsFunding;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/launchpads" className="hover:text-white transition">
            Launchpads
          </Link>
          <span>/</span>
          <span className="text-gray-300">Presale #{presaleId}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* ── Left: details ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div className="flex items-start gap-3 min-w-0">
                  {tokenLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        tokenLogo.startsWith('ipfs://')
                          ? `https://ipfs.io/ipfs/${tokenLogo.slice('ipfs://'.length)}`
                          : tokenLogo
                      }
                      alt={`${tokenSymbol || 'Token'} logo`}
                      className="h-12 w-12 rounded-full object-cover bg-white/5 border border-white/10 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                      {tokenName || 'Unknown Token'}
                      {tokenSymbol && (
                        <span className="text-gray-500 text-base sm:text-lg ml-2 font-normal">
                          {tokenSymbol}
                        </span>
                      )}
                    </h1>
                    <div className="mt-1.5">
                      <AddressLink address={presale.tokenAddress} variant="token" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  <StatusBadge status={status} />
                  <FundingBadge status={funding.status} loading={funding.loading} />
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{pct.toFixed(2)}% raised</span>
                  <span className="font-medium tabular-nums">
                    {formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB
                  </span>
                </div>
                <ProgressBar raised={presale.totalRaised} hardcap={presale.hardcap} />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>
                    Softcap {formatBnb(softcapBnb)} BNB{' '}
                    {reached && (
                      <span className="text-emerald-400">· reached</span>
                    )}
                  </span>
                  <span>Hardcap {formatBnb(hardcapBnb)} BNB</span>
                </div>
              </div>

              {/* Countdown */}
              {(status === 'active' || status === 'upcoming') && (
                <div className="mt-6">
                  <Countdown
                    target={status === 'active' ? presale.endTime : presale.startTime}
                    variant="blocks"
                    label={
                      status === 'active' ? 'Sale ends in' : 'Sale starts in'
                    }
                    onComplete={fetchData}
                  />
                </div>
              )}
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat
                label="Token price"
                value={`${formatBnb(parseFloat(formatEther(presale.tokenPrice)), 8)} BNB`}
              />
              <Stat
                label="Tokens per BNB"
                value={compactNumber(tokensPerBnb, 2)}
              />
              <Stat
                label="Max per wallet"
                value={`${formatBnb(parseFloat(formatEther(presale.maxBuyPerUser)))} BNB`}
              />
              <Stat
                label="Sale window"
                value={`${Math.max(
                  1,
                  Math.round(Number(presale.endTime - presale.startTime) / 86400),
                )}d`}
                hint={`${new Date(Number(presale.startTime) * 1000).toLocaleDateString()} → ${new Date(
                  Number(presale.endTime) * 1000,
                ).toLocaleDateString()}`}
              />
            </div>

            {/* Details */}
            <div className="card">
              <h2 className="text-base font-semibold mb-4">Presale details</h2>
              <dl className="divide-y divide-white/5">
                <DetailRow
                  label="Token contract"
                  value={<AddressLink address={presale.tokenAddress} variant="token" />}
                />
                <DetailRow
                  label="Owner"
                  value={
                    <span className="inline-flex items-center gap-2 flex-wrap justify-end">
                      <AddressLink address={presale.owner} />
                      <Link
                        href={`/vesting?owner=${presale.owner}`}
                        className="text-[11px] uppercase tracking-wider text-sky-300 hover:text-sky-200 inline-flex items-center gap-1"
                        title="View this creator's vesting and liquidity locks"
                      >
                        <Icon name="lock" size={11} /> Locks
                      </Link>
                    </span>
                  }
                />
                <DetailRow
                  label="Start"
                  value={new Date(Number(presale.startTime) * 1000).toLocaleString()}
                />
                <DetailRow
                  label="End"
                  value={new Date(Number(presale.endTime) * 1000).toLocaleString()}
                />
                <DetailRow
                  label="Token price"
                  value={`${formatBnb(parseFloat(formatEther(presale.tokenPrice)), 8)} BNB / token`}
                />
                <DetailRow label="Softcap" value={`${formatBnb(softcapBnb)} BNB`} />
                <DetailRow label="Hardcap" value={`${formatBnb(hardcapBnb)} BNB`} />
                <DetailRow
                  label="Max per wallet"
                  value={`${formatBnb(parseFloat(formatEther(presale.maxBuyPerUser)))} BNB`}
                />
              </dl>
            </div>

            {/* Risk note */}
            <Alert
              tone="warning"
              title="Always do your own research"
            >
              Token sales are high-risk. Confirm the contract on the explorer, read
              the team’s communication channels, and never invest more than you can
              afford to lose. The protocol cannot move user funds — but anyone can
              create a token, including bad actors.
            </Alert>
          </div>

          {/* ── Right: actions ────────────────────────── */}
          <div
            id="actions-panel"
            ref={setActionsRef}
            className="space-y-4 lg:sticky lg:top-24 lg:self-start scroll-mt-24"
          >
            {txError && (
              <Alert tone="error" onDismiss={() => setTxError(null)}>
                {txError}
              </Alert>
            )}
            {txSuccess && (
              <Alert
                tone="success"
                onDismiss={() => setTxSuccess(null)}
                title={txSuccess.msg}
              >
                {txSuccess.hash && (
                  <a
                    href={txUrl(txSuccess.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline underline-offset-2 mt-1"
                  >
                    View transaction
                    <Icon name="external" size={12} />
                  </a>
                )}
              </Alert>
            )}

            {/* Funding panel: owner always sees the deposit form, others see the
                read-only state only when the presale isn't fully funded. */}
            {presale.tokenAddress && (isOwner || funding.status !== 'funded') && (
              <FundingPanel
                presaleId={presaleId!}
                tokenAddress={presale.tokenAddress}
                tokenSymbol={tokenSymbol}
                isOwner={isOwner}
                onChange={fetchData}
              />
            )}

            {/* Connect prompt */}
            {!account && (
              <div className="card text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-gray-300 mb-2">
                  <Icon name="wallet" size={18} />
                </div>
                <p className="font-medium">Wallet required</p>
                <p className="text-xs text-gray-400 mt-1">
                  Connect a wallet to participate in this presale.
                </p>
              </div>
            )}

            {/* Your contribution */}
            {account && hasContrib && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Your position
                </h3>
                <div className="space-y-2 text-sm">
                  <Row
                    label="Contributed"
                    value={`${formatBnb(parseFloat(formatEther(contribution!.amount)))} BNB`}
                  />
                  <Row
                    label="Tokens allocated"
                    value={`${compactNumber(parseFloat(formatEther(contribution!.tokenAmount)), 2)} ${tokenSymbol}`}
                  />
                  <Row
                    label="Status"
                    value={
                      <span
                        className={
                          alreadyClaimed
                            ? 'text-emerald-400'
                            : 'text-amber-300'
                        }
                      >
                        {alreadyClaimed ? 'Claimed' : 'Pending'}
                      </span>
                    }
                  />
                </div>
              </div>
            )}

            {/* Buy panel */}
            {status === 'active' && account && (
              <div className="card">
                <h3 className="font-semibold mb-3">Buy {tokenSymbol || 'tokens'}</h3>
                {funding.status === 'unfunded' ? (
                  <Alert tone="error">
                    This presale isn’t funded yet. Buys are blocked until the owner
                    deposits {tokenSymbol || 'tokens'}.
                  </Alert>
                ) : effectiveMaxBnb <= 0 ? (
                  <p className="text-sm text-gray-400">
                    You’ve reached your wallet limit, or the hardcap is full.
                  </p>
                ) : (
                  <>
                    <label className="label-text text-xs">Amount in BNB</label>
                    <input
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="0.0"
                      step="0.001"
                      min="0"
                      max={effectiveMaxBnb}
                      className="input-field mt-1.5"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                      <span>Max {formatBnb(effectiveMaxBnb)} BNB</span>
                      {buyValue > 0 && (
                        <span className="text-gray-300">
                          ≈ {compactNumber(previewTokens, 2)} {tokenSymbol}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                      {[0.25, 0.5, 0.75, 1].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBuyAmount((effectiveMaxBnb * p).toFixed(4))}
                          className="text-xs py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition border border-white/5"
                        >
                          {p === 1 ? 'Max' : `${p * 100}%`}
                        </button>
                      ))}
                    </div>
                    {buyExceedsFunding && (
                      <p className="field-error mt-2">
                        Not enough deposited tokens to cover this buy. Try a smaller
                        amount.
                      </p>
                    )}
                    <button
                      onClick={handleBuy}
                      disabled={buyDisabled}
                      className="w-full btn-primary mt-4"
                    >
                      {txLoading ? (
                        <>
                          <Icon name="spinner" size={14} />
                          Processing…
                        </>
                      ) : (
                        <>Buy tokens</>
                      )}
                    </button>
                    <p className="text-[11px] text-gray-500 mt-2 text-center">
                      Tokens unlock for claim after sale ends if softcap is reached.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Claim */}
            {status === 'ended' && reached && hasContrib && !alreadyClaimed && (
              <div className="card">
                <h3 className="font-semibold mb-1">Claim tokens</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Sale ended successfully. Claim your{' '}
                  <span className="text-white font-medium">
                    {compactNumber(parseFloat(formatEther(contribution!.tokenAmount)), 2)}{' '}
                    {tokenSymbol}
                  </span>
                  .
                </p>
                <button
                  onClick={handleClaim}
                  disabled={txLoading}
                  className="w-full btn-primary"
                >
                  {txLoading ? (
                    <>
                      <Icon name="spinner" size={14} /> Processing…
                    </>
                  ) : (
                    'Claim tokens'
                  )}
                </button>
              </div>
            )}

            {/* Refund */}
            {status === 'ended' && !reached && hasContrib && !alreadyClaimed && (
              <div className="card">
                <h3 className="font-semibold mb-1">Get refund</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Softcap not reached. Reclaim your{' '}
                  <span className="text-white font-medium">
                    {formatBnb(parseFloat(formatEther(contribution!.amount)))} BNB
                  </span>
                  .
                </p>
                <button
                  onClick={handleRefund}
                  disabled={txLoading}
                  className="w-full btn-secondary"
                >
                  {txLoading ? (
                    <>
                      <Icon name="spinner" size={14} /> Processing…
                    </>
                  ) : (
                    'Refund BNB'
                  )}
                </button>
              </div>
            )}

            {/* Owner withdraw */}
            {isOwner && status === 'ended' && reached && !presale.isFinalized && (
              <div className="card border-amber-500/20 bg-amber-500/5">
                <h3 className="font-semibold text-amber-300 mb-1">
                  Owner: withdraw funds
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Withdraw {formatBnb(raisedBnb)} BNB minus the {feeLabel} protocol fee.
                </p>
                <button
                  onClick={handleWithdraw}
                  disabled={txLoading}
                  className="w-full btn-warning"
                >
                  {txLoading ? (
                    <>
                      <Icon name="spinner" size={14} /> Processing…
                    </>
                  ) : (
                    'Withdraw funds'
                  )}
                </button>
              </div>
            )}

            {/* Already claimed */}
            {alreadyClaimed && (
              <div className="card text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                  <Icon name="check" size={18} />
                </div>
                <p className="text-sm text-emerald-300">You’ve claimed your tokens.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only floating CTA: jumps to the actions panel since the right
          column otherwise sits below all the details on small screens. Hidden
          when the panel is already on screen. */}
      {(() => {
        let label: string | null = null;
        if (status === 'active') label = 'Buy';
        else if (status === 'ended' && reached && hasContrib && !alreadyClaimed) label = 'Claim';
        else if (status === 'ended' && !reached && hasContrib) label = 'Refund';
        else if (isOwner && status === 'ended' && reached && !presale.isFinalized) label = 'Withdraw';
        if (!label || panelInView) return null;
        return (
          <a
            href="#actions-panel"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('actions-panel')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="lg:hidden fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-surface-1/90 backdrop-blur-md border border-primary-500/40 text-primary-100 px-4 py-2.5 text-sm font-semibold shadow-glow animate-slide-up active:scale-95 transition-transform"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse-slow" />
            {label}
            <Icon name="arrow-down" size={14} className="opacity-70" />
          </a>
        );
      })()}
    </Layout>
  );
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 text-sm gap-3">
    <dt className="text-gray-400">{label}</dt>
    <dd className="text-gray-100 font-medium text-right break-all">{value}</dd>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-100 font-medium">{value}</span>
  </div>
);
