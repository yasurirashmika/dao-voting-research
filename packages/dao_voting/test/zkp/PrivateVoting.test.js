const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

describe("PrivateDAOVoting ZKP Integration", function () {
    // Increase timeout for ZK proof generation (can be slow)
    this.timeout(120000);

    let votingContract;
    let verifierContract;
    let owner;
    let voter;
    let poseidon;

    // Paths to circuit artifacts
    const BUILD_DIR = path.join(__dirname, "../../circuits/build/vote");
    const WASM_PATH = path.join(BUILD_DIR, "vote_js/vote.wasm");
    const ZKEY_PATH = path.join(BUILD_DIR, "vote_final.zkey");

    before(async function () {
        poseidon = await buildPoseidon();
    });

    beforeEach(async function () {
        [owner, voter] = await ethers.getSigners();

        // 1. Deploy Verifier
        // FIX: The contract name inside VoteVerifier.sol is "Groth16Verifier"
        const Verifier = await ethers.getContractFactory("Groth16Verifier");
        verifierContract = await Verifier.deploy();
        await verifierContract.waitForDeployment();

        // 2. Deploy Voting Contract
        const PrivateDAOVoting = await ethers.getContractFactory("PrivateDAOVoting");
        votingContract = await PrivateDAOVoting.deploy(await verifierContract.getAddress(), owner.address);
        await votingContract.waitForDeployment();
    });

    // Helper: Hash function matching the circuit (Poseidon)
    function hash(inputs) {
        return BigInt(poseidon.F.toString(poseidon(inputs)));
    }

    // Helper: Generate Merkle Proof (Simplified for testing)
    function generateMerkleProof(leaves, index) {
        // We create a sparse tree for testing where other leaves are 0
        const pathElements = new Array(20).fill(0n);
        const pathIndices = new Array(20).fill(0);
        
        let curr = index;
        for (let i = 0; i < 20; i++) {
            pathIndices[i] = curr % 2;
            curr = Math.floor(curr / 2);
        }
        
        // Calculate root manually
        let currentLevelHash = leaves[index];
        for (let i = 0; i < 20; i++) {
             if (pathIndices[i] === 0) {
                 // Sibling is right
                 currentLevelHash = hash([currentLevelHash, BigInt(0)]);
             } else {
                 // Sibling is left
                 currentLevelHash = hash([BigInt(0), currentLevelHash]);
             }
        }
        
        return { pathElements, pathIndices, root: currentLevelHash };
    }

    it("Should execute a full private voting cycle with Real ZK Proofs", async function () {
        console.log("\n   🗳️  Starting ZKP Vote Cycle...");

        // --- 1. Setup Proposal & Voter ---
        const secret = 123456n;
        const commitment = hash([secret]);
        
        // Generate Merkle Proof for the voter
        const { root, pathElements, pathIndices } = generateMerkleProof([commitment], 0);

        // Update Contract Root (Register the voter set)
        const rootHex = "0x" + root.toString(16).padStart(64, "0");
        await votingContract.updateVoterSetRoot(rootHex);

        // Create Proposal
        await votingContract.submitProposal("ZKP Test Proposal", "Testing integration");
        const proposalId = 1;

        // Move time forward to start voting period
        await ethers.provider.send("evm_increaseTime", [3601]); // +1 hour
        await ethers.provider.send("evm_mine");
        await votingContract.startVoting(proposalId);

        // --- 2. Generate ZKP Proof (Off-Chain) ---
        console.log("   🔐 Generating Proof (this may take a moment)...");
        const voteChoice = 1; // Yes
        
        const input = {
            root: root.toString(),
            proposalId: proposalId.toString(),
            voteChoice: voteChoice.toString(),
            secret: secret.toString(),
            pathElements: pathElements.map(e => e.toString()),
            pathIndices: pathIndices.map(e => e.toString())
        };

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            WASM_PATH,
            ZKEY_PATH
        );

        // --- 3. Format Proof for Solidity ---
        const pA = [proof.pi_a[0], proof.pi_a[1]];
        const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const pC = [proof.pi_c[0], proof.pi_c[1]];
        const pubSignals = publicSignals; // [nullifier, root, proposalId, voteChoice]

        const nullifier = pubSignals[0];
        const nullifierHex = "0x" + BigInt(nullifier).toString(16).padStart(64, "0");
        
        console.log("   ✅ Proof Generated!");
        console.log("      Nullifier:", nullifier);

        // --- 4. Cast Vote (On-Chain) ---
        console.log("   📡 Submitting Vote to Blockchain...");
        
        await expect(votingContract.castPrivateVote(
            proposalId,
            true, // support = true matches voteChoice 1
            nullifierHex,
            pA,
            pB,
            pC,
            pubSignals
        )).to.emit(votingContract, "PrivateVoteCast")
          .withArgs(proposalId, nullifierHex, true);

        // --- 5. Verify Result ---
        const proposal = await votingContract.proposals(proposalId);
        expect(proposal.yesVotes).to.equal(1);
        console.log("   🎉 Vote Counted Successfully!");
    });

    it("Should prevent double voting using Nullifiers", async function () {
        // Setup same voter again
        const secret = 999n;
        const commitment = hash([secret]);
        const { root, pathElements, pathIndices } = generateMerkleProof([commitment], 0);
        
        const rootHex = "0x" + root.toString(16).padStart(64, "0");
        await votingContract.updateVoterSetRoot(rootHex);
        await votingContract.submitProposal("Double Vote", "Desc");
        
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine");
        await votingContract.startVoting(1);

        // Generate Proof
        const input = {
            root: root.toString(),
            proposalId: "1",
            voteChoice: "1",
            secret: secret.toString(),
            pathElements: pathElements.map(e => e.toString()),
            pathIndices: pathIndices.map(e => e.toString())
        };

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);

        const pA = [proof.pi_a[0], proof.pi_a[1]];
        const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const pC = [proof.pi_c[0], proof.pi_c[1]];
        const nullifierHex = "0x" + BigInt(publicSignals[0]).toString(16).padStart(64, "0");

        // First Vote -> Success
        await votingContract.castPrivateVote(1, true, nullifierHex, pA, pB, pC, publicSignals);

        // Second Vote -> Fail (Replay Attack)
        await expect(votingContract.castPrivateVote(
            1, true, nullifierHex, pA, pB, pC, publicSignals
        )).to.be.revertedWith("Already voted");
    });
});