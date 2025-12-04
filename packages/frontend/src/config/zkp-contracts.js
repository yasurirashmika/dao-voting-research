// src/config/zkp-contracts.js (UPDATED)
// ⚠️ IMPORTANT: These are Phase 4 (Private ZKP) addresses
// Generated on: 2025-12-03T08:48:38.119Z
// Network: Sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  // Sepolia Testnet - Private ZKP System
  11155111: {
    // Core ZKP Contracts
    VoteVerifier: "0x33b1a49bdd011656c8Dfb8E8382f0F38B40CB2a2",
    DIDRegistry: "0x8BF72e6c3c1c2F95A1197925465f9479731230Cc",
    PrivateDAOVoting: "0xAf3Ea44122FeFd5C28569166D02a1166243E7Afc",
    
    // ✅ REUSED: Token & Reputation (same as Baseline)
    // These contracts are shared between both systems
    GovernanceToken: "0x5aeE1C91651fcC0094fb2e9E6A51afaD9A8AC401",
    ReputationManager: "0x3AE3e68b226005a355F0E3BB039DB463eD88a4dD",
  },
};

export const getZKPContractAddress = (chainId, contractName) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`ZKP contracts not deployed on network ${chainId}`);
  }

  const address = network[contractName];
  if (!address) {
    throw new Error(`ZKP contract ${contractName} not deployed on network ${chainId}`);
  }

  return address;
};

// ✅ NEW: Get all ZKP contract addresses for a network
export const getAllZKPContracts = (chainId) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`ZKP contracts not deployed on network ${chainId}`);
  }
  return network;
};

export default {
  ZKP_CONTRACT_ADDRESSES,
  getZKPContractAddress,
  getAllZKPContracts
};