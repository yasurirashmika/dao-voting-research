const hre = require("hardhat");

// Add your deployed contract addresses here after deployment
// TODO: Update these with the addresses from 'deploy-full-system.js' output
const DEPLOYED_ADDRESSES = {
  governanceToken: process.env.GOVERNANCE_TOKEN_ADDRESS,
  reputationManager: process.env.REPUTATION_MANAGER_ADDRESS,
  daoVoting: process.env.DAO_VOTING_ADDRESS
};

// TODO: Update with your deployer address
const DEPLOYER_ADDRESS = "0xF2d47208f7c21a143FbDED47e7f260593d901F57"; 

async function main() {
  console.log("Verifying contracts on Etherscan...");

  // Check if addresses are set
  if (Object.values(DEPLOYED_ADDRESSES).some(addr => addr === "0xF2d47208f7c21a143FbDED47e7f260593d901F57")) {
      console.error("Please update DEPLOYED_ADDRESSES in scripts/verify-contracts.js before running.");
      process.exit(1);
  }

  try {
    // 1. Verify Governance Token
    console.log("1. Verifying GovernanceToken...");
    try {
        await hre.run("verify:verify", {
        address: DEPLOYED_ADDRESSES.governanceToken,
        constructorArguments: [
            "DAO Governance Token",
            "DGT",
            DEPLOYER_ADDRESS
        ],
        });
        console.log("GovernanceToken verified successfully!");
    } catch (e) {
        console.log("GovernanceToken verification failed or already verified:", e.message);
    }

    // 2. Verify Reputation Manager
    console.log("2. Verifying ReputationManager...");
    try {
        await hre.run("verify:verify", {
        address: DEPLOYED_ADDRESSES.reputationManager,
        constructorArguments: [DEPLOYER_ADDRESS],
        });
        console.log("ReputationManager verified successfully!");
    } catch (e) {
        console.log("ReputationManager verification failed or already verified:", e.message);
    }

    // 3. Verify DAO Voting (Public)
    console.log("3. Verifying DAOVoting...");
    try {
        await hre.run("verify:verify", {
        address: DEPLOYED_ADDRESSES.daoVoting,
        constructorArguments: [
            DEPLOYED_ADDRESSES.governanceToken,
            // DEPLOYED_ADDRESSES.reputationManager, <--- REMOVED this argument
            DEPLOYER_ADDRESS
        ],
        });
        console.log("DAOVoting verified successfully!");
    } catch (e) {
        console.log("DAOVoting verification failed or already verified:", e.message);
    }

    console.log("\nAll verification steps completed.");

  } catch (error) {
    console.error("Verification script error:", error);
    console.log("\nTroubleshooting tips:");
    console.log("1. Make sure contract addresses are correct");
    console.log("2. Wait a few minutes after deployment before verifying");
    console.log("3. Check that ETHERSCAN_API_KEY is set in .env");
    console.log("4. Verify constructor arguments match deployment");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });