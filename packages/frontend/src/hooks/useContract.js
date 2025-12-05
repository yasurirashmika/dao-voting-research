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
        error.message?.includes('429') || 
        error.message?.includes('Too Many Requests');
      
      if (i === maxRetries - 1 || !isRetryable) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
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
  const { mode } = useDeployment(); // 'baseline' or 'private'

  useEffect(() => {
    if (!publicClient || !contractName || !abi) return;

    try {
      const chainId = publicClient.chain.id;
      // Get the normalized config (voting, token, etc.)
      const activeContracts = getActiveContracts(chainId, mode);
      
      if (!activeContracts || Object.keys(activeContracts).length === 0) {
        console.warn(`No contracts found for chain ${chainId} in ${mode} mode`);
        return;
      }

      let address;
      switch(contractName) {
        // ✅ HANDLE BOTH VOTING NAMES (Maps generic requests to the active contract)
        case 'DAOVoting':
        case 'PrivateDAOVoting':
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
          // Fallback: Check if the name matches a key directly
          address = activeContracts[contractName]; 
      }

      if (!address) {
        // Only warn if we expected it to exist (e.g. ignoring DIDRegistry in baseline is fine)
        if (mode === 'baseline' && (contractName === 'DIDRegistry' || contractName === 'VoteVerifier')) {
            return;
        }
        console.warn(`⚠️ Contract ${contractName} address not found in ${mode} mode config. (Chain ID: ${chainId})`);
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

  const read = async (functionName, args = []) => {
    if (!contract) throw new Error("Contract not initialized");
    setLoading(true);
    try {
      const result = await retryOperation(
        () => contract.publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: args,
        }), 3, 1000
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
    if (!contract || !contract.walletClient) throw new Error("Contract or wallet not initialized");
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
      const receipt = await contract.publicClient.waitForTransactionReceipt({ hash });
      setLoading(false);
      return { hash, receipt };
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  return { contract, read, write, loading, error };
};

export default useContract;