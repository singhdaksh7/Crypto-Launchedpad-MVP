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
NEXT_PUBLIC_NETWORK=97
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-b7c35c69bdb811ec.binance.org:8545
NEXT_PUBLIC_LAUNCHPAD_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...
```

## Development

### Compile Smart Contracts
```bash
npm run contracts:compile
```

### Deploy to BSC Testnet
```bash
npm run contracts:deploy
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

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

---

**Disclaimer**: This is an educational project. Cryptocurrency and token sales carry risks. Always conduct thorough research and use testnet first.
