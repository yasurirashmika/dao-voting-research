// Auto-generated ZKP contract addresses
// Generated on: 2025-12-07T01:21:50.866Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0x0DDb97c00B5fa1bA206A1F90C58ECc96b171119C",
    DIDRegistry: "0x586AB49ADc3a5E365766E7567F4C747D67Dd4320",
    PrivateDAOVoting: "0x8Caa0EC42385006048359A767EFA75FCD6e8086a",
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
