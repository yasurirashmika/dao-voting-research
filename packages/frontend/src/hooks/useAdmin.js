import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from './useContract';
import DAOVotingABI from '../abis/DAOVoting.json';

export const useAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();

  const { contract, read, write } = useContract('DAOVoting', DAOVotingABI.abi);

  /**
   * Register a new voter
   */
  const registerVoter = useCallback(async (voterAddress) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('registerVoter', [voterAddress]);
      console.log('Voter registered successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error registering voter:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Batch register multiple voters
   */
  const batchRegisterVoters = useCallback(async (voterAddresses) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    const results = [];
    const errors = [];

    for (const voterAddress of voterAddresses) {
      try {
        const result = await registerVoter(voterAddress);
        results.push({ address: voterAddress, success: true, result });
      } catch (err) {
        errors.push({ address: voterAddress, success: false, error: err.message });
      }
    }

    return { results, errors };
  }, [contract, registerVoter]);

  /**
   * Check if an address is a registered voter
   */
  const isRegisteredVoter = useCallback(async (voterAddress) => {
    if (!contract) return false;

    try {
      const isRegistered = await read('isVoterRegistered', [voterAddress]);
      return isRegistered;
    } catch (err) {
      console.error('Error checking voter registration:', err);
      return false;
    }
  }, [contract, read]);

  /**
   * Check if current user is the owner
   */
  const isOwner = useCallback(async () => {
    if (!contract || !address) return false;

    try {
      const ownerAddress = await read('owner', []);
      return ownerAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
      console.error('Error checking ownership:', err);
      return false;
    }
  }, [contract, read, address]);

  /**
   * Get all registered voters count (checks provided addresses)
   */
  const getRegisteredVotersCount = useCallback(async (addressesToCheck = []) => {
    if (!contract) return 0;

    let count = 0;
    
    for (const addr of addressesToCheck) {
      try {
        const isRegistered = await read('isVoterRegistered', [addr]);
        if (isRegistered) count++;
      } catch (err) {
        console.error(`Error checking address ${addr}:`, err);
      }
    }

    return count;
  }, [contract, read]);

  /**
   * Update voting parameters (admin only)
   */
  const updateVotingParameters = useCallback(async (
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercentage
  ) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('updateVotingParameters', [
        votingDelay,
        votingPeriod,
        proposalThreshold,
        quorumPercentage
      ]);
      
      console.log('Voting parameters updated:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error updating parameters:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  return {
    registerVoter,
    batchRegisterVoters,
    isRegisteredVoter,
    isOwner,
    getRegisteredVotersCount,
    updateVotingParameters,
    loading,
    error
  };
};

export default useAdmin;