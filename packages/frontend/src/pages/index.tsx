import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { getContractAddresses, getProvider, formatEther } from '@/lib/web3';

interface Stats {
  total: number;
  active: number;
  totalRaisedBnb: number;
}

function StatCard({ value, label, loading }: { value: string; label: string; loading: boolean }) {
  return (
    <div className="card text-center py-8">
      {loading ? (
        <div className="h-9 w-24 bg-gray-700 rounded animate-pulse mx-auto mb-2" />
      ) : (
        <p className="text-4xl font-bold text-primary mb-2">{value}</p>
      )}
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const provider = getProvider();
        const { launchpad } = getContractAddresses();
        const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);

        const counter: bigint = await contract.presaleCounter();
        const total = Number(counter);
        if (total === 0) { setStats({ total: 0, active: 0, totalRaisedBnb: 0 }); return; }

        const now = BigInt(Math.floor(Date.now() / 1000));
        const details = await Promise.all(
          Array.from({ length: total }, (_, i) => contract.getPresaleDetails(i))
        );

        let active = 0;
        let totalRaisedWei = 0n;
        for (const d of details) {
          if (now >= d.startTime && now < d.endTime && d.isActive) active++;
          totalRaisedWei += d.totalRaised;
        }

        setStats({
          total,
          active,
          totalRaisedBnb: parseFloat(parseFloat(formatEther(totalRaisedWei)).toFixed(4)),
        });
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)]">
        {/* Hero */}
        <section className="py-20 text-center">
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Launch Your Token on <span className="text-primary">BSC</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            The easiest way to create tokens and run presales — no code required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/create-token" className="btn-primary text-base px-8 py-3">
              Create Token
            </Link>
            <Link href="/launchpads" className="btn-secondary text-base px-8 py-3">
              Explore Launchpads
            </Link>
          </div>
        </section>

        {/* Live Stats */}
        <section className="pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              value={stats ? stats.total.toString() : '—'}
              label="Total Presales"
              loading={statsLoading}
            />
            <StatCard
              value={stats ? stats.active.toString() : '—'}
              label="Active Now"
              loading={statsLoading}
            />
            <StatCard
              value={stats ? `${stats.totalRaisedBnb} BNB` : '—'}
              label="Total Raised"
              loading={statsLoading}
            />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-gray-800">
          <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Easy Token Creation', desc: 'Deploy a standard ERC20 token in minutes with custom name, symbol, and supply.', icon: '⚙️' },
              { title: 'Presale Management', desc: 'Run a presale with softcap, hardcap, vesting, and per-user buy limits.', icon: '📊' },
              { title: 'Wallet Integration', desc: 'MetaMask support with automatic BSC Testnet switching.', icon: '🔐' },
            ].map((f, i) => (
              <div key={i} className="card text-center hover:border-primary transition-colors">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-gray-800">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {[
              { step: '1', title: 'Create Token', desc: 'Deploy your ERC20 token' },
              { step: '2', title: 'Set Up Presale', desc: 'Define caps, price & timing' },
              { step: '3', title: 'Share Link', desc: 'Share with your community' },
              { step: '4', title: 'Users Buy', desc: 'Community joins the presale' },
              { step: '5', title: 'Claim / Refund', desc: 'Tokens or BNB after presale' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-xl font-bold shrink-0">
                  {s.step}
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute" />
                )}
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-gray-400 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-gray-800 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to launch?</h2>
          <p className="text-gray-400 mb-8">Create your token in under 2 minutes.</p>
          <Link href="/create-token" className="btn-primary text-base px-10 py-3">
            Get Started
          </Link>
        </section>
      </div>
    </Layout>
  );
}
