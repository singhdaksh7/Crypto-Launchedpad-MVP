import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { Icon } from '@/components/ui/Icon';
import { AlertBanner, AddressLink, KeyValueList, EmptyState, Button, FormInput, DateTimeInput, ProgressBar } from '@/components/ui';
import { VESTING_ABI } from '@/lib/abis/Vesting';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, isZeroAddress } from '@/lib/web3';
import { friendlyError } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { getPresaleStatus, softcapReached, formatEther } from '@/lib/presale';
import { ClaimPanel, RefundPanel } from '@/components/presale/ActionBox';
import { VestingScheduleBar } from '@/components/presale/VestingScheduleBar';

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
  const { vesting: vestingAddr, launchpad: launchpadAddr } = getContractAddresses();
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

  // Presale contributions claimed/refunded state
  const [contributions, setContributions] = useState<any[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const [contribTxLoading, setContribTxLoading] = useState<Record<number, boolean>>({});

  const ownerFilter = useMemo(() => {
    const v = router.query.owner;
    return typeof v === 'string' && isValidAddress(v) ? v.toLowerCase() : null;
  }, [router.query.owner]);

  const lookupAddress = ownerFilter || account?.toLowerCase() || null;

  // Fetch contributed presales
  const fetchContributions = useCallback(async () => {
    if (!account) {
      setContributions([]);
      return;
    }
    try {
      setLoadingContribs(true);
      const provider = getProvider();
      const contract = new ethers.Contract(launchpadAddr, LAUNCHPAD_ABI, provider);
      const counter: bigint = await contract.presaleCounter();
      const total = Number(counter);

      const list = await Promise.all(
        Array.from({ length: total }, async (_, i) => {
          try {
            const c = await contract.getUserContribution(i, account);
            if (c.amount > 0n) {
              const details = await contract.getPresaleDetails(i);
              const status = getPresaleStatus({
                ...details,
                isActive: details.isActive,
                isFinalized: details.isFinalized,
              });
              const reached = softcapReached({
                ...details,
                totalRaised: details.totalRaised,
                softcap: details.softcap,
              });

              // Fetch ERC20 info
              let name = 'Unknown';
              let symbol = 'TKN';
              try {
                const token = new ethers.Contract(details.tokenAddress, ERC20_ABI, provider);
                [name, symbol] = await Promise.all([token.name(), token.symbol()]);
              } catch {}

              return {
                id: i,
                amount: c.amount,
                tokenAmount: c.tokenAmount,
                claimed: c.claimed,
                status,
                reached,
                tokenAddress: details.tokenAddress,
                tokenName: name,
                tokenSymbol: symbol,
              };
            }
          } catch (e) {
            console.error('Failed to read contribution', i, e);
          }
          return null;
        })
      );
      setContributions(list.filter((c) => c !== null));
    } catch (err) {
      console.error('Failed to load contributions', err);
    } finally {
      setLoadingContribs(false);
    }
  }, [account, launchpadAddr]);

  // Fetch standard vesting schedules
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
      const [creatorIdsRaw, beneficiaryIdsRaw] = await Promise.all([
        v.schedulesOfCreator(lookupAddress),
        v.schedulesOfBeneficiary(lookupAddress),
      ]);
      
      const idSet = new Set<number>();
      creatorIdsRaw.forEach((x: any) => idSet.add(Number(x)));
      beneficiaryIdsRaw.forEach((x: any) => idSet.add(Number(x)));
      const allIds = Array.from(idSet).sort((a, b) => a - b);

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
          const isCreator = schedule.creator.toLowerCase() === lookupAddress.toLowerCase();
          const isBeneficiary = schedule.beneficiary.toLowerCase() === lookupAddress.toLowerCase();
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
    fetchContributions();
  }, [fetchSchedules, fetchContributions]);

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
      setSubmitError('Vesting contract not configured.');
      return;
    }
    if (!isValidAddress(form.token) || !isValidAddress(form.beneficiary)) {
      setSubmitError('Invalid contract addresses.');
      return;
    }
    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmitError('Amount must be greater than 0.');
      return;
    }

    const cliffSeconds = Math.floor(Number(form.cliffValue) * UNIT_SECONDS[form.cliffUnit]);
    const linearSeconds = Math.floor(Number(form.linearValue) * UNIT_SECONDS[form.linearUnit]);
    const startSeconds = Math.floor(new Date(form.startISO).getTime() / 1000);

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const token = new ethers.Contract(form.token, ERC20_ABI, signer);
      const decimals = Number(await token.decimals());
      const amountWei = ethers.parseUnits(form.amount, decimals);

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
      let newId = -1;
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = v.interface.parseLog(log);
          if (parsed && parsed.name === 'ScheduleCreated') {
            newId = Number(parsed.args.scheduleId);
            break;
          }
        } catch {}
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

  // Claim presale contribution tokens
  const handlePresaleClaim = async (presaleId: number) => {
    if (!signer) return;
    setContribTxLoading((prev) => ({ ...prev, [presaleId]: true }));
    try {
      const contract = new ethers.Contract(launchpadAddr, LAUNCHPAD_ABI, signer);
      const tx = await contract.claimTokens(presaleId);
      await tx.wait();
      await fetchContributions();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setContribTxLoading((prev) => ({ ...prev, [presaleId]: false }));
    }
  };

  // Refund presale contribution BNB
  const handlePresaleRefund = async (presaleId: number) => {
    if (!signer) return;
    setContribTxLoading((prev) => ({ ...prev, [presaleId]: true }));
    try {
      const contract = new ethers.Contract(launchpadAddr, LAUNCHPAD_ABI, signer);
      const tx = await contract.refundContribution(presaleId);
      await tx.wait();
      await fetchContributions();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setContribTxLoading((prev) => ({ ...prev, [presaleId]: false }));
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-10 select-none">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white select-none">Vesting & Timelocks</h1>
          <p className="text-ink-400 text-sm mt-1 select-none font-semibold">
            Claim presale allocations, manage LP locks, and unlock creator-configured schedules.
          </p>
        </div>

        {/* 1. Presale Contributions claims */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Presale Claim & Refund Center</h2>
          {!account ? (
            <div className="card text-center py-8">
              <p className="text-xs text-ink-500 font-semibold">Connect your wallet to manage your presale positions.</p>
            </div>
          ) : loadingContribs ? (
            <div className="card animate-pulse py-10 space-y-2">
              <div className="h-4 bg-white/5 rounded w-1/3 mx-auto" />
              <div className="h-2 bg-white/5 rounded w-1/4 mx-auto" />
            </div>
          ) : contributions.length === 0 ? (
            <EmptyState
              icon="lock"
              title="No launchpad contributions found"
              body="You have not participated in any token presales using this wallet. Browse live launches to contribute."
              CTA={<Link href="/launchpads" className="btn-primary text-xs px-5 py-2">Browse Launches</Link>}
            />
          ) : (
            <div className="space-y-4">
              {contributions.map((c) => {
                const totalTokens = formatEther(c.tokenAmount);
                const claimedTokens = c.claimed ? totalTokens : '0';
                const isClaim = c.status === 'ended' && c.reached;
                const isRefund = c.status === 'ended' && !c.reached;

                return (
                  <div key={c.id} className="card p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <h4 className="font-semibold text-white truncate">{c.tokenName} ({c.tokenSymbol})</h4>
                      <p className="text-[11px] text-ink-500 font-bold mt-1 uppercase tracking-wider">Presale #{c.id}</p>
                    </div>

                    <div className="flex-1">
                      <VestingScheduleBar total={totalTokens} claimed={claimedTokens} className="bg-transparent border-0 p-0" />
                    </div>

                    <div className="flex justify-end">
                      {isClaim && (
                        <ClaimPanel
                          claimable={totalTokens}
                          contribution={formatEther(c.amount)}
                          eligible={true}
                          loading={contribTxLoading[c.id] || false}
                          onClaim={() => handlePresaleClaim(c.id)}
                          alreadyClaimed={c.claimed}
                        />
                      )}
                      {isRefund && (
                        <RefundPanel
                          refundable={formatEther(c.amount)}
                          loading={contribTxLoading[c.id] || false}
                          onRefund={() => handlePresaleRefund(c.id)}
                        />
                      )}
                      {c.status === 'active' && (
                        <span className="text-xs text-bnb-text bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20 font-bold">
                          Active Contribution
                        </span>
                      )}
                      {c.status === 'upcoming' && (
                        <span className="text-xs text-ink-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-semibold">
                          Upcoming Sale
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Custom schedules */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-white/5">
          {/* Create form */}
          <form onSubmit={handleCreate} className="card space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Lock Allocations / LP</h2>
            
            <FormInput
              label="Token Address"
              value={form.token}
              onChange={handleField('token')}
              placeholder="0x..."
              className="font-mono text-xs"
              required
              helperText="Decimals are automatically queried on-chain."
            />

            <div className="space-y-1">
              <label className="label-text text-xs uppercase tracking-wider font-semibold">Beneficiary Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.beneficiary}
                  onChange={handleField('beneficiary')}
                  placeholder="0x..."
                  className="input-field font-mono text-xs flex-1"
                  required
                />
                <Button type="button" variant="secondary" onClick={useMyAddress} disabled={!account} className="text-xs">
                  Use Mine
                </Button>
              </div>
            </div>

            <FormInput
              label="Amount to Lock"
              type="number"
              value={form.amount}
              onChange={handleField('amount')}
              placeholder="100000"
              required
            />

            <DateTimeInput
              label="Vesting Start Time"
              value={form.startISO}
              onChange={handleField('startISO')}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text text-xs uppercase tracking-wider font-semibold mb-1">Cliff Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.cliffValue}
                    onChange={handleField('cliffValue')}
                    className="input-field flex-1 text-sm"
                    min="0"
                  />
                  <select value={form.cliffUnit} onChange={handleField('cliffUnit')} className="input-field w-20 text-xs bg-surface-2">
                    <option value="seconds">sec</option>
                    <option value="minutes">min</option>
                    <option value="hours">hr</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-text text-xs uppercase tracking-wider font-semibold mb-1">Linear Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.linearValue}
                    onChange={handleField('linearValue')}
                    className="input-field flex-1 text-sm"
                    min="0"
                  />
                  <select value={form.linearUnit} onChange={handleField('linearUnit')} className="input-field w-20 text-xs bg-surface-2">
                    <option value="seconds">sec</option>
                    <option value="minutes">min</option>
                    <option value="hours">hr</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            </div>

            {submitError && <AlertBanner variant="error" onDismiss={() => setSubmitError(null)}>{submitError}</AlertBanner>}
            {submitSuccess && (
              <AlertBanner variant="success" onDismiss={() => setSubmitSuccess(null)}>
                Lock schedule #{submitSuccess.scheduleId} created.{' '}
                <a href={txUrl(submitSuccess.hash)} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                  View Tx
                </a>
              </AlertBanner>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !account || !vestingConfigured}
              className="w-full"
            >
              {submitting ? 'Creating schedule...' : 'Lock Tokens'}
            </Button>
          </form>

          {/* List of custom vesting contracts */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Custom Locks & Timelocks</h2>
              <button
                onClick={fetchSchedules}
                disabled={loadingList || !lookupAddress || !vestingConfigured}
                className="text-ink-400 hover:text-white"
              >
                <Icon name={loadingList ? 'spinner' : 'refresh'} size={14} className={loadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {listError && <AlertBanner variant="error">{listError}</AlertBanner>}

            {schedules.length === 0 ? (
              <p className="text-xs text-ink-500 font-semibold">No custom locked allocations or LP tokens found.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {schedules.map((row) => {
                  const total = row.schedule.totalAmount;
                  const released = row.schedule.released;
                  const releasable = row.releasable;
                  const vested = released + releasable;
                  const pct = total > 0n ? Number((vested * 10000n) / total) / 100 : 0;
                  const fmt = (val: bigint) => Number(ethers.formatUnits(val, row.tokenDecimals)).toLocaleString();
                  const isBeneficiary = !!account && row.schedule.beneficiary.toLowerCase() === account.toLowerCase();
                  const fullyReleased = released === total;

                  return (
                    <div key={row.id} className="bg-black/10 border border-white/5 p-4 rounded-xl space-y-3 text-xs font-semibold">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold">{fmt(total)} {row.tokenSymbol}</p>
                          <p className="text-[10px] text-ink-500 mt-0.5">Schedule #{row.id} · {row.role}</p>
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                          row.schedule.linearSeconds === 0n ? 'bg-amber-500/10 text-amber-300' : 'bg-sky-500/10 text-sky-300'
                        }`}>
                          {row.schedule.linearSeconds === 0n ? 'Timelock' : 'Vesting'}
                        </span>
                      </div>

                      <ProgressBar value={vested} max={total} showMarker={false} />
                      <div className="flex justify-between text-[10px] text-ink-400">
                        <span>{pct.toFixed(2)}% vested</span>
                        <span>{fmt(released)} released</span>
                      </div>

                      {isBeneficiary && !fullyReleased && (
                        <Button
                          variant="primary"
                          onClick={() => handleRelease(row.id)}
                          disabled={busyRelease === row.id || releasable === 0n}
                          className="w-full text-xs py-2 mt-2"
                        >
                          {releasable === 0n ? 'No unlocked tokens' : `Release ${fmt(releasable)} ${row.tokenSymbol}`}
                        </Button>
                      )}
                      {fullyReleased && <p className="text-[10px] text-emerald-400 text-center font-bold">Released ✓</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
