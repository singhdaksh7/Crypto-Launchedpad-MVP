import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, formatEther, formatAddress } from '@/lib/web3';

interface PresaleData {
  id: number;
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
  tokenName: string;
  tokenSymbol: string;
}

type StatusFilter = 'all' | 'upcoming' | 'active' | 'ended';

function getPresaleStatus(presale: PresaleData): 'upcoming' | 'active' | 'ended' | 'finalized' {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (presale.isFinalized) return 'finalized';
  if (now < presale.startTime) return 'upcoming';
  if (now >= presale.startTime && now < presale.endTime) return 'active';
  return 'ended';
}

function ProgressBar({ raised, hardcap }: { raised: bigint; hardcap: bigint }) {
  const pct = hardcap === 0n ? 0 : Number((raised * 10000n) / hardcap) / 100;
  const clamped = Math.min(pct, 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all"
        style={{
          width: `${clamped}%`,
          background: clamped >= 100 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#8b5cf6',
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: 'bg-blue-900 text-blue-300',
    active: 'bg-green-900 text-green-300',
    ended: 'bg-gray-700 text-gray-300',
    finalized: 'bg-purple-900 text-purple-300',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.ended}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CountdownTimer({ endTime }: { endTime: bigint }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(endTime) - now;
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return <span>{timeLeft}</span>;
}

function PresaleCard({ presale }: { presale: PresaleData }) {
  const status = getPresaleStatus(presale);
  const raisedEth = parseFloat(formatEther(presale.totalRaised));
  const hardcapEth = parseFloat(formatEther(presale.hardcap));
  const softcapEth = parseFloat(formatEther(presale.softcap));
  const pct = hardcapEth > 0 ? Math.min((raisedEth / hardcapEth) * 100, 100) : 0;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold">
            {presale.tokenName || 'Unknown Token'}{' '}
            <span className="text-primary text-sm">({presale.tokenSymbol || '???'})</span>
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{formatAddress(presale.tokenAddress)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress ({pct.toFixed(1)}%)</span>
          <span>{raisedEth.toFixed(4)} / {hardcapEth.toFixed(2)} BNB</span>
        </div>
        <ProgressBar raised={presale.totalRaised} hardcap={presale.hardcap} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-800 rounded p-2">
          <p className="text-xs text-gray-400">Softcap</p>
          <p className="font-medium">{softcapEth.toFixed(2)} BNB</p>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <p className="text-xs text-gray-400">Hardcap</p>
          <p className="font-medium">{hardcapEth.toFixed(2)} BNB</p>
        </div>
      </div>

      {status === 'active' && (
        <div className="text-xs text-gray-400 flex justify-between">
          <span>Ends in:</span>
          <span className="text-yellow-400 font-medium">
            <CountdownTimer endTime={presale.endTime} />
          </span>
        </div>
      )}

      {status === 'upcoming' && (
        <div className="text-xs text-gray-400 flex justify-between">
          <span>Starts:</span>
          <span className="text-blue-400 font-medium">
            {new Date(Number(presale.startTime) * 1000).toLocaleString()}
          </span>
        </div>
      )}

      <Link
        href={`/presale/${presale.id}`}
        className="w-full btn-primary text-center block text-sm"
      >
        View Details
      </Link>
    </div>
  );
}

export default function Launchpads() {
  const { account } = useWeb3Store();
  const [presales, setPresales] = useState<PresaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchPresales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = getProvider();
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);

      const counter: bigint = await contract.presaleCounter();
      const total = Number(counter);

      if (total === 0) {
        setPresales([]);
        return;
      }

      const ids = Array.from({ length: total }, (_, i) => i);
      const details = await Promise.all(ids.map((id) => contract.getPresaleDetails(id)));

      const enriched = await Promise.all(
        details.map(async (d, id) => {
          let tokenName = '';
          let tokenSymbol = '';
          try {
            const token = new ethers.Contract(d.tokenAddress, ERC20_ABI, provider);
            [tokenName, tokenSymbol] = await Promise.all([token.name(), token.symbol()]);
          } catch {
            // token may not be ERC20 metadata compliant
          }
          return {
            id,
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
            tokenName,
            tokenSymbol,
          } as PresaleData;
        })
      );

      setPresales(enriched.reverse());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch presales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresales();
  }, [fetchPresales]);

  const filtered = presales.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.tokenName.toLowerCase().includes(q) ||
      p.tokenSymbol.toLowerCase().includes(q) ||
      p.tokenAddress.toLowerCase().includes(q);
    const status = getPresaleStatus(p);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'upcoming' && status === 'upcoming') ||
      (statusFilter === 'active' && status === 'active') ||
      (statusFilter === 'ended' && (status === 'ended' || status === 'finalized'));
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: presales.length,
    upcoming: presales.filter((p) => getPresaleStatus(p) === 'upcoming').length,
    active: presales.filter((p) => getPresaleStatus(p) === 'active').length,
    ended: presales.filter((p) => ['ended', 'finalized'].includes(getPresaleStatus(p))).length,
  };

  return (
    <Layout>
      <div className="py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold">Launchpads</h1>
            <p className="text-gray-400 mt-1">{presales.length} presale{presales.length !== 1 ? 's' : ''} total</p>
          </div>
          <div className="flex gap-2">
            {account && (
              <Link href="/dashboard" className="btn-primary">
                + Create Presale
              </Link>
            )}
            <button
              onClick={fetchPresales}
              className="btn-secondary"
              disabled={loading}
            >
              {loading ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by token name, symbol, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'upcoming', 'active', 'ended'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1 text-xs opacity-70">({counts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse space-y-4">
                <div className="h-5 bg-gray-700 rounded w-2/3" />
                <div className="h-2 bg-gray-700 rounded" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-gray-700 rounded" />
                  <div className="h-12 bg-gray-700 rounded" />
                </div>
                <div className="h-9 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-lg mb-2">
              {presales.length === 0 ? 'No presales yet' : 'No presales match your search'}
            </p>
            {presales.length === 0 && !account && (
              <p className="text-sm text-gray-500">Connect your wallet to create the first one</p>
            )}
            {search && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="btn-secondary mt-4 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((presale) => (
              <PresaleCard key={presale.id} presale={presale} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
