const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

// =========================================================
// 1. CONFIGURATION & PATHS
// =========================================================

// robust path resolution
const SCRIPT_DIR = __dirname;
const BUILD_DIR = path.join(SCRIPT_DIR, "../build/vote");

// Artifact Paths
const WASM_PATH = path.join(BUILD_DIR, "vote_js/vote.wasm");
const ZKEY_PATH = path.join(BUILD_DIR, "vote_final.zkey"); 
const VKEY_PATH = path.join(BUILD_DIR, "verification_key.json");
const PROOF_OUTPUT_PATH = path.join(BUILD_DIR, "proof.json");
const PUBLIC_OUTPUT_PATH = path.join(BUILD_DIR, "public.json");

// =========================================================
// 2. CRYPTOGRAPHIC HELPER FUNCTIONS
// =========================================================

/**
 * Hash inputs using Poseidon (matches circuit)
 */
async function poseidonHash(inputs) {
    const poseidon = await buildPoseidon();
    const hash = poseidon.F.toString(poseidon(inputs));
    return BigInt(hash);
}

/**
 * Generate commitment from secret
 * Commitment = Poseidon(secret)
 */
async function generateCommitment(secret) {
    const poseidon = await buildPoseidon();
    const commitment = poseidon.F.toString(poseidon([BigInt(secret)]));
    return BigInt(commitment);
}

/**
 * Generate nullifier
 * Nullifier = Poseidon(secret, proposalId)
 */
async function generateNullifier(secret, proposalId) {
    const poseidon = await buildPoseidon();
    const nullifier = poseidon.F.toString(poseidon([BigInt(secret), BigInt(proposalId)]));
    return BigInt(nullifier);
}

/**
 * Generate Merkle proof for a leaf in the tree
 * (Simplified for testing: assumes sparse tree with 0-value siblings)
 */
function generateMerkleProof(leaves, leafIndex, poseidon, levels = 20) {
    const hash = (inputs) => BigInt(poseidon.F.toString(poseidon(inputs)));
    const pathElements = [];
    const pathIndices = [];
    
    let currentIndex = leafIndex;
    let currentHash = leaves[leafIndex];
    
    for (let i = 0; i < levels; i++) {
        pathIndices.push(currentIndex % 2);
        // For demo: Sibling is always 0
        pathElements.push(0n); 

        if (currentIndex % 2 === 0) {
            currentHash = hash([currentHash, 0n]);
        } else {
            currentHash = hash([0n, currentHash]);
        }
        currentIndex = Math.floor(currentIndex / 2);
    }
    
    return { pathElements, pathIndices, root: currentHash };
}

// =========================================================
// 3. CORE PROOF GENERATION
// =========================================================

/**
 * Generate zero-knowledge proof
 */
async function generateVoteProof(secret, proposalId, voteChoice, voterCommitments = [], voterIndex = 0) {
    console.log("🔄 Initializing Poseidon...");
    const poseidon = await buildPoseidon();
    const hash = (inputs) => BigInt(poseidon.F.toString(poseidon(inputs)));

    console.log("🔍 Checking artifacts...");
    if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        throw new Error(`Missing circuit files.\nExpected WASM at: ${WASM_PATH}\nExpected ZKEY at: ${ZKEY_PATH}`);
    }

    console.log("🌳 Constructing Merkle Tree...");
    // 1. Generate commitment
    const commitment = await generateCommitment(secret);
    console.log("   Commitment:", commitment.toString());
    
    // 2. Generate Merkle proof (Simulated 1-voter tree for simplicity if list empty)
    const leaves = voterCommitments.length > 0 ? voterCommitments : [commitment];
    const { pathElements, pathIndices, root } = generateMerkleProof(leaves, voterIndex, poseidon);

    // 3. Generate Nullifier
    const nullifier = await generateNullifier(secret, proposalId);

    // 4. Prepare Input Object
    const input = {
        root: root.toString(),
        proposalId: proposalId.toString(),
        voteChoice: voteChoice.toString(),
        secret: secret.toString(),
        pathElements: pathElements.map(e => e.toString()),
        pathIndices: pathIndices.map(e => e.toString())
    };

    console.log("\n📝 Circuit Inputs:");
    console.log(`   Root: ${input.root.slice(0, 10)}...`);
    console.log(`   Nullifier: ${nullifier.toString()}`);
    console.log(`   Proposal: ${input.proposalId}`);
    console.log(`   Choice: ${input.voteChoice}`);

    // 5. Generate Proof
    console.log("\n🔐 Calculating Proof (this may take a few seconds)...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        WASM_PATH,
        ZKEY_PATH
    );

    console.log("✅ Proof generated!");

    return { 
        proof, 
        publicSignals, 
        nullifier: nullifier.toString(),
        root: root.toString()
    };
}

/**
 * Verify a proof (for testing purposes)
 */
async function verifyProof(proof, publicSignals) {
    if (!fs.existsSync(VKEY_PATH)) {
        throw new Error(`Verification key not found at ${VKEY_PATH}`);
    }
    const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return isValid;
}

/**
 * Export proof to Solidity-compatible format
 */
async function exportSolidityCallData(proof, publicSignals) {
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    return calldata;
}

// =========================================================
// 4. MAIN EXECUTION (CLI)
// =========================================================

async function main() {
    try {
        // Example Data for manual run
        const VOTER_SECRET = "123456";
        const PROPOSAL_ID = "1";
        const VOTE_YES = "1";

        const result = await generateVoteProof(VOTER_SECRET, PROPOSAL_ID, VOTE_YES);

        console.log("\n---------------------------------------------------");
        console.log(`Nullifier (Public Output): ${result.publicSignals[0]}`);
        console.log("---------------------------------------------------");

        // Verify immediately
        const isValid = await verifyProof(result.proof, result.publicSignals);
        console.log(`Verification Check: ${isValid ? "PASS ✅" : "FAIL ❌"}`);

        // Export solidity data
        const solData = await exportSolidityCallData(result.proof, result.publicSignals);
        console.log("\nSolidity Calldata:");
        console.log(solData);

        // Save to build folder for reference
        fs.writeFileSync(PROOF_OUTPUT_PATH, JSON.stringify(result.proof, null, 2));
        fs.writeFileSync(PUBLIC_OUTPUT_PATH, JSON.stringify(result.publicSignals, null, 2));
        console.log(`\n📄 Proof saved to: ${PROOF_OUTPUT_PATH}`);

    } catch (error) {
        console.error("\n❌ Error generating proof:", error);
        process.exit(1);
    }
}

// Run if called directly via CLI
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

// Export for usage in tests/frontend
module.exports = {
    generateVoteProof,
    generateCommitment,
    generateNullifier,
    verifyProof,
    exportSolidityCallData
};