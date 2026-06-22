import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { TOKEN_FACTORY_ABI } from '@/lib/abis/TokenFactory';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider } from '@/lib/web3';
import { PresaleConfig, getPresaleStatus, softcapReached, formatEther, progressPct } from '@/lib/presale';
import { friendlyError, formatBnb } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { AlertBanner, StatCard, EmptyState, StatusBadge, FundingBadge, ProgressBar, Button } from '@/components/ui';
import { AccessBanner } from '@/components/dashboard/AccessBanner';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TokenCard } from '@/components/token/TokenCard';
import { PresaleCard } from '@/components/presale/PresaleCard';
import { FundingPanel } from '@/components/FundingPanel';
import { usePresaleFunding } from '@/hooks/usePresaleFunding';
import { useProtocolFee } from '@/hooks/useProtocolFee';

interface MyPresale extends PresaleConfig {
  id: number;
  tokenName: string;
  tokenSymbol: string;
}

interface MyToken {
  address: string;
  name: string;
  symbol: string;
  supply: string;
  decimals: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { account, signer } = useWeb3Store();
  const { label: feeLabel } = useProtocolFee();

  const [myPresales, setMyPresales] = useState<MyPresale[]>([]);
  const [myTokens, setMyTokens] = useState<MyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<{ type: 'error' | 'success'; text: string; hash?: string } | null>(null);

  // Stats calculation
  const totalRaisedBnb = myPresales.reduce((acc, p) => acc + parseFloat(formatEther(p.totalRaised)), 0);
  const activePresalesCount = myPresales.filter(p => getPresaleStatus(p) === 'active').length;

  const fetchCreatorData = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      setError(null);
      const provider = getProvider();
      const { launchpad: launchpadAddr, tokenFactory: factoryAddr } = getContractAddresses();
      
      const launchpad = new ethers.Contract(launchpadAddr, LAUNCHPAD_ABI, provider);
      const factory = new ethers.Contract(factoryAddr, TOKEN_FACTORY_ABI, provider);

      // 1. Fetch presales
      const counter: bigint = await launchpad.presaleCounter();
      const totalPresales = Number(counter);
      let creatorPresales: MyPresale[] = [];
      
      if (totalPresales > 0) {
        const all = await Promise.all(
          Array.from({ length: totalPresales }, (_, i) =>
            launchpad.getPresaleDetails(i).then((d: PresaleConfig) => ({
              id: i,
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
            }))
          )
        );
        const mine = all.filter((p) => p.owner.toLowerCase() === account.toLowerCase());
        
        creatorPresales = await Promise.all(
          mine.map(async (p) => {
            let tokenName = 'Unknown';
            let tokenSymbol = 'TKN';
            try {
              const token = new ethers.Contract(p.tokenAddress, ERC20_ABI, provider);
              [tokenName, tokenSymbol] = await Promise.all([token.name(), token.symbol()]);
            } catch {}
            return { ...p, tokenName, tokenSymbol } as MyPresale;
          })
        );
      }

      // 2. Fetch created tokens
      let creatorTokens: MyToken[] = [];
      try {
        const tokenAddresses: string[] = await factory.getTokensByCreator(account);
        creatorTokens = await Promise.all(
          tokenAddresses.map(async (addr) => {
            const token = new ethers.Contract(addr, ERC20_ABI, provider);
            const [name, symbol, supply, decimals] = await Promise.all([
              token.name(),
              token.symbol(),
              token.totalSupply(),
              token.decimals(),
            ]);
            return {
              address: addr,
              name: String(name),
              symbol: String(symbol),
              supply: formatEther(supply),
              decimals: Number(decimals),
            };
          })
        );
      } catch (e) {
        console.error('Failed to query factory tokens', e);
      }

      setMyPresales(creatorPresales.reverse());
      setMyTokens(creatorTokens.reverse());
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchCreatorData();
  }, [fetchCreatorData]);

  const handleWithdraw = async (presaleId: number) => {
    if (!signer) return;
    try {
      setTxLoading(true);
      setTxMsg(null);
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);
      const tx = await contract.withdrawFunds(presaleId);
      const receipt = await tx.wait();
      setTxMsg({ type: 'success', text: 'Funds withdrawn successfully.', hash: receipt?.hash || tx.hash });
      fetchCreatorData();
    } catch (err: any) {
      setTxMsg({ type: 'error', text: friendlyError(err) });
    } finally {
      setTxLoading(false);
    }
  };

  if (!account) {
    return (
      <DashboardLayout>
        <EmptyState
          icon="wallet"
          title="Creator Wallet Required"
          body="Connect your Web3 creator wallet to access the dashboard, view deployment history, and withdraw presale funds."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Creator Dashboard</h1>
            <p className="text-xs text-ink-400 mt-1 font-semibold">
              Manage your launched tokens, monitor presale progress, and claim raised BNB.
            </p>
          </div>
          <button
            onClick={fetchCreatorData}
            disabled={loading}
            className="p-2 rounded-full bg-white/5 text-ink-400 hover:text-white"
          >
            <Icon name={loading ? 'spinner' : 'refresh'} size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Access Banner */}
        <AccessBanner />

        {txMsg && (
          <AlertBanner variant={txMsg.type} onDismiss={() => setTxMsg(null)} title={txMsg.text}>
            {txMsg.hash && (
              <a href={txUrl(txMsg.hash)} target="_blank" rel="noopener noreferrer" className="underline text-xs">
                View Transaction <Icon name="external" size={10} />
              </a>
            )}
          </AlertBanner>
        )}

        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        {/* Stats strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Funds Raised" value={`${formatBnb(totalRaisedBnb)} BNB`} variant="B" tone="green" loading={loading} />
          <StatCard label="Tokens Deployed" value={String(myTokens.length)} variant="B" tone="plain" loading={loading} />
          <StatCard label="Presales Run" value={String(myPresales.length)} variant="B" tone="plain" loading={loading} />
          <StatCard label="Active Presales" value={String(activePresalesCount)} variant="A" tone="yellow" loading={loading} />
        </section>

        {/* Creator Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Lists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Presales List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Your Presales</h3>
                <Link href="/launchpads/create" className="text-xs text-bnb-text hover:text-white font-bold transition">
                  Create Presale +
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="card animate-pulse py-12" />
                  ))}
                </div>
              ) : myPresales.length === 0 ? (
                <EmptyState
                  icon="rocket"
                  title="No presales configured"
                  body="Run a decentralized presale for your token. Configure lock times, price, and personal limits."
                  CTA={<Link href="/launchpads/create" className="btn-primary text-xs px-5 py-2">Start Presale</Link>}
                />
              ) : (
                <div className="space-y-4">
                  {myPresales.map((p) => (
                    <ManageCard key={p.id} presale={p} onWithdraw={handleWithdraw} txLoading={txLoading} />
                  ))}
                </div>
              )}
            </div>

            {/* Deployed Tokens List */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">Your Tokens</h3>
                <Link href="/create-token" className="text-xs text-bnb-text hover:text-white font-bold transition">
                  Create Token +
                </Link>
              </div>

              {loading ? (
                <div className="card animate-pulse py-12" />
              ) : myTokens.length === 0 ? (
                <EmptyState
                  icon="plus"
                  title="No tokens deployed yet"
                  body="Mint your first BEP-20 token on BNB Smart Chain using the no-code factory."
                  CTA={<Link href="/create-token" className="btn-primary text-xs px-5 py-2">Mint Token</Link>}
                />
              ) : (
                <div className="space-y-3">
                  {myTokens.map((t) => (
                    <TokenCard
                      key={t.address}
                      token={t}
                      onCreatePresale={(addr) => router.push(`/launchpads/create?token=${addr}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Activity */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Inner helper ManageCard for dashboard list items
const ManageCard: React.FC<{
  presale: MyPresale;
  onWithdraw: (id: number) => void;
  txLoading: boolean;
}> = ({ presale, onWithdraw, txLoading }) => {
  const status = getPresaleStatus(presale);
  const raisedBnb = parseFloat(formatEther(presale.totalRaised));
  const hardcapBnb = parseFloat(formatEther(presale.hardcap));
  const softcapBnb = parseFloat(formatEther(presale.softcap));
  const reached = softcapReached(presale);
  const pct = progressPct(presale.totalRaised, presale.hardcap);

  const funding = usePresaleFunding(presale.id, presale.tokenAddress);
  const [fundOpen, setFundOpen] = useState(false);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h4 className="font-semibold text-white">
            {presale.tokenName} <span className="text-xs text-ink-400 font-normal">({presale.tokenSymbol})</span>
          </h4>
          <p className="text-[10px] text-ink-500 font-mono mt-1">Presale #{presale.id} · {presale.tokenAddress}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={status === 'active' ? 'live' : status === 'finalized' ? 'ended' : status} />
          <FundingBadge status={funding.status} loading={funding.loading} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-ink-400 font-medium">
          <span>{pct.toFixed(1)}% raised</span>
          <span className="text-white font-mono">{formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB</span>
        </div>
        <ProgressBar value={presale.totalRaised} max={presale.hardcap} softCap={presale.softcap} showMarker={false} />
      </div>

      <div className="flex gap-2 flex-wrap pt-2">
        <Link href={`/presale/${presale.id}`} className="btn-secondary text-xs px-4 py-2 flex-1 justify-center">
          View details
        </Link>
        {!presale.isFinalized && funding.status !== 'funded' && (
          <Button
            variant="secondary"
            onClick={() => setFundOpen(!fundOpen)}
            className="text-xs px-4 py-2 flex-1 justify-center"
          >
            {fundOpen ? 'Close Deposit' : 'Deposit Tokens'}
          </Button>
        )}
        {status === 'ended' && reached && !presale.isFinalized && (
          <Button
            variant="primary"
            onClick={() => onWithdraw(presale.id)}
            disabled={txLoading}
            className="text-xs px-4 py-2 flex-1 justify-center font-bold"
          >
            Withdraw BNB
          </Button>
        )}
      </div>

      {fundOpen && (
        <div className="pt-2 border-t border-white/5 mt-2">
          <FundingPanel
            presaleId={presale.id}
            tokenAddress={presale.tokenAddress}
            tokenSymbol={presale.tokenSymbol}
            isOwner
            onChange={() => setFundOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
