const hre = require("hardhat");
const { poseidon } = require("circomlibjs");
const { ethers } = require("hardhat");

/**
 * 🔐 ADMIN REGISTRATION SCRIPT FOR PRIVATE VOTING
 * 
 * This registers the admin wallet for private voting by:
 * 1. Creating a DID
 * 2. Generating a commitment from a secret
 * 3. Registering the commitment in PrivateDAOVoting
 * 4. Updating the Merkle root
 */

async function main() {
  console.log("🚀 Starting Admin Private Voting Registration...\n");

  // ✅ 1. Load Contract Addresses
  const DID_REGISTRY_ADDR = process.env.DID_REGISTRY_ADDRESS;
  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;

  if (!DID_REGISTRY_ADDR || !PRIVATE_VOTING_ADDR) {
    console.error("❌ Missing contract addresses in .env");
    console.log("Required: DID_REGISTRY_ADDRESS, PRIVATE_DAO_VOTING_ADDRESS");
    process.exit(1);
  }

  const [admin] = await hre.ethers.getSigners();
  console.log("👤 Admin Address:", admin.address);
  console.log("📍 DIDRegistry:", DID_REGISTRY_ADDR);
  console.log("📍 PrivateDAOVoting:", PRIVATE_VOTING_ADDR);
  console.log("");

  // ✅ 2. Connect to Contracts
  const DIDRegistry = await hre.ethers.getContractAt("DIDRegistry", DID_REGISTRY_ADDR);
  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);

  // ✅ 3. Define Your Secret (IMPORTANT: Remember this!)
  const SECRET_STRING = "Yasuri"; // Your string secret
  
  // Convert string to number using simple hash
  const stringToNumber = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return BigInt(Math.abs(hash));
  };
  
  const SECRET = stringToNumber(SECRET_STRING);
  console.log("🔑 Original Secret:", SECRET_STRING);
  console.log("🔢 Converted to Number:", SECRET.toString());
  console.log("⚠️  SAVE BOTH! You'll need the original string to vote.\n");

  // ✅ 4. Calculate Commitment (Poseidon Hash)
  console.log("🔐 Calculating Commitment...");
  const poseidonHash = await poseidon([SECRET]);
  const commitment = "0x" + poseidonHash.toString(16).padStart(64, "0");
  console.log("✅ Commitment:", commitment);
  console.log("");

  // ✅ 5. Check if DID exists
  console.log("🔍 Checking DID Status...");
  const hasDID = await DIDRegistry.hasDID(admin.address);
  
  if (!hasDID) {
    console.log("⏳ Creating DID...");
    const tx1 = await DIDRegistry.createDID(admin.address);
    await tx1.wait();
    console.log("✅ DID Created!");
  } else {
    console.log("✅ DID Already Exists");
  }
  console.log("");

  // ✅ 6. Check if already registered for voting
  const hasRegistered = await DIDRegistry.hasRegisteredForVoting(admin.address);
  
  if (hasRegistered) {
    console.log("⚠️  You've already registered for voting!");
    console.log("If you want to re-register, you need to deploy new contracts.\n");
  } else {
    console.log("⏳ Registering for Private Voting...");
    const tx2 = await DIDRegistry.registerVoterForDAO(commitment);
    await tx2.wait();
    console.log("✅ Registered in PrivateDAOVoting!");
    console.log("");
  }

  // ✅ 7. Update Merkle Root
  console.log("🌳 Updating Merkle Root...");
  
  // For a single voter, the merkle root is just the commitment itself
  // In production, you'd calculate this from a proper merkle tree
  const currentRoot = await PrivateDAOVoting.currentVoterSetRoot();
  
  if (currentRoot === ethers.ZeroHash) {
    console.log("⏳ Setting Initial Merkle Root...");
    const tx3 = await PrivateDAOVoting.updateVoterSetRoot(commitment);
    await tx3.wait();
    console.log("✅ Merkle Root Set:", commitment);
  } else {
    console.log("✅ Merkle Root Already Set:", currentRoot);
  }
  console.log("");

  // ✅ 8. Verification
  console.log("🔍 Verifying Registration...");
  const isRegistered = await PrivateDAOVoting.isCommitmentRegistered(commitment);
  const finalRoot = await PrivateDAOVoting.currentVoterSetRoot();
  
  console.log("✅ Commitment Registered:", isRegistered);
  console.log("✅ Current Root:", finalRoot);
  console.log("");

  // ✅ 9. Summary
  console.log("═══════════════════════════════════════════════");
  console.log("✅ REGISTRATION COMPLETE!");
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("📋 Save These Values:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 Secret:", SECRET.toString());
  console.log("🔐 Commitment:", commitment);
  console.log("🌳 Merkle Root:", finalRoot);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📝 Next Steps:");
  console.log("1. Copy your Secret to the ZK Voting UI");
  console.log("2. The Merkle Root will be auto-fetched");
  console.log("3. Create a proposal and vote!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });