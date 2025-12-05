// src/config/zkp-contracts.js (FIXED)
// Auto-generated ZKP contract addresses
// Generated on: 2025-12-04T17:20:15.574Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0x88Db7bEC51848e8B8e96d1d2FDAc5aC98c04e06a",
    DIDRegistry: "0x67B8CD1e0Ee5A00041f97De72514cEb25483FDb9",
    PrivateDAOVoting: "0xF82Bae4a077617e0E2CDB8Dd7B229136baa627f1",
    // Shared contracts (same as baseline)
    GovernanceToken: "0xD72AB3c2e7482b39235E06A15e797f0C8b31ddfE", 
    ReputationManager: "0xd74591eeB4544BC4bd6BbF5E2BE7b7e8f8BA7ddE",
  },
};

export const getZKPContractAddress = (chainId, contractName) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  const address = network[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on network ${chainId}`);
  }
  return address;
};

export const getAllZKPContracts = (chainId) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`ZKP contracts not deployed on network ${chainId}`);
  }
  return network;
};

export default ZKP_CONTRACT_ADDRESSES;