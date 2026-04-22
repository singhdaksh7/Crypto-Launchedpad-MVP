import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, formatEther, formatAddress } from '@/lib/web3';

interface PresaleConfig {
  tokenAddress: string;
  owner: string;
  tokenPrice: bigint;
  softcap: bigint;
  hardcap: bigint;
  startTime: bigint;
  endTime: bigint;
  maxBuyPerUser: bigint;
  totalRaised: bigint;
  isActive: boolean;
  isFinalized: boolean;
}

interface UserContribution {
  amount: bigint;
  tokenAmount: bigint;
  claimed: boolean;
}

type Status = 'upcoming' | 'active' | 'ended' | 'finalized';

function getStatus(p: PresaleConfig): Status {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (p.isFinalized) return 'finalized';
  if (now < p.startTime) return 'upcoming';
  if (now >= p.startTime && now < p.endTime) return 'active';
  return 'ended';
}

function ProgressBar({ raised, hardcap }: { raised: bigint; hardcap: bigint }) {
  const pct = hardcap === 0n ? 0 : Number((raised * 10000n) / hardcap) / 100;
  const clamped = Math.min(pct, 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 rounded-full transition-all duration-500"
        style={{
          width: `${clamped}%`,
          background: clamped >= 100 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#8b5cf6',
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    upcoming: 'bg-blue-900 text-blue-300 border-blue-700',
    active: 'bg-green-900 text-green-300 border-green-700',
    ended: 'bg-gray-700 text-gray-300 border-gray-600',
    finalized: 'bg-purple-900 text-purple-300 border-purple-700',
  };
  const labels: Record<Status, string> = {
    upcoming: '⏳ Upcoming',
    active: '🟢 Active',
    ended: '⏹ Ended',
    finalized: '✅ Finalized',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function CountdownTimer({ target, label }: { target: bigint; label: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(target) - now;
      if (diff <= 0) { setTimeLeft('0s'); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-mono font-bold text-yellow-400">{timeLeft}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-medium text-sm">{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-2 text-xs text-gray-400 hover:text-primary transition">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function PresaleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { account, signer } = useWeb3Store();

  const [presale, setPresale] = useState<PresaleConfig | null>(null);
  const [contribution, setContribution] = useState<UserContribution | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState('');

  const presaleId = id ? Number(id) : null;

  const fetchData = useCallback(async () => {
    if (presaleId === null || isNaN(presaleId)) return;
    try {
      setLoading(true);
      setError(null);
      const provider = getProvider();
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);

      const details: PresaleConfig = await contract.getPresaleDetails(presaleId);
      setPresale(details);

      try {
        const token = new ethers.Contract(details.tokenAddress, ERC20_ABI, provider);
        const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
        setTokenName(name);
        setTokenSymbol(symbol);
      } catch {}

      if (account) {
        const contrib: UserContribution = await contract.getUserContribution(presaleId, account);
        setContribution(contrib);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load presale');
    } finally {
      setLoading(false);
    }
  }, [presaleId, account]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runTx = async (action: () => Promise<void>, successMsg: string) => {
    if (!signer || !account) { setTxError('Connect wallet first'); return; }
    try {
      setTxLoading(true);
      setTxError(null);
      setTxSuccess(null);
      await action();
      setTxSuccess(successMsg);
      await fetchData();
    } catch (err: any) {
      setTxError(err.reason || err.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  };

  const handleBuy = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      const tx = await contract.buyTokens(presaleId, { value: ethers.parseEther(buyAmount) });
      await tx.wait();
      setBuyAmount('');
    }, 'Tokens purchased successfully!');

  const handleClaim = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      const tx = await contract.claimTokens(presaleId);
      await tx.wait();
    }, 'Tokens claimed successfully!');

  const handleRefund = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      const tx = await contract.refundContribution(presaleId);
      await tx.wait();
    }, 'BNB refunded successfully!');

  const handleWithdraw = () =>
    runTx(async () => {
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer!);
      const tx = await contract.withdrawFunds(presaleId);
      await tx.wait();
    }, 'Funds withdrawn successfully!');

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="card space-y-4">
            <div className="h-5 bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-800 rounded" />
            <div className="h-3 bg-gray-800 rounded w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !presale) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <div className="card text-center py-16">
            <p className="text-red-400 text-lg mb-4">{error || 'Presale not found'}</p>
            <Link href="/launchpads" className="btn-secondary">← Back to Launchpads</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const status = getStatus(presale);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const raisedEth = parseFloat(formatEther(presale.totalRaised));
  const hardcapEth = parseFloat(formatEther(presale.hardcap));
  const softcapEth = parseFloat(formatEther(presale.softcap));
  const pct = hardcapEth > 0 ? Math.min((raisedEth / hardcapEth) * 100, 100) : 0;
  const softcapReached = presale.totalRaised >= presale.softcap;
  const isOwner = account?.toLowerCase() === presale.owner.toLowerCase();
  const hasContrib = contribution && contribution.amount > 0n;
  const alreadyClaimed = contribution?.claimed ?? false;

  const maxBuyLeft = hasContrib
    ? presale.maxBuyPerUser - contribution!.amount
    : presale.maxBuyPerUser;
  const remainingCap = presale.hardcap - presale.totalRaised;
  const effectiveMax = maxBuyLeft < remainingCap ? maxBuyLeft : remainingCap;

  const tokensPerBnb = presale.tokenPrice > 0n
    ? Number(ethers.parseEther('1')) / Number(presale.tokenPrice)
    : 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/launchpads" className="text-gray-400 hover:text-white transition">
            ← Launchpads
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300">Presale #{presaleId}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {tokenName || 'Unknown Token'}
                    {tokenSymbol && (
                      <span className="text-primary ml-2 text-xl">({tokenSymbol})</span>
                    )}
                  </h1>
                  <div className="flex items-center mt-1 text-sm text-gray-400 font-mono">
                    {formatAddress(presale.tokenAddress)}
                    <CopyButton text={presale.tokenAddress} />
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress ({pct.toFixed(2)}%)</span>
                  <span className="font-medium">
                    {raisedEth.toFixed(4)} / {hardcapEth.toFixed(2)} BNB
                  </span>
                </div>
                <ProgressBar raised={presale.totalRaised} hardcap={presale.hardcap} />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Softcap: {softcapEth.toFixed(2)} BNB {softcapReached ? '✅' : ''}</span>
                  <span>Hardcap: {hardcapEth.toFixed(2)} BNB</span>
                </div>
              </div>

              {/* Countdown */}
              {status === 'active' && (
                <div className="mt-6 bg-gray-800 rounded-lg p-4 text-center">
                  <CountdownTimer target={presale.endTime} label="Presale ends in" />
                </div>
              )}
              {status === 'upcoming' && (
                <div className="mt-6 bg-gray-800 rounded-lg p-4 text-center">
                  <CountdownTimer target={presale.startTime} label="Presale starts in" />
                </div>
              )}
            </div>

            {/* Details card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4">Presale Details</h2>
              <InfoRow label="Token Price" value={`${formatEther(presale.tokenPrice)} BNB per token`} />
              <InfoRow label="Tokens per BNB" value={tokensPerBnb.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
              <InfoRow label="Softcap" value={`${softcapEth.toFixed(2)} BNB`} />
              <InfoRow label="Hardcap" value={`${hardcapEth.toFixed(2)} BNB`} />
              <InfoRow label="Max Buy Per User" value={`${parseFloat(formatEther(presale.maxBuyPerUser)).toFixed(4)} BNB`} />
              <InfoRow
                label="Start Time"
                value={new Date(Number(presale.startTime) * 1000).toLocaleString()}
              />
              <InfoRow
                label="End Time"
                value={new Date(Number(presale.endTime) * 1000).toLocaleString()}
              />
              <InfoRow
                label="Owner"
                value={
                  <span className="font-mono flex items-center">
                    {formatAddress(presale.owner)}
                    <CopyButton text={presale.owner} />
                  </span>
                }
              />
            </div>
          </div>

          {/* Right column: actions */}
          <div className="space-y-4">
            {/* TX feedback */}
            {txError && (
              <div className="bg-red-900 border border-red-700 p-4 rounded-lg text-red-200 text-sm">
                {txError}
              </div>
            )}
            {txSuccess && (
              <div className="bg-green-900 border border-green-700 p-4 rounded-lg text-green-200 text-sm">
                {txSuccess}
              </div>
            )}

            {/* User contribution */}
            {account && hasContrib && (
              <div className="card">
                <h3 className="font-bold mb-3 text-sm text-gray-300">Your Contribution</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">BNB Spent</span>
                    <span>{parseFloat(formatEther(contribution!.amount)).toFixed(4)} BNB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens Allocated</span>
                    <span>{parseFloat(formatEther(contribution!.tokenAmount)).toLocaleString()} {tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={alreadyClaimed ? 'text-green-400' : 'text-yellow-400'}>
                      {alreadyClaimed ? 'Claimed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buy panel */}
            {status === 'active' && account && (
              <div className="card">
                <h3 className="font-bold mb-4">Buy Tokens</h3>
                <div className="mb-3">
                  <label className="label-text text-xs">Amount (BNB)</label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.001"
                    min="0"
                    max={parseFloat(formatEther(effectiveMax)).toFixed(4)}
                    className="input-field mt-1 text-sm"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Max: {parseFloat(formatEther(effectiveMax)).toFixed(4)} BNB</span>
                    {buyAmount && (
                      <span>
                        ≈ {(parseFloat(buyAmount) * tokensPerBnb).toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  {['25%', '50%', '75%', 'Max'].map((label) => {
                    const max = parseFloat(formatEther(effectiveMax));
                    const pctVal = label === 'Max' ? 1 : parseInt(label) / 100;
                    return (
                      <button
                        key={label}
                        onClick={() => setBuyAmount((max * pctVal).toFixed(4))}
                        className="flex-1 text-xs py-1 bg-gray-800 rounded hover:bg-gray-700 transition"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleBuy}
                  disabled={txLoading || !buyAmount || parseFloat(buyAmount) <= 0}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {txLoading ? 'Processing...' : 'Buy Tokens'}
                </button>
              </div>
            )}

            {/* Claim tokens */}
            {status === 'ended' && !presale.isFinalized && softcapReached && hasContrib && !alreadyClaimed && (
              <div className="card">
                <h3 className="font-bold mb-2">Claim Tokens</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Presale ended successfully. Claim your {tokenSymbol} tokens.
                </p>
                <button onClick={handleClaim} disabled={txLoading} className="w-full btn-primary disabled:opacity-50">
                  {txLoading ? 'Processing...' : `Claim ${parseFloat(formatEther(contribution!.tokenAmount)).toLocaleString()} ${tokenSymbol}`}
                </button>
              </div>
            )}

            {/* Refund */}
            {status === 'ended' && !softcapReached && hasContrib && !alreadyClaimed && (
              <div className="card">
                <h3 className="font-bold mb-2">Get Refund</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Softcap not reached. Reclaim your {parseFloat(formatEther(contribution!.amount)).toFixed(4)} BNB.
                </p>
                <button onClick={handleRefund} disabled={txLoading} className="w-full btn-secondary disabled:opacity-50">
                  {txLoading ? 'Processing...' : 'Refund BNB'}
                </button>
              </div>
            )}

            {/* Owner withdraw */}
            {isOwner && status === 'ended' && softcapReached && !presale.isFinalized && (
              <div className="card border-yellow-800">
                <h3 className="font-bold mb-2 text-yellow-400">Owner: Withdraw Funds</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Withdraw {raisedEth.toFixed(4)} BNB (minus 2.5% platform fee).
                </p>
                <button onClick={handleWithdraw} disabled={txLoading} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
                  {txLoading ? 'Processing...' : 'Withdraw Funds'}
                </button>
              </div>
            )}

            {/* Connect wallet prompt */}
            {!account && status === 'active' && (
              <div className="card text-center">
                <p className="text-gray-400 text-sm mb-3">Connect wallet to participate</p>
              </div>
            )}

            {/* Already claimed */}
            {alreadyClaimed && (
              <div className="card text-center">
                <p className="text-green-400 font-medium">✅ You have claimed your tokens</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
