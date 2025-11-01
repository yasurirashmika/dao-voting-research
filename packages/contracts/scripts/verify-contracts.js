const hre = require("hardhat");

// Add your deployed contract addresses here after deployment
const DEPLOYED_ADDRESSES = {
  governanceToken: "0x...", // Replace with actual address
  reputationManager: "0x...", // Replace with actual address  
  daoVoting: "0x..." // Replace with actual address
};

const DEPLOYER_ADDRESS = "0x..."; // Replace with your deployer address

async function main() {
  console.log("Verifying contracts on Etherscan...");

  try {
    // Verify Governance Token
    console.log("1. Verifying GovernanceToken...");
    await hre.run("verify:verify", {
      address: DEPLOYED_ADDRESSES.governanceToken,
      constructorArguments: [
        "DAO Governance Token",
        "DGT",
        DEPLOYER_ADDRESS
      ],
    });
    console.log("GovernanceToken verified successfully!");

    // Verify Reputation Manager
    console.log("2. Verifying ReputationManager...");
    await hre.run("verify:verify", {
      address: DEPLOYED_ADDRESSES.reputationManager,
      constructorArguments: [DEPLOYER_ADDRESS],
    });
    console.log("ReputationManager verified successfully!");

    // Verify DAO Voting
    console.log("3. Verifying DAOVoting...");
    await hre.run("verify:verify", {
      address: DEPLOYED_ADDRESSES.daoVoting,
      constructorArguments: [
        DEPLOYED_ADDRESSES.governanceToken,
        DEPLOYED_ADDRESSES.reputationManager,
        DEPLOYER_ADDRESS
      ],
    });
    console.log("DAOVoting verified successfully!");

    console.log("All contracts verified successfully!");

  } catch (error) {
    console.error("Verification failed:", error);
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