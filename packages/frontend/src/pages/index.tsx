import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeeExplainer } from '@/components/landing/FeeExplainer';
import { BscBenefits } from '@/components/landing/BscBenefits';
import { FeaturedPresales } from '@/components/landing/FeaturedPresales';
import { AlertBanner, StatCard } from '@/components/ui';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider } from '@/lib/web3';
import { formatEther } from '@/lib/presale';
import { compactNumber, formatBnb } from '@/lib/format';

interface Stats {
  total: number;
  active: number;
  totalRaisedBnb: number;
}

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [presales, setPresales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const provider = getProvider();
        const { launchpad } = getContractAddresses();
        const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
        const counter: bigint = await contract.presaleCounter();
        const total = Number(counter);
        
        if (total === 0) {
          setStats({ total: 0, active: 0, totalRaisedBnb: 0 });
          setPresales([]);
          return;
        }

        const now = BigInt(Math.floor(Date.now() / 1000));
        const rawDetails = await Promise.all(
          Array.from({ length: total }, (_, i) => 
            contract.getPresaleDetails(i).then(d => ({
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

        let activeCount = 0;
        let totalRaisedWei = 0n;

        // Enrich with ERC20 details
        const enriched = await Promise.all(
          rawDetails.map(async (p) => {
            if (now >= p.startTime && now < p.endTime && p.isActive && !p.isFinalized) {
              activeCount++;
            }
            totalRaisedWei += p.totalRaised;

            let name = 'Unknown';
            let ticker = 'TKN';
            try {
              const token = new ethers.Contract(p.tokenAddress, ERC20_ABI, provider);
              [name, ticker] = await Promise.all([token.name(), token.symbol()]);
            } catch {}
            return { ...p, name, ticker };
          })
        );

        setStats({
          total,
          active: activeCount,
          totalRaisedBnb: parseFloat(formatEther(totalRaisedWei)),
        });
        setPresales(enriched);
      } catch (err) {
        console.error('Failed to load stats or presales', err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewPresale = (id: string | number) => {
    router.push(`/presale/${id}`);
  };

  return (
    <PublicLayout>
      <div className="space-y-12">
        {/* Hero Section */}
        <Hero />

        {/* Real Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Presales launched"
            value={stats ? compactNumber(stats.total) : '0'}
            loading={loading}
            variant="B"
            tone="plain"
          />
          <StatCard
            label="Active Presales now"
            value={stats ? compactNumber(stats.active) : '0'}
            loading={loading}
            variant="A"
            tone="yellow"
          />
          <StatCard
            label="Total Funds Raised"
            value={stats ? `${formatBnb(stats.totalRaisedBnb)} BNB` : '0 BNB'}
            loading={loading}
            variant="B"
            tone="green"
          />
        </section>

        {/* Live featured presales list */}
        <FeaturedPresales
          presales={presales}
          loading={loading}
          onView={handleViewPresale}
        />

        {/* How it works */}
        <HowItWorks />

        {/* ₹1000 Fee Explainer */}
        <FeeExplainer />

        {/* BSC Benefits */}
        <BscBenefits />

        {/* Risk Disclaimer Alert */}
        <section className="max-w-4xl mx-auto pt-6">
          <AlertBanner variant="warning" title="Decentralised Token Launch Safety & Risks">
            Participating in crypto presales carries severe financial risks. Deployed tokens are configured by independent creators and are not audited, verified, or endorsed by LaunchBNB. Smart contracts lock contributions and issue automatic refunds if the softcap fails. No returns, yields, or profits are ever promised or guaranteed. Verify all addresses before transacting.
          </AlertBanner>
        </section>
      </div>
    </PublicLayout>
  );
}
