import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)]">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Crypto Launchpad</h1>
          <p className="text-xl text-gray-400 mb-8">
            Launch your token and run a successful presale on BSC
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/create-token" className="btn-primary">
              Create Token
            </Link>
            <Link href="/launchpads" className="btn-secondary">
              Explore Launchpads
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Easy Token Creation',
                desc: 'Create your ERC20 token in minutes',
                icon: '⚙️',
              },
              {
                title: 'Presale Management',
                desc: 'Run a presale with softcap, hardcap, and vesting',
                icon: '📊',
              },
              {
                title: 'Wallet Integration',
                desc: 'MetaMask and multi-wallet support',
                icon: '🔐',
              },
            ].map((feature, i) => (
              <div key={i} className="card text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="space-y-4">
            {[
              '1. Create your token with custom name and symbol',
              '2. Set up a presale with your desired parameters',
              '3. Share presale link with community',
              '4. Users buy tokens during presale',
              '5. Claim tokens after presale ends (if softcap reached)',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-4 card">
                <div className="text-2xl font-bold text-primary">{i + 1}</div>
                <p className="text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
