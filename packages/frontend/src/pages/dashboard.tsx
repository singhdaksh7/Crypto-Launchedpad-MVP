import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, parseEther, formatEther, formatAddress } from '@/lib/web3';

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

interface MyPresale extends PresaleConfig {
  id: number;
  tokenName: string;
  tokenSymbol: string;
}

type Status = 'upcoming' | 'active' | 'ended' | 'finalized';

function getStatus(p: PresaleConfig): Status {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (p.isFinalized) return 'finalized';
  if (now < p.startTime) return 'upcoming';
  if (now >= p.startTime && now < p.endTime) return 'active';
  return 'ended';
}

const STATUS_STYLES: Record<Status, string> = {
  upcoming: 'bg-blue-900 text-blue-300',
  active: 'bg-green-900 text-green-300',
  ended: 'bg-gray-700 text-gray-300',
  finalized: 'bg-purple-900 text-purple-300',
};

function MyPresaleCard({
  presale,
  onWithdraw,
  txLoading,
}: {
  presale: MyPresale;
  onWithdraw: (id: number) => void;
  txLoading: boolean;
}) {
  const status = getStatus(presale);
  const raisedEth = parseFloat(formatEther(presale.totalRaised));
  const hardcapEth = parseFloat(formatEther(presale.hardcap));
  const softcapEth = parseFloat(formatEther(presale.softcap));
  const pct = hardcapEth > 0 ? Math.min((raisedEth / hardcapEth) * 100, 100) : 0;
  const softcapReached = presale.totalRaised >= presale.softcap;

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">
            {presale.tokenName || 'Unknown'}
            {presale.tokenSymbol && <span className="text-primary ml-1 text-sm">({presale.tokenSymbol})</span>}
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Presale #{presale.id}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Raised ({pct.toFixed(1)}%)</span>
          <span>{raisedEth.toFixed(4)} / {hardcapEth} BNB</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#8b5cf6',
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Softcap: {softcapEth} BNB {softcapReached ? '✅' : ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div>
          <span className="block text-gray-500">Start</span>
          {new Date(Number(presale.startTime) * 1000).toLocaleDateString()}
        </div>
        <div>
          <span className="block text-gray-500">End</span>
          {new Date(Number(presale.endTime) * 1000).toLocaleDateString()}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Link href={`/presale/${presale.id}`} className="flex-1 btn-secondary text-center text-sm py-1.5">
          View
        </Link>
        {status === 'ended' && softcapReached && !presale.isFinalized && (
          <button
            onClick={() => onWithdraw(presale.id)}
            disabled={txLoading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {txLoading ? '...' : 'Withdraw'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { account, signer } = useWeb3Store();
  const [tab, setTab] = useState<'create' | 'manage'>('create');

  // Create presale form
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tokenAddress: '',
    tokenPrice: '',
    softcap: '',
    hardcap: '',
    startTime: '',
    endTime: '',
    maxBuyPerUser: '',
  });

  // Pre-fill from ?token= query param
  useEffect(() => {
    if (router.query.token && typeof router.query.token === 'string') {
      setFormData((prev) => ({ ...prev, tokenAddress: router.query.token as string }));
    }
  }, [router.query.token]);

  // My presales
  const [myPresales, setMyPresales] = useState<MyPresale[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
      if (total === 0) { setMyPresales([]); return; }

      const all = await Promise.all(
        Array.from({ length: total }, (_, i) => contract.getPresaleDetails(i).then((d: PresaleConfig) => ({ ...d, id: i })))
      );

      const mine = all.filter((p) => p.owner.toLowerCase() === account.toLowerCase());

      const enriched = await Promise.all(
        mine.map(async (p) => {
          let tokenName = '', tokenSymbol = '';
          try {
            const token = new ethers.Contract(p.tokenAddress, ERC20_ABI, provider);
            [tokenName, tokenSymbol] = await Promise.all([token.name(), token.symbol()]);
          } catch {}
          return { ...p, tokenName, tokenSymbol } as MyPresale;
        })
      );

      setMyPresales(enriched.reverse());
    } catch (err: any) {
      setManageError(err.message || 'Failed to fetch presales');
    } finally {
      setManageLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (tab === 'manage') fetchMyPresales();
  }, [tab, fetchMyPresales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePresale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) { setFormError('Please connect wallet first'); return; }
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
        parseEther(formData.maxBuyPerUser)
      );
      await tx.wait();

      setFormSuccess('Presale created! View it in the My Presales tab.');
      setFormData({ tokenAddress: '', tokenPrice: '', softcap: '', hardcap: '', startTime: '', endTime: '', maxBuyPerUser: '' });
    } catch (err: any) {
      setFormError(err.reason || err.message || 'Failed to create presale');
    } finally {
      setFormLoading(false);
    }
  };

  const handleWithdraw = async (presaleId: number) => {
    if (!signer) return;
    try {
      setTxLoading(true);
      setTxMsg(null);
      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);
      const tx = await contract.withdrawFunds(presaleId);
      await tx.wait();
      setTxMsg({ type: 'success', text: 'Funds withdrawn successfully!' });
      fetchMyPresales();
    } catch (err: any) {
      setTxMsg({ type: 'error', text: err.reason || err.message || 'Withdrawal failed' });
    } finally {
      setTxLoading(false);
    }
  };

  if (!account) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="card text-center py-16">
            <p className="text-gray-400 mb-2">Connect your wallet to access the dashboard</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-400 font-mono">{formatAddress(account)}</p>
        </div>

        <div className="flex gap-0 mb-8 border-b border-gray-800">
          {(['create', 'manage'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition ${
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create Presale' : `My Presales${myPresales.length ? ` (${myPresales.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* ── Create Presale tab ── */}
        {tab === 'create' && (
          <>
            {formError && (
              <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-200 text-sm">{formError}</div>
            )}
            {formSuccess && (
              <div className="bg-green-900 border border-green-700 p-4 rounded-lg mb-6 text-green-200 text-sm">
                {formSuccess}{' '}
                <button onClick={() => setTab('manage')} className="underline font-medium">View now</button>
              </div>
            )}
            <form onSubmit={handleCreatePresale} className="card space-y-6">
              <div>
                <label className="label-text">Token Address</label>
                <input
                  type="text"
                  name="tokenAddress"
                  value={formData.tokenAddress}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="input-field mt-2"
                  required
                />
                {!formData.tokenAddress && (
                  <p className="text-xs text-gray-500 mt-1">
                    Don't have a token?{' '}
                    <Link href="/create-token" className="text-primary hover:underline">Create one first</Link>
                  </p>
                )}
              </div>

              <div>
                <label className="label-text">Token Price (BNB per token)</label>
                <input
                  type="number"
                  name="tokenPrice"
                  value={formData.tokenPrice}
                  onChange={handleChange}
                  placeholder="0.0001"
                  className="input-field mt-2"
                  required
                  step="0.00001"
                  min="0.00001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Softcap (BNB)</label>
                  <input type="number" name="softcap" value={formData.softcap} onChange={handleChange}
                    placeholder="1" className="input-field mt-2" required step="0.01" min="0.01" />
                </div>
                <div>
                  <label className="label-text">Hardcap (BNB)</label>
                  <input type="number" name="hardcap" value={formData.hardcap} onChange={handleChange}
                    placeholder="10" className="input-field mt-2" required step="0.01" min="0.01" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Start Time</label>
                  <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange}
                    className="input-field mt-2" required />
                </div>
                <div>
                  <label className="label-text">End Time</label>
                  <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange}
                    className="input-field mt-2" required />
                </div>
              </div>

              <div>
                <label className="label-text">Max Buy Per User (BNB)</label>
                <input type="number" name="maxBuyPerUser" value={formData.maxBuyPerUser} onChange={handleChange}
                  placeholder="1" className="input-field mt-2" required step="0.01" min="0.01" />
              </div>

              <button type="submit" disabled={formLoading} className="w-full btn-primary disabled:opacity-50">
                {formLoading ? 'Creating...' : 'Create Presale'}
              </button>
            </form>
          </>
        )}

        {/* ── My Presales tab ── */}
        {tab === 'manage' && (
          <div>
            {txMsg && (
              <div className={`p-4 rounded-lg mb-6 text-sm border ${
                txMsg.type === 'success'
                  ? 'bg-green-900 border-green-700 text-green-200'
                  : 'bg-red-900 border-red-700 text-red-200'
              }`}>
                {txMsg.text}
              </div>
            )}

            {manageError && (
              <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-200 text-sm">{manageError}</div>
            )}

            {manageLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="card animate-pulse space-y-3">
                    <div className="h-5 bg-gray-700 rounded w-1/2" />
                    <div className="h-2 bg-gray-700 rounded" />
                    <div className="h-8 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : myPresales.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-400 mb-4">You haven't created any presales yet</p>
                <button onClick={() => setTab('create')} className="btn-primary text-sm">
                  Create Your First Presale
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myPresales.map((p) => (
                  <MyPresaleCard
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
