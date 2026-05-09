import React, { useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { Layout } from '@/components/Layout';
import { TOKEN_FACTORY_ABI } from '@/lib/abis/TokenFactory';
import { getContractAddresses } from '@/lib/web3';
import { friendlyError } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { Alert } from '@/components/ui/Alert';
import { AddressLink } from '@/components/ui/AddressLink';
import { AccessGate } from '@/components/AccessGate';

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  logoURI: string;
}

interface SuccessState {
  address: string;
  hash?: string;
  symbol: string;
  supply: string;
  logoURI: string;
}

export default function CreateToken() {
  const { account, signer } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessState | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    logoURI: '',
  });
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'symbol') {
      setFormData((prev) => ({ ...prev, symbol: value.toUpperCase().slice(0, 8) }));
      return;
    }
    if (name === 'logoURI') {
      setLogoLoadFailed(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ipfs:// URIs aren't directly fetchable by browsers — render through a public gateway.
  const previewSrc = (() => {
    const v = formData.logoURI.trim();
    if (!v) return '';
    if (v.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${v.slice('ipfs://'.length)}`;
    return v;
  })();

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      setError('Connect your wallet first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { tokenFactory } = getContractAddresses();
      const contract = new ethers.Contract(tokenFactory, TOKEN_FACTORY_ABI, signer);
      const supply = ethers.parseEther(formData.initialSupply);
      const logoURI = formData.logoURI.trim();
      const tx = await contract.createToken(
        formData.name,
        formData.symbol,
        supply,
        logoURI,
      );
      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs[0]?.address || '';

      setResult({
        address: tokenAddr,
        hash: receipt?.hash || tx.hash,
        symbol: formData.symbol,
        supply: formData.initialSupply,
        logoURI,
      });
      setFormData({ name: '', symbol: '', initialSupply: '', logoURI: '' });
      setLogoLoadFailed(false);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Create a token
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Deploy a standard ERC20 on BNB Chain. The token is minted to your wallet.
          </p>
        </div>

        {error && (
          <Alert tone="error" onDismiss={() => setError(null)} className="mb-4">
            {error}
          </Alert>
        )}

        <AccessGate>
        {!account ? (
          <div className="card text-center py-16">
            <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-300 mb-3">
              <Icon name="wallet" size={20} />
            </div>
            <p className="text-lg font-medium mb-1">Wallet required</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Connect a wallet to deploy a token. You’ll pay only the network gas fee.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateToken} className="card space-y-5">
            <div>
              <label className="label-text">Token name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="My Awesome Token"
                className="input-field mt-1.5"
                required
                maxLength={48}
              />
              <p className="field-hint">Shown on explorers and wallets.</p>
            </div>
            <div>
              <label className="label-text">Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="MAT"
                className="input-field mt-1.5 font-mono uppercase tracking-wide"
                required
                maxLength={8}
              />
              <p className="field-hint">3–6 uppercase characters works best.</p>
            </div>
            <div>
              <label className="label-text">Token image URL</label>
              <div className="mt-1.5 flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-gray-500">
                  {previewSrc && !logoLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewSrc}
                      alt="Token logo preview"
                      className="h-full w-full object-cover"
                      onError={() => setLogoLoadFailed(true)}
                      onLoad={() => setLogoLoadFailed(false)}
                    />
                  ) : (
                    <Icon name="image" size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="url"
                    name="logoURI"
                    value={formData.logoURI}
                    onChange={handleChange}
                    placeholder="https://… or ipfs://…"
                    className="input-field"
                    maxLength={256}
                  />
                  <p className="field-hint">
                    Optional. Paste an HTTPS or ipfs:// link to a square image.
                  </p>
                  {previewSrc && logoLoadFailed && (
                    <p className="field-error mt-1">
                      Couldn’t load that image. Check the URL.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="label-text">Initial supply</label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleChange}
                placeholder="1000000"
                className="input-field mt-1.5"
                required
                min="1"
              />
              <p className="field-hint">
                Total tokens minted to your wallet (18 decimals).
              </p>
            </div>

            <Alert tone="info">
              You’ll pay only the BSC network gas fee. The token contract is deployed
              by the factory and ownership is transferred to you.
            </Alert>

            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? (
                <>
                  <Icon name="spinner" size={14} /> Deploying…
                </>
              ) : (
                'Deploy token'
              )}
            </button>
          </form>
        )}
        </AccessGate>

        {result && (
          <div className="card mt-6 border-emerald-500/30 bg-emerald-500/[0.04] animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Icon name="check" size={16} />
              </span>
              <h3 className="text-lg font-semibold">Token deployed</h3>
            </div>

            {result.logoURI && (
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    result.logoURI.startsWith('ipfs://')
                      ? `https://ipfs.io/ipfs/${result.logoURI.slice('ipfs://'.length)}`
                      : result.logoURI
                  }
                  alt={`${result.symbol} logo`}
                  className="h-10 w-10 rounded-full object-cover bg-white/5 border border-white/10"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm text-gray-400">Token logo</span>
              </div>
            )}

            <p className="text-sm text-gray-400 mb-4">
              Your <span className="text-white font-medium">{result.symbol}</span> token
              is live. {Number(result.supply).toLocaleString()} tokens were minted to your
              wallet.
            </p>

            <div className="bg-surface-2 border border-white/5 rounded-lg p-3 mb-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Contract address
              </p>
              <AddressLink address={result.address} variant="token" truncate={false} />
            </div>

            {result.hash && (
              <a
                href={txUrl(result.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 mb-5"
              >
                View deployment transaction <Icon name="external" size={12} />
              </a>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard?token=${result.address}`}
                className="btn-primary"
              >
                Create presale
                <Icon name="arrow-right" size={14} />
              </Link>
              <button
                onClick={() => setResult(null)}
                className="btn-secondary"
              >
                Deploy another
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
