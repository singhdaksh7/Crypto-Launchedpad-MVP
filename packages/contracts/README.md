# Smart Contracts

This directory contains all Solidity smart contracts for the launchpad platform.

## Contracts

### LaunchpadToken.sol
ERC20 token implementation with owner-controlled mint and burn functions.

**Key Functions:**
- `constructor(name, symbol, initialSupply)` - Deploy token
- `mint(to, amount)` - Mint new tokens (only owner)
- `burn(amount)` - Burn tokens

### TokenFactory.sol
Factory pattern implementation for deploying LaunchpadToken instances.

**Key Functions:**
- `createToken(name, symbol, initialSupply)` - Deploy new token
- `getCreatedTokens()` - Get all created tokens
- `getTokensByCreator(creator)` - Get tokens by specific creator

**Events:**
- `TokenCreated(creator, tokenAddress, name, symbol, supply)`

### Launchpad.sol
Main presale contract with security and state management.

**Key Structs:**
```solidity
PresaleConfig {
    address tokenAddress;
    address owner;
    uint256 tokenPrice;
    uint256 softcap;
    uint256 hardcap;
    uint256 startTime;
    uint256 endTime;
    uint256 maxBuyPerUser;
    uint256 totalRaised;
    bool isActive;
    bool isFinalized;
}

UserContribution {
    uint256 amount;
    uint256 tokenAmount;
    bool claimed;
}
```

**Key Functions:**
- `createPresale(...)` - Create new presale
- `buyTokens(presaleId)` - Participate in presale (payable)
- `claimTokens(presaleId)` - Claim tokens after presale
- `withdrawFunds(presaleId)` - Owner withdraws funds
- `refundContribution(presaleId)` - Refund if softcap not reached

**Events:**
- `PresaleCreated(presaleId, tokenAddress, owner, softcap, hardcap, startTime, endTime)`
- `TokensPurchased(presaleId, buyer, amount, tokenAmount)`
- `PresaleFinalized(presaleId, success)`
- `TokensClaimed(presaleId, buyer, amount)`
- `FundsWithdrawn(presaleId, amount)`

## Security Features

✅ **ReentrancyGuard** - Prevents reentrancy attacks
✅ **Ownable** - Owner-based access control
✅ **Input Validation** - All parameters validated
✅ **Checks-Effects-Interactions Pattern** - Prevents reentrancy
✅ **Safe Transfer** - Uses low-level calls with checks

## Testing

Run tests:
```bash
npm run contracts:test
```

## Deployment

Deploy to BSC Testnet:
```bash
npm run deploy
```

Deploy to BSC Mainnet:
```bash
npm run deploy:mainnet
```

## Configuration

Edit `hardhat.config.js` to configure:
- Network RPC endpoints
- Private key for deployment
- Gas settings
- Solidity compiler version

## Gas Costs (Testnet)

Approximate gas costs:
- Create Token: ~400,000 gas
- Create Presale: ~150,000 gas
- Buy Tokens: ~100,000 gas
- Claim Tokens: ~80,000 gas
- Withdraw Funds: ~50,000 gas

## Verification

After deployment, verify on BscScan:
```bash
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS "constructor args"
```
