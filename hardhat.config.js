// Hardhat toolbox includes ethers, waffle, chai, etherscan plugin, etc.
require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Optimization for cheaper gas deployment
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 31337, // Local in-memory blockchain
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
      chainId: 11155111,
    },
  },

  etherscan: {
    // For contract verification
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },

  mocha: {
    // Increase test timeout for slower networks
    timeout: 500000,
  },
};

module.exports = config;
