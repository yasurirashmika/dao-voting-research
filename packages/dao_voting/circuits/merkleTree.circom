pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

/**
 * @title MerkleTreeChecker
 * @dev Verifies Merkle tree membership proof
 */
template MerkleTreeChecker(levels) {
    // Public inputs
    signal input root;              // Merkle root (public)

    // Private inputs
    signal input leaf;              // Voter's commitment (private)
    signal input pathElements[levels];  // Merkle proof path (private)
    signal input pathIndices[levels];   // Merkle proof indices (private)

    // Hash function for Merkle tree
    component hashers[levels];
    component indexBits[levels];

    signal currentHash[levels + 1];
    currentHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Determine if current node is left or right child
        indexBits[i] = Num2Bits(1);
        indexBits[i].in <== pathIndices[i];

        // Hash current node with sibling
        hashers[i] = Poseidon(2);

        // If pathIndices[i] == 0, current is left child
        // If pathIndices[i] == 1, current is right child
        hashers[i].inputs[0] <== currentHash[i] - indexBits[i].out[0] * (currentHash[i] - pathElements[i]);
        hashers[i].inputs[1] <== pathElements[i] - indexBits[i].out[0] * (pathElements[i] - currentHash[i]);

        currentHash[i + 1] <== hashers[i].out;
    }

    // Verify final hash matches root
    root === currentHash[levels];
}

/**
 * @title MerkleTreeInclusionProof
 * @dev Main component for Merkle tree inclusion proof
 */
// depth to 5
component main {public [root]} = MerkleTreeChecker(5);