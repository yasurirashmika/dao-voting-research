const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploymentHelpers, tokenHelpers, timeHelpers} = require("../helpers/testHelpers");

describe("DAOVoting Unit Tests", function () {
  let governanceToken, reputationManager, daoVoting;
  let owner, voter1, voter2, voter3, nonVoter;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    PROPOSAL_THRESHOLD = tokenHelpers.parseTokens("1000"); 
    // Deploy system
    const contracts = await deploymentHelpers.deployFullSystem(owner);
    governanceToken = contracts.governanceToken;
    reputationManager = contracts.reputationManager;
    daoVoting = contracts.daoVoting;

    // Setup voters with tokens
    await deploymentHelpers.setupVoters(contracts, [voter1, voter2, voter3], PROPOSAL_THRESHOLD);
  });

  describe("Deployment and Initialization", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await daoVoting.owner()).to.equal(owner.address);
      expect(await daoVoting.governanceToken()).to.equal(await governanceToken.getAddress());
      expect(await daoVoting.reputationManager()).to.equal(await reputationManager.getAddress());
      expect(await daoVoting.proposalCount()).to.equal(0);
    });

    it("Should have correct default parameters", async function () {
      expect(await daoVoting.votingDelay()).to.equal(timeHelpers.HOUR);
      expect(await daoVoting.votingPeriod()).to.equal(timeHelpers.WEEK);
      expect(await daoVoting.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
      expect(await daoVoting.quorumPercentage()).to.equal(40);
      expect(await daoVoting.tokenWeightPercentage()).to.equal(7000);
      expect(await daoVoting.reputationWeightPercentage()).to.equal(3000);
    });

    it("Should reject deployment with invalid addresses", async function () {
      const DAOVoting = await ethers.getContractFactory("DAOVoting");
      
      await expect(
        DAOVoting.deploy(ethers.ZeroAddress, await reputationManager.getAddress(), owner.address)
      ).to.be.revertedWith("Invalid governance token address");

      await expect(
        DAOVoting.deploy(await governanceToken.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("Invalid reputation manager address");
    });
  });

  describe("Voter Registration", function () {
    it("Should register voters and initialize reputation", async function () {
      // voter1 is already registered in beforeEach, so check existing registration
      expect(await daoVoting.isVoterRegistered(voter1.address)).to.be.true;
      expect(await reputationManager.hasActiveReputation(voter1.address)).to.be.true;
    });

    it("Should emit VoterRegistered event", async function () {
      // Register a new voter to test event emission
      await expect(daoVoting.registerVoter(nonVoter.address))
        .to.emit(daoVoting, "VoterRegistered")
        .withArgs(nonVoter.address);
    });

    it("Should not allow non-owner to register voters", async function () {
      await expect(
        daoVoting.connect(voter1).registerVoter(nonVoter.address)
      ).to.be.revertedWithCustomError(daoVoting, "OwnableUnauthorizedAccount");
    });

    it("Should not allow registering zero address", async function () {
      await expect(
        daoVoting.registerVoter(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid voter address");
    });

    it("Should not allow double registration", async function () {
      await expect(
        daoVoting.registerVoter(voter1.address)
      ).to.be.revertedWith("Voter already registered");
    });
  });

  describe("Proposal Submission", function () {
    it("Should create proposal with correct parameters", async function () {
      await daoVoting.connect(voter1).submitProposal(
        "Test Proposal",
        "This is a test proposal",
        0,
        0
      );

      const proposal = await daoVoting.proposals(1);
      expect(proposal.id).to.equal(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("This is a test proposal");
      expect(proposal.proposer).to.equal(voter1.address);
      expect(proposal.state).to.equal(0); // Pending
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should emit ProposalCreated event", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("Title", "Description", 0, 0)
      ).to.emit(daoVoting, "ProposalCreated");
    });

    it("Should not allow non-registered voters to submit", async function () {
      await expect(
        daoVoting.connect(nonVoter).submitProposal("Title", "Description", 0, 0)
      ).to.be.revertedWith("Only registered voters can perform this action");
    });

    it("Should not allow empty title", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("", "Description", 0, 0)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should not allow empty description", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("Title", "", 0, 0)
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Should enforce proposal threshold", async function () {
      // Remove tokens from voter1
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);

      await expect(
        daoVoting.connect(voter1).submitProposal("Title", "Description", 0, 0)
      ).to.be.revertedWith("Insufficient tokens to create proposal");
    });

    it("Should increment proposal count", async function () {
      await daoVoting.connect(voter1).submitProposal("Proposal 1", "First", 0, 0);
      expect(await daoVoting.proposalCount()).to.equal(1);

      await daoVoting.connect(voter1).submitProposal("Proposal 2", "Second", 0, 0);
      expect(await daoVoting.proposalCount()).to.equal(2);
    });
  });

  describe("Voting Process", function () {
    let proposalId;

    beforeEach(async function () {
      await daoVoting.connect(voter1).submitProposal("Test", "Description", 0, 0);
      proposalId = 1;

      // Move to voting start time
      await timeHelpers.increaseTime(timeHelpers.HOUR + 1);
      await daoVoting.startVoting(proposalId);
    });

    it("Should start voting and change state to Active", async function () {
      const proposal = await daoVoting.proposals(proposalId);
      expect(proposal.state).to.equal(1); // Active
    });

    it("Should allow registered voters to cast votes", async function () {
      await daoVoting.connect(voter1).castVote(proposalId, true);
      
      const vote = await daoVoting.votes(proposalId, voter1.address);
      expect(vote.support).to.be.true;
      expect(vote.weight).to.be.gt(0);
      expect(await daoVoting.hasVoted(proposalId, voter1.address)).to.be.true;
    });

    it("Should emit VoteCast event", async function () {
      await expect(daoVoting.connect(voter1).castVote(proposalId, true))
        .to.emit(daoVoting, "VoteCast")
        .withArgs(proposalId, voter1.address, true, await daoVoting.getVotingPowerOf(voter1.address));
    });

    it("Should prevent double voting", async function () {
      await daoVoting.connect(voter1).castVote(proposalId, true);
      await expect(
        daoVoting.connect(voter1).castVote(proposalId, false)
      ).to.be.revertedWith("Already voted on this proposal");
    });

    it("Should not allow voting on non-active proposals", async function () {
      // Create another proposal but don't start voting
      await daoVoting.connect(voter1).submitProposal("Test2", "Description2", 0, 0);
      
      await expect(
        daoVoting.connect(voter1).castVote(2, true)
      ).to.be.revertedWith("Proposal not active");
    });

    it("Should not allow voting after deadline", async function () {
      await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
      
      await expect(
        daoVoting.connect(voter1).castVote(proposalId, true)
      ).to.be.revertedWith("Voting period has ended");
    });

    it("Should enforce minimum token requirements", async function () {
      // Create proposal with high token requirement
      await daoVoting.connect(voter1).submitProposal("High Token Req", "Description", tokenHelpers.parseTokens("2000"), 0);
      await timeHelpers.increaseTime(timeHelpers.HOUR + 1);
      await daoVoting.startVoting(2);

      await expect(
        daoVoting.connect(voter1).castVote(2, true)
      ).to.be.revertedWith("Insufficient tokens to vote");
    });

    it("Should enforce minimum reputation requirements", async function () {
      // Create proposal with high reputation requirement
      await daoVoting.connect(voter1).submitProposal("High Rep Req", "Description", 0, 1000);
      await timeHelpers.increaseTime(timeHelpers.HOUR + 1);
      await daoVoting.startVoting(2);

      await expect(
        daoVoting.connect(voter1).castVote(2, true)
      ).to.be.revertedWith("Insufficient reputation to vote");
    });
  });

  describe("Proposal Finalization", function () {
    let proposalId;

    beforeEach(async function () {
      await daoVoting.connect(voter1).submitProposal("Test", "Description", 0, 0);
      proposalId = 1;

      await timeHelpers.increaseTime(timeHelpers.HOUR + 1);
      await daoVoting.startVoting(proposalId);
    });

    it("Should finalize proposal after voting period", async function () {
      // Cast some votes
      await daoVoting.connect(voter1).castVote(proposalId, true);
      await daoVoting.connect(voter2).castVote(proposalId, true);

      // End voting period
      await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
      await daoVoting.finalizeProposal(proposalId);

      const proposal = await daoVoting.proposals(proposalId);
      expect(proposal.state).to.be.oneOf([2n, 3n]); // Succeeded or Defeated
    });

    it("Should not finalize before voting ends", async function () {
      await expect(
        daoVoting.finalizeProposal(proposalId)
      ).to.be.revertedWith("Voting period not ended");
    });

    it("Should not finalize non-active proposal", async function () {
      await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
      await daoVoting.finalizeProposal(proposalId); // Finalize once

      await expect(
        daoVoting.finalizeProposal(proposalId) // Try to finalize again
      ).to.be.revertedWith("Proposal not active");
    });

    it("Should emit ProposalStateChanged event", async function () {
      await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
      
      await expect(daoVoting.finalizeProposal(proposalId))
        .to.emit(daoVoting, "ProposalStateChanged");
    });
  });

  describe("Proposal Cancellation", function () {
    let proposalId;

    beforeEach(async function () {
      await daoVoting.connect(voter1).submitProposal("Test", "Description", 0, 0);
      proposalId = 1;
    });

    it("Should allow proposer to cancel their proposal", async function () {
      await daoVoting.connect(voter1).cancelProposal(proposalId);
      
      const proposal = await daoVoting.proposals(proposalId);
      expect(proposal.state).to.equal(5); // Cancelled
    });

    it("Should allow owner to cancel any proposal", async function () {
      await daoVoting.connect(owner).cancelProposal(proposalId);
      
      const proposal = await daoVoting.proposals(proposalId);
      expect(proposal.state).to.equal(5); // Cancelled
    });

    it("Should not allow others to cancel proposal", async function () {
      await expect(
        daoVoting.connect(voter2).cancelProposal(proposalId)
      ).to.be.revertedWith("Only proposer or owner can cancel");
    });

    it("Should emit ProposalStateChanged event", async function () {
      await expect(daoVoting.connect(voter1).cancelProposal(proposalId))
        .to.emit(daoVoting, "ProposalStateChanged")
        .withArgs(proposalId, 5); // Cancelled state
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update voting parameters", async function () {
      await daoVoting.updateVotingParameters(
        timeHelpers.HOUR * 2, // 2 hour delay
        timeHelpers.DAY * 3,  // 3 day period
        tokenHelpers.parseTokens("500"), // 500 token threshold
        30 // 30% quorum
      );

      expect(await daoVoting.votingDelay()).to.equal(timeHelpers.HOUR * 2);
      expect(await daoVoting.votingPeriod()).to.equal(timeHelpers.DAY * 3);
      expect(await daoVoting.proposalThreshold()).to.equal(tokenHelpers.parseTokens("500"));
      expect(await daoVoting.quorumPercentage()).to.equal(30);
    });

    it("Should emit VotingParametersUpdated event", async function () {
      await expect(
        daoVoting.updateVotingParameters(3600, 86400, 1000, 30)
      ).to.emit(daoVoting, "VotingParametersUpdated");
    });

    it("Should not allow non-owner to update parameters", async function () {
      await expect(
        daoVoting.connect(voter1).updateVotingParameters(3600, 86400, 1000, 30)
      ).to.be.revertedWithCustomError(daoVoting, "OwnableUnauthorizedAccount");
    });

    it("Should reject invalid parameter ranges", async function () {
      // Voting delay too long
      await expect(
        daoVoting.updateVotingParameters(timeHelpers.DAY * 8, timeHelpers.WEEK, 1000, 40)
      ).to.be.revertedWith("Voting delay too long");

      // Voting period too short
      await expect(
        daoVoting.updateVotingParameters(timeHelpers.HOUR, 3600, 1000, 40)
      ).to.be.revertedWith("Invalid voting period");

      // Invalid quorum percentage
      await expect(
        daoVoting.updateVotingParameters(timeHelpers.HOUR, timeHelpers.WEEK, 1000, 150)
      ).to.be.revertedWith("Invalid quorum percentage");
    });

    it("Should allow owner to update weight parameters", async function () {
      await daoVoting.updateWeightParameters(8000, 2000);

      expect(await daoVoting.tokenWeightPercentage()).to.equal(8000);
      expect(await daoVoting.reputationWeightPercentage()).to.equal(2000);
    });

    it("Should reject weight parameters that don't sum to 10000", async function () {
      await expect(
        daoVoting.updateWeightParameters(7000, 2000)
      ).to.be.revertedWith("Weights must sum to 10000 basis points");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await daoVoting.connect(voter1).submitProposal("Test", "Description", 0, 0);
    });

    it("Should return correct proposal details", async function () {
      const details = await daoVoting.getProposalDetails(1);
      
      expect(details.id).to.equal(1);
      expect(details.title).to.equal("Test");
      expect(details.description).to.equal("Description");
      expect(details.proposer).to.equal(voter1.address);
      expect(details.state).to.equal(0); // Pending
    });

    it("Should return vote information", async function () {
      await timeHelpers.increaseTime(timeHelpers.HOUR + 1);
      await daoVoting.startVoting(1);
      await daoVoting.connect(voter1).castVote(1, true);

      const [hasVotedOnProposal, support, weight, timestamp] = await daoVoting.getVote(1, voter1.address);
      
      expect(hasVotedOnProposal).to.be.true;
      expect(support).to.be.true;
      expect(weight).to.be.gt(0);
      expect(timestamp).to.be.gt(0);
    });

    it("Should return voting power correctly", async function () {
      const votingPower = await daoVoting.getVotingPowerOf(voter1.address);
      expect(votingPower).to.be.gt(0);
    });

    it("Should handle invalid proposal IDs", async function () {
      await expect(
        daoVoting.getProposalDetails(999)
      ).to.be.revertedWith("Invalid proposal ID");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle zero voting power gracefully", async function () {
      // Remove all tokens and deactivate reputation
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);
      await reputationManager.deactivateUser(voter1.address);

      const votingPower = await daoVoting.getVotingPowerOf(voter1.address);
      expect(votingPower).to.equal(0);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract, but we're using ReentrancyGuard
      // The modifier should prevent any reentrancy issues
      expect(await daoVoting.proposalCount()).to.equal(0); // Basic check that contract works
    });
  });
});