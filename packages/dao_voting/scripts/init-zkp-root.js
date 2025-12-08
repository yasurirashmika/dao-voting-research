const hre = require("hardhat");
const { buildPoseidon } = require("circomlibjs");

// Helper function to retry failed requests
async function retryAsync(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`⚠️  Retry ${i + 1}/${retries} after error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;
  const DID_REGISTRY_ADDR = process.env.DID_REGISTRY_ADDRESS;

  if (!PRIVATE_VOTING_ADDR || !DID_REGISTRY_ADDR) {
    console.error("❌ Error: Missing contract addresses in .env");
    console.error("Need: PRIVATE_DAO_VOTING_ADDRESS and DID_REGISTRY_ADDRESS");
    process.exit(1);
  }

  console.log("🚀 Calculating and Updating Voter Set Root...");
  console.log("PrivateDAOVoting:", PRIVATE_VOTING_ADDR);
  console.log("DIDRegistry:", DID_REGISTRY_ADDR);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Signer:", deployer.address);

  // Connect to contracts
  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);

  // Fetch all registered voter commitments with retry
  console.log("\n📋 Fetching registered voters...");
  const voterCount = await retryAsync(() => PrivateDAOVoting.getRegisteredVoterCount());
  console.log(`Found ${voterCount} registered voters`);

  if (voterCount === 0n) {
    console.error("❌ No voters registered yet. Register voters first!");
    process.exit(1);
  }

  const commitments = [];
  for (let i = 0; i < Number(voterCount); i++) {
    const commitment = await retryAsync(() => 
      PrivateDAOVoting.getVoterCommitmentByIndex(i)
    );
    commitments.push(commitment);
    console.log(`  Voter ${i}: ${commitment}`);
  }

  // Build Poseidon Merkle Tree
  console.log("\n🌳 Building Poseidon Merkle Tree...");
  const poseidon = await buildPoseidon();
  const MERKLE_DEPTH = 20;

  // Convert hex commitments to BigInt
  const leafBigInts = commitments.map((leaf) => {
    const cleaned = leaf.startsWith("0x") ? leaf.slice(2) : leaf;
    return BigInt("0x" + cleaned);
  });

  // Pad to full tree size
  const paddedLeaves = [...leafBigInts];
  const targetSize = 2 ** MERKLE_DEPTH;
  while (paddedLeaves.length < targetSize) {
    paddedLeaves.push(BigInt(0));
  }

  // Build tree level by level
  let currentLevel = paddedLeaves;
  const tree = [currentLevel];

  for (let level = 0; level < MERKLE_DEPTH; level++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];

      // Hash using Poseidon
      const hash = poseidon([left, right]);
      const hashBigInt = poseidon.F.toString(hash);
      nextLevel.push(BigInt(hashBigInt));
    }
    currentLevel = nextLevel;
    tree.push(currentLevel);
  }

  // Get the root (top of tree)
  const calculatedRootBigInt = tree[tree.length - 1][0];
  const calculatedRoot = "0x" + calculatedRootBigInt.toString(16).padStart(64, "0");

  console.log("\n✅ Calculated Merkle Root:", calculatedRoot);

  // Check current root on contract with retry
  console.log("\n🔍 Checking current contract root...");
  const currentRoot = await retryAsync(() => PrivateDAOVoting.currentVoterSetRoot());
  console.log("Current contract root:", currentRoot);

  if (currentRoot.toLowerCase() === calculatedRoot.toLowerCase()) {
    console.log("\n✅ Root already up to date! No update needed.");
    return;
  }

  // Update the root on-chain
  console.log("\n📝 Updating root on-chain...");
  try {
    const tx = await PrivateDAOVoting.updateVoterSetRoot(calculatedRoot);
    console.log("Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    console.log("\n🎉 Success! Voter set root updated to:", calculatedRoot);
    console.log("👉 Voters can now cast private votes!");
  } catch (error) {
    console.error("\n❌ Error updating root:", error.message);
    if (error.message.includes("nonce")) {
      console.log("\n💡 Tip: Try again in a few seconds. Nonce issue detected.");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });