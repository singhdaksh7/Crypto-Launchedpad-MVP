import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { getContractAddresses, getProvider, formatEther } from '@/lib/web3';

interface PresaleData {
  id: number;
  tokenAddress: string;
  owner: string;
  softcap: bigint;
  hardcap: bigint;
  startTime: bigint;
  endTime: bigint;
  totalRaised: bigint;
  isActive: boolean;
}

export default function Launchpads() {
  const { account } = useWeb3Store();
  const [presales, setPresales] = useState<PresaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresales = async () => {
      try {
        setLoading(true);
        const provider = getProvider();
        const { launchpad } = getContractAddresses();

        const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);

        // Note: You'd need to implement a way to get all presales
        // This is a simplified version - in production, you'd use TheGraph or similar
        setPresales([]);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch presales');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPresales();
  }, []);

  return (
    <Layout>
      <div className="py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Active Launchpads</h1>
          {account && (
            <Link href="/dashboard" className="btn-primary">
              Create Launchpad
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">Loading presales...</p>
          </div>
        ) : presales.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No active launchpads yet</p>
            {!account && (
              <p className="text-sm text-gray-500 mt-2">Connect wallet to create one</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presales.map((presale) => (
              <div key={presale.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">Presale #{presale.id}</h3>
                    <p className="text-sm text-gray-400">{presale.tokenAddress}</p>
                  </div>
                  {presale.isActive && (
                    <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">
                      Active
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="text-gray-400">Raised:</span> {formatEther(presale.totalRaised)} BNB
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-400">Cap:</span> {formatEther(presale.softcap)} -{' '}
                    {formatEther(presale.hardcap)} BNB
                  </p>
                </div>

                <Link
                  href={`/presale/${presale.id}`}
                  className="w-full btn-primary text-center block"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
