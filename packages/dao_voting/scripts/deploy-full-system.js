const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  console.log("🚀 Deploying Full DAO System...");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);

  // 1. Deploy Governance Token (IMPLEMENTATION)
  console.log("\n1. Deploying Governance Token Implementation...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DAO Governance Token",
    "DGT",
    deployer.address
  );
  await governanceToken.deployed();
  console.log(`GovernanceToken deployed to: ${governanceToken.address}`);

  // 2. Deploy Reputation Manager (IMPLEMENTATION)
  console.log("\n2. Deploying Reputation Manager Implementation...");
  const ReputationManager = await ethers.getContractFactory(
    "ReputationManager"
  );
  const reputationManager = await ReputationManager.deploy(deployer.address);
  await reputationManager.deployed();
  console.log(`ReputationManager deployed to: ${reputationManager.address}`);

  // 3. Deploy DAO Voting (USES INTERFACES BUT NEEDS IMPLEMENTATION ADDRESSES)
  console.log("\n3. Deploying DAO Voting Contract...");
  const DAOVoting = await ethers.getContractFactory("DAOVoting");
  const daoVoting = await DAOVoting.deploy(
    governanceToken.address, // Address of implementation, but DAOVoting uses IGovernanceToken interface
    reputationManager.address, // Address of implementation, but DAOVoting uses IReputationManager interface
    deployer.address
  );
  await daoVoting.deployed();
  console.log(`DAOVoting deployed to: ${daoVoting.address}`);

  // 4. Setup permissions (IMPLEMENTATIONS GRANT PERMISSIONS TO MAIN CONTRACT)
  console.log("\n4. Setting up cross-contract permissions...");

  // Add DAO contract as minter for governance token
  await governanceToken.addMinter(daoVoting.address);
  console.log("✅ Added DAO contract as governance token minter");

  // Add DAO contract as reputation updater
  await reputationManager.addReputationUpdater(daoVoting.address);
  console.log("✅ Added DAO contract as reputation updater");

  // 5. Initial setup and testing
  console.log("\n5. Performing initial setup...");

  // Distribute some initial tokens to deployer for testing
  const initialTokens = ethers.utils.parseEther("10000");
  await governanceToken.mint(deployer.address, initialTokens);
  console.log(
    `✅ Minted ${ethers.utils.formatEther(initialTokens)} tokens to deployer`
  );

  // Register deployer as voter
  await daoVoting.registerVoter(deployer.address);
  console.log("✅ Registered deployer as voter");

  // 6. Verify the interface-based connections work
  console.log("\n6. Verifying interface-based connections...");

  // Test that DAOVoting can interact with GovernanceToken via interface
  const tokenBalance = await daoVoting.getVotingPowerOf(deployer.address);
  console.log(
    `✅ DAOVoting → IGovernanceToken: Voting power = ${tokenBalance}`
  );

  // Test that DAOVoting can interact with ReputationManager via interface
  const reputationScore = await daoVoting.reputationManager();
  console.log(
    `✅ DAOVoting → IReputationManager: Connected to ${reputationScore}`
  );

  // 7. Architecture verification
  console.log("\n7. Architecture Summary:");
  console.log("=".repeat(50));
  console.log("📋 IMPLEMENTATIONS (Actual contracts):");
  console.log(`   GovernanceToken: ${governanceToken.address}`);
  console.log(`   ReputationManager: ${reputationManager.address}`);
  console.log("\n🔌 MAIN CONTRACT (Uses interfaces):");
  console.log(`   DAOVoting: ${daoVoting.address}`);
  console.log("\n💡 Interface Usage:");
  console.log("   DAOVoting imports IGovernanceToken & IReputationManager");
  console.log("   But connects to actual implementation addresses");
  console.log("   This provides loose coupling + upgradability");
  console.log("=".repeat(50));

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n📝 To verify on Etherscan:");
    console.log(
      `npx hardhat verify --network ${network.name} ${governanceToken.address} "DAO Governance Token" "DGT" "${deployer.address}"`
    );
    console.log(
      `npx hardhat verify --network ${network.name} ${reputationManager.address} "${deployer.address}"`
    );
    console.log(
      `npx hardhat verify --network ${network.name} ${daoVoting.address} "${governanceToken.address}" "${reputationManager.address}" "${deployer.address}"`
    );
  }

  return {
    governanceToken: governanceToken.address,
    reputationManager: reputationManager.address,
    daoVoting: daoVoting.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
