import React from 'react';
import { Button, FormInput } from '../ui';
import { formatBnb } from '@/lib/format';

interface ContributePanelProps {
  amount: string;
  onAmountChange: (v: string) => void;
  balance: string;
  min: string;
  max: string;
  loading: boolean;
  onContribute: () => void;
}

export const ContributePanel: React.FC<ContributePanelProps> = ({
  amount,
  onAmountChange,
  balance,
  min,
  max,
  loading,
  onContribute,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-ink-400 font-medium">
        <span>Your Wallet Balance</span>
        <span className="text-white font-mono">{formatBnb(parseFloat(balance))} BNB</span>
      </div>

      <FormInput
        label="Contribution Amount (BNB)"
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.5"
        step="0.01"
        min={min}
        max={max}
        helperText={`Min: ${min} BNB · Max: ${max} BNB`}
      />

      <Button
        variant="primary"
        onClick={onContribute}
        loading={loading}
        className="w-full"
      >
        Contribute BNB
      </Button>
    </div>
  );
};

interface ClaimPanelProps {
  claimable: string;
  contribution: string;
  eligible: boolean;
  loading: boolean;
  onClaim: () => void;
  alreadyClaimed: boolean;
}

export const ClaimPanel: React.FC<ClaimPanelProps> = ({
  claimable,
  contribution,
  eligible,
  loading,
  onClaim,
  alreadyClaimed,
}) => {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="grid grid-cols-2 gap-3 text-xs bg-black/10 rounded-xl p-3 border border-white/5 font-medium">
        <div>
          <p className="text-ink-500 mb-0.5">Your Contribution</p>
          <p className="text-white font-mono">{formatBnb(parseFloat(contribution))} BNB</p>
        </div>
        <div>
          <p className="text-ink-500 mb-0.5">Claimable Tokens</p>
          <p className="text-bnb-text font-mono font-bold">{parseFloat(claimable).toLocaleString()} Tokens</p>
        </div>
      </div>

      {alreadyClaimed ? (
        <div className="py-2 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          You have already claimed your tokens
        </div>
      ) : eligible ? (
        <Button
          variant="primary"
          onClick={onClaim}
          loading={loading}
          className="w-full"
        >
          Claim Tokens
        </Button>
      ) : (
        <p className="text-xs text-ink-500 font-medium">
          You are not eligible to claim. Ensure you contributed to this presale.
        </p>
      )}
    </div>
  );
};

interface RefundPanelProps {
  refundable: string;
  loading: boolean;
  onRefund: () => void;
}

export const RefundPanel: React.FC<RefundPanelProps> = ({
  refundable,
  loading,
  onRefund,
}) => {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="bg-black/10 rounded-xl p-4 border border-white/5">
        <p className="text-xs text-ink-400 mb-1 font-medium">Your Refundable Amount</p>
        <p className="text-2xl font-bold font-mono text-white">{formatBnb(parseFloat(refundable))} BNB</p>
      </div>

      {parseFloat(refundable) > 0 ? (
        <Button
          variant="danger"
          onClick={onRefund}
          loading={loading}
          className="w-full"
        >
          Reclaim BNB Refund
        </Button>
      ) : (
        <p className="text-xs text-ink-500 font-medium">
          No refundable balance found.
        </p>
      )}
    </div>
  );
};

interface ActionBoxProps {
  status: 'upcoming' | 'active' | 'ended' | 'finalized';
  reached: boolean;
  hasContrib: boolean;
  alreadyClaimed: boolean;
  
  // Contribute props
  amount: string;
  onAmountChange: (v: string) => void;
  balance: string;
  min: string;
  max: string;
  buyLoading: boolean;
  onContribute: () => void;

  // Claim props
  claimable: string;
  contribution: string;
  claimLoading: boolean;
  onClaim: () => void;

  // Refund props
  refundable: string;
  refundLoading: boolean;
  onRefund: () => void;
}

export const ActionBox: React.FC<ActionBoxProps> = ({
  status,
  reached,
  hasContrib,
  alreadyClaimed,
  amount,
  onAmountChange,
  balance,
  min,
  max,
  buyLoading,
  onContribute,
  claimable,
  contribution,
  claimLoading,
  onClaim,
  refundable,
  refundLoading,
  onRefund,
}) => {
  const [activeTab, setActiveTab] = React.useState<'buy' | 'claim' | 'refund'>(
    status === 'active' ? 'buy' : (status === 'ended' || status === 'finalized') && reached ? 'claim' : 'refund'
  );

  React.useEffect(() => {
    if (status === 'active') setActiveTab('buy');
    else if ((status === 'ended' || status === 'finalized') && reached) setActiveTab('claim');
    else if ((status === 'ended' || status === 'finalized') && !reached) setActiveTab('refund');
  }, [status, reached]);

  return (
    <div className="card space-y-5">
      {/* Tabs list */}
      <div className="flex border-b border-white/5">
        <button
          disabled={status !== 'active'}
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'buy' ? 'text-bnb-text border-b-2 border-bnb' : 'text-ink-500 hover:text-ink-300 disabled:opacity-30'
          }`}
        >
          Contribute
        </button>
        <button
          disabled={!(status === 'ended' || status === 'finalized') || !reached}
          onClick={() => setActiveTab('claim')}
          className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'claim' ? 'text-bnb-text border-b-2 border-bnb' : 'text-ink-500 hover:text-ink-300 disabled:opacity-30'
          }`}
        >
          Claim
        </button>
        <button
          disabled={!(status === 'ended' || status === 'finalized') || reached}
          onClick={() => setActiveTab('refund')}
          className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider relative transition ${
            activeTab === 'refund' ? 'text-bnb-text border-b-2 border-bnb' : 'text-ink-500 hover:text-ink-300 disabled:opacity-30'
          }`}
        >
          Refund
        </button>
      </div>

      {/* Panels */}
      {activeTab === 'buy' && (
        <ContributePanel
          amount={amount}
          onAmountChange={onAmountChange}
          balance={balance}
          min={min}
          max={max}
          loading={buyLoading}
          onContribute={onContribute}
        />
      )}

      {activeTab === 'claim' && (
        <ClaimPanel
          claimable={claimable}
          contribution={contribution}
          eligible={hasContrib}
          loading={claimLoading}
          onClaim={onClaim}
          alreadyClaimed={alreadyClaimed}
        />
      )}

      {activeTab === 'refund' && (
        <RefundPanel
          refundable={refundable}
          loading={refundLoading}
          onRefund={onRefund}
        />
      )}
    </div>
  );
};
export default ActionBox;
