const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ZKP Voting System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // ============================================
  // 1. Deploy VoteVerifier (Generated from Circuit)
  // ============================================
  console.log("\n📝 [1/3] Deploying VoteVerifier...");
  
  const VoteVerifier = await hre.ethers.getContractFactory("VoteVerifier");
  const verifier = await VoteVerifier.deploy();
  await verifier.waitForDeployment();
  
  const verifierAddress = await verifier.getAddress();
  console.log("✅ VoteVerifier deployed to:", verifierAddress);

  // ============================================
  // 2. Deploy DIDRegistry
  // ============================================
  console.log("\n📝 [2/3] Deploying DIDRegistry...");
  
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy(deployer.address);
  await didRegistry.waitForDeployment();
  
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("✅ DIDRegistry deployed to:", didRegistryAddress);

  // ============================================
  // 3. Deploy PrivateDAOVoting
  // ============================================
  console.log("\n📝 [3/3] Deploying PrivateDAOVoting...");
  
  const PrivateDAOVoting = await hre.ethers.getContractFactory("PrivateDAOVoting");
  const privateVoting = await PrivateDAOVoting.deploy(
    verifierAddress,
    deployer.address
  );
  await privateVoting.waitForDeployment();
  
  const privateVotingAddress = await privateVoting.getAddress();
  console.log("✅ PrivateDAOVoting deployed to:", privateVotingAddress);

  // ============================================
  // 4. Initial Configuration
  // ============================================
  console.log("\n⚙️  Configuring system...");
  
  // Authorize deployer as DID issuer
  const authTx = await didRegistry.authorizeIssuer(deployer.address);
  await authTx.wait();
  console.log("✅ Authorized deployer as DID issuer");

  // ============================================
  // 5. Save Deployment Info
  // ============================================
  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      VoteVerifier: verifierAddress,
      DIDRegistry: didRegistryAddress,
      PrivateDAOVoting: privateVotingAddress
    },
    gasUsed: {
      VoteVerifier: "TBD", // Updated after deployment
      DIDRegistry: "TBD",
      PrivateDAOVoting: "TBD"
    }
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `zkp-deployment-${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));

  console.log("\n📄 Deployment info saved to:", filepath);

  // ============================================
  // 6. Update Frontend Config
  // ============================================
  const frontendConfigPath = path.join(__dirname, "../../frontend/src/config/zkp-contracts.js");
  const frontendConfig = `// Auto-generated ZKP contract addresses
// Generated on: ${deployment.timestamp}
// Network: ${deployment.network}

export const ZKP_CONTRACT_ADDRESSES = {
  ${deployment.chainId}: {
    VoteVerifier: "${verifierAddress}",
    DIDRegistry: "${didRegistryAddress}",
    PrivateDAOVoting: "${privateVotingAddress}",
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

export default ZKP_CONTRACT_ADDRESSES;
`;

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("✅ Frontend config updated:", frontendConfigPath);

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 ZKP Voting System Deployed Successfully!");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  VoteVerifier:", verifierAddress);
  console.log("  DIDRegistry:", didRegistryAddress);
  console.log("  PrivateDAOVoting:", privateVotingAddress);
  console.log("\nNext Steps:");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Register test voters");
  console.log("  3. Test proof generation");
  console.log("  4. Update frontend with new addresses");
  console.log("=".repeat(60) + "\n");

  // Return for use in tests
  return {
    verifier,
    didRegistry,
    privateVoting,
    addresses: {
      verifier: verifierAddress,
      didRegistry: didRegistryAddress,
      privateVoting: privateVotingAddress
    }
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;