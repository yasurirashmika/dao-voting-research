import { ethers } from 'ethers';
import { getContractAddress } from '../../config/contracts';

/**
 * Get contract instance
 */
export const getContractInstance = (contractName, abi, signerOrProvider) => {
  try {
    const chainId = signerOrProvider.provider?.network?.chainId || 11155111;
    const address = getContractAddress(chainId, contractName);
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error('Error getting contract instance:', error);
    throw error;
  }
};

/**
 * Call contract read function
 */
export const callContractRead = async (contract, methodName, args = []) => {
  try {
    const result = await contract[methodName](...args);
    return result;
  } catch (error) {
    console.error(`Error calling ${methodName}:`, error);
    throw error;
  }
};

/**
 * Call contract write function
 */
export const callContractWrite = async (contract, methodName, args = [], options = {}) => {
  try {
    const tx = await contract[methodName](...args, options);
    const receipt = await tx.wait();
    return { tx, receipt };
  } catch (error) {
    console.error(`Error calling ${methodName}:`, error);
    throw error;
  }
};

/**
 * Estimate gas for transaction
 */
export const estimateGas = async (contract, methodName, args = []) => {
  try {
    const gasEstimate = await contract.estimateGas[methodName](...args);
    return gasEstimate;
  } catch (error) {
    console.error(`Error estimating gas for ${methodName}:`, error);
    throw error;
  }
};

/**
 * Parse contract events from receipt
 */
export const parseContractEvents = (contract, receipt, eventName) => {
  try {
    const events = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(event => event && event.name === eventName);
    
    return events;
  } catch (error) {
    console.error('Error parsing events:', error);
    return [];
  }
};

/**
 * Get transaction receipt
 */
export const getTransactionReceipt = async (provider, txHash) => {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
  } catch (error) {
    console.error('Error getting transaction receipt:', error);
    throw error;
  }
};

export default {
  getContractInstance,
  callContractRead,
  callContractWrite,
  estimateGas,
  parseContractEvents,
  getTransactionReceipt
};
