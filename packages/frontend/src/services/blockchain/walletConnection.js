import { ethers } from 'ethers';

/**
 * Get provider from window.ethereum
 */
export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return null;
};

/**
 * Get signer from provider
 */
export const getSigner = () => {
  const provider = getProvider();
  if (provider) {
    return provider.getSigner();
  }
  return null;
};

/**
 * Request account access
 */
export const requestAccounts = async () => {
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      return accounts;
    }
    throw new Error('No Ethereum provider found');
  } catch (error) {
    console.error('Error requesting accounts:', error);
    throw error;
  }
};

/**
 * Get current chain ID
 */
export const getChainId = async () => {
  try {
    const provider = getProvider();
    if (provider) {
      const network = await provider.getNetwork();
      return network.chainId;
    }
    return null;
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
};

/**
 * Switch network
 */
export const switchNetwork = async (chainId) => {
  try {
    if (window.ethereum) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error switching network:', error);
    throw error;
  }
};

/**
 * Add network to wallet
 */
export const addNetwork = async (networkConfig) => {
  try {
    if (window.ethereum) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig]
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding network:', error);
    throw error;
  }
};

/**
 * Get account balance
 */
export const getBalance = async (address) => {
  try {
    const provider = getProvider();
    if (provider && address) {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    }
    return '0';
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};

export default {
  getProvider,
  getSigner,
  requestAccounts,
  getChainId,
  switchNetwork,
  addNetwork,
  getBalance
};