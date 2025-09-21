const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOVoting Contract", function () {
  let daoVoting; // Instance of the deployed contract
  let admin, voter1, voter2, nonVoter; // Test accounts/signers

  const ZERO_ADDRESS = ethers.constants.AddressZero;

  // Deploy a fresh contract before each test
  beforeEach(async function () {
    // Get multiple test accounts
    [admin, voter1, voter2, nonVoter] = await ethers.getSigners();

    // Deploy a new DAOVoting contract
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy();
    await daoVoting.deployed(); // Wait for deployment to complete
  });

  describe("Deployment", function () {
    // Test that deployer becomes admin
    it("Should set the deployer as admin", async function () {
      expect(await daoVoting.admin()).to.equal(admin.address);
    });

    // Test that initially there are no proposals
    it("Should start with zero proposals", async function () {
      expect(await daoVoting.proposalCount()).to.equal(0);
    });
  });

  describe("Voter Registration", function () {
    // Test admin can register a voter
    it("Should allow admin to register voters", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      expect(await daoVoting.registeredVoters(voter1.address)).to.be.true;
    });

    // Test that non-admin cannot register voters
    it("Should not allow non-admin to register voters", async function () {
      await expect(
        daoVoting.connect(voter1).registerVoter(voter2.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    // Test that ZERO_ADDRESS cannot be registered
    it("Should not allow registering zero address", async function () {
      await expect(
        daoVoting.connect(admin).registerVoter(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid voter address");
    });

    // Test double registration fails
    it("Should not allow double registration", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await expect(
        daoVoting.connect(admin).registerVoter(voter1.address)
      ).to.be.revertedWith("Voter already registered");
    });
  });

  describe("Proposal Creation", function () {
    // Test admin can create proposals
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
    });

    it("Should allow any registered voter to submit a proposal", async function () {
      await daoVoting
        .connect(voter1)
        .submitProposal("Test Proposal", "This is a test", 604800); // 7 days duration
      expect(await daoVoting.proposalCount()).to.equal(1);

      const proposal = await daoVoting.proposals(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("This is a test");
      expect(proposal.isActive).to.be.true;
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(0);
      expect(proposal.votingDeadline).to.be.gt(0);
    });

    // Non-registered voters cannot submit
    it("Should not allow non-registered voter to submit proposal", async function () {
      await expect(
        daoVoting.connect(nonVoter).submitProposal("Test", "Test", 3600)
      ).to.be.revertedWith("Only registered voters can perform this action");
    });

    // Title and description must not be empty
    it("Should not allow empty title", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("", "Test description", 3600)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should not allow empty description", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("Test Title", "", 3600)
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Should not allow zero duration", async function () {
      await expect(
        daoVoting.connect(voter1).submitProposal("Title", "Desc", 0)
      ).to.be.revertedWith("Duration must be > 0");
    });
  });

  describe("Voting", function () {
    // Register voters and create proposal before voting tests
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting.connect(admin).registerVoter(voter2.address);
      await daoVoting
        .connect(voter1)
        .submitProposal("Test Proposal", "Testing voting", 604800);
    });

    // Registered voters can vote YES
    it("Should allow registered voters to vote YES", async function () {
      await daoVoting.connect(voter1).castVote(1, true);
      const proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(0);
    });

    // Registered voters can vote NO
    it("Should allow registered voters to vote NO", async function () {
      await daoVoting.connect(voter1).castVote(1, false);
      const proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(1);
    });

    // Non-registered users cannot vote
    it("Should not allow non-registered users to vote", async function () {
      await expect(
        daoVoting.connect(nonVoter).castVote(1, true)
      ).to.be.revertedWith("Only registered voters can perform this action");
    });

    // Prevent double voting
    it("Should not allow double voting", async function () {
      await daoVoting.connect(voter1).castVote(1, true);
      await expect(
        daoVoting.connect(voter1).castVote(1, false)
      ).to.be.revertedWith("You have already voted on this proposal");
    });

    // Voting on invalid proposal ID fails
    it("Should not allow voting on invalid proposal", async function () {
      await expect(
        daoVoting.connect(voter1).castVote(999, true)
      ).to.be.revertedWith("Invalid proposal ID");
    });

    // Voting after deadline fails
    it("Should not allow voting after deadline", async function () {
      const proposal = await daoVoting.proposals(1);
      await ethers.provider.send("evm_increaseTime", [proposal.votingDeadline.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        daoVoting.connect(voter1).castVote(1, true)
      ).to.be.revertedWith("Voting period has ended");
    });

    // Ensure VoteCast event is emitted correctly
    it("Should emit VoteCast event", async function () {
      await expect(daoVoting.connect(voter1).castVote(1, true))
        .to.emit(daoVoting, "VoteCast")
        .withArgs(1, voter1.address, true);
    });

    // Check voting status tracking
    it("Should track voting status correctly", async function () {
      expect(await daoVoting.hasUserVoted(1, voter1.address)).to.be.false;
      await daoVoting.connect(voter1).castVote(1, true);
      expect(await daoVoting.hasUserVoted(1, voter1.address)).to.be.true;
    });
  });

  describe("Vote Tallying / Finalizing", function () {
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting
        .connect(voter1)
        .submitProposal("Tally Test", "Testing vote tallying", 3600);
    });

    // Anyone can finalize after deadline
    it("Should allow anyone to finalize after deadline", async function () {
      const proposal = await daoVoting.proposals(1);
      await ethers.provider.send("evm_increaseTime", [proposal.votingDeadline.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(daoVoting.connect(voter1).finalizeProposal(1))
        .to.emit(daoVoting, "ProposalFinalized")
        .withArgs(1, 0, 0);

      const updatedProposal = await daoVoting.proposals(1);
      expect(updatedProposal.isActive).to.be.false;
    });

    // Cannot finalize before deadline
    it("Should not finalize before deadline", async function () {
      await expect(
        daoVoting.connect(voter1).finalizeProposal(1)
      ).to.be.revertedWith("Voting period not yet ended");
    });

    // Cannot finalize already finalized proposals
    it("Should not finalize already finalized proposals", async function () {
      const proposal = await daoVoting.proposals(1);
      await ethers.provider.send("evm_increaseTime", [proposal.votingDeadline.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);
      await daoVoting.connect(voter1).finalizeProposal(1);

      await expect(
        daoVoting.connect(voter1).finalizeProposal(1)
      ).to.be.revertedWith("Proposal already finalized");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting
        .connect(voter1)
        .submitProposal("View Test", "Testing view functions", 3600);
    });

    // Check getProposal returns correct details
    it("Should return proposal details correctly", async function () {
      const [id, title, description, yesVotes, noVotes, isActive, createdAt, votingDeadline] =
        await daoVoting.getProposalDetails(1);
      expect(id).to.equal(1);
      expect(title).to.equal("View Test");
      expect(description).to.equal("Testing view functions");
      expect(yesVotes).to.equal(0);
      expect(noVotes).to.equal(0);
      expect(isActive).to.be.true;
      expect(createdAt).to.be.gt(0);
      expect(votingDeadline).to.be.gt(0);
    });

    // Check voter registration status
    it("Should check voter registration status", async function () {
      expect(await daoVoting.isVoterRegistered(voter1.address)).to.be.true;
      expect(await daoVoting.isVoterRegistered(voter2.address)).to.be.false;
    });
  });

  describe("Integration Tests", function () {
    // Test a full voting flow from registration to finalize
    it("Should handle complete voting flow", async function () {
      await daoVoting.connect(admin).registerVoter(voter1.address);
      await daoVoting.connect(admin).registerVoter(voter2.address);
      await daoVoting
        .connect(voter1)
        .submitProposal("Integration Test", "Full flow test", 3600);

      await daoVoting.connect(voter1).castVote(1, true);
      await daoVoting.connect(voter2).castVote(1, false);

      let proposal = await daoVoting.proposals(1);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(1);
      expect(proposal.isActive).to.be.true;

      // Fast-forward time beyond deadline
      await ethers.provider.send("evm_increaseTime", [proposal.votingDeadline.toNumber() + 1]);
      await ethers.provider.send("evm_mine", []);

      await daoVoting.connect(voter1).finalizeProposal(1);
      proposal = await daoVoting.proposals(1);

      expect(proposal.isActive).to.be.false;
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(1);
    });
  });
});
