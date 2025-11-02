const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  
  console.log("Deploying DAO Voting Contract...");
  console.log("Network:", network.name);
  
  // You need to provide these addresses from previous deployments
  const GOVERNANCE_TOKEN_ADDRESS = "0x..."; // Replace with deployed token address
  const REPUTATION_MANAGER_ADDRESS = "0x..."; // Replace with deployed reputation manager address
  
  if (GOVERNANCE_TOKEN_ADDRESS === "0x..." || REPUTATION_MANAGER_ADDRESS === "0x...") {
    console.error("Please update GOVERNANCE_TOKEN_ADDRESS and REPUTATION_MANAGER_ADDRESS in this script");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "ETH");

  // Deploy DAO Voting
  const DAOVoting = await ethers.getContractFactory("DAOVoting");
  const daoVoting = await DAOVoting.deploy(
    GOVERNANCE_TOKEN_ADDRESS,
    REPUTATION_MANAGER_ADDRESS,
    deployer.address
  );
  
  await daoVoting.deployed();
  console.log("DAOVoting deployed to:", daoVoting.address);
  
  // Test basic functions
  const owner = await daoVoting.owner();
  const governanceToken = await daoVoting.governanceToken();
  const reputationManager = await daoVoting.reputationManager();
  const proposalCount = await daoVoting.proposalCount();
  const votingDelay = await daoVoting.votingDelay();
  const votingPeriod = await daoVoting.votingPeriod();
  
  console.log("Contract Details:");
  console.log("- Owner:", owner);
  console.log("- Governance Token:", governanceToken);
  console.log("- Reputation Manager:", reputationManager);
  console.log("- Proposal Count:", proposalCount.toString());
  console.log("- Voting Delay:", votingDelay.toString(), "seconds");
  console.log("- Voting Period:", votingPeriod.toString(), "seconds");
  
  return daoVoting.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });