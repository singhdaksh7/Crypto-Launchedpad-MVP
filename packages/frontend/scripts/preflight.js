// Runs before `next build` (via the `prebuild` npm script).
// Fails the build if required env vars are missing, zero, or malformed —
// otherwise the app ships with NEXT_PUBLIC_* inlined as empty/zero and
// silently calls the zero address.
//
// Supports BSC Testnet (97) and BSC Mainnet (56). Selected via
// NEXT_PUBLIC_NETWORK; defaults to 97 when unset.

const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const REQUIRED_ADDRESSES = [
  'NEXT_PUBLIC_LAUNCHPAD_ADDRESS',
  'NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS',
  'NEXT_PUBLIC_VESTING_ADDRESS',
];
const SUPPORTED_CHAIN_IDS = ['56', '97'];
const DEFAULT_CHAIN_ID = '97';

const errors = [];

for (const name of REQUIRED_ADDRESSES) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    errors.push(`${name} is missing.`);
    continue;
  }
  if (value.toLowerCase() === ZERO_ADDRESS) {
    errors.push(`${name} is the zero address.`);
    continue;
  }
  if (!ADDRESS_RE.test(value)) {
    errors.push(`${name} is not a valid 0x-prefixed 20-byte address: "${value}".`);
  }
}

const network = (process.env.NEXT_PUBLIC_NETWORK || '').trim();
const activeChain = network || DEFAULT_CHAIN_ID;
if (network && !SUPPORTED_CHAIN_IDS.includes(network)) {
  errors.push(
    `NEXT_PUBLIC_NETWORK must be "97" (BSC Testnet) or "56" (BSC Mainnet) — got "${network}".`,
  );
}

if (errors.length > 0) {
  console.error('\nPreflight failed — refusing to build:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nSet the missing env vars (.env.local or Vercel project settings) and retry.\n');
  process.exit(1);
}

const networkLabel = activeChain === '56' ? 'BSC Mainnet' : 'BSC Testnet';
console.log(
  `Preflight ok — chain ${activeChain} (${networkLabel}), ${REQUIRED_ADDRESSES.length} addresses validated.`,
);
