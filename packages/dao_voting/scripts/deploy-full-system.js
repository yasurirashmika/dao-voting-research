const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;

  console.log("🚀 Deploying Full DAO System...");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // 1. Deploy Governance Token (IMPLEMENTATION)
  console.log("\n1. Deploying Governance Token Implementation...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DAO Governance Token",
    "DGT",
    deployer.address
  );
  await governanceToken.waitForDeployment();
  console.log(`GovernanceToken deployed to: ${governanceToken.target}`);

  // 2. Deploy Reputation Manager (IMPLEMENTATION)
  console.log("\n2. Deploying Reputation Manager Implementation...");
  const ReputationManager = await ethers.getContractFactory(
    "ReputationManager"
  );
  const reputationManager = await ReputationManager.deploy(deployer.address);
  await reputationManager.waitForDeployment();
  console.log(`ReputationManager deployed to: ${reputationManager.target}`);

  // 3. Deploy DAO Voting (USES INTERFACES BUT NEEDS IMPLEMENTATION ADDRESSES)
  console.log("\n3. Deploying DAO Voting Contract...");
  const DAOVoting = await ethers.getContractFactory("DAOVoting");
  const daoVoting = await DAOVoting.deploy(
    governanceToken.target, // Address of implementation
    reputationManager.target, // Address of implementation
    deployer.address
  );
  await daoVoting.waitForDeployment();
  console.log(`DAOVoting deployed to: ${daoVoting.target}`);

  // 4. Setup permissions (IMPLEMENTATIONS GRANT PERMISSIONS TO MAIN CONTRACT)
  console.log("\n4. Setting up cross-contract permissions...");

  // Add DAO contract as minter for governance token
  const addMinterTx = await governanceToken.addMinter(daoVoting.target);
  await addMinterTx.wait(); // ✅ CRITICAL: Wait for transaction to be mined
  console.log("✅ Added DAO contract as governance token minter");

  // Add DAO contract as reputation updater
  const addReputationUpdaterTx = await reputationManager.addReputationUpdater(daoVoting.target);
  await addReputationUpdaterTx.wait(); // ✅ CRITICAL: Wait for transaction to be mined
  console.log("✅ Added DAO contract as reputation updater");

  // 5. Initial setup and testing
  console.log("\n5. Performing initial setup...");

  // Distribute some initial tokens to deployer for testing
  const initialTokens = ethers.parseEther("10000");
  const mintTokensTx = await governanceToken.mint(deployer.address, initialTokens);
  await mintTokensTx.wait(); // ✅ Wait for confirmation
  console.log(
    `✅ Minted ${ethers.formatEther(initialTokens)} tokens to deployer`
  );

  // Register deployer as voter
  const registerVoterTx = await daoVoting.registerVoter(deployer.address);
  await registerVoterTx.wait(); // ✅ Wait for confirmation
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
  console.log(`   GovernanceToken: ${governanceToken.target}`);
  console.log(`   ReputationManager: ${reputationManager.target}`);
  console.log("\n🔌 MAIN CONTRACT (Uses interfaces):");
  console.log(`   DAOVoting: ${daoVoting.target}`);
  console.log("\n💡 Interface Usage:");
  console.log("   DAOVoting imports IGovernanceToken & IReputationManager");
  console.log("   But connects to actual implementation addresses");
  console.log("   This provides loose coupling + upgradability");
  console.log("=".repeat(50));

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n📝 Contract deployed successfully!");
    console.log(" Verify on Etherscan with:");
    console.log(
      `npx hardhat verify --network ${network.name} ${governanceToken.target} "DAO Governance Token" "DGT" "${deployer.address}"`
    );
    console.log(
      `npx hardhat verify --network ${network.name} ${reputationManager.target} "${deployer.address}"`
    );
    console.log(
      `npx hardhat verify --network ${network.name} ${daoVoting.target} "${governanceToken.target}" "${reputationManager.target}" "${deployer.address}"`
    );
    
    console.log("\n🔗 View your contracts on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${governanceToken.target}`);
    console.log(`https://sepolia.etherscan.io/address/${reputationManager.target}`);
    console.log(`https://sepolia.etherscan.io/address/${daoVoting.target}`);
  }

  return {
    governanceToken: governanceToken.target,
    reputationManager: reputationManager.target,
    daoVoting: daoVoting.target,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });