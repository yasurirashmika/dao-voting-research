// Auto-generated ZKP contract addresses
// Generated on: 2025-12-09T07:15:39.304Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0xb107b30989219E315aA05F53D0A156038E450f1f",
    DIDRegistry: "0xd41174f299651257f41fdAaE9cc1594f7a59703f",
    PrivateDAOVoting: "0x170b7967604EcEDf5b83f47748ec52ed4e4cc948",
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
