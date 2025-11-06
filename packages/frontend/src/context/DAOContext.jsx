import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from './WalletContext';

const DAOContext = createContext();

export const useDAO = () => {
  const context = useContext(DAOContext);
  if (!context) {
    throw new Error('useDAO must be used within DAOProvider');
  }
  return context;
};

export const DAOProvider = ({ children }) => {
  const { address, isConnected } = useWallet();
  
  const [daoState, setDaoState] = useState({
    proposals: [],
    userVotingPower: 0,
    userDelegatedTo: null,
    totalSupply: 0,
    loading: false,
    error: null
  });

  // Load DAO data when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadDAOData();
    }
  }, [isConnected, address]);

  const loadDAOData = async () => {
    setDaoState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Fetch actual data from blockchain
      // This is placeholder data
      const mockData = {
        proposals: [],
        userVotingPower: 0,
        userDelegatedTo: address,
        totalSupply: 1000000
      };
      
      setDaoState(prev => ({
        ...prev,
        ...mockData,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading DAO data:', error);
      setDaoState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const refreshProposals = async () => {
    // TODO: Implement proposal refresh
    await loadDAOData();
  };

  const value = {
    ...daoState,
    loadDAOData,
    refreshProposals
  };

  return (
    <DAOContext.Provider value={value}>
      {children}
    </DAOContext.Provider>
  );
};
