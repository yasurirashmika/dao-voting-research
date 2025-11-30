import { useState, useEffect } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { getContractAddress } from "../config/contracts";

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

      setContract({ address, abi, publicClient, walletClient });
      setError(null);
    } catch (err) {
      console.error(`Error initializing ${contractName} contract:`, err);
      setError(err.message);
    }
  }, [publicClient, walletClient, contractName, abi]);

  const read = async (functionName, args = []) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    setLoading(true);
    try {
      const result = await contract.publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: functionName,
        args: args,
      });
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
