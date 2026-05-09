import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { Icon } from '@/components/ui/Icon';
import { Alert } from '@/components/ui/Alert';
import { AddressLink } from '@/components/ui/AddressLink';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VESTING_ABI } from '@/lib/abis/Vesting';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, isZeroAddress } from '@/lib/web3';
import { friendlyError } from '@/lib/format';
import { txUrl } from '@/lib/links';

type Unit = 'seconds' | 'minutes' | 'hours' | 'days';
const UNIT_SECONDS: Record<Unit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

interface FormState {
  token: string;
  beneficiary: string;
  amount: string;
  startISO: string;
  cliffValue: string;
  cliffUnit: Unit;
  linearValue: string;
  linearUnit: Unit;
}

interface RawSchedule {
  token: string;
  beneficiary: string;
  creator: string;
  totalAmount: bigint;
  released: bigint;
  start: bigint;
  cliffSeconds: bigint;
  linearSeconds: bigint;
}

interface EnrichedSchedule {
  id: number;
  schedule: RawSchedule;
  releasable: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  role: 'beneficiary' | 'creator' | 'both';
}

const isValidAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

const toLocalISO = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const formatDuration = (seconds: bigint): string => {
  const s = Number(seconds);
  if (s === 0) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
};

const initialForm = (): FormState => ({
  token: '',
  beneficiary: '',
  amount: '',
  startISO: toLocalISO(new Date()),
  cliffValue: '0',
  cliffUnit: 'days',
  linearValue: '0',
  linearUnit: 'days',
});

export default function VestingPage() {
  const router = useRouter();
  const { account, signer } = useWeb3Store();
  const { vesting: vestingAddr } = getContractAddresses();
  const vestingConfigured = !isZeroAddress(vestingAddr);

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{ scheduleId: number; hash: string } | null>(
    null,
  );

  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busyRelease, setBusyRelease] = useState<number | null>(null);

  // Optional ?owner=0x... filter for "view this creator's locks" deeplinks.
  const ownerFilter = useMemo(() => {
    const v = router.query.owner;
    return typeof v === 'string' && isValidAddress(v) ? v.toLowerCase() : null;
  }, [router.query.owner]);

  const lookupAddress = ownerFilter || account?.toLowerCase() || null;

  const fetchSchedules = useCallback(async () => {
    if (!lookupAddress || !vestingConfigured) {
      setSchedules([]);
      return;
    }
    setLoadingList(true);
    setListError(null);
    try {
      const provider = getProvider();
      const v = new ethers.Contract(vestingAddr, VESTING_ABI, provider);
      const [creatorIdsRaw, beneficiaryIdsRaw] = (await Promise.all([
        v.schedulesOfCreator(lookupAddress),
        v.schedulesOfBeneficiary(lookupAddress),
      ])) as [bigint[], bigint[]];
      const idSet = new Set<number>();
      creatorIdsRaw.forEach((x) => idSet.add(Number(x)));
      beneficiaryIdsRaw.forEach((x) => idSet.add(Number(x)));
      const allIds: number[] = Array.from(idSet).sort((a, b) => a - b);

      // Enrich each schedule with the token symbol and current releasable amount.
      const tokenInfoCache = new Map<string, { symbol: string; decimals: number }>();
      const enriched: EnrichedSchedule[] = await Promise.all(
        allIds.map(async (id: number): Promise<EnrichedSchedule> => {
          const [scheduleRaw, releasable] = await Promise.all([
            v.getSchedule(id),
            v.releasableOf(id),
          ]);
          const schedule: RawSchedule = {
            token: scheduleRaw.token,
            beneficiary: scheduleRaw.beneficiary,
            creator: scheduleRaw.creator,
            totalAmount: scheduleRaw.totalAmount,
            released: scheduleRaw.released,
            start: scheduleRaw.start,
            cliffSeconds: scheduleRaw.cliffSeconds,
            linearSeconds: scheduleRaw.linearSeconds,
          };
          const tokenAddr = schedule.token.toLowerCase();
          let info = tokenInfoCache.get(tokenAddr);
          if (!info) {
            try {
              const t = new ethers.Contract(schedule.token, ERC20_ABI, provider);
              const [symbol, decimals] = await Promise.all([t.symbol(), t.decimals()]);
              info = { symbol, decimals: Number(decimals) };
            } catch {
              info = { symbol: 'TOKEN', decimals: 18 };
            }
            tokenInfoCache.set(tokenAddr, info);
          }
          const isCreator =
            schedule.creator.toLowerCase() === lookupAddress.toLowerCase();
          const isBeneficiary =
            schedule.beneficiary.toLowerCase() === lookupAddress.toLowerCase();
          return {
            id,
            schedule,
            releasable,
            tokenSymbol: info.symbol,
            tokenDecimals: info.decimals,
            role: isCreator && isBeneficiary ? 'both' : isCreator ? 'creator' : 'beneficiary',
          };
        }),
      );
      setSchedules(enriched);
    } catch (err: any) {
      setListError(friendlyError(err));
    } finally {
      setLoadingList(false);
    }
  }, [lookupAddress, vestingAddr, vestingConfigured]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Live refresh while there's anything releasable but not released.
  useEffect(() => {
    if (schedules.length === 0) return;
    const id = setInterval(fetchSchedules, 20000);
    return () => clearInterval(id);
  }, [schedules.length, fetchSchedules]);

  const handleField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const useMyAddress = () => {
    if (account) setForm((f) => ({ ...f, beneficiary: account }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      setSubmitError('Connect your wallet first.');
      return;
    }
    if (!vestingConfigured) {
      setSubmitError('Vesting contract not configured. Set NEXT_PUBLIC_VESTING_ADDRESS.');
      return;
    }
    if (!isValidAddress(form.token)) {
      setSubmitError('Invalid token address.');
      return;
    }
    if (!isValidAddress(form.beneficiary)) {
      setSubmitError('Invalid beneficiary address.');
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setSubmitError('Amount must be greater than 0.');
      return;
    }
    const cliffNum = Number(form.cliffValue);
    const linearNum = Number(form.linearValue);
    if (!Number.isFinite(cliffNum) || cliffNum < 0) {
      setSubmitError('Cliff must be ≥ 0.');
      return;
    }
    if (!Number.isFinite(linearNum) || linearNum < 0) {
      setSubmitError('Linear duration must be ≥ 0.');
      return;
    }
    const cliffSeconds = Math.floor(cliffNum * UNIT_SECONDS[form.cliffUnit]);
    const linearSeconds = Math.floor(linearNum * UNIT_SECONDS[form.linearUnit]);
    if (cliffSeconds === 0 && linearSeconds === 0) {
      setSubmitError('Set at least one of cliff or linear duration.');
      return;
    }
    const startSeconds = Math.floor(new Date(form.startISO).getTime() / 1000);
    if (!Number.isFinite(startSeconds)) {
      setSubmitError('Invalid start time.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const token = new ethers.Contract(form.token, ERC20_ABI, signer);
      const decimals = Number(await token.decimals());
      const amountWei = ethers.parseUnits(form.amount, decimals);

      // Approve only what's needed if current allowance is short.
      const current = (await token.allowance(account, vestingAddr)) as bigint;
      if (current < amountWei) {
        const approveTx = await token.approve(vestingAddr, amountWei);
        await approveTx.wait();
      }

      const v = new ethers.Contract(vestingAddr, VESTING_ABI, signer);
      const tx = await v.createSchedule(
        form.token,
        form.beneficiary,
        amountWei,
        startSeconds,
        cliffSeconds,
        linearSeconds,
      );
      const receipt = await tx.wait();

      // Pull the new scheduleId out of the ScheduleCreated event.
      let newId = -1;
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = v.interface.parseLog(log);
          if (parsed && parsed.name === 'ScheduleCreated') {
            newId = Number(parsed.args.scheduleId);
            break;
          }
        } catch {
          /* not from vesting contract */
        }
      }

      setSubmitSuccess({ scheduleId: newId, hash: receipt?.hash || tx.hash });
      setForm(initialForm());
      await fetchSchedules();
    } catch (err: any) {
      setSubmitError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (id: number) => {
    if (!signer) return;
    setBusyRelease(id);
    try {
      const v = new ethers.Contract(vestingAddr, VESTING_ABI, signer);
      const tx = await v.release(id);
      await tx.wait();
      await fetchSchedules();
    } catch (err: any) {
      setListError(friendlyError(err));
    } finally {
      setBusyRelease(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Vesting & locks</h1>
          <p className="text-gray-400 text-sm mt-1">
            Lock tokens with a cliff or vest them linearly. Use this for team/treasury
            allocations or to lock LP tokens after a launch.
          </p>
        </div>

        {!vestingConfigured && (
          <Alert tone="warning" className="mb-6" title="Vesting contract not configured">
            Set <code>NEXT_PUBLIC_VESTING_ADDRESS</code> in your environment after deploying
            the latest contracts. Until then this page can't read or write schedules.
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Create form ───────────────────────────── */}
          <form onSubmit={handleCreate} className="card space-y-4">
            <h2 className="text-lg font-semibold">Create schedule</h2>

            <div>
              <label className="label-text">Token address</label>
              <input
                type="text"
                value={form.token}
                onChange={handleField('token')}
                placeholder="0x…"
                className="input-field mt-1.5 font-mono text-xs"
                required
              />
              <p className="field-hint">Any ERC20. For LP locks, paste your LP pair address.</p>
            </div>

            <div>
              <label className="label-text">Beneficiary address</label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  value={form.beneficiary}
                  onChange={handleField('beneficiary')}
                  placeholder="0x…"
                  className="input-field font-mono text-xs flex-1"
                  required
                />
                <button
                  type="button"
                  onClick={useMyAddress}
                  className="btn-secondary text-xs whitespace-nowrap"
                  disabled={!account}
                >
                  Use mine
                </button>
              </div>
              <p className="field-hint">Who can call <code>release()</code> on this schedule.</p>
            </div>

            <div>
              <label className="label-text">Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={handleField('amount')}
                placeholder="100000"
                className="input-field mt-1.5"
                min="0"
                step="any"
                required
              />
              <p className="field-hint">In token units. Decimals are read from the token.</p>
            </div>

            <div>
              <label className="label-text">Start</label>
              <input
                type="datetime-local"
                value={form.startISO}
                onChange={handleField('startISO')}
                className="input-field mt-1.5"
                required
              />
              <p className="field-hint">Vesting timer begins at this moment.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Cliff</label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="number"
                    value={form.cliffValue}
                    onChange={handleField('cliffValue')}
                    className="input-field flex-1"
                    min="0"
                    step="any"
                  />
                  <select
                    value={form.cliffUnit}
                    onChange={handleField('cliffUnit')}
                    className="input-field w-28"
                  >
                    <option value="seconds">sec</option>
                    <option value="minutes">min</option>
                    <option value="hours">hr</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-text">Linear</label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="number"
                    value={form.linearValue}
                    onChange={handleField('linearValue')}
                    className="input-field flex-1"
                    min="0"
                    step="any"
                  />
                  <select
                    value={form.linearUnit}
                    onChange={handleField('linearUnit')}
                    className="input-field w-28"
                  >
                    <option value="seconds">sec</option>
                    <option value="minutes">min</option>
                    <option value="hours">hr</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Linear = 0</strong> turns this into a pure timelock — everything releases
              at the cliff. Otherwise, tokens release linearly over the linear window starting
              at the cliff.
            </p>

            {submitError && (
              <Alert tone="error" onDismiss={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
            {submitSuccess && (
              <Alert tone="success" onDismiss={() => setSubmitSuccess(null)}>
                Schedule #{submitSuccess.scheduleId} created.{' '}
                <a
                  href={txUrl(submitSuccess.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View tx
                </a>
              </Alert>
            )}

            <button
              type="submit"
              disabled={submitting || !account || !vestingConfigured}
              className="w-full btn-primary"
            >
              {submitting ? (
                <>
                  <Icon name="spinner" size={14} /> Submitting…
                </>
              ) : !account ? (
                <>
                  <Icon name="wallet" size={14} /> Connect wallet to continue
                </>
              ) : (
                <>
                  <Icon name="lock" size={14} /> Approve & create
                </>
              )}
            </button>
            <p className="text-[11px] text-gray-500 text-center">
              Two transactions: ERC20 approve, then create. We skip the approve if your
              allowance is already enough.
            </p>
          </form>

          {/* ── My schedules ──────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {ownerFilter ? "Creator's schedules" : 'Your schedules'}
              </h2>
              <button
                onClick={fetchSchedules}
                disabled={loadingList || !lookupAddress || !vestingConfigured}
                className="btn-ghost text-xs"
                aria-label="Refresh"
              >
                <Icon name={loadingList ? 'spinner' : 'refresh'} size={14} />
              </button>
            </div>

            {ownerFilter && (
              <p className="text-xs text-gray-500 mb-3 break-all">
                Filtered to <span className="font-mono">{ownerFilter}</span>.{' '}
                <button
                  onClick={() => router.push('/vesting', undefined, { shallow: true })}
                  className="underline"
                >
                  Show mine
                </button>
              </p>
            )}

            {!account && !ownerFilter && (
              <p className="text-sm text-gray-400">Connect a wallet to see your schedules.</p>
            )}

            {listError && (
              <Alert tone="error" className="mb-3" onDismiss={() => setListError(null)}>
                {listError}
              </Alert>
            )}

            {lookupAddress && !loadingList && schedules.length === 0 && !listError && (
              <p className="text-sm text-gray-500">No schedules found.</p>
            )}

            <div className="space-y-3">
              {schedules.map((row) => (
                <ScheduleRow
                  key={row.id}
                  row={row}
                  account={account}
                  busy={busyRelease === row.id}
                  onRelease={handleRelease}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface ScheduleRowProps {
  row: EnrichedSchedule;
  account: string | null;
  busy: boolean;
  onRelease: (id: number) => void;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({ row, account, busy, onRelease }) => {
  const { schedule, releasable, tokenSymbol, tokenDecimals, role, id } = row;
  const total = schedule.totalAmount;
  const released = schedule.released;
  const vested = released + releasable;
  const pct = total > 0n ? Number((vested * 10000n) / total) / 100 : 0;
  const cliffEnd = Number(schedule.start + schedule.cliffSeconds) * 1000;
  const linearEnd = cliffEnd + Number(schedule.linearSeconds) * 1000;
  const isTimelock = schedule.linearSeconds === 0n;
  const fmt = (v: bigint) => Number(ethers.formatUnits(v, tokenDecimals)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
  const isBeneficiary =
    !!account && schedule.beneficiary.toLowerCase() === account.toLowerCase();
  const fullyReleased = released === total;

  return (
    <div className="bg-surface-2 border border-white/5 rounded-lg p-3 text-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-2 flex-wrap">
            <span className="text-base">
              {fmt(total)} {tokenSymbol}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isTimelock
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'bg-sky-500/10 text-sky-300'
              }`}
            >
              {isTimelock ? 'Timelock' : 'Vesting'}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
              {role === 'both' ? 'creator + beneficiary' : role}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Schedule #{id}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Releasable</p>
          <p className="font-mono text-sm">{fmt(releasable)}</p>
        </div>
      </div>

      <ProgressBar raised={vested} hardcap={total} />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{pct.toFixed(2)}% vested</span>
        <span>{fmt(released)} released</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-xs">
        <dt className="text-gray-500">Beneficiary</dt>
        <dd className="text-right">
          <AddressLink address={schedule.beneficiary} />
        </dd>
        <dt className="text-gray-500">Token</dt>
        <dd className="text-right">
          <AddressLink address={schedule.token} variant="token" />
        </dd>
        <dt className="text-gray-500">Cliff ends</dt>
        <dd className="text-right">{new Date(cliffEnd).toLocaleString()}</dd>
        {!isTimelock && (
          <>
            <dt className="text-gray-500">Linear ends</dt>
            <dd className="text-right">{new Date(linearEnd).toLocaleString()}</dd>
          </>
        )}
      </dl>

      {isBeneficiary && !fullyReleased && (
        <button
          onClick={() => onRelease(id)}
          disabled={busy || releasable === 0n}
          className="w-full btn-primary mt-3"
        >
          {busy ? (
            <>
              <Icon name="spinner" size={12} /> Releasing…
            </>
          ) : releasable === 0n ? (
            'Nothing to release yet'
          ) : (
            <>
              <Icon name="arrow-down" size={12} /> Release {fmt(releasable)} {tokenSymbol}
            </>
          )}
        </button>
      )}
      {fullyReleased && (
        <p className="text-xs text-emerald-400 mt-3 text-center">Fully released ✓</p>
      )}
    </div>
  );
};
