import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { getChainId, getContractAddresses, getProvider } from '@/lib/web3';
import { formatEther } from '@/lib/presale';
import { compactNumber, formatBnb } from '@/lib/format';
import { networkLabel } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { Stat } from '@/components/ui/Stat';
import { useProtocolFee } from '@/hooks/useProtocolFee';

interface Stats {
  total: number;
  active: number;
  totalRaisedBnb: number;
}

const FEATURES = [
  {
    icon: 'sparkles' as const,
    title: 'No-code token creation',
    desc: 'Deploy a standard ERC20 with custom name, symbol, and supply in under a minute.',
  },
  {
    icon: 'gauge' as const,
    title: 'Configurable presales',
    desc: 'Set softcap, hardcap, price, time window and per-wallet limits. All on-chain, no escrow.',
  },
  {
    icon: 'shield' as const,
    title: 'Refunds if softcap fails',
    desc: 'If a presale doesn’t hit its softcap, contributors can reclaim their BNB directly from the contract.',
  },
  {
    icon: 'lock' as const,
    title: 'Open contracts',
    desc: 'Every token, presale and transaction is verifiable on BscScan. The protocol is open-source.',
  },
];

const STEPS = [
  {
    n: 1,
    title: 'Create your token',
    desc: 'Deploy an ERC20 with a single transaction.',
  },
  {
    n: 2,
    title: 'Configure the presale',
    desc: 'Set caps, price and the sale window.',
  },
  {
    n: 3,
    title: 'Share with your community',
    desc: 'Anyone can contribute BNB during the sale.',
  },
  {
    n: 4,
    title: 'Claim or refund',
    desc: 'Tokens unlock if softcap is hit, otherwise refund.',
  },
];

const buildFaq = (feeLabel: string) => [
  {
    q: 'How does the launchpad work?',
    a: `You deploy an ERC20 token, transfer the tokens to the launchpad presale contract, and configure the sale (price, caps, window). Contributors send BNB during the sale. If softcap is reached, contributors claim tokens after the sale ends and the owner withdraws the raised BNB minus a ${feeLabel} protocol fee. If softcap isn’t reached, contributors can refund their BNB.`,
  },
  {
    q: 'Are my funds safe?',
    a: 'BNB stays in the presale contract until the sale ends. Owners cannot withdraw funds before the sale closes, and contributors can refund their BNB on-chain if the softcap is missed. The protocol cannot move user funds.',
  },
  {
    q: 'Which network is this on?',
    a: 'The app runs on BNB Chain Testnet (chainId 97). You can grab testnet BNB from the official faucet at testnet.bnbchain.org/faucet-smart. Confirm your wallet is on BSC Testnet before connecting.',
  },
  {
    q: 'How do I claim my tokens?',
    a: 'Once a presale ends and softcap is reached, open the presale page and press “Claim”. Tokens are sent directly to your wallet.',
  },
  {
    q: 'What are the fees?',
    a: `Creating a token or presale costs only the BSC gas fee. When a successful presale is finalized, the protocol takes a ${feeLabel} fee from the raised BNB. Contributors are not charged any additional fee.`,
  },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { label: feeLabel } = useProtocolFee();
  const faq = buildFaq(feeLabel);

  useEffect(() => {
    (async () => {
      try {
        const provider = getProvider();
        const { launchpad } = getContractAddresses();
        const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
        const counter: bigint = await contract.presaleCounter();
        const total = Number(counter);
        if (total === 0) {
          setStats({ total: 0, active: 0, totalRaisedBnb: 0 });
          return;
        }
        const now = BigInt(Math.floor(Date.now() / 1000));
        const details = await Promise.all(
          Array.from({ length: total }, (_, i) => contract.getPresaleDetails(i)),
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
          totalRaisedBnb: parseFloat(formatEther(totalRaisedWei)),
        });
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  return (
    <Layout contained={false}>
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.25]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0, 247, 255, 0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(60% 60% at 50% 0%, #000 50%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(60% 60% at 50% 0%, #000 50%, transparent 100%)',
          }}
        />
        <div className="container-page pt-24 sm:pt-32 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 mb-6 animate-fade-in">
            <span className="pulse-dot" />
            Live on {networkLabel(getChainId())}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-5">
            Launch tokens on{' '}
            <span className="text-gradient drop-shadow-[0_0_15px_rgba(0,247,255,0.3)]">BNB&nbsp;Chain</span>,
            <br className="hidden sm:block" /> no code required.
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Create an ERC20 token, run a transparent presale and let your community
            participate on-chain — with built-in refunds if your softcap doesn’t hit.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link href="/create-token" className="btn-primary px-6 py-3 text-base">
              Create your token
              <Icon name="arrow-right" size={16} />
            </Link>
            <Link href="/launchpads" className="btn-secondary px-6 py-3 text-base">
              Browse live presales
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Free to use · Pay only network gas · Contracts open on BscScan
          </p>
        </div>
      </section>

      {/* ── Live stats ─────────────────────────────────── */}
      <section className="container-page pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat
            label="Total presales"
            value={stats ? compactNumber(stats.total) : '—'}
            loading={statsLoading}
            align="center"
          />
          <Stat
            label="Active now"
            value={stats ? compactNumber(stats.active) : '—'}
            loading={statsLoading}
            align="center"
          />
          <Stat
            label="Total raised"
            value={stats ? `${formatBnb(stats.totalRaisedBnb)} BNB` : '—'}
            loading={statsLoading}
            align="center"
          />
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="container-page py-16 border-t border-white/5">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-3">
            Built for transparent token launches
          </h2>
          <p className="text-gray-400">
            Everything happens on-chain — no custodial intermediaries, no hidden
            steps. Your contributors see exactly what they’re buying.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover">
              <div className="h-9 w-9 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center mb-4">
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section className="container-page py-16 border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-10 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative">
              <span className="absolute -top-3 left-5 px-2 py-0.5 rounded-full bg-brand-gradient text-xs font-semibold">
                Step {s.n}
              </span>
              <h3 className="font-semibold mt-2 mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <section className="container-page py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-3 text-center">
            Frequently asked questions
          </h2>
          <p className="text-gray-400 text-center mb-10">
            Everything you should know before launching or contributing.
          </p>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <details
                key={i}
                className="card group cursor-pointer hover:border-white/15 transition"
              >
                <summary className="flex justify-between items-center font-medium list-none">
                  {item.q}
                  <Icon
                    name="arrow-down"
                    size={16}
                    className="text-gray-500 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────── */}
      <section className="container-page py-20 border-t border-white/5">
        <div className="card border-white/10 text-center max-w-3xl mx-auto bg-gradient-to-br from-primary-500/5 to-secondary-500/5 shadow-glow">
          <h2 className="text-2xl sm:text-4xl font-semibold mb-4 drop-shadow-[0_0_10px_rgba(0,247,255,0.2)]">
            Ready to launch your token?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
            Deploy in under two minutes. No fees beyond network gas — and a {feeLabel}
            {' '}protocol fee only on successful raises.
          </p>
          <Link href="/create-token" className="btn-primary px-6 py-3 text-base">
            Get started
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
