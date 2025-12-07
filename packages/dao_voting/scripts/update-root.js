const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Updating Merkle Root on Sepolia...\n");

  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;

  if (!PRIVATE_VOTING_ADDR) {
    console.error("Missing PRIVATE_DAO_VOTING_ADDRESS in .env");
    process.exit(1);
  }

  const [admin] = await hre.ethers.getSigners();
  console.log("Admin Address:", admin.address);
  console.log("PrivateDAOVoting:", PRIVATE_VOTING_ADDR);

  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);

  // Build Merkle Tree
  console.log("\nBuilding Merkle Tree (Depth 20)...");
  
  const MERKLE_TREE_DEPTH = 20;
  
  const voterCount = await PrivateDAOVoting.getRegisteredVoterCount();
  console.log("Total voters:", Number(voterCount));
  
  const commitments = [];
  for (let i = 0; i < Number(voterCount); i++) {
    const comm = await PrivateDAOVoting.getVoterCommitmentByIndex(i);
    commitments.push(comm);
    console.log(`Voter ${i}: ${comm}`);
  }
  
  let currentLevel = [...commitments];
  const targetSize = 2 ** MERKLE_TREE_DEPTH;
  
  while (currentLevel.length < targetSize) {
    currentLevel.push(ethers.ZeroHash);
  }
  
  for (let level = 0; level < MERKLE_TREE_DEPTH; level++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      const parent = ethers.keccak256(ethers.concat([left, right]));
      nextLevel.push(parent);
    }
    currentLevel = nextLevel;
  }
  
  const merkleRootHex = currentLevel[0];
  console.log("\nCalculated Merkle Root:", merkleRootHex);
  
  const currentRoot = await PrivateDAOVoting.currentVoterSetRoot();
  console.log("Current Root on Contract:", currentRoot);
  
  if (currentRoot.toLowerCase() === merkleRootHex.toLowerCase()) {
    console.log("\n✅ Merkle Root is already correct!");
    return;
  }
  
  console.log("\n⏳ Updating Merkle Root on contract...");
  console.log("This will take ~15-30 seconds on Sepolia...");
  
  const tx = await PrivateDAOVoting.updateVoterSetRoot(merkleRootHex);
  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");
  
  await tx.wait();
  
  console.log("\n✅ Merkle Root Updated Successfully!");
  console.log("\nVerifying...");
  const finalRoot = await PrivateDAOVoting.currentVoterSetRoot();
  console.log("Final Root:", finalRoot);
  
  console.log("\n✅ You can now vote in the UI!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });