# Deployment Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Hardhat** development environment
4. **MetaMask** wallet with testnet ETH
5. **Etherscan API key** (for contract verification)

## Environment Setup

Create a `.env` file in the project root:

```bash
# Testnet Configuration
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SEPOLIA_PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional: Alternative RPCs
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
```

## Installation

```bash
# Install dependencies
npm install

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts

# Install additional dev dependencies
npm install --save-dev hardhat-gas-reporter hardhat-contract-sizer solidity-coverage
```

## Deployment Options

### Option 1: Full System Deployment (Recommended)

```bash
# Local deployment
npm run deploy:local

# Sepolia testnet deployment
npm run deploy:sepolia
```

### Option 2: Individual Contract Deployment

```bash
# Deploy governance token only
npx hardhat run scripts/deploy-governance-token.js --network sepolia

# Deploy reputation manager only
npx hardhat run scripts/deploy-reputation-manager.js --network sepolia

# Deploy DAO voting (requires token and reputation addresses)
npx hardhat run scripts/deploy-dao-voting.js --network sepolia
```

## Verification

After deployment, verify contracts on Etherscan:

```bash
# Automatic verification (included in deployment script)
npm run verify:sepolia

# Manual verification
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "constructor" "arguments"
```

## Testing

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration

# Generate gas report
npm run test:gas

# Generate coverage report
npm run coverage
```

## Deployment Checklist

- [ ] Environment variables set in `.env`
- [ ] Sufficient testnet ETH in deployer wallet
- [ ] All contracts compile successfully
- [ ] Tests pass locally
- [ ] Deploy to local network first
- [ ] Deploy to testnet
- [ ] Verify contracts on Etherscan
- [ ] Test basic functionality on testnet

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Get testnet ETH from faucets
2. **"Contract not verified"**: Wait 1-2 minutes after deployment
3. **"Invalid constructor arguments"**: Check deployment parameters
4. **"Gas estimation failed"**: Increase gas limit or check for reverts

### Getting Testnet ETH

- Sepolia: https://sepoliafaucet.com/
- Sepolia Alt: https://faucet.sepolia.dev/
- Goerli: https://goerlifaucet.com/

### Network Configuration

Ensure your MetaMask has Sepolia network added:
- Network Name: Sepolia
- RPC URL: https://rpc.sepolia.org
- Chain ID: 11155111
- Currency Symbol: ETH