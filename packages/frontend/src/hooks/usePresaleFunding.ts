import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '@/store';
import { LAUNCHPAD_ABI } from '@/lib/abis/Launchpad';
import { ERC20_ABI } from '@/lib/abis/ERC20';
import { getContractAddresses, getProvider } from '@/lib/web3';

export type FundingStatus = 'unfunded' | 'partial' | 'funded';

export interface FundingState {
  required: bigint;       // tokens needed to cover hardcap
  funded: bigint;         // tokens already deposited into Launchpad
  committed: bigint;      // tokens already promised to buyers (totalRaised converted)
  remaining: bigint;      // required - funded, clamped to 0
  shortfall: bigint;      // committed - funded, clamped to 0 (red zone — buys would revert)
  allowance: bigint;      // ERC20 allowance from `account` to Launchpad
  balance: bigint;        // ERC20 balance of `account`
  status: FundingStatus;
  loading: boolean;
  error: string | null;
}

const ZERO: FundingState = {
  required: 0n,
  funded: 0n,
  committed: 0n,
  remaining: 0n,
  shortfall: 0n,
  allowance: 0n,
  balance: 0n,
  status: 'unfunded',
  loading: true,
  error: null,
};

function deriveStatus(required: bigint, funded: bigint): FundingStatus {
  if (required === 0n) return 'unfunded';
  if (funded >= required) return 'funded';
  if (funded === 0n) return 'unfunded';
  return 'partial';
}

/**
 * Reads the on-chain funding state for a presale, plus the connected wallet's
 * allowance/balance for the presale token. `presaleId` and `tokenAddress` may be
 * null while the parent is still loading.
 */
export function usePresaleFunding(
  presaleId: number | null,
  tokenAddress: string | null,
) {
  const { account, provider: walletProvider } = useWeb3Store();
  const [state, setState] = useState<FundingState>(ZERO);

  const fetchState = useCallback(async () => {
    if (presaleId === null || !tokenAddress) {
      setState({ ...ZERO, loading: false });
      return;
    }
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const provider = walletProvider || getProvider();
      const { launchpad } = getContractAddresses();
      const launchpadContract = new ethers.Contract(launchpad, LAUNCHPAD_ABI, provider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const [statusRes, allowance, balance] = await Promise.all([
        launchpadContract.getFundingStatus(presaleId),
        account
          ? tokenContract.allowance(account, launchpad)
          : Promise.resolve(0n),
        account ? tokenContract.balanceOf(account) : Promise.resolve(0n),
      ]);

      const required: bigint = statusRes.required ?? statusRes[0];
      const funded: bigint = statusRes.funded ?? statusRes[1];
      const committed: bigint = statusRes.committed ?? statusRes[2];

      const remaining = required > funded ? required - funded : 0n;
      const shortfall = committed > funded ? committed - funded : 0n;

      setState({
        required,
        funded,
        committed,
        remaining,
        shortfall,
        allowance,
        balance,
        status: deriveStatus(required, funded),
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.shortMessage || err?.message || 'Failed to load funding state',
      }));
    }
  }, [presaleId, tokenAddress, account, walletProvider]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  return { ...state, refresh: fetchState };
}
