import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { getContractAddresses, parseEther } from '@/lib/web3';

export default function Dashboard() {
  const { account, signer } = useWeb3Store();
  const [tab, setTab] = useState<'create' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tokenAddress: '',
    tokenPrice: '',
    softcap: '',
    hardcap: '',
    startTime: '',
    endTime: '',
    maxBuyPerUser: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePresale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      setError('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);

      const tokenPrice = parseEther(formData.tokenPrice);
      const softcap = parseEther(formData.softcap);
      const hardcap = parseEther(formData.hardcap);
      const maxBuy = parseEther(formData.maxBuyPerUser);
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      const tx = await contract.createPresale(
        formData.tokenAddress,
        tokenPrice,
        softcap,
        hardcap,
        startTime,
        endTime,
        maxBuy
      );

      const receipt = await tx.wait();
      setSuccess('Presale created successfully!');
      setFormData({
        tokenAddress: '',
        tokenPrice: '',
        softcap: '',
        hardcap: '',
        startTime: '',
        endTime: '',
        maxBuyPerUser: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create presale');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="card text-center py-12">
            <p className="text-gray-400 mb-4">Please connect your wallet to access the dashboard</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setTab('create')}
            className={`px-4 py-2 ${
              tab === 'create'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-400'
            }`}
          >
            Create Presale
          </button>
          <button
            onClick={() => setTab('manage')}
            className={`px-4 py-2 ${
              tab === 'manage'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-400'
            }`}
          >
            My Presales
          </button>
        </div>

        {tab === 'create' && (
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
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Softcap (BNB)</label>
                <input
                  type="number"
                  name="softcap"
                  value={formData.softcap}
                  onChange={handleChange}
                  placeholder="1"
                  className="input-field mt-2"
                  required
                  step="0.01"
                />
              </div>
              <div>
                <label className="label-text">Hardcap (BNB)</label>
                <input
                  type="number"
                  name="hardcap"
                  value={formData.hardcap}
                  onChange={handleChange}
                  placeholder="10"
                  className="input-field mt-2"
                  required
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Start Time</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="input-field mt-2"
                  required
                />
              </div>
              <div>
                <label className="label-text">End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="input-field mt-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-text">Max Buy Per User (BNB)</label>
              <input
                type="number"
                name="maxBuyPerUser"
                value={formData.maxBuyPerUser}
                onChange={handleChange}
                placeholder="1"
                className="input-field mt-2"
                required
                step="0.01"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Presale'}
            </button>
          </form>
        )}

        {tab === 'manage' && (
          <div className="card text-center py-12">
            <p className="text-gray-400">Your presales will appear here</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
