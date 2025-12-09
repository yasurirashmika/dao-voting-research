const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting Admin Private Voting Registration...\n");

  const DID_REGISTRY_ADDR = process.env.DID_REGISTRY_ADDRESS;
  const PRIVATE_VOTING_ADDR = process.env.PRIVATE_DAO_VOTING_ADDRESS;

  if (!DID_REGISTRY_ADDR || !PRIVATE_VOTING_ADDR) {
    console.error("Missing contract addresses in .env");
    console.log("Required: DID_REGISTRY_ADDRESS, PRIVATE_DAO_VOTING_ADDRESS");
    process.exit(1);
  }

  const [admin] = await hre.ethers.getSigners();
  console.log("Admin Address:", admin.address);
  console.log("DIDRegistry:", DID_REGISTRY_ADDR);
  console.log("PrivateDAOVoting:", PRIVATE_VOTING_ADDR);
  console.log("");

  const DIDRegistry = await hre.ethers.getContractAt("DIDRegistry", DID_REGISTRY_ADDR);
  const PrivateDAOVoting = await hre.ethers.getContractAt("PrivateDAOVoting", PRIVATE_VOTING_ADDR);

  // Define your secret
  const SECRET_STRING = "Yasuri";
  
  // Convert string to number using simple hash (MUST MATCH UI)
  const stringToNumber = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  };
  
  const SECRET_NUMBER = stringToNumber(SECRET_STRING);
  console.log("Original Secret:", SECRET_STRING);
  console.log("Converted to Number:", SECRET_NUMBER);
  console.log("SAVE THIS! You'll need the original string to vote.\n");

  // Calculate Commitment using Keccak256 (MUST MATCH UI)
  console.log("Calculating Commitment...");
  const commitment = ethers.keccak256(ethers.toBeHex(SECRET_NUMBER, 32));
  console.log("Commitment:", commitment);
  console.log("");

  // Check if DID exists
  console.log("Checking DID Status...");
  const hasDID = await DIDRegistry.hasDID(admin.address);
  
  if (!hasDID) {
    console.log("Creating DID...");
    const tx1 = await DIDRegistry.createDID(admin.address);
    await tx1.wait();
    console.log("DID Created!");
  } else {
    console.log("DID Already Exists");
  }
  console.log("");

  // Check if already registered for voting
  const hasRegistered = await DIDRegistry.hasRegisteredForVoting(admin.address);
  
  if (hasRegistered) {
    console.log("You've already registered for voting!");
    console.log("If you want to re-register, you need to deploy new contracts.\n");
  } else {
    console.log("Registering for Private Voting...");
    const tx2 = await DIDRegistry.registerVoterForDAO(commitment);
    await tx2.wait();
    console.log("Registered in PrivateDAOVoting!");
    console.log("");
  }

  // Build Merkle Tree and Update Root
  console.log("Building Merkle Tree (Depth 20)...");
  
  const MERKLE_TREE_DEPTH = 5;
  
  // Get all commitments from contract
  const voterCount = await PrivateDAOVoting.getRegisteredVoterCount();
  const commitments = [];
  for (let i = 0; i < Number(voterCount); i++) {
    const comm = await PrivateDAOVoting.getVoterCommitmentByIndex(i);
    commitments.push(comm);
  }
  
  console.log("Total voters:", commitments.length);
  
  // Build tree using Keccak256
  let currentLevel = [...commitments];
  const targetSize = 2 ** MERKLE_TREE_DEPTH;
  
  // Pad with zero hashes
  while (currentLevel.length < targetSize) {
    currentLevel.push(ethers.ZeroHash);
  }
  
  // Build tree bottom-up
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
  console.log("Calculated Merkle Root:", merkleRootHex);
  console.log("");
  
  // Update root on contract
  const currentRoot = await PrivateDAOVoting.currentVoterSetRoot();
  
  if (currentRoot.toLowerCase() !== merkleRootHex.toLowerCase()) {
    console.log("Updating Merkle Root...");
    const tx3 = await PrivateDAOVoting.updateVoterSetRoot(merkleRootHex);
    await tx3.wait();
    console.log("Merkle Root Updated!");
  } else {
    console.log("Merkle Root Already Correct");
  }
  console.log("");

  // Verification
  console.log("Verifying Registration...");
  const isRegistered = await PrivateDAOVoting.isCommitmentRegistered(commitment);
  const finalRoot = await PrivateDAOVoting.currentVoterSetRoot();
  
  console.log("Commitment Registered:", isRegistered);
  console.log("Current Root:", finalRoot);
  console.log("");

  // Save to file
  const secretData = {
    secret: SECRET_STRING,
    secretNumber: SECRET_NUMBER.toString(),
    commitment: commitment,
    merkleRoot: finalRoot,
    address: admin.address,
    timestamp: new Date().toISOString(),
    warning: "Keep this file secure! You need the secret to vote privately."
  };

  const secretsDir = path.join(__dirname, "../secrets");
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  const filename = path.join(secretsDir, `dao-secret-${admin.address.slice(0, 8)}.json`);
  fs.writeFileSync(filename, JSON.stringify(secretData, null, 2));
  console.log("Secret saved to:", filename);
  console.log("");

  // Summary
  console.log("=".repeat(60));
  console.log("REGISTRATION COMPLETE!");
  console.log("=".repeat(60));
  console.log("");
  console.log("Save These Values:");
  console.log("-".repeat(60));
  console.log("Secret String:", SECRET_STRING);
  console.log("Secret Number:", SECRET_NUMBER);
  console.log("Commitment:", commitment);
  console.log("Merkle Root:", finalRoot);
  console.log("-".repeat(60));
  console.log("");
  console.log("Next Steps:");
  console.log("1. Copy your Secret String:", SECRET_STRING);
  console.log("2. Go to the ZK Voting UI");
  console.log("3. Paste the secret and vote!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });