import React from 'react';
import { Alert } from './ui/Alert';

interface CreatorSafetyChecklistProps {
  mode: 'token' | 'presale';
}

const TOKEN_ITEMS = [
  'Verify your token name, symbol, and total supply before deploying.',
  'Confirm whether you are operating on BSC Testnet or BSC Mainnet before signing.',
  'You are responsible for all token descriptions, claims, and compliance obligations.',
  'No listing, liquidity, demand, or profit is guaranteed by the platform.',
];

const PRESALE_ITEMS = [
  'Verify your token address, swap price, caps, and timeline before creating the presale.',
  'Confirm whether you are launching on BSC Testnet or BSC Mainnet before signing.',
  'You are responsible for token claims, disclosures, and applicable compliance requirements.',
  'No listing, liquidity, softcap success, or profit is guaranteed by the platform.',
];

export const CreatorSafetyChecklist: React.FC<CreatorSafetyChecklistProps> = ({ mode }) => {
  const items = mode === 'token' ? TOKEN_ITEMS : PRESALE_ITEMS;

  return (
    <Alert tone="warning" title="Creator safety checklist">
      <ul className="mt-1 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Alert>
  );
};
