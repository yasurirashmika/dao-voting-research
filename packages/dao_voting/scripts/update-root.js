const hre = require("hardhat");
const { ethers } = require("hardhat");
const { buildPoseidon } = require("circomlibjs");

async function main() {
  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;
  const [admin] = await hre.ethers.getSigners();
  
  console.log("🔄 Updating Merkle Root with Poseidon Hashing...\n");
  console.log("Admin:", admin.address);
  console.log("Contract:", PRIVATE_VOTING_ADDR);
  console.log("=" .repeat(60) + "\n");
  
  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);
  
  // Fetch all commitments
  const voterCount = await PrivateDAOVoting.getRegisteredVoterCount();
  console.log("📊 Total registered voters:", Number(voterCount));
  
  if (voterCount === 0n) {
    console.log("⚠️  No voters registered. Nothing to update.");
    return;
  }
  
  const commitments = [];
  for (let i = 0; i < Number(voterCount); i++) {
    const comm = await PrivateDAOVoting.getVoterCommitmentByIndex(i);
    commitments.push(comm);
    console.log(`  Voter ${i}: ${comm}`);
  }
  
  console.log("\n🔧 Building Poseidon Merkle Tree...");
  
  // Initialize Poseidon
  const poseidon = await buildPoseidon();
  
  // Convert hex commitments to BigInt
  const leafBigInts = commitments.map(leaf => {
    const cleaned = leaf.startsWith("0x") ? leaf.slice(2) : leaf;
    return BigInt("0x" + cleaned);
  });
  
  // Pad to full tree size (depth 5)
  const DEPTH = 5;
  const targetSize = 2 ** DEPTH;
  const paddedLeaves = [...leafBigInts];
  
  while (paddedLeaves.length < targetSize) {
    paddedLeaves.push(BigInt(0));
  }
  
  console.log(`  Tree depth: ${DEPTH}`);
  console.log(`  Padded leaves: ${paddedLeaves.length}`);
  
  // Build tree using Poseidon
  let currentLevel = paddedLeaves;
  
  for (let level = 0; level < DEPTH; level++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      
      // Hash using Poseidon
      const hash = poseidon([left, right]);
      const hashBigInt = BigInt(poseidon.F.toString(hash));
      nextLevel.push(hashBigInt);
    }
    currentLevel = nextLevel;
    
    if (level < 3) {
      console.log(`  Level ${level + 1}: ${currentLevel.length} nodes`);
    }
  }
  
  // Convert root to hex
  const merkleRootBigInt = currentLevel[0];
  const merkleRoot = '0x' + merkleRootBigInt.toString(16).padStart(64, '0');
  
  console.log("\n✅ Calculated Poseidon Root:", merkleRoot);
  console.log("   (BigInt:", merkleRootBigInt.toString(10).slice(0, 30) + "...)");
  
  // Get current root from contract
  try {
    const currentRoot = await PrivateDAOVoting.currentVoterSetRoot();
    console.log("\n📋 Current contract root:", currentRoot);
    
    if (currentRoot.toLowerCase() === merkleRoot.toLowerCase()) {
      console.log("✅ Root is already up to date! No update needed.");
      return;
    }
  } catch (err) {
    console.log("⚠️  Could not fetch current root:", err.message);
  }
  
  // Update on contract
  console.log("\n🚀 Updating contract with new Poseidon root...");
  
  const tx = await PrivateDAOVoting.updateVoterSetRoot(merkleRoot, { gasLimit: 500000 });
  console.log("📝 Transaction hash:", tx.hash);
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ MERKLE ROOT UPDATED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\nNew root:", merkleRoot);
  console.log("\n⚠️  IMPORTANT: All users must re-register or the frontend");
  console.log("   will now calculate Poseidon roots that match this update.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });