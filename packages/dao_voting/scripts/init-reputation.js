const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // 1. Enter your deployed ReputationManager address here
  // You can find this in your previous deployment logs.
  // If you lost it, check your PrivateDAOVoting contract on Etherscan -> Read Contract -> reputationManager
  const REPUTATION_MANAGER_ADDRESS = process.env.REPUTATION_MANAGER_ADDRESS;

  if (REPUTATION_MANAGER_ADDRESS === "YOUR_REPUTATION_MANAGER_ADDRESS_HERE") {
    console.error("❌ Error: You must replace REPUTATION_MANAGER_ADDRESS with your actual contract address in the script.");
    return;
  }

  // 2. Connect to the contract
  const reputationManager = await hre.ethers.getContractAt(
    "ReputationManager", 
    REPUTATION_MANAGER_ADDRESS
  );

  // 3. Check current status
  const currentRep = await reputationManager.getReputationScore(deployer.address);
  console.log(`Current Reputation Score: ${currentRep.toString()}`);

  if (currentRep > 0n) { // Using BigInt '0n' for comparison
     console.log("✅ You already have reputation! No need to initialize.");
     return;
  }

  // 4. Initialize Reputation
  console.log("🔄 Initializing reputation for deployer...");
  const tx = await reputationManager.initializeReputation(deployer.address);
  
  console.log("Waiting for transaction confirmation...");
  await tx.wait();

  // 5. Verify result
  const newRep = await reputationManager.getReputationScore(deployer.address);
  console.log(`🎉 Success! New Reputation Score: ${newRep.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });