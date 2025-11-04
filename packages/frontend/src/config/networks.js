export const NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SepoliaETH',
      decimals: 18
    }
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  80001: {
    name: 'Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  42161: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

export const getNetworkById = (chainId) => {
  return NETWORKS[chainId] || null;
};

export const getBlockExplorerUrl = (chainId, hash, type = 'tx') => {
  const network = getNetworkById(chainId);
  if (!network) return null;
  
  return `${network.blockExplorer}/${type}/${hash}`;
};

export default NETWORKS;