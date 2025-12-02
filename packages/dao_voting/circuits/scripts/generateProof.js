const snarkjs = require("snarkjs");
const fs = require("fs");
const { buildPoseidon } = require("circomlibjs");

/**
 * Generate Merkle proof for a leaf in the tree
 */
function generateMerkleProof(leaves, leafIndex, levels = 20) {
    const pathElements = [];
    const pathIndices = [];
    
    let currentIndex = leafIndex;
    let currentLevelLeaves = [...leaves];
    
    for (let level = 0; level < levels; level++) {
        const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
        
        // If sibling exists, add it; otherwise use zero
        const sibling = siblingIndex < currentLevelLeaves.length 
            ? currentLevelLeaves[siblingIndex] 
            : BigInt(0);
        
        pathElements.push(sibling);
        pathIndices.push(currentIndex % 2);
        
        // Move up to next level
        currentIndex = Math.floor(currentIndex / 2);
        
        // Hash pairs for next level
        const nextLevel = [];
        for (let i = 0; i < currentLevelLeaves.length; i += 2) {
            const left = currentLevelLeaves[i];
            const right = i + 1 < currentLevelLeaves.length 
                ? currentLevelLeaves[i + 1] 
                : BigInt(0);
            
            // In production, use Poseidon hash
            // For now, simple hash
            nextLevel.push(hashPair(left, right));
        }
        
        currentLevelLeaves = nextLevel;
    }
    
    return { pathElements, pathIndices, root: currentLevelLeaves[0] };
}

/**
 * Hash two elements using Poseidon
 */
async function hashPair(left, right) {
    const poseidon = await buildPoseidon();
    const hash = poseidon.F.toString(poseidon([left, right]));
    return BigInt(hash);
}

/**
 * Generate commitment from secret
 */
async function generateCommitment(secret) {
    const poseidon = await buildPoseidon();
    const commitment = poseidon.F.toString(poseidon([secret]));
    return BigInt(commitment);
}

/**
 * Generate nullifier
 */
async function generateNullifier(secret, proposalId) {
    const poseidon = await buildPoseidon();
    const nullifier = poseidon.F.toString(poseidon([secret, proposalId]));
    return BigInt(nullifier);
}

/**
 * Generate zero-knowledge proof for voting
 * @param {BigInt} secret - Voter's secret
 * @param {BigInt} proposalId - Proposal ID
 * @param {number} voteChoice - 0 (No) or 1 (Yes)
 * @param {Array<BigInt>} voterCommitments - All registered voter commitments
 * @param {number} voterIndex - Index of this voter in the set
 */
async function generateVoteProof(secret, proposalId, voteChoice, voterCommitments, voterIndex) {
    console.log("Generating zero-knowledge proof...");
    
    // 1. Generate commitment
    const commitment = await generateCommitment(secret);
    console.log("Commitment:", commitment.toString());
    
    // 2. Generate Merkle proof
    const { pathElements, pathIndices, root } = generateMerkleProof(
        voterCommitments,
        voterIndex,
        20
    );
    console.log("Merkle root:", root.toString());
    
    // 3. Generate nullifier
    const nullifier = await generateNullifier(secret, proposalId);
    console.log("Nullifier:", nullifier.toString());
    
    // 4. Prepare circuit inputs
    const input = {
        root: root.toString(),
        proposalId: proposalId.toString(),
        voteChoice: voteChoice,
        secret: secret.toString(),
        pathElements: pathElements.map(e => e.toString()),
        pathIndices: pathIndices
    };
    
    console.log("Circuit input prepared");
    
    // 5. Generate witness
    const wasmPath = "circuits/build/vote/vote_js/vote.wasm";
    const zkeyPath = "circuits/build/vote/vote_0001.zkey";
    
    console.log("Calculating witness...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmPath,
        zkeyPath
    );
    
    console.log("Proof generated successfully!");
    
    return {
        proof,
        publicSignals,
        nullifier: nullifier.toString(),
        root: root.toString()
    };
}

/**
 * Verify a proof (for testing)
 */
async function verifyProof(proof, publicSignals) {
    const vkeyPath = "circuits/build/vote/verification_key.json";
    const vKey = JSON.parse(fs.readFileSync(vkeyPath));
    
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return isValid;
}

/**
 * Export proof to Solidity-compatible format
 */
function exportSolidityCallData(proof, publicSignals) {
    const calldata = snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    
    // Parse the call data
    const argv = calldata.split(",");
    
    return {
        a: JSON.parse(argv[0]),
        b: JSON.parse(argv[1]),
        c: JSON.parse(argv[2]),
        input: JSON.parse(argv[3])
    };
}

// Example usage
async function main() {
    // Example: 5 registered voters
    const voterSecrets = [
        BigInt("123456789"),
        BigInt("987654321"),
        BigInt("555555555"),
        BigInt("111111111"),
        BigInt("999999999")
    ];
    
    // Generate commitments for all voters
    const commitments = [];
    for (const secret of voterSecrets) {
        const commitment = await generateCommitment(secret);
        commitments.push(commitment);
    }
    
    console.log("Registered voters:", commitments.length);
    
    // Voter 0 votes on proposal 1 with choice "Yes" (1)
    const voterIndex = 0;
    const voterSecret = voterSecrets[voterIndex];
    const proposalId = BigInt(1);
    const voteChoice = 1; // Yes
    
    const result = await generateVoteProof(
        voterSecret,
        proposalId,
        voteChoice,
        commitments,
        voterIndex
    );
    
    console.log("\n=== Proof Generated ===");
    console.log("Nullifier:", result.nullifier);
    console.log("Root:", result.root);
    
    // Verify proof
    const isValid = await verifyProof(result.proof, result.publicSignals);
    console.log("Proof valid:", isValid);
    
    // Export for Solidity
    const solidityData = exportSolidityCallData(result.proof, result.publicSignals);
    console.log("\n=== Solidity Call Data ===");
    console.log(JSON.stringify(solidityData, null, 2));
    
    // Save to file
    fs.writeFileSync(
        "circuits/build/vote/example_proof.json",
        JSON.stringify({ ...result, solidityData }, null, 2)
    );
    console.log("\nProof saved to: circuits/build/vote/example_proof.json");
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    generateVoteProof,
    verifyProof,
    exportSolidityCallData,
    generateCommitment,
    generateNullifier,
    generateMerkleProof
};