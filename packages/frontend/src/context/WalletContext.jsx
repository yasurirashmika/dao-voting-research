import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { data: balance, refetch: refetchBalance } = useBalance({ 
    address,
    // Force refetch when address changes
    watch: true 
  });
  
  const [walletState, setWalletState] = useState({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    balance: null
  });

  // Update state when wagmi detects changes
  useEffect(() => {
    console.log('🔄 Wallet state updated:', { address, isConnected });
    
    setWalletState({
      address,
      isConnected,
      isConnecting,
      chainId,
      balance: balance?.formatted || null
    });

    // Refetch balance when address changes
    if (address) {
      refetchBalance();
    }
  }, [address, isConnected, isConnecting, chainId, balance, refetchBalance]);

  const value = {
    ...walletState,
    balanceSymbol: balance?.symbol || 'ETH',
    refetchBalance
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};