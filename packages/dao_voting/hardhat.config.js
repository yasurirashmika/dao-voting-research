require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      type: 'edr-simulated',
      chainId: 31337,
    },
    localhost: {
      type: 'http',
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      type: 'http',
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
      chainId: 11155111,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },

  mocha: {
    timeout: 500000,
  },

  gasReporter: {
    enabled: true,
    currency: 'USD',
    // gasPrice: 20,  <-- REMOVED: Now fetches live network gas price
    
    // IMPORTANT: To get accurate USD costs, you need a CoinMarketCap key
    // Get one here (free): https://coinmarketcap.com/api/
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },
  
};