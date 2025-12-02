pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template PrivateVote(levels) {
    signal input root;
    signal input proposalId;
    signal input voteChoice;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output nullifier;

    signal voteSquared;
    voteSquared <== voteChoice * voteChoice;
    voteChoice === voteSquared;

    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== secret;
    signal commitment;
    commitment <== commitmentHasher.out;

    component merkleHashers[levels];
    signal currentHash[levels + 1];
    currentHash[0] <== commitment;

    for (var i = 0; i < levels; i++) {
        component indexBit = Num2Bits(1);
        indexBit.in <== pathIndices[i];

        merkleHashers[i] = Poseidon(2);
        
        signal leftChild;
        signal rightChild;
        
        leftChild <== currentHash[i] - indexBit.out[0] * (currentHash[i] - pathElements[i]);
        rightChild <== pathElements[i] - indexBit.out[0] * (pathElements[i] - currentHash[i]);
        
        merkleHashers[i].inputs[0] <== leftChild;
        merkleHashers[i].inputs[1] <== rightChild;

        currentHash[i + 1] <== merkleHashers[i].out;
    }

    root === currentHash[levels];

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== proposalId;
    nullifier <== nullifierHasher.out;

    signal voteBinding;
    component voteBindingHasher = Poseidon(3);
    voteBindingHasher.inputs[0] <== nullifier;
    voteBindingHasher.inputs[1] <== voteChoice;
    voteBindingHasher.inputs[2] <== proposalId;
    voteBinding <== voteBindingHasher.out;
}

component main {public [root, proposalId, voteChoice]} = PrivateVote(20);