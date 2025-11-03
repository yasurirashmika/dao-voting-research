import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import styles
import './assets/styles/variables.css';
import './assets/styles/global.css';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// Import wagmi and RainbowKit
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, sepolia, polygon, arbitrum } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Import context providers
import { WalletProvider } from './context/WalletContext';
import { DAOProvider } from './context/DAOContext';
import { ThemeProvider } from './context/ThemeContext';

// Get WalletConnect project ID from environment variables
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// Configure wagmi with chains
const config = getDefaultConfig({
  appName: 'DAO Voting Platform',
  projectId: projectId,
  chains: [
    mainnet, 
    sepolia,    // Ethereum testnet
    polygon,    // Polygon mainnet
    arbitrum    // Arbitrum mainnet
  ],
  ssr: false, // If using Next.js, set to true
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          coolMode
          theme={null}
          showRecentTransactions={true}
        >
          <ThemeProvider>
            <WalletProvider>
              <DAOProvider>
                <App />
              </DAOProvider>
            </WalletProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);