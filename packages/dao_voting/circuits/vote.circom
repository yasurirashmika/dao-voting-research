pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

// Note: We are using the direct implementation to avoid import complexity inside the loop
template PrivateVote(levels) {
    // --- Inputs ---
    signal input root;              // Public: Merkle Root
    signal input proposalId;        // Public: Proposal ID
    signal input voteChoice;        // Public: 0 or 1
    
    
    signal input secret;            // Private: Voter's Secret
    signal input pathElements[levels]; // Private: Merkle Proof
    signal input pathIndices[levels];  // Private: Merkle Path

    signal output nullifier;

    // --- 1. Validate Vote Choice (Must be 0 or 1) ---
    signal voteSquared;
    voteSquared <== voteChoice * voteChoice;
    voteChoice === voteSquared;

    // --- 2. Generate Commitment ---
    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== secret;
    signal commitment;
    commitment <== commitmentHasher.out;

    // --- 3. Verify Merkle Proof (Identity Check) ---
    component merkleHashers[levels];
    component indexBits[levels];
    signal leftChild[levels];
    signal rightChild[levels];
    
    signal currentHash[levels + 1];
    currentHash[0] <== commitment;

    for (var i = 0; i < levels; i++) {
        // Convert index (0 or 1) to bits
        indexBits[i] = Num2Bits(1);
        indexBits[i].in <== pathIndices[i];

        merkleHashers[i] = Poseidon(2);
        
        // Swapping logic
        leftChild[i] <== currentHash[i] - indexBits[i].out[0] * (currentHash[i] - pathElements[i]);
        rightChild[i] <== pathElements[i] - indexBits[i].out[0] * (pathElements[i] - currentHash[i]);
        
        merkleHashers[i].inputs[0] <== leftChild[i];
        merkleHashers[i].inputs[1] <== rightChild[i];

        currentHash[i + 1] <== merkleHashers[i].out;
    }

    // Check if calculated root matches public root
    root === currentHash[levels];

    // --- 4. Generate Nullifier (Double Voting Check) ---
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== proposalId;
    nullifier <== nullifierHasher.out;

    // --- 5. Bind Vote to Nullifier (Prevent tampering) ---
    signal voteBinding;
    component voteBindingHasher = Poseidon(3);
    voteBindingHasher.inputs[0] <== nullifier;
    voteBindingHasher.inputs[1] <== voteChoice;
    voteBindingHasher.inputs[2] <== proposalId;
    voteBinding <== voteBindingHasher.out;
}

// depth to 6
component main {public [root, proposalId, voteChoice]} = PrivateVote(6);