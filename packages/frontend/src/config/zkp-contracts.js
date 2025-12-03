// Auto-generated ZKP contract addresses
// Generated on: 2025-12-03T08:48:38.119Z
// Network: sepolia

export const ZKP_CONTRACT_ADDRESSES = {
  11155111: {
    VoteVerifier: "0x33b1a49bdd011656c8Dfb8E8382f0F38B40CB2a2",
    DIDRegistry: "0x8BF72e6c3c1c2F95A1197925465f9479731230Cc",
    PrivateDAOVoting: "0xAf3Ea44122FeFd5C28569166D02a1166243E7Afc",
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

export default ZKP_CONTRACT_ADDRESSES;
