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
  const { data: balance } = useBalance({ address });
  
  const [walletState, setWalletState] = useState({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    balance: null
  });

  useEffect(() => {
    setWalletState({
      address,
      isConnected,
      isConnecting,
      chainId,
      balance: balance?.formatted || null
    });
  }, [address, isConnected, isConnecting, chainId, balance]);

  const value = {
    ...walletState,
    balanceSymbol: balance?.symbol || 'ETH'
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};