import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { useContract } from './useContract';
import { useDeployment } from '../context/DeploymentContext'; // ✅ Import Context

// ABIs
import DAOVotingABI from '../abis/DAOVoting.json';
import DIDRegistryABI from '../abis/DIDRegistry.json';

// Config
import { ZKP_CONTRACT_ADDRESSES } from '../config/zkp-contracts';

export const useAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { mode } = useDeployment(); // ✅ Get Mode

  // Public Contract (Existing)
  const { contract: publicContract, read: readPublic, write: writePublic } = useContract('DAOVoting', DAOVotingABI.abi);

  // Helper to get ZKP Address safely
  const getDIDRegistryAddress = useCallback(() => {
    return ZKP_CONTRACT_ADDRESSES[chainId]?.DIDRegistry;
  }, [chainId]);

  /**
   * Register a new voter (PUBLIC SYSTEM)
   */
  const registerVoter = useCallback(async (voterAddress) => {
    if (mode === 'private') throw new Error("Use registerDID for Private mode"); // ✅ Safety Check
    if (!publicContract) throw new Error('Public Contract not ready');
    
    setLoading(true);
    try {
      const result = await writePublic('registerVoter', [voterAddress]);
      console.log('Public Voter registered:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error registering public voter:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [publicContract, writePublic, mode]);

  /**
   * ✅ NEW: Register a DID (PRIVATE SYSTEM)
   * In the private system, the Admin creates a DID for the user.
   */
  const registerDID = useCallback(async (voterAddress) => {
    const registryAddress = getDIDRegistryAddress();
    if (!registryAddress) throw new Error('DID Registry address not found for this network');

    setLoading(true);
    setError(null);

    try {
      console.log("Creating DID for:", voterAddress);
      
      const tx = await writeContractAsync({
        address: registryAddress,
        abi: DIDRegistryABI.abi,
        functionName: 'createDID',
        args: [voterAddress],
      });

      console.log('DID Created successfully:', tx);
      setLoading(false);
      return tx;
    } catch (err) {
      console.error('Error creating DID:', err);
      // Friendly error handling
      const msg = err.message.includes("DID already exists") 
        ? "This address already has a DID." 
        : err.message;
      setError(msg);
      setLoading(false);
      throw err;
    }
  }, [chainId, writeContractAsync, getDIDRegistryAddress]);

  /**
   * Check if registered (HANDLES BOTH SYSTEMS)
   */
  const isRegisteredVoter = useCallback(async (voterAddress) => {
    // 1. Check Public System
    if (mode !== 'private' && publicContract) {
      try {
        const isPublic = await readPublic('registeredVoters', [voterAddress]);
        if (isPublic) return true;
      } catch (err) {
        console.warn("Public check failed:", err);
      }
    }

    // 2. Check Private System (DID Registry)
    if (mode === 'private') {
        const registryAddress = getDIDRegistryAddress();
        if (registryAddress && publicClient) {
        try {
            const isActive = await publicClient.readContract({
                address: registryAddress,
                abi: DIDRegistryABI.abi,
                functionName: 'hasDID',
                args: [voterAddress]
            });
            if (isActive) return true;
        } catch (err) {
            console.warn("Error checking DID status:", err);
        }
        }
    }

    return false;
  }, [publicContract, readPublic, chainId, publicClient, mode, getDIDRegistryAddress]);

  /**
   * Batch register (Smart Switching)
   */
  const batchRegisterVoters = useCallback(async (voterAddresses, isPrivateMode = false) => {
    const results = [];
    const errors = [];

    // Force private mode flag if global mode is private
    const usePrivate = isPrivateMode || mode === 'private';

    for (const addr of voterAddresses) {
      try {
        // Switch logic based on mode
        let result;
        if (usePrivate) {
            result = await registerDID(addr);
        } else {
            result = await registerVoter(addr);
        }
        results.push({ address: addr, success: true, result });
      } catch (err) {
        errors.push({ address: addr, success: false, error: err.message });
      }
    }
    return { results, errors };
  }, [registerVoter, registerDID, mode]);

  /**
   * Check if current user is the owner
   */
  const isOwner = useCallback(async () => {
    // If contract is not ready, we cannot determine ownership yet
    if (!publicContract || !address) return false;

    try {
      const ownerAddress = await readPublic('owner', []);
      return ownerAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
      console.error('Error checking ownership:', err);
      return false;
    }
  }, [publicContract, readPublic, address]);

  /**
   * Get all registered voters count
   * ✅ FIXED: Do not call 'registeredVoters' in Private Mode
   */
  const getRegisteredVotersCount = useCallback(async (addressesToCheck = []) => {
    let count = 0;

    // A. Private Mode: Check DID Registry
    if (mode === 'private') {
        const registryAddress = getDIDRegistryAddress();
        if (!registryAddress || !publicClient) return 0;

        for (const addr of addressesToCheck) {
            try {
                const hasDid = await publicClient.readContract({
                    address: registryAddress,
                    abi: DIDRegistryABI.abi,
                    functionName: 'hasDID',
                    args: [addr]
                });
                if (hasDid) count++;
            } catch (e) { /* ignore */ }
        }
        return count;
    }

    // B. Public Mode: Check Voting Contract
    if (!publicContract) return 0;
    
    for (const addr of addressesToCheck) {
      try {
        const isRegistered = await readPublic('registeredVoters', [addr]);
        if (isRegistered) count++;
      } catch (err) {
        // Ignore errors
      }
    }

    return count;
  }, [publicContract, readPublic, mode, publicClient, getDIDRegistryAddress]);

  /**
   * Update voting parameters
   */
  const updateVotingParameters = useCallback(async (
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercentage
  ) => {
    if (!publicContract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await writePublic('updateVotingParameters', [
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
  }, [publicContract, writePublic, address]);

  return {
    registerVoter,
    registerDID, 
    batchRegisterVoters,
    isRegisteredVoter,
    isOwner,
    getRegisteredVotersCount,
    updateVotingParameters,
    loading,
    error,
    contract: publicContract
  };
};

export default useAdmin;