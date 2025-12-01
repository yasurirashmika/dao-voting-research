import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from './useContract';
import ReputationManagerABI from '../abis/ReputationManager.json';

export const useReputation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();

  const { contract, read, write } = useContract('ReputationManager', ReputationManagerABI.abi);

  /**
   * Get reputation score for an address
   */
  const getReputationScore = useCallback(async (userAddress) => {
    if (!contract) return 0;

    try {
      const score = await read('getReputationScore', [userAddress || address]);
      return Number(score);
    } catch (err) {
      console.error('Error getting reputation score:', err);
      return 0;
    }
  }, [contract, read, address]);

  /**
   * Get full reputation data for an address
   */
  const getReputationData = useCallback(async (userAddress) => {
    if (!contract) return null;

    try {
      const data = await read('getReputationData', [userAddress || address]);
      return {
        score: Number(data.score),
        lastUpdated: Number(data.lastUpdated),
        isActive: data.isActive
      };
    } catch (err) {
      console.error('Error getting reputation data:', err);
      return null;
    }
  }, [contract, read, address]);

  /**
   * Get reputation weight (in basis points, 10000 = 100%)
   */
  const getReputationWeight = useCallback(async (userAddress) => {
    if (!contract) return 0;

    try {
      const weight = await read('getReputationWeight', [userAddress || address]);
      return Number(weight);
    } catch (err) {
      console.error('Error getting reputation weight:', err);
      return 0;
    }
  }, [contract, read, address]);

  /**
   * Check if user has active reputation
   */
  const hasActiveReputation = useCallback(async (userAddress) => {
    if (!contract) return false;

    try {
      const isActive = await read('hasActiveReputation', [userAddress || address]);
      return isActive;
    } catch (err) {
      console.error('Error checking active reputation:', err);
      return false;
    }
  }, [contract, read, address]);

  /**
   * Initialize reputation for a user (Admin only)
   */
  const initializeReputation = useCallback(async (userAddress) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('initializeReputation', [userAddress]);
      console.log('Reputation initialized:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error initializing reputation:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Update reputation score (Admin only)
   */
  const updateReputation = useCallback(async (userAddress, newScore) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    if (newScore < 1 || newScore > 1000) {
      throw new Error('Reputation score must be between 1 and 1000');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('updateReputation', [userAddress, newScore]);
      console.log('Reputation updated:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error updating reputation:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Batch update multiple users' reputation (Admin only)
   */
  const batchUpdateReputation = useCallback(async (userAddresses, scores) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    if (userAddresses.length !== scores.length) {
      throw new Error('User addresses and scores arrays must have the same length');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('batchUpdateReputation', [userAddresses, scores]);
      console.log('Batch reputation updated:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error batch updating reputation:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  return {
    getReputationScore,
    getReputationData,
    getReputationWeight,
    hasActiveReputation,
    initializeReputation,
    updateReputation,
    batchUpdateReputation,
    loading,
    error
  };
};

export default useReputation;