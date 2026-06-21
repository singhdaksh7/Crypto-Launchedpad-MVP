# Crypto Launchpad

A decentralized launchpad platform built on Binance Smart Chain (BSC). Create ERC20 tokens, launch presales, and manage token offerings with full Web3 integration.

## Features

✅ **Token Creation** - Deploy ERC20 tokens with custom name, symbol, and supply
✅ **Presale Management** - Create presales with softcap, hardcap, and time limits
✅ **Multi-Wallet Support** - MetaMask integration (Phase 2: TrustWallet, WalletConnect, etc.)
✅ **Buy/Claim Flow** - Users can purchase tokens and claim after presale ends
✅ **Admin Dashboard** - Manage presales and view contributions
✅ **Vesting Support** - Automatic token vesting (Phase 2)
✅ **Liquidity Lock** - Lock LP tokens post-launch (Phase 2)

## Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- Hardhat for development and testing
- OpenZeppelin Contracts for security

### Frontend
- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- ethers.js for Web3 integration
- Zustand for state management
- Prisma for persistent payment/access storage

### Network
- BSC Testnet (default)
- BSC Mainnet (for production)

## Project Structure

```
crypto-launchpad/
├── packages/
│   ├── contracts/          # Smart contracts (Solidity)
│   │   ├── contracts/      # Contract source files
│   │   ├── test/           # Contract tests
│   │   ├── scripts/        # Deployment scripts
│   │   └── hardhat.config.js
│   └── frontend/           # Next.js frontend
│       ├── src/
│       │   ├── pages/      # Next.js pages
│       │   ├── components/ # React components
│       │   ├── lib/        # Utilities and ABIs
│       │   ├── hooks/      # Custom React hooks
│       │   └── store/      # Zustand stores
│       └── package.json
└── package.json            # Root package.json with workspaces
```

## Installation

### Prerequisites
- Node.js >= 16
- npm or yarn
- MetaMask browser extension

### Setup

1. **Clone the repository**
```bash
cd crypto-launchpad
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create `.env` files in both `packages/contracts` and `packages/frontend`:

**packages/contracts/.env**
```
PRIVATE_KEY=0x...
BSCSCAN_API_KEY=your_api_key
```

**packages/frontend/.env.local**
```
# 97 = BSC Testnet (default), 56 = BSC Mainnet
NEXT_PUBLIC_NETWORK=97
NEXT_PUBLIC_RPC_URL=https://bsc-testnet-rpc.publicnode.com
NEXT_PUBLIC_LAUNCHPAD_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_VESTING_ADDRESS=0x...
```

See `packages/frontend/.env.example` for the full list of vars (WalletConnect,
creator access, payment gateway, JWT) and the "Deploying to Vercel" section below for the
mainnet-vs-testnet split.

## Development

### Compile Smart Contracts
```bash
npm run contracts:compile
```

### Deploy to BSC Testnet
```bash
npm run contracts:deploy
```

### Deploy to BSC Mainnet
```bash
npm run contracts:deploy:mainnet
```

### Run Frontend Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Run Tests
```bash
npm run test
```

### Payment/access database

Creator launch access uses a storage adapter selected by `PAYMENT_STORAGE`.
Local development may use `PAYMENT_STORAGE=memory`, but production builds must
set `PAYMENT_STORAGE=database` and `DATABASE_URL` for PostgreSQL-backed storage.

Useful Prisma commands:

```bash
cd packages/frontend
npx prisma generate
npx prisma validate
npx prisma migrate dev
```

Use `npx prisma db push` only for disposable development databases. For shared
or production databases, review and run the checked-in migration under
`packages/frontend/prisma/migrations/`.

## Smart Contracts

### 1. LaunchpadToken.sol
- ERC20 token with mint/burn functionality
- Created via TokenFactory

### 2. TokenFactory.sol
- Factory contract for deploying LaunchpadToken instances
- Tracks all created tokens
- Allows querying tokens by creator

### 3. Launchpad.sol
- Main presale contract
- Functions:
  - `createPresale()` - Create new presale
  - `buyTokens()` - Participate in presale
  - `claimTokens()` - Claim tokens after presale
  - `withdrawFunds()` - Owner withdraws raised funds
  - `refundContribution()` - Refund if softcap not reached

## Usage

### Creating a Token

1. Connect your MetaMask wallet
2. Go to "Create Token"
3. Enter token name, symbol, and initial supply
4. Pay gas fees and wait for transaction

### Creating a Presale

1. Go to "Dashboard"
2. Click "Create Presale"
3. Fill in presale parameters:
   - Token address
   - Token price in BNB
   - Softcap and hardcap
   - Start and end times
   - Max buy per user
4. Submit transaction

### Participating in Presale

1. Go to "Launchpads"
2. Find the presale you want to join
3. Click "View Details"
4. Enter amount and click "Buy Tokens"
5. Confirm MetaMask transaction
6. After presale ends, claim your tokens

## Gas Optimization

- Batch operations where possible
- Efficient storage usage in contracts
- Fallback receiver for ETH refunds

## Security Considerations

⚠️ **This is a demo/learning project**
- Smart contracts should be audited before mainnet deployment
- Use testnet for testing
- Never share your private key
- Always verify contract addresses

## Future Enhancements (Phase 2)

- [ ] Multi-wallet support (TrustWallet, WalletConnect, Coinbase, MathWallet)
- [ ] KYC integration
- [ ] Vesting schedules
- [ ] Liquidity lock functionality
- [ ] Referral system
- [ ] Advanced analytics
- [ ] Governance token
- [ ] Community voting on presales

## Deploying to Vercel

The frontend supports both BSC Testnet (97) and BSC Mainnet (56). The selected
network is driven entirely by env vars — code is identical between deployments.

### Recommended layout: two separate Vercel projects

Keep the existing project as **testnet** (preview/dev), and create a new
project for **mainnet** production.

**Build settings (identical for both projects, root-level `vercel.json`):**
- Build Command: `cd packages/frontend && npm run build`
- Install Command: `npm install --legacy-peer-deps`
- Output Directory: `packages/frontend/.next`
- Root Directory: leave blank (repository root — Vercel must see `packages/`)
- Framework Preset: Next.js
- Node.js Version: 20.x or newer

The `prebuild` step runs `scripts/preflight.js`, which fails the build if any
contract address is missing/zero or `NEXT_PUBLIC_NETWORK` is not `56` or `97`.

### Env vars — testnet project (current setup)

Apply to **Production, Preview, Development**.

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_NETWORK` | `97` |
| `NEXT_PUBLIC_RPC_URL` | `https://bsc-testnet-rpc.publicnode.com` (or paid testnet RPC) |
| `NEXT_PUBLIC_LAUNCHPAD_ADDRESS` | from `packages/contracts/deployments/bscTestnet.json` |
| `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS` | from `bscTestnet.json` |
| `NEXT_PUBLIC_VESTING_ADDRESS` | from `bscTestnet.json` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project id |
| `JWT_SECRET` | 32+ byte random string |
| `EXEMPT_ADDRESSES` | comma-separated, lowercase |
| `KYC_VERIFIED_ADDRESSES` | comma-separated, lowercase |
| `PAYMENT_PROVIDER` | `mock` for local/testnet until SMEPay is configured |
| `PAYMENT_AMOUNT_INR` | `1000` |
| `PAYMENT_STORAGE` | `database` for deployed environments; `memory` is local/dev only |
| `DATABASE_URL` | PostgreSQL connection string for Prisma payment/access storage |
| `MOCK_PAYMENT_SECRET` | random test secret for mock-provider verification |
| `SMEPAY_MERCHANT_ID` | empty until SMEPay credentials are available |
| `SMEPAY_SECRET` | empty until SMEPay credentials are available |
| `SMEPAY_WEBHOOK_SECRET` | empty until SMEPay webhook docs are available |

### Env vars — mainnet project (new production project)

Create a new Vercel project pointing at the same git repository. Set scope to
**Production, Preview, Development** unless you specifically want previews to
talk to testnet (in which case set the `NEXT_PUBLIC_*` chain/address values
only at the Production scope and leave the others empty — but the simpler,
recommended approach is to keep this project mainnet-only and use the existing
project for testnet previews).

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_NETWORK` | `56` |
| `NEXT_PUBLIC_RPC_URL` | a reliable BSC mainnet RPC (Alchemy / QuickNode / Ankr; free public endpoints are rate-limited and not recommended for production) |
| `NEXT_PUBLIC_LAUNCHPAD_ADDRESS` | from `packages/contracts/deployments/bscMainnet.json` after running `npm run contracts:deploy:mainnet` |
| `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS` | from `bscMainnet.json` |
| `NEXT_PUBLIC_VESTING_ADDRESS` | from `bscMainnet.json` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | a separate WalletConnect Cloud project id with the production domain in its allowed origins |
| `JWT_SECRET` | a fresh 32+ byte random string (do **not** reuse the testnet secret) |
| `EXEMPT_ADDRESSES` | comma-separated, lowercase mainnet addresses |
| `KYC_VERIFIED_ADDRESSES` | comma-separated, lowercase mainnet addresses |
| `PAYMENT_PROVIDER` | `smepay` after SMEPay API credentials/docs are wired |
| `PAYMENT_AMOUNT_INR` | `1000` |
| `PAYMENT_STORAGE` | `database` — production must use persistent storage |
| `DATABASE_URL` | PostgreSQL connection string for Prisma payment/access storage |
| `SMEPAY_MERCHANT_ID` | live merchant id from SMEPay |
| `SMEPAY_SECRET` | live server-side SMEPay secret |
| `SMEPAY_WEBHOOK_SECRET` | live webhook checksum/signature secret once documented |

Payment/access storage note: the built-in memory adapter is only for local
development because it resets on server restart and is not reliable on Vercel
serverless. Production deployments must use `PAYMENT_STORAGE=database` with a
PostgreSQL `DATABASE_URL`.

After setting `DATABASE_URL`, run the Prisma migration before relying on the
payment gate:

```bash
cd packages/frontend
npx prisma generate
npx prisma migrate deploy
```

### Mainnet pre-deploy checklist

Before connecting the new Vercel project:

1. Add a `PRIVATE_KEY` (mainnet deployer) and `BSCSCAN_API_KEY` to
   `packages/contracts/.env`.
2. Optionally set `BSC_MAINNET_RPC_URL` to your paid mainnet RPC.
3. Run `npx hardhat run scripts/deploy.js --network bscMainnet` from
   `packages/contracts/` (or `npm run contracts:deploy:mainnet`). This writes
   `packages/contracts/deployments/bscMainnet.json`.
4. Verify each contract: `npx hardhat verify --network bscMainnet <address>`.
5. Copy the three deployed addresses into the Vercel project env vars above.
6. Trigger a Production deployment.

The preflight step will fail the build if `NEXT_PUBLIC_NETWORK=56` is set but
any of the three address vars is missing.

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

---

**Disclaimer**: This is an educational project. Cryptocurrency and token sales carry risks. Always conduct thorough research and use testnet first.
