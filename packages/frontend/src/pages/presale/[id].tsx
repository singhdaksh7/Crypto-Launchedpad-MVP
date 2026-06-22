import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { AlertBanner, AddressLink, ProgressBar, StatusBadge, FundingBadge, KeyValueList, Button } from '@/components/ui';
import { ActionBox } from '@/components/presale/ActionBox';
import { PresaleTimeline } from '@/components/presale/PresaleTimeline';
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
        try {
          const logo: string = await token.logoURI();
          setTokenLogo(logo || '');
        } catch {
          setTokenLogo('');
        }
      } catch {
        /* token may not be compliant */
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!presale) return;
    const status = getPresaleStatus(presale);
    if (status === 'finalized') return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
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
      <AppLayout>
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
      </AppLayout>
    );
  }

  if (error || !presale || !derived) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-16">
            <div className="mx-auto h-10 w-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
              <Icon name="alert" size={18} />
            </div>
            <p className="text-lg font-medium mb-1">Presale Not Found</p>
            <p className="text-sm text-ink-400 mb-6">{error || 'Could not load presale details.'}</p>
            <Link href="/launchpads" className="btn-secondary">
              Back to Launchpads
            </Link>
          </div>
        </div>
      </AppLayout>
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
    effectiveMaxBnb,
  } = derived;

  const detailItems = [
    { label: 'Token Contract Address', value: <AddressLink address={presale.tokenAddress} variant="token" /> },
    { label: 'Creator Wallet Address', value: <AddressLink address={presale.owner} /> },
    { label: 'Swap Rate', value: `${tokensPerBnb.toLocaleString()} ${tokenSymbol} per 1 BNB` },
    { label: 'Platform Access Fee Billed', value: '₹1000' },
    { label: 'Softcap Limit', value: `${softcapBnb} BNB` },
    { label: 'Hardcap Limit', value: `${hardcapBnb} BNB` },
    { label: 'Personal Wallet Limit', value: `${formatBnb(parseFloat(formatEther(presale.maxBuyPerUser)))} BNB` },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 select-none">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-ink-500 mb-4 font-semibold">
          <Link href="/launchpads" className="hover:text-white transition">
            Presales
          </Link>
          <span>/</span>
          <span className="text-white">Presale #{presaleId}</span>
        </nav>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Info, Timeline, Tables */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header info */}
            <div className="card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-ink-400 shrink-0 font-bold text-bnb-text">
                    {tokenLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tokenLogo.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${tokenLogo.slice('ipfs://'.length)}` : tokenLogo}
                        alt={`${tokenSymbol} logo`}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      tokenName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {tokenName} <span className="text-ink-400 font-normal uppercase text-sm font-semibold">({tokenSymbol})</span>
                    </h2>
                    <div className="mt-1 flex items-center gap-1 font-mono text-xs">
                      <AddressLink address={presale.tokenAddress} variant="token" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                  <StatusBadge status={status === 'active' ? 'live' : status === 'finalized' ? 'ended' : status} />
                  <FundingBadge status={funding.status} loading={funding.loading} />
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-ink-400 font-medium">
                  <span>{pct.toFixed(2)}% Raised</span>
                  <span className="text-white font-semibold font-mono">
                    {formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB
                  </span>
                </div>
                <ProgressBar value={presale.totalRaised} max={presale.hardcap} softCap={presale.softcap} />
              </div>
            </div>

            {/* Timeline component */}
            <PresaleTimeline startTime={presale.startTime} endTime={presale.endTime} status={status} />

            {/* Technical Detail Table */}
            <div className="card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Technical Details</h3>
              <KeyValueList items={detailItems} />
            </div>

            {/* Risk Warnings Banner */}
            <AlertBanner variant="warning" title="Buyer Safety & Risk Warning">
              DeFi presale listings carry high risk of rug pulls or market loss. Confirm token configuration, owner locks, and team credentials manually. Contributions lock until finalisation; should the softcap fail to hit, you are solely responsible for reclaiming your BNB refund. LaunchBNB assumes no liability.
            </AlertBanner>
          </div>

          {/* Right Column: Actions panel */}
          <div className="lg:col-span-1 space-y-6">
            
            {txError && <AlertBanner variant="error" onDismiss={() => setTxError(null)}>{txError}</AlertBanner>}
            {txSuccess && (
              <AlertBanner variant="success" onDismiss={() => setTxSuccess(null)} title={txSuccess.msg}>
                {txSuccess.hash && (
                  <a href={txUrl(txSuccess.hash)} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1 mt-1 text-xs">
                    View Transaction <Icon name="external" size={10} />
                  </a>
                )}
              </AlertBanner>
            )}

            {/* Deposit Funding Panel (Owners only, if not fully funded) */}
            {isOwner && funding.status !== 'funded' && (
              <div className="card space-y-4 border-amber-500/20 bg-amber-500/[0.02]">
                <h3 className="text-xs uppercase font-bold text-bnb-text">Owner: Deposit Launch Tokens</h3>
                <FundingPanel
                  presaleId={presaleId!}
                  tokenAddress={presale.tokenAddress}
                  tokenSymbol={tokenSymbol}
                  isOwner={isOwner}
                  onChange={fetchData}
                />
              </div>
            )}

            {/* Action Box component */}
            <ActionBox
              status={status}
              reached={reached}
              hasContrib={hasContrib}
              alreadyClaimed={alreadyClaimed}
              amount={buyAmount}
              onAmountChange={setBuyAmount}
              balance={funding.balance.toString()} // Fallback balance read
              min="0.1"
              max={effectiveMaxBnb.toString()}
              buyLoading={txLoading}
              onContribute={handleBuy}
              claimable={contribution ? formatEther(contribution.tokenAmount) : '0'}
              contribution={contribution ? formatEther(contribution.amount) : '0'}
              claimLoading={txLoading}
              onClaim={handleClaim}
              refundable={contribution ? formatEther(contribution.amount) : '0'}
              refundLoading={txLoading}
              onRefund={handleRefund}
            />

            {/* Withdraw raised funds (Owner only, ended & reached) */}
            {isOwner && status === 'ended' && reached && !presale.isFinalized && (
              <div className="card border-primary-500/20 bg-primary-500/[0.02] space-y-4">
                <h3 className="text-xs uppercase font-bold text-bnb-text">Withdraw Raised Funds</h3>
                <p className="text-xs text-ink-400 leading-relaxed font-semibold">
                  The presale was successful! Withdraw {formatBnb(raisedBnb)} BNB to your owner address (minus the {feeLabel} protocol fee).
                </p>
                <Button variant="primary" onClick={handleWithdraw} loading={txLoading} className="w-full">
                  Withdraw BNB
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
