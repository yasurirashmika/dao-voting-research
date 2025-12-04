// src/hooks/useContract.js (UPDATED - With Retry Logic)
import { useState, useEffect } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { getActiveContracts } from "../config/deploymentConfig";
import { useDeployment } from "../context/DeploymentContext";

/**
 * ✅ Retry helper with exponential backoff
 */
const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = 
        error.message?.includes('timeout') || 
        error.message?.includes('took too long') ||
        error.message?.includes('timed out') ||
        error.message?.includes('429') || // Rate limit
        error.message?.includes('Too Many Requests');
      
      if (i === maxRetries - 1 || !isRetryable) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * ✅ UPDATED: Now listens to DeploymentContext
 * Automatically switches contracts when mode changes
 */
export const useContract = (contractName, abi) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const { mode } = useDeployment();

  useEffect(() => {
    if (!publicClient || !contractName || !abi) return;

    try {
      const chainId = publicClient.chain.id;
      const activeContracts = getActiveContracts(chainId, mode);
      
      let address;
      switch(contractName) {
        case 'DAOVoting':
          address = activeContracts.voting;
          break;
        case 'GovernanceToken':
          address = activeContracts.token;
          break;
        case 'ReputationManager':
          address = activeContracts.reputation;
          break;
        case 'DIDRegistry':
          address = activeContracts.registry;
          break;
        case 'VoteVerifier':
          address = activeContracts.verifier;
          break;
        default:
          throw new Error(`Unknown contract: ${contractName}`);
      }

      if (!address) {
        console.warn(`⚠️ Contract ${contractName} not available in ${mode} mode`);
        setContract(null);
        setError(`${contractName} not available in ${mode} mode`);
        return;
      }

      console.log(`📝 [${mode}] Initialized ${contractName} at ${address}`);
      
      setContract({ address, abi, publicClient, walletClient });
      setError(null);
    } catch (err) {
      console.error(`Error initializing ${contractName} contract:`, err);
      setError(err.message);
      setContract(null);
    }
  }, [publicClient, walletClient, contractName, abi, mode]);

  // ✅ UPDATED: Add retry logic to read function
  const read = async (functionName, args = []) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    setLoading(true);
    try {
      const result = await retryOperation(
        () => contract.publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: args,
        }),
        3, // 3 retries
        1000 // Start with 1 second delay
      );
      
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const write = async (functionName, args = [], options = {}) => {
    if (!contract || !contract.walletClient) {
      throw new Error("Contract or wallet not initialized");
    }

    setLoading(true);
    try {
      const { request } = await contract.publicClient.simulateContract({
        address: contract.address,
        abi: contract.abi,
        functionName: functionName,
        args: args,
        account: contract.walletClient.account,
        ...options,
      });

      const hash = await contract.walletClient.writeContract(request);

      const receipt = await contract.publicClient.waitForTransactionReceipt({
        hash,
      });

      setLoading(false);
      return { hash, receipt };
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  return {
    contract,
    read,
    write,
    loading,
    error,
  };
};

export default useContract;