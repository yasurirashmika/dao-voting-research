// Hardhat toolbox includes ethers, waffle, chai, etherscan plugin, etc.
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
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
      type: 'edr-simulated', // <-- FIX
      chainId: 31337,
    },
    localhost: {
      type: 'http', // <-- FIX
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      type: 'http', // <-- FIX
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
};

export default config;