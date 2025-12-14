// Auto-generated ZKP contract addresses
// Generated on: 2025-12-13T05:16:39.411Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0xc44bf6C95eC13E6E42c498f2660140e72A76b10a",
    DIDRegistry: "0xE43956fEaF8c03C6d7EA90695C0e7BC1819566D1",
    PrivateDAOVoting: "0x1250BB282d85dfeEa706D534D1868981Ae0BA55a",
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
