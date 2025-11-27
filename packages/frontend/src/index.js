import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import styles
import './assets/styles/variables.css';
import './assets/styles/global.css';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// Import wagmi and RainbowKit
import { getDefaultConfig, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { http } from 'viem';
import { mainnet, sepolia, polygon, arbitrum } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Import context providers
import { WalletProvider } from './context/WalletContext';
import { DAOProvider } from './context/DAOContext';
import { ThemeProvider } from './context/ThemeContext';

// Get project IDs from environment variables
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'bb12a9390f7afd6748d4e48963e83782';
const infuraId = process.env.REACT_APP_INFURA_PROJECT_ID;

// Configure wagmi with chains using Infura
const config = getDefaultConfig({
  appName: 'DAO Voting Platform',
  projectId: projectId,
  chains: [sepolia, mainnet, polygon, arbitrum],
  transports: {
    // Use Infura for Sepolia and Mainnet
    [sepolia.id]: http(`https://sepolia.infura.io/v3/${infuraId}`),
    [mainnet.id]: http(`https://mainnet.infura.io/v3/${infuraId}`),
    
    // Public RPCs for other chains
    [polygon.id]: http('https://polygon-rpc.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
  },
  ssr: false,
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
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider
        coolMode
        theme={lightTheme()}
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
);