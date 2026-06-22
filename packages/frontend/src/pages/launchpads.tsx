import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'react-query';
import { useWeb3Store } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { getPresaleStatus } from '@/lib/presale';
import { PresaleData, fetchPresalesFromApi } from '@/lib/api';
import { friendlyError } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { AlertBanner, EmptyState, Button } from '@/components/ui';
import { PresaleCard } from '@/components/presale/PresaleCard';

type StatusFilter = 'all' | 'upcoming' | 'active' | 'ended';
type SortBy = 'newest' | 'raised' | 'ending';

export default function Launchpads() {
  const { account } = useWeb3Store();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // Preserve cached API reads
  const {
    data: presales = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<PresaleData[]>('presales', fetchPresalesFromApi);

  const error = queryError ? friendlyError(queryError) : null;

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
    { key: 'all', label: 'All Launches' },
    { key: 'active', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'ended', label: 'Ended' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 select-none">
        {/* Listing Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Explore Presales</h1>
            <p className="text-ink-400 text-sm mt-1 font-semibold">
              Find and participate in BEP-20 launches on BNB Smart Chain.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Icon name={isFetching ? 'spinner' : 'refresh' as any} size={12} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Link href="/launchpads/create" className="btn-primary px-5 py-2.5 text-xs font-bold flex-1 sm:flex-none text-center">
              Launch Your Own
            </Link>
          </div>
        </div>

        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Icon
              name="search"
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              type="text"
              placeholder="Search by token name, ticker, or contract address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10.5 text-sm"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none font-semibold">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-full text-xs transition whitespace-nowrap border ${
                  statusFilter === f.key
                    ? 'bg-primary-500/10 text-primary-500 border-primary-500/25'
                    : 'bg-white/5 text-ink-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {f.label}
                <span className="ml-1.5 opacity-60 text-[10px] font-mono">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="input-field text-xs md:w-40 font-semibold cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="raised">Most raised</option>
            <option value="ending">Ending soonest</option>
          </select>
        </div>

        {/* Listing Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card animate-pulse h-[340px] space-y-4">
                <div className="h-6 bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-white/5 rounded" />
                <div className="h-2 bg-white/5 rounded" />
                <div className="h-20 bg-white/5 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="rocket"
            title="No presales matching filters"
            body={presales.length === 0
              ? 'Be the first to launch on BNB Chain. Deploy your BEP-20 token and configure a presale in minutes.'
              : 'Try checking other filters or clear the search input.'}
            CTA={
              presales.length === 0 ? (
                <Link href="/create-token" className="btn-primary">
                  Deploy Token & Start
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Reset Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PresaleCard key={p.id} presale={p} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
