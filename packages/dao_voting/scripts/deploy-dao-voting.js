const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  
  console.log("🚀 Deploying DAO Voting Contract (Public)...");
  console.log("Network:", network.name);
  
  const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
  
  
  if (!GOVERNANCE_TOKEN_ADDRESS || GOVERNANCE_TOKEN_ADDRESS === "0xD72AB3c2e7482b39235E06A15e797f0C8b31ddfE") {
    console.error("❌ Please update GOVERNANCE_TOKEN_ADDRESS in scripts/deploy-dao-voting.js");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Deploy DAO Voting
  const DAOVoting = await ethers.getContractFactory("DAOVoting");
  
  // Constructor now only accepts (Token, Owner)

  const daoVoting = await DAOVoting.deploy(
    GOVERNANCE_TOKEN_ADDRESS,
    deployer.address
  );
  
  await daoVoting.waitForDeployment();
  const daoVotingAddress = await daoVoting.getAddress();
  console.log("✅ DAOVoting deployed to:", daoVotingAddress);
  
  // Test interaction
  try {
      const owner = await daoVoting.owner();
      console.log("Contract Details:");
      console.log("- Owner:", owner);
      console.log("- Governance Token:", await daoVoting.governanceToken());
      // Note: votingDelay/Period are publicly accessible variables, not functions in some versions,
      // but in your contract they are public variables, so getters exist.
      console.log("- Proposal Count:", (await daoVoting.proposalCount()).toString());
  } catch (e) {
      console.log("Verification skipped:", e.message);
  }
  
  return daoVotingAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });