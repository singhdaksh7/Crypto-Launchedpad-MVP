import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, formatAddress } from '@/lib/web3';
import {
  PresaleConfig,
  PresaleStatus,
  formatEther,
  getPresaleStatus,
  progressPct,
} from '@/lib/presale';
import { friendlyError, formatBnb } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Countdown } from '@/components/ui/Countdown';
import { Alert } from '@/components/ui/Alert';

interface PresaleData extends PresaleConfig {
  id: number;
  tokenName: string;
  tokenSymbol: string;
}

type StatusFilter = 'all' | 'upcoming' | 'active' | 'ended';
type SortBy = 'newest' | 'raised' | 'ending';

function PresaleCard({ presale, account }: { presale: PresaleData; account: string | null }) {
  const status = getPresaleStatus(presale);
  const raisedBnb = parseFloat(formatEther(presale.totalRaised));
  const hardcapBnb = parseFloat(formatEther(presale.hardcap));
  const softcapBnb = parseFloat(formatEther(presale.softcap));
  const pct = progressPct(presale.totalRaised, presale.hardcap);
  const isOwner = !!account && account.toLowerCase() === presale.owner.toLowerCase();

  return (
    <Link
      href={`/presale/${presale.id}`}
      className="card card-hover flex flex-col gap-4 group"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {presale.tokenName || 'Unknown Token'}
            {presale.tokenSymbol && (
              <span className="text-gray-500 text-sm ml-1.5 font-normal">
                {presale.tokenSymbol}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-1 truncate">
            {formatAddress(presale.tokenAddress)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOwner && (
            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-300 border border-primary-500/30">
              Yours
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-400">{pct.toFixed(1)}% raised</span>
          <span className="text-gray-300 font-medium tabular-nums">
            {formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB
          </span>
        </div>
        <ProgressBar raised={presale.totalRaised} hardcap={presale.hardcap} />
        <div className="flex justify-between text-[11px] text-gray-500 mt-1.5">
          <span>Softcap {formatBnb(softcapBnb)} BNB</span>
          {status === 'active' && (
            <span className="text-amber-300 font-medium inline-flex items-center gap-1">
              <Icon name="clock" size={11} />
              <Countdown target={presale.endTime} />
            </span>
          )}
          {status === 'upcoming' && (
            <span className="text-sky-300 font-medium inline-flex items-center gap-1">
              <Icon name="clock" size={11} />
              starts in <Countdown target={presale.startTime} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-300 pt-1">
        <span className="text-gray-500 text-xs">Presale #{presale.id}</span>
        <span className="inline-flex items-center gap-1 text-primary-400 group-hover:translate-x-0.5 transition-transform">
          View details
          <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-5 bg-white/5 rounded w-2/3" />
        <div className="h-5 bg-white/5 rounded w-16" />
      </div>
      <div className="h-2 bg-white/5 rounded" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
      <div className="h-9 bg-white/5 rounded" />
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
  const [sortBy, setSortBy] = useState<SortBy>('newest');

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
            /* token may not be ERC20 metadata-compliant */
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
        }),
      );

      setPresales(enriched);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresales();
  }, [fetchPresales]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: presales.length, upcoming: 0, active: 0, ended: 0 };
    presales.forEach((p) => {
      const s = getPresaleStatus(p);
      if (s === 'upcoming') c.upcoming++;
      else if (s === 'active') c.active++;
      else c.ended++;
    });
    return c;
  }, [presales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = presales.filter((p) => {
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
    list = [...list].sort((a, b) => {
      if (sortBy === 'raised') {
        return a.totalRaised < b.totalRaised ? 1 : a.totalRaised > b.totalRaised ? -1 : 0;
      }
      if (sortBy === 'ending') {
        const sa = getPresaleStatus(a);
        const sb = getPresaleStatus(b);
        if (sa === 'active' && sb !== 'active') return -1;
        if (sb === 'active' && sa !== 'active') return 1;
        return Number(a.endTime - b.endTime);
      }
      return b.id - a.id; // newest
    });
    return list;
  }, [presales, search, statusFilter, sortBy]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'ended', label: 'Ended' },
  ];

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Launchpads</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {presales.length} presale{presales.length === 1 ? '' : 's'} on this network
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPresales}
            disabled={loading}
            className="btn-secondary"
            aria-label="Refresh"
          >
            <Icon name={loading ? 'spinner' : 'refresh'} size={14} />
            <span className="hidden sm:inline">{loading ? 'Loading' : 'Refresh'}</span>
          </button>
          {account && (
            <Link href="/dashboard" className="btn-primary">
              <Icon name="plus" size={14} />
              Create Presale
            </Link>
          )}
        </div>
      </div>

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      {/* Search + filter + sort */}
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search by name, symbol or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                statusFilter === f.key
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'bg-white/0 border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {f.label}
              <span className="ml-1 text-xs opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="input-field lg:w-44"
        >
          <option value="newest">Newest first</option>
          <option value="raised">Most raised</option>
          <option value="ending">Ending soonest</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-400">
            <Icon name="rocket" size={20} />
          </div>
          <p className="text-lg font-medium mb-1">
            {presales.length === 0 ? 'No presales yet' : 'No presales match your filters'}
          </p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            {presales.length === 0
              ? 'Be the first to launch on this network. Create a token and configure a presale in minutes.'
              : 'Try clearing the search or switching the status filter.'}
          </p>
          {presales.length === 0 ? (
            <Link href="/create-token" className="btn-primary">
              Create your token
              <Icon name="arrow-right" size={14} />
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="btn-secondary"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => <PresaleCard key={p.id} presale={p} account={account} />)}
        </div>
      )}
    </Layout>
  );
}
