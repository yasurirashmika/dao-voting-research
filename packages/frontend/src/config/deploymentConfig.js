import { CONTRACT_ADDRESSES } from './contracts';
import { ZKP_CONTRACT_ADDRESSES } from './zkp-contracts';

/**
 * Deployment Modes
 * Defines the two operating states of the application.
 */
export const DEPLOYMENT_MODE = {
  BASELINE: 'baseline',
  PRIVATE: 'private'
};

/**
 * Get active contract addresses based on Chain ID AND Deployment Mode.
 * This function is pure and depends only on arguments (no side effects).
 * * @param {number} chainId - Network chain ID
 * @param {string} mode - 'baseline' or 'private'
 * @returns {object} Active contract addresses
 */
export const getActiveContracts = (chainId, mode) => {
  // Ensure we have a valid chainId, default to Sepolia if undefined (safeguard)
  const safeChainId = chainId || 11155111;

  // --- ZKP / PRIVATE MODE ---
  if (mode === DEPLOYMENT_MODE.PRIVATE) {
    const zkpContracts = ZKP_CONTRACT_ADDRESSES[safeChainId];
    
    if (!zkpContracts) {
      console.warn(`ZKP contracts not found for chain ${safeChainId}`);
      return {};
    }
    
    return {
      voting: zkpContracts.PrivateDAOVoting,      
      registry: zkpContracts.DIDRegistry,         
      verifier: zkpContracts.VoteVerifier,        
      token: zkpContracts.GovernanceToken,        
      reputation: zkpContracts.ReputationManager, // Reputation enabled
      mode: DEPLOYMENT_MODE.PRIVATE
    };
  }
  
  // --- BASELINE / PUBLIC MODE ---
  const baseContracts = CONTRACT_ADDRESSES[safeChainId];
  
  if (!baseContracts) {
    console.warn(`Baseline contracts not found for chain ${safeChainId}`);
    return {};
  }
  
  return {
    voting: baseContracts.DAOVoting,              
    token: baseContracts.GovernanceToken,         
    reputation: null, // Reputation explicitly disabled
    registry: null,
    verifier: null,
    mode: DEPLOYMENT_MODE.BASELINE
  };
};

/**
 * Helper to check if reputation system is active for a given mode
 */
export const isReputationEnabled = (mode) => {
  return mode === DEPLOYMENT_MODE.PRIVATE;
};

/**
 * Helper to get the correct contract name for ABI lookup
 */
export const getVotingContractName = (mode) => {
  return mode === DEPLOYMENT_MODE.PRIVATE ? 'PrivateDAOVoting' : 'DAOVoting';
};

/**
 * Helper to check if private voting is enabled (runtime check)
 */
export const isPrivateVotingEnabled = (mode) => {
  return mode === DEPLOYMENT_MODE.PRIVATE;
};

const deploymentConfig = {
  DEPLOYMENT_MODE,
  getActiveContracts,
  isReputationEnabled,
  getVotingContractName,
  isPrivateVotingEnabled
};

export default deploymentConfig;