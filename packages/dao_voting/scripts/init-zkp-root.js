const hre = require("hardhat");

async function main() {
  // 1. Get the address from your .env
  // Make sure your packages/dao_voting/.env has PRIVATE_DAO_VOTING_ADDRESS set!
  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;

  if (!PRIVATE_VOTING_ADDR) {
    console.error("❌ Error: PRIVATE_DAO_VOTING_ADDRESS is missing in .env");
    process.exit(1);
  }

  console.log("🚀 Initializing ZKP Voter Root...");
  console.log("Contract:", PRIVATE_VOTING_ADDR);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Signer:", deployer.address);

  // 2. Connect to the contract
  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);

  // 3. Define an Initial Root
  // In a real ZK app, this is calculated from the Merkle Tree of registered commitments.
  // For the prototype startup, we set a "Genesis Root".
  // This allows proposals to be created immediately.
  const GENESIS_ROOT = "0x1111111111111111111111111111111111111111111111111111111111111111";

  // 4. Send Transaction
  try {
    const tx = await PrivateDAOVoting.updateVoterSetRoot(GENESIS_ROOT);
    console.log("Transaction sent:", tx.hash);
    
    await tx.wait();
    console.log("Success! Voter set root initialized to:", GENESIS_ROOT);
    console.log("👉 You can now create proposals in Private Mode.");
  } catch (error) {
    console.error("❌ Error updating root:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });