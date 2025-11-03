import { ethers } from 'ethers';

/**
 * Check if address is valid Ethereum address
 */
export const isAddress = (address) => {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Get checksummed address
 */
export const getAddress = (address) => {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return null;
  }
};

/**
 * Convert wei to ether
 */
export const fromWei = (value, decimals = 18) => {
  try {
    return ethers.utils.formatUnits(value, decimals);
  } catch {
    return '0';
  }
};

/**
 * Convert ether to wei
 */
export const toWei = (value, decimals = 18) => {
  try {
    return ethers.utils.parseUnits(value.toString(), decimals);
  } catch {
    return ethers.BigNumber.from(0);
  }
};

/**
 * Shorten transaction hash
 */
export const shortenHash = (hash, chars = 4) => {
  if (!hash) return '';
  return `${hash.substring(0, chars + 2)}...${hash.substring(66 - chars)}`;
};

/**
 * Get network name by chain ID
 */
export const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    5: 'Goerli',
    11155111: 'Sepolia',
    137: 'Polygon',
    80001: 'Mumbai',
    42161: 'Arbitrum One'
  };
  return networks[chainId] || 'Unknown Network';
};

/**
 * Check if transaction was successful
 */
export const isTransactionSuccessful = (receipt) => {
  return receipt && receipt.status === 1;
};

/**
 * Calculate gas cost in ether
 */
export const calculateGasCost = (gasUsed, gasPrice) => {
  try {
    const cost = ethers.BigNumber.from(gasUsed).mul(gasPrice);
    return ethers.utils.formatEther(cost);
  } catch {
    return '0';
  }
};

export default {
  isAddress,
  getAddress,
  fromWei,
  toWei,
  shortenHash,
  getNetworkName,
  isTransactionSuccessful,
  calculateGasCost
};