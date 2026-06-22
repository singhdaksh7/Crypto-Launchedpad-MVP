import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider, isValidAddress, parseEther } from '@/lib/web3';
import { assertCreatorAccess } from '@/lib/creatorAccess';
import { friendlyError, formatBnb } from '@/lib/format';
import { txUrl } from '@/lib/links';
import { Icon } from '@/components/ui/Icon';
import { AlertBanner, FormInput, DateTimeInput, KeyValueList, Stepper, Button } from '@/components/ui';
import { AccessGate } from '@/components/AccessGate';
import { FundingPanel } from '@/components/FundingPanel';

interface FormData {
  tokenAddress: string;
  tokenPrice: string;
  softcap: string;
  hardcap: string;
  startTime: string;
  endTime: string;
  maxBuyPerUser: string;
}

const EMPTY_FORM: FormData = {
  tokenAddress: '',
  tokenPrice: '',
  softcap: '',
  hardcap: '',
  startTime: '',
  endTime: '',
  maxBuyPerUser: '',
};

type TokenCheck =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; name: string; symbol: string }
  | { status: 'error'; message: string };

async function inspectErc20(address: string): Promise<TokenCheck> {
  try {
    const provider = getProvider();
    const code = await provider.getCode(address);
    if (!code || code === '0x') {
      return { status: 'error', message: 'No contract deployed at this address.' };
    }
    const token = new ethers.Contract(address, ERC20_ABI, provider);
    const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
    await token.decimals();
    return { status: 'ok', name: String(name), symbol: String(symbol) };
  } catch {
    return { status: 'error', message: 'Address is not a standard ERC20 token.' };
  }
}

function validateForm(d: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (!isValidAddress(d.tokenAddress)) {
    errors.tokenAddress = 'Enter a valid token address.';
  }
  const price = parseFloat(d.tokenPrice);
  if (!price || price <= 0) errors.tokenPrice = 'Price must be greater than 0.';
  const soft = parseFloat(d.softcap);
  const hard = parseFloat(d.hardcap);
  const max = parseFloat(d.maxBuyPerUser);
  if (!soft || soft <= 0) errors.softcap = 'Softcap must be greater than 0.';
  if (!hard || hard <= 0) errors.hardcap = 'Hardcap must be greater than 0.';
  if (soft && hard && soft >= hard) {
    errors.hardcap = 'Hardcap must be greater than softcap.';
  }
  if (!max || max <= 0) errors.maxBuyPerUser = 'Max per user must be greater than 0.';
  if (max && hard && max > hard) {
    errors.maxBuyPerUser = 'Max per user can’t exceed hardcap.';
  }

  const now = Math.floor(Date.now() / 1000);
  const start = d.startTime ? Math.floor(new Date(d.startTime).getTime() / 1000) : 0;
  const end = d.endTime ? Math.floor(new Date(d.endTime).getTime() / 1000) : 0;
  const START_BUFFER_SEC = 60;
  
  if (!start) errors.startTime = 'Pick a start time.';
  else if (start <= now + START_BUFFER_SEC) {
    errors.startTime = 'Start must be at least 1 minute in the future.';
  }
  if (!end) errors.endTime = 'Pick an end time.';
  else if (start && end <= start) errors.endTime = 'End must be after start.';
  return errors;
}

export default function CreateLaunchpad() {
  const router = useRouter();
  const { account, signer } = useWeb3Store();
  
  const [currentStep, setCurrentStep] = useState(0); // 0: Form, 1: Review, 2: Tx Pending, 3: Success
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [tokenCheck, setTokenCheck] = useState<TokenCheck>({ status: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    presaleId: number;
    tokenAddress: string;
    hash?: string;
  } | null>(null);

  useEffect(() => {
    if (router.query.token && typeof router.query.token === 'string') {
      setFormData((p) => ({ ...p, tokenAddress: router.query.token as string }));
    }
  }, [router.query.token]);

  useEffect(() => {
    setTokenCheck({ status: 'idle' });
  }, [formData.tokenAddress]);

  const checkTokenAddress = useCallback(async () => {
    const addr = formData.tokenAddress.trim();
    if (!isValidAddress(addr)) return;
    setTokenCheck({ status: 'checking' });
    const result = await inspectErc20(addr);
    if (addr !== formData.tokenAddress.trim()) return;
    setTokenCheck(result);
  }, [formData.tokenAddress]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const errs = validateForm(formData);
    if (Object.keys(errs).length > 0) {
      setFormError(Object.values(errs)[0] || 'Invalid inputs.');
      return;
    }

    if (tokenCheck.status !== 'ok') {
      setTokenCheck({ status: 'checking' });
      const check = await inspectErc20(formData.tokenAddress.trim());
      setTokenCheck(check);
      if (check.status !== 'ok') {
        setFormError('Verified token address is required.');
        return;
      }
    }

    setCurrentStep(1); // Review
  };

  const handleCreatePresale = async () => {
    if (!signer || !account) {
      setFormError('Connect wallet first.');
      return;
    }

    try {
      setLoading(true);
      setFormError(null);
      setCurrentStep(2); // Pending Tx

      await assertCreatorAccess(account);

      const { launchpad } = getContractAddresses();
      const contract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, signer);

      const tx = await contract.createPresale(
        formData.tokenAddress,
        parseEther(formData.tokenPrice),
        parseEther(formData.softcap),
        parseEther(formData.hardcap),
        Math.floor(new Date(formData.startTime).getTime() / 1000),
        Math.floor(new Date(formData.endTime).getTime() / 1000),
        parseEther(formData.maxBuyPerUser),
      );
      
      const receipt = await tx.wait();
      const counter: bigint = await contract.presaleCounter();
      const newId = Math.max(0, Number(counter) - 1);

      setSuccessData({
        presaleId: newId,
        tokenAddress: formData.tokenAddress,
        hash: receipt?.hash || tx.hash,
      });
      setCurrentStep(3); // Success
    } catch (err: any) {
      setFormError(friendlyError(err));
      setCurrentStep(1); // Go back to review on failure
    } finally {
      setLoading(false);
    }
  };

  const reviewItems = [
    { label: 'Token Address', value: formData.tokenAddress },
    { label: 'Token Details', value: tokenCheck.status === 'ok' ? `${tokenCheck.name} (${tokenCheck.symbol})` : 'Unverified' },
    { label: 'Swap Price', value: `${formData.tokenPrice} BNB per token` },
    { label: 'Softcap / Hardcap', value: `${formData.softcap} / ${formData.hardcap} BNB` },
    { label: 'Max Buy limit', value: `${formData.maxBuyPerUser} BNB` },
    { label: 'Start Time', value: new Date(formData.startTime).toLocaleString() },
    { label: 'End Time', value: new Date(formData.endTime).toLocaleString() },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white select-none">
            Configure Presale Launchpad
          </h1>
          <p className="text-ink-400 text-sm mt-1 select-none font-semibold">
            Lock details on-chain. Token buyers are automatically refunded if the softcap fails to hit.
          </p>
        </div>

        {formError && (
          <AlertBanner variant="error" onDismiss={() => setFormError(null)}>
            {formError}
          </AlertBanner>
        )}

        <AccessGate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Form Steps */}
            <div className="lg:col-span-2 space-y-6">
              {currentStep < 3 && (
                <Stepper steps={['Configure', 'Review', 'Launch']} current={currentStep} />
              )}

              {/* Step 0: Input fields */}
              {currentStep === 0 && (
                <form onSubmit={handleNextStep} className="card space-y-5">
                  <FormInput
                    label="Token Address"
                    name="tokenAddress"
                    value={formData.tokenAddress}
                    onChange={handleChange}
                    onBlur={checkTokenAddress}
                    placeholder="0x..."
                    className="font-mono"
                    required
                    helperText={tokenCheck.status === 'ok' ? `Verified: ${tokenCheck.name} (${tokenCheck.symbol})` : "Don't have a token? Deploy one first."}
                  />

                  <FormInput
                    label="Token Price (BNB per Token)"
                    name="tokenPrice"
                    type="number"
                    value={formData.tokenPrice}
                    onChange={handleChange}
                    placeholder="0.001"
                    step="0.000000000000000001"
                    min="0"
                    required
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormInput
                      label="Softcap (BNB)"
                      name="softcap"
                      type="number"
                      value={formData.softcap}
                      onChange={handleChange}
                      placeholder="10"
                      step="0.01"
                      min="0.1"
                      required
                    />
                    <FormInput
                      label="Hardcap (BNB)"
                      name="hardcap"
                      type="number"
                      value={formData.hardcap}
                      onChange={handleChange}
                      placeholder="50"
                      step="0.01"
                      min="0.1"
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <DateTimeInput
                      label="Start Time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                    />
                    <DateTimeInput
                      label="End Time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <FormInput
                    label="Max Buy per Wallet (BNB)"
                    name="maxBuyPerUser"
                    type="number"
                    value={formData.maxBuyPerUser}
                    onChange={handleChange}
                    placeholder="5"
                    step="0.1"
                    min="0.1"
                    required
                  />

                  <Button type="submit" variant="primary" className="w-full">
                    Review Presale
                  </Button>
                </form>
              )}

              {/* Step 1: Review */}
              {currentStep === 1 && (
                <div className="card space-y-6">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Review Parameters</h3>
                  <KeyValueList items={reviewItems} />

                  <AlertBanner variant="warning" title="Irreversible Parameters Warning">
                    Verify all prices, limits, and timelines. Once deployed, presale parameters are permanently locked on the BSC ledger and cannot be altered or deleted.
                  </AlertBanner>

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setCurrentStep(0)} className="flex-1">
                      Back to Edit
                    </Button>
                    <Button variant="primary" onClick={handleCreatePresale} className="flex-1">
                      Launch Presale
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Tx Pending */}
              {currentStep === 2 && (
                <div className="card text-center py-16 space-y-4">
                  <Icon name="spinner" size={32} className="mx-auto text-bnb-text animate-spin" />
                  <h3 className="text-lg font-bold text-white">Deploying Presale Smart Ledger</h3>
                  <p className="text-xs text-ink-400 font-semibold max-w-sm mx-auto">
                    Acknowledge the deployment request inside your wallet. The transaction is executing on-chain.
                  </p>
                </div>
              )}

              {/* Step 3: Success & Token Funding */}
              {currentStep === 3 && successData && (
                <div className="space-y-6 animate-slide-up">
                  <div className="card border-emerald-500/20 bg-emerald-500/[0.02] space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Icon name="check" size={18} />
                      </span>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">Presale Created Successfully</h3>
                        <p className="text-xs text-ink-400 mt-0.5 font-medium">
                          Presale ledger is active. Next, you must fund the presale with tokens.
                        </p>
                      </div>
                    </div>

                    <div className="bg-surface-2 border border-white/5 p-4 rounded-xl font-mono text-xs">
                      <p className="text-[10px] uppercase font-bold text-ink-500 mb-1.5">Presale ID</p>
                      <p className="text-white select-all">Presale #{successData.presaleId}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Link href={`/presale/${successData.presaleId}`} className="btn-primary flex-1 text-center justify-center font-bold">
                        Open Presale Page
                      </Link>
                      <Link href="/dashboard" className="btn-secondary flex-1 text-center justify-center">
                        Open Creator Dashboard
                      </Link>
                    </div>
                  </div>

                  {/* Funding Actions Panel */}
                  <div className="card">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500 mb-4">Required Action: Deposit Presale Tokens</h3>
                    <p className="text-xs text-ink-400 mb-5 font-semibold leading-relaxed">
                      For buyers to receive tokens successfully upon finalization, you must deposit the required tokens into the launchpad smart contract. You can perform this deposit right now below:
                    </p>
                    <FundingPanel
                      presaleId={successData.presaleId}
                      tokenAddress={successData.tokenAddress}
                      isOwner
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-1 space-y-4">
              <div className="card space-y-5 bg-gradient-to-b from-surface to-black border border-white/10 shadow-glow sticky top-24 select-none">
                <h3 className="text-xs uppercase tracking-wider text-ink-500 font-bold">Presale Blueprint</h3>
                <div className="space-y-3 font-semibold text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-ink-500">Decentralized Escrow</span>
                    <span className="text-emerald-400">Enabled ✓</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-ink-500">Failsafe Refunds</span>
                    <span className="text-emerald-400">Enabled ✓</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-ink-500">Softcap Safe-Check</span>
                    <span className="text-white font-mono">100% On-chain</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-ink-500 leading-relaxed font-semibold">
                  🛡️ Presale contract logic enforces strict softcap compliance. Owners cannot withdraw BNB unless softcap is hit.
                </p>
              </div>
            </div>
          </div>
        </AccessGate>
      </div>
    </AppLayout>
  );
}
