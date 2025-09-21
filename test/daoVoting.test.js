const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOVoting Contract", function () {
  let daoVoting;
  let admin;
  let voter1;
  let voter2;
  let nonVoter;

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [admin, voter1, voter2, nonVoter] = await ethers.getSigners();
    
    // Deploy contract - HARDHAT v2 SYNTAX
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy();
    await daoVoting.deployed(); // Use deployed() instead of waitForDeployment()
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      expect(await daoVoting.admin()).to.equal(admin.address);
    });

    it("Should start with zero proposals", async function () {
      expect(await daoVoting.proposalCount()).to.equal(0);
    });
  });

  describe("Voter Registration", function () {
    it("Should allow admin to register voters", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      expect(await daoVoting.voters(voter1.address)).to.be.true;
    });

    it("Should not allow non-admin to register voters", async function () {
      await expect(
        daoVoting.connect(voter1).registerVoter(voter2.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should not allow registering zero address", async function () {
      await expect(
        daoVoting.connect(admin).registerVoter(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid voter address");
    });

    it("Should not allow double registration", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await expect(
        daoVoting.connect(admin).registerVoter(voter1.address)
      ).to.be.revertedWith("Voter already registered");
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow admin to create proposals", async function () {
      await daoVoting.connect(admin).createProposal("Test Proposal", "This is a test");
      expect(await daoVoting.proposalCount()).to.equal(1);
      
      const proposal = await daoVoting.proposals(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("This is a test");
      expect(proposal.isActive).to.be.true;
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should not allow non-admin to create proposals", async function () {
      await expect(
        daoVoting.connect(voter1).createProposal("Test", "Test")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should not allow empty title", async function () {
      await expect(
        daoVoting.connect(admin).createProposal("", "Test description")
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should not allow empty description", async function () {
      await expect(
        daoVoting.connect(admin).createProposal("Test Title", "")
      ).to.be.revertedWith("Description cannot be empty");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting.connect(admin).registerVoter(voter2.address);
      await daoVoting.connect(admin).createProposal("Test Proposal", "Testing voting");
    });

    it("Should allow registered voters to vote YES", async function () {
      await daoVoting.connect(voter1).vote(1, true);
      const proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should allow registered voters to vote NO", async function () {
      await daoVoting.connect(voter1).vote(1, false);
      const proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(1);
    });

    it("Should not allow non-registered users to vote", async function () {
      await expect(
        daoVoting.connect(nonVoter).vote(1, true)
      ).to.be.revertedWith("Only registered voters can vote");
    });

    it("Should not allow double voting", async function () {
      await daoVoting.connect(voter1).vote(1, true);
      await expect(
        daoVoting.connect(voter1).vote(1, false)
      ).to.be.revertedWith("You have already voted on this proposal");
    });

    it("Should not allow voting on invalid proposal", async function () {
      await expect(
        daoVoting.connect(voter1).vote(999, true)
      ).to.be.revertedWith("Invalid proposal ID");
    });

    it("Should not allow voting on inactive proposals", async function () {
      await daoVoting.connect(admin).tallyVotes(1);
      await expect(
        daoVoting.connect(voter1).vote(1, true)
      ).to.be.revertedWith("Proposal is not active");
    });

    it("Should emit VoteCast event", async function () {
      await expect(daoVoting.connect(voter1).vote(1, true))
        .to.emit(daoVoting, "VoteCast")
        .withArgs(1, voter1.address, true);
    });

    it("Should track voting status correctly", async function () {
      expect(await daoVoting.hasUserVoted(1, voter1.address)).to.be.false;
      await daoVoting.connect(voter1).vote(1, true);
      expect(await daoVoting.hasUserVoted(1, voter1.address)).to.be.true;
    });
  });

  describe("Vote Tallying", function () {
    beforeEach(async function () {
      await daoVoting.connect(admin).createProposal("Tally Test", "Testing vote tallying");
    });

    it("Should allow admin to tally votes and close proposal", async function () {
      const proposalId = await daoVoting.proposalCount();
      await expect(daoVoting.connect(admin).tallyVotes(proposalId))
        .to.emit(daoVoting, "ProposalClosed")
        .withArgs(proposalId, 0, 0);
      const proposal = await daoVoting.proposals(proposalId);
      expect(proposal.isActive).to.be.false;
    });

    it("Should not allow non-admin to tally votes", async function () {
      const proposalId = await daoVoting.proposalCount();
      await expect(
        daoVoting.connect(voter1).tallyVotes(proposalId)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should not allow tallying already closed proposals", async function () {
      const proposalId = await daoVoting.proposalCount();
      await daoVoting.connect(admin).tallyVotes(proposalId);
      await expect(
        daoVoting.connect(admin).tallyVotes(proposalId)
      ).to.be.revertedWith("Proposal already closed");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting.connect(admin).createProposal("View Test", "Testing view functions");
    });

    it("Should return proposal details correctly", async function () {
      const [id, title, description, yesVotes, noVotes, isActive, createdAt] =
        await daoVoting.getProposal(1);
      expect(id).to.equal(1);
      expect(title).to.equal("View Test");
      expect(description).to.equal("Testing view functions");
      expect(yesVotes).to.equal(0);
      expect(noVotes).to.equal(0);
      expect(isActive).to.be.true;
      expect(createdAt).to.be.gt(0);
    });

    it("Should check voter registration status", async function () {
      expect(await daoVoting.isVoterRegistered(voter1.address)).to.be.true;
      expect(await daoVoting.isVoterRegistered(voter2.address)).to.be.false;
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete voting flow", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting.connect(admin).registerVoter(voter2.address);
      await daoVoting.connect(admin).createProposal("Integration Test", "Full flow test");
      await daoVoting.connect(voter1).vote(1, true);
      await daoVoting.connect(voter2).vote(1, false);

      let proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(1);
      expect(proposal.isActive).to.be.true;

      await daoVoting.connect(admin).tallyVotes(1);
      proposal = await daoVoting.proposals(1);
      expect(proposal.isActive).to.be.false;
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(1);
    });
  });
});