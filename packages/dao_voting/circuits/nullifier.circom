pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template NullifierGenerator() {
    signal input secret;
    signal input proposalId;
    signal output nullifier;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== proposalId;
    
    nullifier <== hasher.out;
}

template CommitmentGenerator() {
    signal input secret;
    signal output commitment;

    component hasher = Poseidon(1);
    hasher.inputs[0] <== secret;
    
    commitment <== hasher.out;
}

component main = NullifierGenerator();