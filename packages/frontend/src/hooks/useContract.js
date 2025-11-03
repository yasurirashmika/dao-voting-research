import { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getContract } from 'viem';
import { getContractAddress } from '../config/contracts';

/**
 * Custom hook to interact with smart contracts
 * @param {string} contractName - Name of the contract
 * @param {object} abi - Contract ABI
 * @returns {object} Contract instance and utilities
 */
export const useContract = (contractName, abi) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (!publicClient || !contractName || !abi) return;

    try {
      const chainId = publicClient.chain.id;
      const address = getContractAddress(chainId, contractName);

      const contractInstance = getContract({
        address,
        abi,
        publicClient,
        walletClient: walletClient || undefined
      });

      setContract(contractInstance);
      setError(null);
    } catch (err) {
      console.error(`Error initializing ${contractName} contract:`, err);
      setError(err.message);
    }
  }, [publicClient, walletClient, contractName, abi]);

  /**
   * Read from contract
   */
  const read = async (functionName, args = []) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    setLoading(true);
    try {
      const result = await contract.read[functionName](args);
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  /**
   * Write to contract
   */
  const write = async (functionName, args = [], options = {}) => {
    if (!contract || !walletClient) {
      throw new Error('Contract or wallet not initialized');
    }

    setLoading(true);
    try {
      const hash = await contract.write[functionName](args, options);
      
      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
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
    error
  };
};

export default useContract;