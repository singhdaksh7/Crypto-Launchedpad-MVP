import React, { useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { TOKEN_FACTORY_ABI } from '@/lib/abis/TokenFactory';
import { getContractAddresses } from '@/lib/web3';
import { assertCreatorAccess } from '@/lib/creatorAccess';
import { friendlyError } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { AlertBanner, FormInput, KeyValueList, Stepper, Button } from '@/components/ui';
import { AccessGate } from '@/components/AccessGate';
import { CreatorSafetyChecklist } from '@/components/CreatorSafetyChecklist';
import { TokenPreviewCard } from '@/components/token/TokenPreviewCard';

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
  const [currentStep, setCurrentStep] = useState(0); // 0: Details, 1: Review, 2: Deploy/Tx, 3: Success
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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.symbol || !formData.initialSupply) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setCurrentStep(1); // Move to Review
  };

  const handleDeployToken = async () => {
    if (!signer || !account) {
      setError('Connect your wallet first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setCurrentStep(2); // Move to Pending Tx state
      
      await assertCreatorAccess(account);

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
      
      setCurrentStep(3); // Success
    } catch (err: any) {
      setError(friendlyError(err));
      setCurrentStep(1); // Go back to Review to retry
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', symbol: '', initialSupply: '', logoURI: '' });
    setResult(null);
    setLogoLoadFailed(false);
    setCurrentStep(0);
  };

  const reviewItems = [
    { label: 'Token Name', value: formData.name },
    { label: 'Symbol', value: formData.symbol },
    { label: 'Decimals', value: '18 (Standard BEP-20)' },
    { label: 'Total Supply', value: `${parseFloat(formData.initialSupply).toLocaleString()} ${formData.symbol}` },
    { label: 'Token Logo URI', value: formData.logoURI || 'Not provided' },
    { label: 'Owner Wallet', value: account ? `${account.substring(0, 8)}...${account.substring(account.length - 8)}` : 'Not connected' },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="mb-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white select-none">
            Deploy New Token
          </h1>
          <p className="text-ink-400 text-sm mt-1 select-none font-semibold">
            Deploy a standard BEP-20 token on BNB Smart Chain. The initial supply is minted directly to your wallet.
          </p>
        </div>

        {error && (
          <AlertBanner variant="error" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        <AccessGate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Hand Form/Steps Column */}
            <div className="lg:col-span-2 space-y-6">
              {currentStep < 3 && (
                <Stepper steps={['Details', 'Review', 'Deploy']} current={currentStep} />
              )}
              <CreatorSafetyChecklist mode="token" />

              {/* Step 0: Input Form */}
              {currentStep === 0 && (
                <form onSubmit={handleNextStep} className="card space-y-5">
                  <FormInput
                    label="Token Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Venus Token"
                    required
                    maxLength={48}
                    helperText="Shown on explorers, wallets, and scan hubs."
                  />

                  <FormInput
                    label="Token Symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="e.g. XVS"
                    className="uppercase font-mono"
                    required
                    maxLength={8}
                    helperText="3-8 uppercase characters works best."
                  />

                  <FormInput
                    label="Token Image URL"
                    name="logoURI"
                    value={formData.logoURI}
                    onChange={handleChange}
                    placeholder="https://... or ipfs://..."
                    maxLength={256}
                    helperText="Optional. URL to a square PNG/JPG or IPFS hash."
                  />

                  <FormInput
                    label="Initial Supply"
                    name="initialSupply"
                    type="number"
                    value={formData.initialSupply}
                    onChange={handleChange}
                    placeholder="1000000"
                    required
                    min="1"
                    helperText="Tokens minted directly to the creator's address."
                  />

                  <Button type="submit" variant="primary" className="w-full">
                    Review Configuration
                  </Button>
                </form>
              )}

              {/* Step 1: Review Panel */}
              {currentStep === 1 && (
                <div className="card space-y-6">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Confirm Token Details</h3>
                  <KeyValueList items={reviewItems} />

                  <AlertBanner variant="warning" title="Gas/Network Fee Notice">
                    Deploying standard ERC20 contracts onto BNB Chain requires a network gas fee paid in BNB. Please confirm that your wallet has sufficient gas funds.
                  </AlertBanner>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentStep(0)}
                      className="flex-1"
                    >
                      Back to Edit
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleDeployToken}
                      className="flex-1"
                    >
                      Confirm & Deploy
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Deployment Tx Pending State */}
              {currentStep === 2 && (
                <div className="card text-center py-16 space-y-4">
                  <Icon name="spinner" size={32} className="mx-auto text-bnb-text animate-spin" />
                  <h3 className="text-lg font-bold text-white">Deploying Smart Contract</h3>
                  <p className="text-sm text-ink-400 max-w-sm mx-auto font-medium">
                    Confirm the transaction inside your wallet. Please do not close this browser tab while deployment is in progress.
                  </p>
                </div>
              )}

              {/* Step 3: Success State */}
              {currentStep === 3 && result && (
                <div className="card border-emerald-500/20 bg-emerald-500/[0.02] space-y-6 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Icon name="check" size={18} />
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold text-white">BEP-20 Contract Deployed</h3>
                      <p className="text-xs text-ink-400 mt-0.5 font-medium">
                        Your token was minted successfully and ownership is assigned.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-ink-400 leading-relaxed font-semibold">
                    Congratulations! Your token <span className="text-white font-bold">{result.symbol}</span> is live. {parseFloat(result.supply).toLocaleString()} tokens have been credited to your wallet address.
                  </p>

                  <div className="bg-surface-2 border border-white/5 rounded-xl p-4 font-mono">
                    <p className="text-[10px] uppercase font-bold text-ink-500 mb-1.5">Contract Address</p>
                    <p className="text-xs text-white select-all break-all">{result.address}</p>
                  </div>

                  {result.hash && (
                    <a
                      href={txUrl(result.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ink-400 hover:text-white inline-flex items-center gap-1 font-semibold"
                    >
                      Verify Transaction on BscScan <Icon name="external" size={10} />
                    </a>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href={`/launchpads/create?token=${result.address}`}
                      className="btn-primary flex-1 sm:flex-initial text-center justify-center"
                    >
                      Create Presale Launchpad
                    </Link>
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      className="flex-1 sm:flex-initial"
                    >
                      Deploy Another Token
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Hand Sidebar (Token Preview) */}
            <div className="lg:col-span-1">
              <TokenPreviewCard
                name={formData.name}
                symbol={formData.symbol}
                supply={formData.initialSupply}
                decimals={18}
                logoURI={formData.logoURI}
                owner={account || undefined}
              />
            </div>
          </div>
        </AccessGate>
      </div>
    </AppLayout>
  );
}
