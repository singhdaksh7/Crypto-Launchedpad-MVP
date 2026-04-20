# Frontend

Next.js frontend for the crypto launchpad platform.

## Structure

```
src/
├── pages/               # Next.js pages (routes)
│   ├── _app.tsx        # App wrapper
│   ├── index.tsx       # Home page
│   ├── create-token.tsx    # Token creation page
│   ├── launchpads.tsx      # List all presales
│   └── dashboard.tsx       # Admin dashboard
├── components/         # React components
│   ├── Header.tsx      # Navigation header
│   ├── Footer.tsx      # Footer
│   ├── Layout.tsx      # Layout wrapper
│   └── WalletButton.tsx    # Wallet connection button
├── lib/                # Utilities
│   ├── web3.ts         # Web3 utilities
│   └── abis/           # Contract ABIs
├── hooks/              # Custom React hooks
│   └── useWalletConnect.ts # Wallet connection hook
├── store/              # Zustand stores
│   └── index.ts        # Web3 and launchpad state
└── styles/             # Global styles
    └── globals.css     # TailwindCSS styles
```

## Pages

### Home (/)
Landing page with features and how-it-works section.

### Create Token (/create-token)
Form to create new ERC20 tokens using TokenFactory contract.

**Features:**
- Token name, symbol, supply input
- MetaMask integration
- Real-time transaction confirmation

### Launchpads (/launchpads)
Browse all active presales.

**Features:**
- List all presales
- Filter by status
- View presale details

### Dashboard (/dashboard)
Admin dashboard for managing presales.

**Tabs:**
- Create Presale - Form to launch new presale
- My Presales - List and manage your presales

## Components

### Header
Navigation bar with:
- Logo/branding
- Navigation links
- Wallet connection button

### WalletButton
Connects MetaMask wallet and displays account address.

### Layout
Wraps pages with Header and Footer.

## Hooks

### useWalletConnect
Custom hook for wallet connection management.

**Returns:**
```typescript
{
  connectWallet: () => void,
  disconnectWallet: () => void,
  error: string | null
}
```

## State Management (Zustand)

### Web3Store
```typescript
{
  account: string | null,
  signer: ethers.Signer | null,
  provider: ethers.BrowserProvider | null,
  chainId: number | null,
  isConnecting: boolean
}
```

### LaunchpadStore
```typescript
{
  presales: any[],
  userContributions: Record<string, any>
}
```

## Utilities

### web3.ts

- `getProvider()` - Get ethers provider
- `getChainId()` - Get configured chain ID
- `getContractAddresses()` - Get deployed contract addresses
- `isValidAddress()` - Validate Ethereum address
- `formatAddress()` - Format address to short form
- `parseEther()` - Convert string to wei
- `formatEther()` - Convert wei to string

## Styling

Uses TailwindCSS with custom utilities:
- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.btn-outline` - Outline button
- `.card` - Card component
- `.input-field` - Form input
- `.label-text` - Form label

## Environment Variables

```
NEXT_PUBLIC_NETWORK=97              # BSC Testnet chain ID
NEXT_PUBLIC_RPC_URL=...             # BSC Testnet RPC URL
NEXT_PUBLIC_LAUNCHPAD_ADDRESS=0x... # Deployed Launchpad contract
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x... # Deployed TokenFactory contract
```

## Development

Start dev server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Troubleshooting

**MetaMask not connecting:**
- Ensure MetaMask is installed
- Check that you're on BSC Testnet (chainId: 97)
- Clear browser cache and reload

**Contract calls failing:**
- Verify contract addresses in .env.local
- Check that contracts are deployed on BSC Testnet
- Ensure you have testnet BNB in your wallet

**Transactions pending:**
- Check gas price settings
- Increase gas limit if needed
- Wait for blockchain confirmation

## Future Improvements

- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add transaction history
- [ ] Mobile responsive optimization
- [ ] Dark/light mode toggle
- [ ] Advanced filtering
- [ ] Search functionality
"# Crypto-Launchedpad-MVP" 
