const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  
  console.log("Deploying Reputation Manager...");
  console.log("Network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Deploy Reputation Manager
  const ReputationManager = await ethers.getContractFactory("ReputationManager");
  const reputationManager = await ReputationManager.deploy(deployer.address);
  
  await reputationManager.waitForDeployment();
  const reputationAddress = await reputationManager.getAddress();
  console.log("ReputationManager deployed to:", reputationAddress);
  
  // Test basic functions
  try {
    const owner = await reputationManager.owner();
    const maxReputation = await reputationManager.MAX_REPUTATION();
    const minReputation = await reputationManager.MIN_REPUTATION();
    const defaultReputation = await reputationManager.DEFAULT_REPUTATION();
    
    console.log("Contract Details:");
    console.log("- Owner:", owner);
    console.log("- Max Reputation:", maxReputation.toString());
    console.log("- Min Reputation:", minReputation.toString());
    console.log("- Default Reputation:", defaultReputation.toString());
  } catch (e) {
    console.log("Skipping verification read:", e.message);
  }
  
  return reputationAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });