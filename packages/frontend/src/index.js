import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 1. Import all the wagmi/rainbowkit stuff
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// 2. Set up your config
const config = getDefaultConfig({
  appName: 'DAO Voting App',
  projectId: 'YOUR_PROJECT_ID', // You get this from WalletConnect
  chains: [mainnet, sepolia],
});

const queryClient = new QueryClient();

// 3. Wrap your App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);