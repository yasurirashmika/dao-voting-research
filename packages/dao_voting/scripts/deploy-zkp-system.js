const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ZKP Voting System (Private)...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check for required environment variables
  const REPUTATION_MANAGER_ADDRESS = process.env.REPUTATION_MANAGER_ADDRESS;
  const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;

  if (!REPUTATION_MANAGER_ADDRESS) {
      console.error("Error: REPUTATION_MANAGER_ADDRESS is missing.");
      console.error("Please add 'REPUTATION_MANAGER_ADDRESS=0x...' to your packages/dao_voting/.env file");
      process.exit(1);
  }

  if (!GOVERNANCE_TOKEN_ADDRESS) {
      console.error("Error: GOVERNANCE_TOKEN_ADDRESS is missing.");
      console.error("Please add 'GOVERNANCE_TOKEN_ADDRESS=0x...' to your packages/dao_voting/.env file");
      process.exit(1);
  }

  console.log("Using Reputation Manager at:", REPUTATION_MANAGER_ADDRESS);
  console.log("Using Governance Token at:", GOVERNANCE_TOKEN_ADDRESS);

  // Deploy VoteVerifier (Generated from Circuit)
  console.log("\n[1/3] Deploying VoteVerifier...");
  const VoteVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await VoteVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("VoteVerifier deployed to:", verifierAddress);

  // Deploy DIDRegistry
  console.log("\n[2/3] Deploying DIDRegistry...");
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy(deployer.address);
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("DIDRegistry deployed to:", didRegistryAddress);

  // Deploy PrivateDAOVoting
  console.log("\n[3/3] Deploying PrivateDAOVoting...");
  const PrivateDAOVoting = await hre.ethers.getContractFactory("PrivateDAOVoting");
  
  const privateVoting = await PrivateDAOVoting.deploy(
    verifierAddress,
    REPUTATION_MANAGER_ADDRESS, 
    deployer.address
  );
  await privateVoting.waitForDeployment();
  const privateVotingAddress = await privateVoting.getAddress();
  console.log("PrivateDAOVoting deployed to:", privateVotingAddress);

  // Initial Configuration
  console.log("\nConfiguring system...");
  
  // Authorize deployer as DID issuer
  const authTx = await didRegistry.authorizeIssuer(deployer.address);
  await authTx.wait();
  console.log("Authorized deployer as DID issuer");

  // LINKING STEPS
  console.log("   -> Linking PrivateDAOVoting to DIDRegistry...");
  const txLinkRegistry = await didRegistry.setPrivateVotingContract(privateVotingAddress);
  await txLinkRegistry.wait();

  console.log("   -> Linking DIDRegistry to PrivateDAOVoting...");
  const txLinkVoting = await privateVoting.setDIDRegistry(didRegistryAddress);
  await txLinkVoting.wait();
  console.log("Contracts linked successfully");

  // Save Deployment Info & Update Config
  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      VoteVerifier: verifierAddress,
      DIDRegistry: didRegistryAddress,
      PrivateDAOVoting: privateVotingAddress
    }
  };

  // Save JSON log
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `zkp-deployment-${hre.network.name}-${Date.now()}.json`), 
    JSON.stringify(deployment, null, 2)
  );

  // Update Frontend Config
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/config");
  if (fs.existsSync(frontendConfigDir)) {
      const frontendConfigPath = path.join(frontendConfigDir, "zkp-contracts.js");
      
      const frontendConfig = `// Auto-generated ZKP contract addresses
// Generated on: ${deployment.timestamp}
// Network: ${deployment.network}

export const ZKP_CONTRACT_ADDRESSES = {
  ${deployment.chainId}: {
    VoteVerifier: "${verifierAddress}",
    DIDRegistry: "${didRegistryAddress}",
    PrivateDAOVoting: "${privateVotingAddress}",
    // Re-exporting these for convenience if needed by Private mode
    GovernanceToken: "${GOVERNANCE_TOKEN_ADDRESS}", 
    ReputationManager: "${REPUTATION_MANAGER_ADDRESS}",
  },
};

export const getZKPContractAddress = (chainId, contractName) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(\`Unsupported network: \${chainId}\`);
  }
  const address = network[contractName];
  if (!address) {
    throw new Error(\`Contract \${contractName} not deployed on network \${chainId}\`);
  }
  return address;
};

export const getAllZKPContracts = (chainId) => {
  const network = ZKP_CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(\`ZKP contracts not deployed on network \${chainId}\`);
  }
  return network;
};

export default ZKP_CONTRACT_ADDRESSES;
`;
      fs.writeFileSync(frontendConfigPath, frontendConfig);
      console.log("Frontend config updated:", frontendConfigPath);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("ZKP SYSTEM DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`Network:           ${hre.network.name}`);
  console.log(`VoteVerifier:      ${verifierAddress}`);
  console.log(`DIDRegistry:       ${didRegistryAddress}`);
  console.log(`PrivateDAOVoting:  ${privateVotingAddress}`);
  console.log("=".repeat(60));

  if (hre.network.name === "sepolia") {
    console.log("\nView on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${verifierAddress}`);
    console.log(`https://sepolia.etherscan.io/address/${didRegistryAddress}`);
    console.log(`https://sepolia.etherscan.io/address/${privateVotingAddress}`);
  }

  // Return for tests
  return {
    verifier,
    didRegistry,
    privateVoting,
    addresses: deployment.contracts
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;