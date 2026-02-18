const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

// =========================================================
// 1. CONFIGURATION & PATHS
// =========================================================
const SCRIPT_DIR = __dirname;
const BUILD_DIR = path.join(SCRIPT_DIR, "../build/vote");

const WASM_PATH = path.join(BUILD_DIR, "vote_js/vote.wasm");
const ZKEY_PATH = path.join(BUILD_DIR, "vote_final.zkey");
const VKEY_PATH = path.join(BUILD_DIR, "verification_key.json");
const PROOF_OUTPUT_PATH = path.join(BUILD_DIR, "proof.json");
const PUBLIC_OUTPUT_PATH = path.join(BUILD_DIR, "public.json");

// =========================================================
// 2. HELPER FUNCTIONS
// =========================================================

// Converts BigInt or hex → decimal string
const toDec = (x) => BigInt(x).toString(10);

// Poseidon hash helper
async function poseidonHash(inputs) {
  const poseidon = await buildPoseidon();
  const hash = poseidon.F.toString(poseidon(inputs));
  return BigInt(hash);
}

// Generate commitment from secret
async function generateCommitment(secret) {
  const poseidon = await buildPoseidon();
  const commitment = poseidon.F.toString(poseidon([BigInt(secret)]));
  return BigInt(commitment);
}

// Generate nullifier = Poseidon(secret, proposalId)
async function generateNullifier(secret, proposalId) {
  const poseidon = await buildPoseidon();
  const nullifier = poseidon.F.toString(
    poseidon([BigInt(secret), BigInt(proposalId)])
  );
  return BigInt(nullifier);
}

// Generate Merkle Proof (simple sparse tree with 0-value siblings)
function generateMerkleProof(leaves, leafIndex, poseidon, levels = 20) {
  const hash = (inputs) => BigInt(poseidon.F.toString(poseidon(inputs)));
  const pathElements = [];
  const pathIndices = [];

  let currentIndex = leafIndex;
  let currentHash = leaves[leafIndex];

  for (let i = 0; i < levels; i++) {
    pathIndices.push(currentIndex % 2);
    pathElements.push(0n); // dummy sibling

    currentHash =
      currentIndex % 2 === 0 ? hash([currentHash, 0n]) : hash([0n, currentHash]);
    currentIndex = Math.floor(currentIndex / 2);
  }

  return { pathElements, pathIndices, root: currentHash };
}

// =========================================================
// 3. CORE PROOF GENERATION
// =========================================================

async function generateVoteProof(
  secret,
  proposalId,
  voteChoice,
  voterCommitments = [],
  voterIndex = 0
) {
  console.log("🔄 Initializing Poseidon...");
  const poseidon = await buildPoseidon();

  console.log("Checking artifacts...");
  if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
    throw new Error(`Missing circuit files:
WASM: ${WASM_PATH}
ZKEY: ${ZKEY_PATH}`);
  }

  console.log("🌳 Constructing Merkle Tree...");

  // 1. Generate commitment
  const commitment = await generateCommitment(secret);

  // 2. Build Merkle Proof
  const leaves =
    voterCommitments.length > 0 ? voterCommitments.map(BigInt) : [commitment];

  const { pathElements, pathIndices, root } = generateMerkleProof(
    leaves,
    voterIndex,
    poseidon
  );

  // 3. Nullifier
  const nullifier = await generateNullifier(secret, proposalId);

  const hexToDec = (hex) => BigInt(hex).toString(10);

  // FIXED: use correct variables from generateMerkleProof
  const input = {
    root: hexToDec(root),
    secret: hexToDec(secret),
    proposalId: proposalId.toString(),
    voteChoice: voteChoice.toString(),
    pathElements: pathElements.map(hexToDec),
    pathIndices: pathIndices.map(String),
  };

  console.log("\n📝 Circuit Inputs (sanitized):");
  console.log(input);

  console.log("\n🔐 Generating Proof...");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_PATH,
    ZKEY_PATH
  );

  console.log("Proof generated!");

  return {
    proof,
    publicSignals,
    nullifier: toDec(nullifier),
    root: toDec(root),
    commitment: toDec(commitment),
  };
}

// =========================================================
// 4. VERIFY PROOF
// =========================================================

async function verifyProof(proof, publicSignals) {
  if (!fs.existsSync(VKEY_PATH)) {
    throw new Error(`Verification key not found: ${VKEY_PATH}`);
  }
  const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
  return await snarkjs.groth16.verify(vKey, publicSignals, proof);
}

// =========================================================
// 5. EXPORT SOLIDITY CALL DATA
// =========================================================

async function exportSolidityCallData(proof, publicSignals) {
  return await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
}

// =========================================================
// 6. MAIN (CLI)
// =========================================================

async function main() {
  try {
    const VOTER_SECRET = "123456";
    const PROPOSAL_ID = "1";
    const VOTE_CHOICE = "1";

    const result = await generateVoteProof(
      VOTER_SECRET,
      PROPOSAL_ID,
      VOTE_CHOICE
    );

    console.log("\nPublic Signals:", result.publicSignals);

    const ok = await verifyProof(result.proof, result.publicSignals);
    console.log("\nVerification:", ok ? "PASS ✅" : "FAIL ❌");

    fs.writeFileSync(PROOF_OUTPUT_PATH, JSON.stringify(result.proof, null, 2));
    fs.writeFileSync(
      PUBLIC_OUTPUT_PATH,
      JSON.stringify(result.publicSignals, null, 2)
    );

    console.log(`Proof saved → ${PROOF_OUTPUT_PATH}`);
  } catch (err) {
    console.error("\nError:", err);
  }
}

if (require.main === module) {
  main();
}

// =========================================================
// 7. EXPORT FUNCTIONS
// =========================================================

module.exports = {
  generateVoteProof,
  generateCommitment,
  generateNullifier,
  verifyProof,
  exportSolidityCallData,
};
