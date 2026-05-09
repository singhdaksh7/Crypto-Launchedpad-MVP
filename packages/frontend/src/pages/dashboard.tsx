import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import {
  getContractAddresses,
  getProvider,
  isValidAddress,
  parseEther,
} from '@/lib/web3';
import {
  PresaleConfig,
  formatEther,
  getPresaleStatus,
  progressPct,
  softcapReached,
} from '@/lib/presale';
import { friendlyError, formatBnb } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Alert } from '@/components/ui/Alert';
import { AddressLink } from '@/components/ui/AddressLink';

interface MyPresale extends PresaleConfig {
  id: number;
  tokenName: string;
  tokenSymbol: string;
}

interface FormData {
  tokenAddress: string;
  tokenPrice: string;
  softcap: string;
  hardcap: string;
  startTime: string;
  endTime: string;
  maxBuyPerUser: string;
}

const EMPTY_FORM: FormData = {
  tokenAddress: '',
  tokenPrice: '',
  softcap: '',
  hardcap: '',
  startTime: '',
  endTime: '',
  maxBuyPerUser: '',
};

function validateForm(d: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (!isValidAddress(d.tokenAddress)) {
    errors.tokenAddress = 'Enter a valid token address.';
  }
  const price = parseFloat(d.tokenPrice);
  if (!price || price <= 0) errors.tokenPrice = 'Price must be greater than 0.';
  const soft = parseFloat(d.softcap);
  const hard = parseFloat(d.hardcap);
  const max = parseFloat(d.maxBuyPerUser);
  if (!soft || soft <= 0) errors.softcap = 'Softcap must be greater than 0.';
  if (!hard || hard <= 0) errors.hardcap = 'Hardcap must be greater than 0.';
  if (soft && hard && soft >= hard) {
    errors.hardcap = 'Hardcap must be greater than softcap.';
  }
  if (!max || max <= 0) errors.maxBuyPerUser = 'Max per user must be greater than 0.';
  if (max && hard && max > hard) {
    errors.maxBuyPerUser = 'Max per user can’t exceed hardcap.';
  }

  const now = Math.floor(Date.now() / 1000);
  const start = d.startTime ? Math.floor(new Date(d.startTime).getTime() / 1000) : 0;
  const end = d.endTime ? Math.floor(new Date(d.endTime).getTime() / 1000) : 0;
  if (!start) errors.startTime = 'Pick a start time.';
  else if (start < now - 60) errors.startTime = 'Start must be in the future.';
  if (!end) errors.endTime = 'Pick an end time.';
  else if (start && end <= start) errors.endTime = 'End must be after start.';
  return errors;
}

export default function Dashboard() {
  const router = useRouter();
  const { account, signer } = useWeb3Store();
  const [tab, setTab] = useState<'create' | 'manage'>('create');

  /* ── Create form ───────────────────────────────── */
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<{ msg: string; hash?: string } | null>(null);

  useEffect(() => {
    if (router.query.token && typeof router.query.token === 'string') {
      setFormData((p) => ({ ...p, tokenAddress: router.query.token as string }));
    }
  }, [router.query.token]);

  const liveErrors = useMemo(() => validateForm(formData), [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePresale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateForm(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0 || !signer) {
      if (!signer) setFormError('Connect your wallet first.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      setFormSuccess(null);

      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);

      const tx = await contract.createPresale(
        formData.tokenAddress,
        parseEther(formData.tokenPrice),
        parseEther(formData.softcap),
        parseEther(formData.hardcap),
        Math.floor(new Date(formData.startTime).getTime() / 1000),
        Math.floor(new Date(formData.endTime).getTime() / 1000),
        parseEther(formData.maxBuyPerUser),
      );
      const receipt = await tx.wait();

      setFormSuccess({
        msg: 'Presale created. View it from My Presales.',
        hash: receipt?.hash || tx.hash,
      });
      setFormData(EMPTY_FORM);
      setSubmitted(false);
      setFormErrors({});
    } catch (err: any) {
      setFormError(friendlyError(err));
    } finally {
      setFormLoading(false);
    }
  };

  const showError = (field: keyof FormData) =>
    submitted && (formErrors[field] || liveErrors[field]);

  /* ── My presales ───────────────────────────────── */
  const [myPresales, setMyPresales] = useState<MyPresale[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<
    { type: 'error' | 'success'; text: string; hash?: string } | null
  >(null);

  const fetchMyPresales = useCallback(async () => {
    if (!account) return;
    try {
      setManageLoading(true);
      setManageError(null);
      const provider = getProvider();
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
      const counter: bigint = await contract.presaleCounter();
      const total = Number(counter);
      if (total === 0) {
        setMyPresales([]);
        return;
      }
      const all = await Promise.all(
        Array.from({ length: total }, (_, i) =>
          contract.getPresaleDetails(i).then((d: PresaleConfig) => ({ ...d, id: i })),
        ),
      );
      const mine = all.filter(
        (p) => p.owner.toLowerCase() === account.toLowerCase(),
      );
      const enriched = await Promise.all(
        mine.map(async (p) => {
          let tokenName = '';
          let tokenSymbol = '';
          try {
            const token = new ethers.Contract(p.tokenAddress, ERC20_ABI, provider);
            [tokenName, tokenSymbol] = await Promise.all([token.name(), token.symbol()]);
          } catch {}
          return { ...p, tokenName, tokenSymbol } as MyPresale;
        }),
      );
      setMyPresales(enriched.reverse());
    } catch (err: any) {
      setManageError(friendlyError(err));
    } finally {
      setManageLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (tab === 'manage') fetchMyPresales();
  }, [tab, fetchMyPresales]);

  const handleWithdraw = async (presaleId: number) => {
    if (!signer) return;
    try {
      setTxLoading(true);
      setTxMsg(null);
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);
      const tx = await contract.withdrawFunds(presaleId);
      const receipt = await tx.wait();
      setTxMsg({ type: 'success', text: 'Funds withdrawn.', hash: receipt?.hash || tx.hash });
      fetchMyPresales();
    } catch (err: any) {
      setTxMsg({ type: 'error', text: friendlyError(err) });
    } finally {
      setTxLoading(false);
    }
  };

  /* ── Render ────────────────────────────────────── */
  if (!account) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="card text-center py-16">
            <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-300 mb-3">
              <Icon name="wallet" size={20} />
            </div>
            <p className="text-lg font-medium mb-1">Wallet required</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Connect a wallet to create presales and manage your launches.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Create presales and manage your launches.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex border-b border-white/5 mb-6">
          {(['create', 'manage'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium relative transition-colors ${
                tab === t
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create'
                ? 'Create presale'
                : `My presales${myPresales.length ? ` (${myPresales.length})` : ''}`}
              {tab === t && (
                <span className="absolute left-0 bottom-0 h-0.5 w-full bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        {/* ── Create tab ─────────────────────────────── */}
        {tab === 'create' && (
          <div className="space-y-4">
            {formError && <Alert tone="error" onDismiss={() => setFormError(null)}>{formError}</Alert>}
            {formSuccess && (
              <Alert
                tone="success"
                onDismiss={() => setFormSuccess(null)}
                title={formSuccess.msg}
              >
                <div className="flex flex-wrap gap-3 items-center mt-1">
                  <button
                    onClick={() => setTab('manage')}
                    className="underline underline-offset-2 text-sm"
                  >
                    View my presales
                  </button>
                  {formSuccess.hash && (
                    <a
                      href={txUrl(formSuccess.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 text-sm inline-flex items-center gap-1"
                    >
                      View transaction <Icon name="external" size={12} />
                    </a>
                  )}
                </div>
              </Alert>
            )}

            <form onSubmit={handleCreatePresale} className="card space-y-5">
              <div>
                <label className="label-text">Token address</label>
                <input
                  type="text"
                  name="tokenAddress"
                  value={formData.tokenAddress}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="input-field mt-1.5 font-mono text-sm"
                  spellCheck={false}
                />
                {showError('tokenAddress') ? (
                  <p className="field-error">{formErrors.tokenAddress || liveErrors.tokenAddress}</p>
                ) : (
                  !formData.tokenAddress && (
                    <p className="field-hint">
                      Don’t have a token yet?{' '}
                      <Link href="/create-token" className="text-primary-400 hover:underline">
                        Create one
                      </Link>
                    </p>
                  )
                )}
              </div>

              <div>
                <label className="label-text">Token price (BNB per token)</label>
                <input
                  type="number"
                  name="tokenPrice"
                  value={formData.tokenPrice}
                  onChange={handleChange}
                  placeholder="0.0001"
                  className="input-field mt-1.5"
                  step="0.00001"
                  min="0"
                />
                {showError('tokenPrice') && (
                  <p className="field-error">{formErrors.tokenPrice || liveErrors.tokenPrice}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Softcap (BNB)</label>
                  <input
                    type="number"
                    name="softcap"
                    value={formData.softcap}
                    onChange={handleChange}
                    placeholder="1"
                    className="input-field mt-1.5"
                    step="0.01"
                    min="0"
                  />
                  {showError('softcap') && (
                    <p className="field-error">{formErrors.softcap || liveErrors.softcap}</p>
                  )}
                </div>
                <div>
                  <label className="label-text">Hardcap (BNB)</label>
                  <input
                    type="number"
                    name="hardcap"
                    value={formData.hardcap}
                    onChange={handleChange}
                    placeholder="10"
                    className="input-field mt-1.5"
                    step="0.01"
                    min="0"
                  />
                  {showError('hardcap') && (
                    <p className="field-error">{formErrors.hardcap || liveErrors.hardcap}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Start time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="input-field mt-1.5"
                  />
                  {showError('startTime') && (
                    <p className="field-error">{formErrors.startTime || liveErrors.startTime}</p>
                  )}
                </div>
                <div>
                  <label className="label-text">End time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="input-field mt-1.5"
                  />
                  {showError('endTime') && (
                    <p className="field-error">{formErrors.endTime || liveErrors.endTime}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label-text">Max buy per wallet (BNB)</label>
                <input
                  type="number"
                  name="maxBuyPerUser"
                  value={formData.maxBuyPerUser}
                  onChange={handleChange}
                  placeholder="1"
                  className="input-field mt-1.5"
                  step="0.01"
                  min="0"
                />
                {showError('maxBuyPerUser') && (
                  <p className="field-error">
                    {formErrors.maxBuyPerUser || liveErrors.maxBuyPerUser}
                  </p>
                )}
              </div>

              <Alert tone="info">
                Make sure the launchpad contract is approved to transfer the
                token amount you intend to sell. The protocol takes 2.5% of raised
                BNB on successful sales.
              </Alert>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full btn-primary"
              >
                {formLoading ? (
                  <>
                    <Icon name="spinner" size={14} /> Creating presale…
                  </>
                ) : (
                  'Create presale'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Manage tab ─────────────────────────────── */}
        {tab === 'manage' && (
          <div className="space-y-4">
            {txMsg && (
              <Alert
                tone={txMsg.type}
                onDismiss={() => setTxMsg(null)}
                title={txMsg.text}
              >
                {txMsg.hash && (
                  <a
                    href={txUrl(txMsg.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-sm inline-flex items-center gap-1"
                  >
                    View transaction <Icon name="external" size={12} />
                  </a>
                )}
              </Alert>
            )}

            {manageError && (
              <Alert tone="error" onDismiss={() => setManageError(null)}>{manageError}</Alert>
            )}

            {manageLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="card animate-pulse space-y-3">
                    <div className="h-5 bg-white/5 rounded w-1/2" />
                    <div className="h-2 bg-white/5 rounded" />
                    <div className="h-8 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : myPresales.length === 0 ? (
              <div className="card text-center py-14">
                <p className="text-gray-300 mb-1">No presales yet</p>
                <p className="text-gray-500 text-sm mb-5">
                  Configure your first presale to share with your community.
                </p>
                <button onClick={() => setTab('create')} className="btn-primary">
                  Create your first presale
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myPresales.map((p) => (
                  <ManageCard
                    key={p.id}
                    presale={p}
                    onWithdraw={handleWithdraw}
                    txLoading={txLoading}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

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

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {presale.tokenName || 'Unknown'}
            {presale.tokenSymbol && (
              <span className="text-gray-500 font-normal ml-1.5 text-sm">
                {presale.tokenSymbol}
              </span>
            )}
          </h3>
          <div className="text-xs text-gray-500 mt-1">
            Presale #{presale.id} · <AddressLink address={presale.tokenAddress} variant="token" />
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{pct.toFixed(1)}% raised</span>
          <span className="text-gray-300 tabular-nums">
            {formatBnb(raisedBnb)} / {formatBnb(hardcapBnb)} BNB
          </span>
        </div>
        <ProgressBar raised={presale.totalRaised} hardcap={presale.hardcap} size="sm" />
        <p className="text-xs text-gray-500 mt-1.5">
          Softcap {formatBnb(softcapBnb)} BNB {reached && '· reached'}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href={`/presale/${presale.id}`} className="btn-secondary flex-1 justify-center">
          View
        </Link>
        {status === 'ended' && reached && !presale.isFinalized && (
          <button
            onClick={() => onWithdraw(presale.id)}
            disabled={txLoading}
            className="btn-warning flex-1 justify-center"
          >
            {txLoading ? (
              <>
                <Icon name="spinner" size={14} /> Processing…
              </>
            ) : (
              'Withdraw funds'
            )}
          </button>
        )}
      </div>
    </div>
  );
};
