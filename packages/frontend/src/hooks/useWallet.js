import { useContext } from 'react';
import { WalletContext } from '../context/WalletContext';

/**
 * Custom hook to use wallet context
 * This is a convenience wrapper around useContext(WalletContext)
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  
  return context;
};

export default useWallet;
