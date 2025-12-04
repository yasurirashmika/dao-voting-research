// src/hooks/useTokenManagement.js
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from './useContract';
import { parseUnits, formatUnits } from 'ethers';
import GovernanceTokenABI from '../abis/GovernanceToken.json';

export const useTokenManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();

  const { contract, read, write } = useContract('GovernanceToken', GovernanceTokenABI.abi);

  /**
   * Mint tokens to an address
   */
  const mintTokens = useCallback(async (toAddress, amount) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Convert amount to Wei (18 decimals)
      const amountInWei = parseUnits(amount.toString(), 18);
      
      const result = await write('mint', [toAddress, amountInWei]);
      console.log('Tokens minted successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error minting tokens:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Batch mint tokens to multiple addresses
   */
  const batchMintTokens = useCallback(async (recipients, amounts) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Convert all amounts to Wei
      const amountsInWei = amounts.map(amount => parseUnits(amount.toString(), 18));
      
      const result = await write('batchMint', [recipients, amountsInWei]);
      console.log('Batch mint successful:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error batch minting:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Get token balance of an address
   */
  const getTokenBalance = useCallback(async (holderAddress) => {
    if (!contract) return '0';

    try {
      const balance = await read('balanceOf', [holderAddress || address]);
      return formatUnits(balance, 18);
    } catch (err) {
      console.error('Error getting balance:', err);
      return '0';
    }
  }, [contract, read, address]);

  /**
   * Get total supply
   */
  const getTotalSupply = useCallback(async () => {
    if (!contract) return '0';

    try {
      const supply = await read('totalSupply', []);
      return formatUnits(supply, 18);
    } catch (err) {
      console.error('Error getting total supply:', err);
      return '0';
    }
  }, [contract, read]);

  /**
   * Get max supply
   */
  const getMaxSupply = useCallback(async () => {
    if (!contract) return '0';

    try {
      const maxSupply = await read('MAX_SUPPLY', []);
      return formatUnits(maxSupply, 18);
    } catch (err) {
      console.error('Error getting max supply:', err);
      return '1000000'; // Default 1M
    }
  }, [contract, read]);

  /**
   * Check if address can mint
   */
  const canMint = useCallback(async (checkerAddress) => {
    if (!contract) return false;

    try {
      const canMintResult = await read('canMint', [checkerAddress || address]);
      return canMintResult;
    } catch (err) {
      console.error('Error checking mint permission:', err);
      return false;
    }
  }, [contract, read, address]);

  /**
   * Add minter
   */
  const addMinter = useCallback(async (minterAddress) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('addMinter', [minterAddress]);
      console.log('Minter added:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error adding minter:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Remove minter
   */
  const removeMinter = useCallback(async (minterAddress) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('removeMinter', [minterAddress]);
      console.log('Minter removed:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error removing minter:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  return {
    mintTokens,
    batchMintTokens,
    getTokenBalance,
    getTotalSupply,
    getMaxSupply,
    canMint,
    addMinter,
    removeMinter,
    loading,
    error,
    contract
  };
};

export default useTokenManagement;