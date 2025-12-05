// Auto-generated ZKP contract addresses
// Generated on: 2025-12-05T16:34:55.638Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0xCd663E258c61386D24549C43D3A1ee532D09abaF",
    DIDRegistry: "0xfAC0e408Eed2528ef6BF58968d5B6405d07Fb9a4",
    PrivateDAOVoting: "0xC594973F437b8146c561bfFC8Bcd7f6B22b5B930",
    // Re-exporting these for convenience if needed by Private mode
    GovernanceToken: "0x92aDA13a738C9069eC44a7B5C65b5dBC5Bd0a881", 
    ReputationManager: "0xEfcAEac1af83762889207e5aDC458774618515EE",
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
