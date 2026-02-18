// src/context/WalletContext.jsx (SIMPLIFIED - No Infinite Loop)
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

const STORAGE_KEYS = {
  WALLET_STATE: 'dao_wallet_state',
  LAST_ADDRESS: 'dao_last_address'
};

export const WalletProvider = ({ children }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  
  // SIMPLIFIED: Just get balance, don't watch or refetch automatically
  const { data: balance } = useBalance({ 
    address,
    enabled: !!address && isConnected,
    cacheTime: 60_000, // Cache for 60 seconds
    staleTime: 30_000, // Consider fresh for 30 seconds
  });

  // Simple state - no complex logic
  const [walletState, setWalletState] = useState({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    balance: null
  });

  // Track previous values to prevent unnecessary updates
  const prevRef = useRef({});

  // Update state only when values change
  useEffect(() => {
    const balanceFormatted = balance?.formatted || null;
    
    // Only update if something actually changed
    if (
      prevRef.current.address === address &&
      prevRef.current.isConnected === isConnected &&
      prevRef.current.isConnecting === isConnecting &&
      prevRef.current.chainId === chainId &&
      prevRef.current.balance === balanceFormatted
    ) {
      return; // No changes, skip update
    }

    // Update previous values
    prevRef.current = {
      address,
      isConnected,
      isConnecting,
      chainId,
      balance: balanceFormatted
    };

    // Update state
    const newState = {
      address,
      isConnected,
      isConnecting,
      chainId,
      balance: balanceFormatted
    };

    setWalletState(newState);

    // Save to localStorage
    if (address && isConnected) {
      try {
        localStorage.setItem(STORAGE_KEYS.WALLET_STATE, JSON.stringify(newState));
        localStorage.setItem(STORAGE_KEYS.LAST_ADDRESS, address);
      } catch (err) {
        console.error('Failed to save wallet state:', err);
      }
    }
  }, [address, isConnected, isConnecting, chainId, balance]);

  // Clear on disconnect
  useEffect(() => {
    if (!isConnected) {
      try {
        localStorage.removeItem(STORAGE_KEYS.WALLET_STATE);
      } catch (err) {
        console.error('Failed to clear wallet state:', err);
      }
    }
  }, [isConnected]);

  // Simple context value
  const value = {
    address: walletState.address,
    isConnected: walletState.isConnected,
    isConnecting: walletState.isConnecting,
    chainId: walletState.chainId,
    balance: walletState.balance,
    balanceSymbol: balance?.symbol || 'ETH',
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};