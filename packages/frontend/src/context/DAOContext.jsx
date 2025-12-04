// src/context/DAOContext.jsx (FIXED - No Infinite Loop)
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../hooks/useContract';
import DAOVotingABI from '../abis/DAOVoting.json';

const DAOContext = createContext();

export const useDAO = () => {
  const context = useContext(DAOContext);
  if (!context) {
    throw new Error('useDAO must be used within DAOProvider');
  }
  return context;
};

export const DAOProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { contract } = useContract('DAOVoting', DAOVotingABI.abi);
  
  const [daoState, setDaoState] = useState({
    isAdmin: false,
    loading: false,
    error: null
  });

  const hasCheckedRef = useRef(false);

  // ✅ Check admin status only once
  useEffect(() => {
    if (!contract || !address || !isConnected || hasCheckedRef.current) {
      return;
    }

    const checkAdmin = async () => {
      try {
        setDaoState(prev => ({ ...prev, loading: true }));
        
        const owner = await contract.publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'owner',
          args: []
        });

        const isAdmin = owner.toLowerCase() === address.toLowerCase();
        
        setDaoState({
          isAdmin,
          loading: false,
          error: null
        });
        
        hasCheckedRef.current = true; // ✅ Mark as checked
      } catch (err) {
        console.error('Error checking admin:', err);
        setDaoState({
          isAdmin: false,
          loading: false,
          error: err.message
        });
        hasCheckedRef.current = true;
      }
    };

    checkAdmin();
  }, [contract, address, isConnected]);

  // ✅ Reset when wallet changes
  useEffect(() => {
    hasCheckedRef.current = false;
    setDaoState({ isAdmin: false, loading: false, error: null });
  }, [address]);

  const value = {
    ...daoState,
    address,
    isConnected
  };

  return <DAOContext.Provider value={value}>{children}</DAOContext.Provider>;
};