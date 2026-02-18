import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { getActiveContracts } from "../config/deploymentConfig";
import { useDeployment } from "../context/DeploymentContext";

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

export const useContract = (contractName, abi) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { mode } = useDeployment(); // USE CONTEXT

  useEffect(() => {
    if (!publicClient || !contractName || !abi) {
      console.warn("Missing dependencies for contract initialization");
      return;
    }

    try {
      const chainId = publicClient.chain?.id;
      
      if (!chainId) {
        console.error("No chain ID available");
        setError("Network not connected");
        return;
      }

      console.log(`🔧 Initializing ${contractName} on chain ${chainId} in ${mode} mode`);

      const activeContracts = getActiveContracts(chainId, mode);
      
      if (!activeContracts || Object.keys(activeContracts).length === 0) {
        console.warn(`No contracts found for chain ${chainId} in ${mode} mode`);
        setContract(null);
        return;
      }

      let address;
      switch(contractName) {
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
          address = activeContracts[contractName]; 
      }

      // CRITICAL: Skip gracefully if contract not available in current mode
      if (!address) {
        if (mode === 'baseline' && ['DIDRegistry', 'VoteVerifier', 'ReputationManager'].includes(contractName)) {
          console.log(`ℹ️ ${contractName} not available in baseline mode (expected)`);
          setContract(null);
          return;
        }
        console.warn(`${contractName} address not found in ${mode} mode`);
        setContract(null);
        return;
      }

      console.log(`${contractName} initialized at ${address}`);

      setContract({ 
        address, 
        abi, 
        publicClient, 
        walletClient,
        name: contractName 
      });
      setError(null);
    } catch (err) {
      console.error(`Error initializing ${contractName}:`, err);
      setError(err.message);
      setContract(null);
    }
  }, [publicClient, walletClient, contractName, abi, mode]); // ADDED mode

  // WRAPPED IN useCallback
  const read = useCallback(async (functionName, args = []) => {
    if (!contract) {
      console.error(`Contract not initialized for read: ${contractName}`);
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
        }), 3, 1000
      );
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      console.error(`Read failed for ${contract.name}.${functionName}:`, err);
      setError(err.message);
      throw err;
    }
  }, [contract, contractName]); // ADDED contractName

  // WRAPPED IN useCallback
  const write = useCallback(async (functionName, args = [], options = {}) => {
    if (!contract || !contract.walletClient) {
      console.error(`Contract or wallet not initialized for write: ${contractName}`);
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
      const receipt = await contract.publicClient.waitForTransactionReceipt({ hash });
      setLoading(false);
      return { hash, receipt };
    } catch (err) {
      setLoading(false);
      console.error(`Write failed for ${contract.name}.${functionName}:`, err);
      setError(err.message);
      throw err;
    }
  }, [contract, contractName]); // ADDED contractName

  return { contract, read, write, loading, error };
};

export default useContract;