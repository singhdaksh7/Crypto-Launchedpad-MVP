// Runs before `next build` (via the `prebuild` npm script).
// Fails the build if testnet env vars are missing, zero, or malformed —
// otherwise the app ships with NEXT_PUBLIC_* inlined as empty/zero and
// silently calls the zero address.
//
// Testnet-only: enforces NEXT_PUBLIC_NETWORK === "97" (BSC Testnet).

const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const REQUIRED_ADDRESSES = [
  'NEXT_PUBLIC_LAUNCHPAD_ADDRESS',
  'NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS',
  'NEXT_PUBLIC_VESTING_ADDRESS',
];
const REQUIRED_CHAIN_ID = '97';

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
if (network && network !== REQUIRED_CHAIN_ID) {
  errors.push(
    `NEXT_PUBLIC_NETWORK must be "${REQUIRED_CHAIN_ID}" (BSC Testnet) — got "${network}". This project is testnet-only.`,
  );
}

if (errors.length > 0) {
  console.error('\nPreflight failed — refusing to build:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nSet the missing env vars (.env.local) and retry.\n');
  process.exit(1);
}

console.log(
  `Preflight ok — chain ${network || REQUIRED_CHAIN_ID}, ${REQUIRED_ADDRESSES.length} addresses validated.`,
);
