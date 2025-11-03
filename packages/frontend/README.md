<!-- # Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify) -->


# DAO Voting Platform - Frontend

A modern, decentralized voting platform for DAOs built with React, RainbowKit, and Wagmi.

## 🚀 Features

- **Wallet Integration**: Connect with multiple wallets using RainbowKit
- **Proposal Management**: Create, view, and manage governance proposals
- **Voting System**: Cast votes with optional reasons
- **Dashboard**: Track your voting power, activity, and participation
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Mode**: Toggle between light and dark themes

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- WalletConnect Project ID ([Get one here](https://cloud.walletconnect.com/))

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dao-voting-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   
   Edit `.env` and add your configuration:
   ```env
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
   REACT_APP_DAO_GOVERNANCE_CONTRACT=0x...
   REACT_APP_GOVERNANCE_TOKEN_CONTRACT=0x...
   REACT_APP_TREASURY_CONTRACT=0x...
   ```

5. **Add your smart contract ABIs**
   
   Place your contract ABIs in `src/abis/`:
   - `DAOGovernance.json`
   - `GovernanceToken.json`
   - `Treasury.json`

## 🏃 Running the Application

### Development Mode

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
```

Build files will be in the `build/` directory.

## 📁 Project Structure

```
dao-voting-frontend/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Reusable components (Button, Card, etc.)
│   │   ├── layout/      # Layout components (Header, Footer)
│   │   ├── proposal/    # Proposal-related components
│   │   ├── voting/      # Voting components
│   │   └── dashboard/   # Dashboard components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── context/         # React Context providers
│   ├── services/        # API and blockchain services
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   ├── assets/          # CSS, images, fonts
│   ├── abis/            # Smart contract ABIs
│   ├── routes/          # Route configuration
│   ├── App.js           # Main App component
│   └── index.js         # Entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔧 Configuration

### Networks

Edit `src/config/networks.js` to add/modify supported networks:

```javascript
export const NETWORKS = {
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    // ...
  }
};
```

### Contracts

Update `src/config/contracts.js` with your deployed contract addresses:

```javascript
export const CONTRACT_ADDRESSES = {
  11155111: {
    DAOGovernance: '0x...',
    GovernanceToken: '0x...',
    Treasury: '0x...'
  }
};
```

## 🎨 Customization

### Styling

- **CSS Variables**: Edit `src/assets/styles/variables.css` for colors and themes
- **Global Styles**: Modify `src/assets/styles/global.css`
- **Component Styles**: Each component has its own `.module.css` file

### Branding

- Update logo and favicon in `public/`
- Modify `public/manifest.json` for PWA settings
- Edit `src/components/layout/Header/Header.jsx` for navigation

## 📝 Smart Contract Integration

### Update Contract Hooks

1. Import your ABI in `src/hooks/useContract.js`
2. Implement contract methods in `src/hooks/useProposals.js` and `src/hooks/useVoting.js`
3. Update `src/services/blockchain/contractInteraction.js` with your contract logic

### Example: Implementing Vote Function

```javascript
// In src/hooks/useVoting.js
import DAOGovernanceABI from '../abis/DAOGovernance.json';

export const useVoting = () => {
  const { write } = useContract('DAOGovernance', DAOGovernanceABI);

  const castVote = async (proposalId, support) => {
    return await write('castVote', [proposalId, support]);
  };
  
  // ...
};
```

## 🧪 Testing

```bash
npm test
```

## 🚢 Deployment

### Vercel

```bash
npm run build
# Deploy the build/ directory to Vercel
```

### Netlify

```bash
npm run build
# Deploy the build/ directory to Netlify
```

### IPFS

```bash
npm run build
# Upload build/ directory to IPFS
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh/)
- [React Documentation](https://react.dev/)
- [Viem Documentation](https://viem.sh/)

## 💬 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🙏 Acknowledgments

- RainbowKit team for wallet connection
- Wagmi team for React hooks for Ethereum
- OpenZeppelin for governance contracts reference

---

Built with ❤️ for decentralized communities