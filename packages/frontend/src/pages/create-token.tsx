import React, { useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { TOKEN_FACTORY_ABI } from '@/lib/abis/TokenFactory';
import { getContractAddresses } from '@/lib/web3';

export default function CreateToken() {
  const { account, signer } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({ name: '', symbol: '', initialSupply: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) { setError('Please connect wallet first'); return; }

    try {
      setLoading(true);
      setError(null);

      const { tokenFactory } = getContractAddresses();
      const contract = new ethers.Contract(tokenFactory, TOKEN_FACTORY_ABI, signer);
      const supply = ethers.parseEther(formData.initialSupply);
      const tx = await contract.createToken(formData.name, formData.symbol, supply);
      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs[0]?.address || 'Unknown';

      setTokenAddress(tokenAddr);
      setFormData({ name: '', symbol: '', initialSupply: '' });
    } catch (err: any) {
      setError(err.reason || err.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (!tokenAddress) return;
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-bold mb-2">Create Token</h1>
        <p className="text-gray-400 mb-8">Deploy an ERC20 token on BSC Testnet in seconds.</p>

        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-200 text-sm">
            {error}
          </div>
        )}

        {!account ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 mb-2">Connect your wallet to create a token</p>
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
              <p className="text-xs text-gray-500 mt-1">Max 5 characters</p>
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
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Total tokens to mint (18 decimals)</p>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? 'Deploying...' : 'Create Token'}
            </button>
          </form>
        )}

        {tokenAddress && (
          <div className="card mt-8 border-green-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎉</span>
              <h3 className="text-xl font-bold">Token Created!</h3>
            </div>

            <p className="text-gray-400 text-sm mb-2">Token Contract Address</p>
            <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-between gap-2 mb-6">
              <span className="text-primary break-all font-mono text-sm">{tokenAddress}</span>
              <button
                onClick={copyAddress}
                className="shrink-0 text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Next step: create a presale to sell your token to the community.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Link
                href={`/dashboard?token=${tokenAddress}`}
                className="btn-primary text-sm"
              >
                Create Presale with this Token →
              </Link>
              <button
                onClick={() => setTokenAddress(null)}
                className="btn-secondary text-sm"
              >
                Create Another Token
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
