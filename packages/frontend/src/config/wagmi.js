import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const transports = {
  [sepolia.id]: http(
    process.env.REACT_APP_RPC_URL || 'https://sepolia.infura.io/v3/104845fd11af4611b886d2269eb925ee',
    {
      timeout: 60_000,
      retryCount: 2, 
      retryDelay: 3000,
    }
  ),
};

export const config = getDefaultConfig({
  appName: 'DAO Voting System',
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'bb12a9390f7afd6748d4e48963e83782',
  
  // ✅ UPDATED: Strictly Sepolia Only
  chains: [sepolia],
  
  transports,
  
  ssr: false,
  
  // ✅ CRITICAL: Disable auto-reconnect to prevent loops
  // Note: In newer Wagmi/RainbowKit versions, this might be handled differently, 
  // but keeping it explicit is good if supported by your version.
});

export default config;