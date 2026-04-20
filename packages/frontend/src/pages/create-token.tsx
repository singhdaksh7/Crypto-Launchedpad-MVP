import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { TOKEN_FACTORY_ABI } from '@/lib/abis/TokenFactory';
import { getContractAddresses } from '@/lib/web3';

export default function CreateToken() {
  const { account, signer } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    initialSupply: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      setError('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { tokenFactory } = getContractAddresses();
      const contract = new ethers.Contract(
        tokenFactory,
        TOKEN_FACTORY_ABI,
        signer
      );

      const supply = ethers.parseEther(formData.initialSupply);
      const tx = await contract.createToken(
        formData.name,
        formData.symbol,
        supply
      );

      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs[0]?.address || 'Unknown';

      setTokenAddress(tokenAddr);
      setSuccess(`Token created successfully! Address: ${tokenAddr}`);
      setFormData({ name: '', symbol: '', initialSupply: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8">Create Token</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 p-4 rounded-lg mb-6 text-green-200">
            {success}
          </div>
        )}

        {!account ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 mb-4">Please connect your wallet to create a token</p>
          </div>
        ) : (
          <form onSubmit={handleCreateToken} className="card space-y-6">
            <div>
              <label className="label-text">Token Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Awesome Token"
                className="input-field mt-2"
                required
              />
            </div>

            <div>
              <label className="label-text">Token Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g., MAT"
                className="input-field mt-2"
                required
                maxLength={5}
              />
            </div>

            <div>
              <label className="label-text">Initial Supply</label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleChange}
                placeholder="e.g., 1000000"
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
              {loading ? 'Creating...' : 'Create Token'}
            </button>
          </form>
        )}

        {tokenAddress && (
          <div className="card mt-8">
            <h3 className="text-xl font-bold mb-4">Token Created! 🎉</h3>
            <p className="text-gray-400 mb-2">Token Address:</p>
            <p className="bg-gray-800 p-3 rounded text-primary break-all font-mono text-sm">
              {tokenAddress}
            </p>
            <p className="text-gray-400 text-sm mt-4">
              Next step: Create a presale using this token!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
