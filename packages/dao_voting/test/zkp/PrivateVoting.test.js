const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

describe("ZKP Private Voting System", function () {
  let verifier, didRegistry, privateVoting;
  let owner, voter1, voter2, voter3, unauthorized;
  let poseidon;

  // Helper: Generate commitment
  async function generateCommitment(secret) {
    const hash = poseidon.F.toString(poseidon([secret]));
    return BigInt(hash);
  }

  // Helper: Generate nullifier
  async function generateNullifier(secret, proposalId) {
    const hash = poseidon.F.toString(poseidon([secret, proposalId]));
    return BigInt(hash);
  }

  // Helper: Build Merkle tree
  function buildMerkleTree(leaves, levels = 20) {
    let currentLevel = [...leaves];
    const tree = [currentLevel];

    for (let level = 0; level < levels; level++) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : BigInt(0);
        const hash = poseidon.F.toString(poseidon([left, right]));
        nextLevel.push(BigInt(hash));
      }
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0],
      tree,
      levels
    };
  }

  // Helper: Get Merkle proof
  function getMerkleProof(tree, leafIndex) {
    const pathElements = [];
    const pathIndices = [];

    let currentIndex = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = siblingIndex < tree[level].length 
        ? tree[level][siblingIndex] 
        : BigInt(0);

      pathElements.push(sibling);
      pathIndices.push(currentIndex % 2);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  before(async function () {
    this.timeout(60000); // Increase timeout for circuit operations

    // Initialize Poseidon
    poseidon = await buildPoseidon();

    // Get signers
    [owner, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();

    console.log("\n📦 Deploying contracts...");

    // Deploy VoteVerifier
    const VoteVerifier = await ethers.getContractFactory("VoteVerifier");
    verifier = await VoteVerifier.deploy();
    await verifier.waitForDeployment();
    console.log("✅ VoteVerifier deployed");

    // Deploy DIDRegistry
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy(owner.address);
    await didRegistry.waitForDeployment();
    console.log("✅ DIDRegistry deployed");

    // Deploy PrivateDAOVoting
    const PrivateDAOVoting = await ethers.getContractFactory("PrivateDAOVoting");
    privateVoting = await PrivateDAOVoting.deploy(
      await verifier.getAddress(),
      owner.address
    );
    await privateVoting.waitForDeployment();
    console.log("✅ PrivateDAOVoting deployed");
  });

  describe("DID Registry", function () {
    it("Should authorize issuer", async function () {
      await expect(didRegistry.authorizeIssuer(owner.address))
        .to.emit(didRegistry, "IssuerAuthorized")
        .withArgs(owner.address);
    });

    it("Should create DID for voter", async function () {
      await expect(didRegistry.createDID(voter1.address))
        .to.emit(didRegistry, "DIDCreated");

      const didDoc = await didRegistry.getDIDDocument(voter1.address);
      expect(didDoc.isActive).to.be.true;
      expect(didDoc.controller).to.equal(voter1.address);
    });

    it("Should issue credential", async function () {
      const credentialHash = ethers.id("test-credential-voter1");
      const validityPeriod = 365 * 24 * 60 * 60; // 1 year

      await expect(
        didRegistry.issueCredential(
          voter1.address,
          "GovernanceCredential",
          credentialHash,
          validityPeriod
        )
      ).to.emit(didRegistry, "CredentialIssued");

      const isEligible = await didRegistry.verifyVotingEligibility(voter1.address);
      expect(isEligible).to.be.true;
    });

    it("Should reject unauthorized issuer", async function () {
      await expect(
        didRegistry.connect(unauthorized).createDID(voter2.address)
      ).to.be.revertedWith("Not authorized issuer");
    });
  });

  describe("Voter Registration", function () {
    let voterSecrets = [];
    let voterCommitments = [];

    before(async function () {
      // Generate secrets and commitments for 3 voters
      for (let i = 0; i < 3; i++) {
        const secret = BigInt(Math.floor(Math.random() * 1000000));
        voterSecrets.push(secret);
        const commitment = await generateCommitment(secret);
        voterCommitments.push(commitment);
      }
    });

    it("Should register voter commitments", async function () {
      for (let i = 0; i < voterCommitments.length; i++) {
        const commitmentBytes32 = ethers.zeroPadValue(
          ethers.toBeHex(voterCommitments[i]),
          32
        );

        await expect(privateVoting.registerVoter(commitmentBytes32))
          .to.emit(privateVoting, "VoterRegistered")
          .withArgs(commitmentBytes32);
      }
    });

    it("Should reject duplicate commitment", async function () {
      const commitmentBytes32 = ethers.zeroPadValue(
        ethers.toBeHex(voterCommitments[0]),
        32
      );

      await expect(
        privateVoting.registerVoter(commitmentBytes32)
      ).to.be.revertedWith("Already registered");
    });

    it("Should batch register voters", async function () {
      const newSecrets = [BigInt(111111), BigInt(222222)];
      const newCommitments = [];

      for (const secret of newSecrets) {
        const commitment = await generateCommitment(secret);
        newCommitments.push(
          ethers.zeroPadValue(ethers.toBeHex(commitment), 32)
        );
      }

      await privateVoting.batchRegisterVoters(newCommitments);

      // Verify registered
      for (const commitment of newCommitments) {
        const isRegistered = await privateVoting.isCommitmentRegistered(commitment);
        expect(isRegistered).to.be.true;
      }
    });

    it("Should update voter set root", async function () {
      // Build Merkle tree
      const { root } = buildMerkleTree(voterCommitments);
      const rootBytes32 = ethers.zeroPadValue(ethers.toBeHex(root), 32);

      await expect(privateVoting.updateVoterSetRoot(rootBytes32))
        .to.emit(privateVoting, "VoterSetUpdated")
        .withArgs(rootBytes32, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });
  });

  describe("Proposal Creation", function () {
    it("Should create proposal with voter set root", async function () {
      await expect(
        privateVoting.submitProposal(
          "Test Proposal",
          "This is a test proposal for ZKP voting"
        )
      ).to.emit(privateVoting, "ProposalCreated");

      const proposal = await privateVoting.getProposal(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.state).to.equal(0); // Pending
    });

    it("Should reject proposal without voter set", async function () {
      // Deploy new contract without voter set
      const PrivateDAOVoting = await ethers.getContractFactory("PrivateDAOVoting");
      const newVoting = await PrivateDAOVoting.deploy(
        await verifier.getAddress(),
        owner.address
      );

      await expect(
        newVoting.submitProposal("Test", "Description")
      ).to.be.revertedWith("Voter set not initialized");
    });
  });

  describe("Private Voting (Mock - No Actual Proof)", function () {
    // Note: Actual proof generation requires full circuit setup
    // This tests the contract interface

    it("Should start voting on proposal", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      await privateVoting.startVoting(1);

      const proposal = await privateVoting.getProposal(1);
      expect(proposal.state).to.equal(1); // Active
    });

    it("Should reject vote with invalid proof (mock)", async function () {
      // Mock proof data (invalid)
      const mockProof_a = [0, 0];
      const mockProof_b = [[0, 0], [0, 0]];
      const mockProof_c = [0, 0];
      const mockPublicSignals = [0, 1, 1]; // [root, proposalId, voteChoice]
      const mockNullifier = ethers.id("mock-nullifier");

      await expect(
        privateVoting.castPrivateVote(
          1,
          true,
          mockNullifier,
          mockProof_a,
          mockProof_b,
          mockProof_c,
          mockPublicSignals
        )
      ).to.be.reverted; // Will fail proof verification
    });
  });

  describe("Proposal Finalization", function () {
    it("Should finalize proposal after voting ends", async function () {
      // Fast forward past voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600]); // 7 days
      await ethers.provider.send("evm_mine");

      await privateVoting.finalizeProposal(1);

      const proposal = await privateVoting.getProposal(1);
      expect(proposal.state).to.be.oneOf([2, 3]); // Succeeded or Defeated
    });

    it("Should reject finalization before voting ends", async function () {
      // Create new proposal
      await privateVoting.submitProposal("Proposal 2", "Test");
      
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      await privateVoting.startVoting(2);

      await expect(
        privateVoting.finalizeProposal(2)
      ).to.be.revertedWith("Not ended");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to register voters", async function () {
      const commitment = ethers.id("test-commitment");
      await privateVoting.registerVoter(commitment);
    });

    it("Should reject non-owner voter registration", async function () {
      const commitment = ethers.id("unauthorized-commitment");
      
      await expect(
        privateVoting.connect(unauthorized).registerVoter(commitment)
      ).to.be.reverted;
    });

    it("Should allow proposer or owner to cancel", async function () {
      await privateVoting.submitProposal("Cancel Test", "Description");
      const proposalId = await privateVoting.proposalCount();

      await expect(privateVoting.cancelProposal(proposalId))
        .to.emit(privateVoting, "ProposalStateChanged");
    });
  });

  describe("Gas Measurements", function () {
    it("Should measure voter registration gas", async function () {
      const commitment = ethers.id("gas-test-commitment");
      const tx = await privateVoting.registerVoter(commitment);
      const receipt = await tx.wait();

      console.log("\n📊 Gas Usage:");
      console.log(`  Voter Registration: ${receipt.gasUsed.toString()} gas`);
    });

    it("Should measure proposal creation gas", async function () {
      const tx = await privateVoting.submitProposal(
        "Gas Test Proposal",
        "Measuring gas for proposal creation"
      );
      const receipt = await tx.wait();

      console.log(`  Proposal Creation: ${receipt.gasUsed.toString()} gas`);
    });
  });
});