// Auto-generated ZKP contract addresses
// Generated on: 2025-12-09T01:19:04.638Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0xdcE1CeF74ffAB71142dBB022677f48b9F34540EF",
    DIDRegistry: "0x159AAB9D03C957E8e2189375f8BEf7AB736c1A89",
    PrivateDAOVoting: "0x2522a9f7f9a784cE9A9fD582b6AC69EA60718498",
    // Re-exporting these for convenience if needed by Private mode
    GovernanceToken: "0x054b18F9eFE94Ee819bb93B64e7fDa3f71DCe071", 
    ReputationManager: "0x662574C7F70930483B281A5155edF6aE318a9F71",
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
