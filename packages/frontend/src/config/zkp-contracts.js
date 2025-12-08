// Auto-generated ZKP contract addresses
// Generated on: 2025-12-08T01:04:51.984Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0xa620AeC531127C6F02FA67493a710c971657a805",
    DIDRegistry: "0x2206B91A2eBcAc3a33406F7cA8d211a6d11F7Bf2",
    PrivateDAOVoting: "0xecC6b82e46c0f58987085842B1652bF9b7DF392F",
    // Re-exporting these for convenience if needed by Private mode
    GovernanceToken: "0xCF77340B958dA7D9ddB0A5976BE7972770d8233e", 
    ReputationManager: "0xC46aEfD592d2C4Ab1c5203edA28f3b0cBec3f772",
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
