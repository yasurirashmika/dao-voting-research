# DAO Voting Frontend - Complete Setup Guide

## Step-by-Step Installation

### 1. Create React App (if not already created)

```bash
npx create-react-app dao-voting-frontend
cd dao-voting-frontend
```

### 2. Install All Dependencies

```bash
npm install @rainbow-me/rainbowkit wagmi viem ethers @tanstack/react-query react-router-dom
```

### 3. Create Directory Structure

Run these commands from your project root:

```bash
# Create component directories
mkdir -p src/components/common/{Button,Modal,Loader,Card,Input}
mkdir -p src/components/layout/{Header,Footer,Sidebar}
mkdir -p src/components/wallet/{WalletConnect,WalletInfo}
mkdir -p src/components/proposal/{ProposalCard,ProposalList,ProposalDetail,CreateProposal,ProposalFilters}
mkdir -p src/components/voting/{VoteButton,VoteResults,VotingPower}
mkdir -p src/components/dashboard/{Stats,Activity}

# Create pages directories
mkdir -p src/pages/{Home,Proposals,ProposalDetails,CreateProposalPage,Dashboard,NotFound}

# Create other directories
mkdir -p src/{hooks,context,services/api,services/blockchain,services/ipfs}
mkdir -p src/{utils,config,assets/styles,assets/fonts,assets/icons,abis,routes}

# Create all necessary files
touch src/hooks/{useWallet.js,useContract.js,useProposals.js,useVoting.js,useDebounce.js}
touch src/context/{WalletContext.jsx,DAOContext.jsx,ThemeContext.jsx}
touch src/services/api/{proposalService.js,votingService.js,userService.js}
touch src/services/blockchain/{contractInteraction.js,walletConnection.js,eventListeners.js}
touch src/services/ipfs/ipfsService.js
touch src/utils/{constants.js,formatters.js,validators.js,helpers.js,web3Utils.js}
touch src/config/{contracts.js,networks.js,environment.js}
touch src/assets/styles/{global.css,variables.css,theme.css}
touch src/routes/{AppRouter.jsx,ProtectedRoute.jsx}

# Create config files
touch .env .env.example .gitignore
```

### 4. Create Environment File

Create `.env` in root directory:

```bash
cat > .env << 'EOF'
# WalletConnect Project ID
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Blockchain Network
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Contract Addresses
REACT_APP_DAO_GOVERNANCE_CONTRACT=0x...
REACT_APP_GOVERNANCE_TOKEN_CONTRACT=0x...
REACT_APP_TREASURY_CONTRACT=0x...

# IPFS
REACT_APP_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Environment
REACT_APP_ENVIRONMENT=development
EOF
```

### 5. Copy All Code Files

Now copy all the code I provided into their respective files:

**Important files to replace:**
- `public/index.html`
- `src/index.js`
- `src/App.js`
- `src/App.css`
- All component files
- All page files
- All utility files
- All context files
- All hook files

### 6. Add Your Contract ABIs

Create your contract ABI files in `src/abis/`:

```bash
# Example: Create a placeholder ABI file
cat > src/abis/DAOGovernance.json << 'EOF'
[
  {
    "inputs": [],
    "name": "proposalCount",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]
EOF
```

**You'll need to replace these with your actual contract ABIs.**

### 7. Get WalletConnect Project ID

1. Visit https://cloud.walletconnect.com/
2. Sign up or log in
3. Create a new project
4. Copy your Project ID
5. Add it to `.env` file

### 8. Update Package.json

Replace the content of `package.json` with the one I provided earlier.

### 9. Install Updated Dependencies

```bash
npm install
```

### 10. Start Development Server

```bash
npm start
```

Your app should now be running at `http://localhost:3000`

## Troubleshooting

### Issue: Module not found errors

**Solution:**
```bash
npm install
npm start
```

### Issue: RainbowKit styling issues

**Solution:**
Make sure `@rainbow-me/rainbowkit/styles.css` is imported in `src/index.js`

### Issue: Contract not deployed on network

**Solution:**
1. Check your contract addresses in `.env`
2. Ensure you're connected to the correct network
3. Verify contract deployment on block explorer

### Issue: Wallet not connecting

**Solution:**
1. Verify WalletConnect Project ID in `.env`
2. Clear browser cache
3. Try different wallet
4. Check browser console for errors

## Next Steps

### 1. Deploy Your Smart Contracts

Make sure your governance contracts are deployed and verified.

### 2. Update Contract Addresses

Add your deployed contract addresses to `src/config/contracts.js`

### 3. Implement Contract Methods

Update the following files with actual blockchain calls:
- `src/hooks/useContract.js`
- `src/hooks/useProposals.js`
- `src/hooks/useVoting.js`

### 4. Test Thoroughly

```bash
# Run tests
npm test

# Build for production
npm run build
```

### 5. Deploy Frontend

Choose your deployment platform:
- **Vercel**: Easiest for React apps
- **Netlify**: Good CI/CD pipeline
- **IPFS**: Fully decentralized hosting

## File Checklist

Make sure you have created/updated these files:

### Root Files
- [ ] `package.json`
- [ ] `.env`
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `README.md`

### Public Files
- [ ] `public/index.html`
- [ ] `public/manifest.json`

### Source Files
- [ ] `src/index.js`
- [ ] `src/App.js`
- [ ] `src/App.css`

### Styles
- [ ] `src/assets/styles/global.css`
- [ ] `src/assets/styles/variables.css`

### Routes
- [ ] `src/routes/AppRouter.jsx`
- [ ] `src/routes/ProtectedRoute.jsx`

### Context
- [ ] `src/context/WalletContext.jsx`
- [ ] `src/context/DAOContext.jsx`
- [ ] `src/context/ThemeContext.jsx`

### Hooks
- [ ] `src/hooks/useContract.js`
- [ ] `src/hooks/useProposals.js`
- [ ] `src/hooks/useVoting.js`
- [ ] `src/hooks/useDebounce.js`

### Utils
- [ ] `src/utils/constants.js`
- [ ] `src/utils/formatters.js`
- [ ] `src/utils/validators.js`
- [ ] `src/utils/helpers.js`

### Config
- [ ] `src/config/networks.js`
- [ ] `src/config/contracts.js`

### Layout Components
- [ ] `src/components/layout/Layout.jsx`
- [ ] `src/components/layout/Layout.css`
- [ ] `src/components/layout/Header/Header.jsx`
- [ ] `src/components/layout/Header/Header.module.css`
- [ ] `src/components/layout/Footer/Footer.jsx`
- [ ] `src/components/layout/Footer/Footer.module.css`

### Common Components
- [ ] `src/components/common/Button/Button.jsx`
- [ ] `src/components/common/Button/Button.module.css`
- [ ] `src/components/common/Card/Card.jsx`
- [ ] `src/components/common/Card/Card.module.css`
- [ ] `src/components/common/Modal/Modal.jsx`
- [ ] `src/components/common/Modal/Modal.module.css`
- [ ] `src/components/common/Input/Input.jsx`
- [ ] `src/components/common/Input/Input.module.css`
- [ ] `src/components/common/Loader/Loader.jsx`
- [ ] `src/components/common/Loader/Loader.module.css`

### Pages
- [ ] `src/pages/Home/Home.jsx`
- [ ] `src/pages/Home/Home.module.css`
- [ ] `src/pages/Proposals/Proposals.jsx`
- [ ] `src/pages/Proposals/Proposals.module.css`
- [ ] `src/pages/ProposalDetails/ProposalDetails.jsx`
- [ ] `src/pages/ProposalDetails/ProposalDetails.module.css`
- [ ] `src/pages/CreateProposalPage/CreateProposalPage.jsx`
- [ ] `src/pages/CreateProposalPage/CreateProposalPage.module.css`
- [ ] `src/pages/Dashboard/Dashboard.jsx`
- [ ] `src/pages/Dashboard/Dashboard.module.css`
- [ ] `src/pages/NotFound/NotFound.jsx`
- [ ] `src/pages/NotFound/NotFound.module.css`

## Quick Start Commands Summary

```bash
# 1. Create project (if needed)
npx create-react-app dao-voting-frontend
cd dao-voting-frontend

# 2. Install dependencies
npm install @rainbow-me/rainbowkit wagmi viem ethers @tanstack/react-query react-router-dom

# 3. Create directory structure (use commands above)

# 4. Copy all provided code files

# 5. Create and configure .env file

# 6. Start development
npm start

# 7. Build for production
npm run build
```

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all files are in correct locations
3. Ensure environment variables are set
4. Check that dependencies are installed
5. Refer to README.md for detailed information

Good luck with your DAO Voting Platform! 🚀