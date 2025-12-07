import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';

// Config
import { config } from './config/wagmi';

// Contexts
import { DeploymentProvider } from './context/DeploymentContext';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import { DAOProvider } from './context/DAOContext';

// Main Component
import App from './App';

// Styles
import './assets/styles/variables.css';
import './assets/styles/global.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {/* 1. Deployment Context (Must be first for config loading) */}
    <DeploymentProvider>
      
      {/* 2. Wagmi (Blockchain Connection) */}
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            coolMode 
            theme={lightTheme()}
            showRecentTransactions={true}
          >
            
            {/* 3. Theme & UI */}
            <ThemeProvider>
              
              {/* 4. Wallet Data */}
              <WalletProvider>
                
                {/* 5. DAO Logic (Depends on Deployment + Wallet) */}
                <DAOProvider>
                  
                  {/* 6. The App */}
                  <App />
                  
                </DAOProvider>
              </WalletProvider>
            </ThemeProvider>
            
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
      
    </DeploymentProvider>
  </React.StrictMode>
);