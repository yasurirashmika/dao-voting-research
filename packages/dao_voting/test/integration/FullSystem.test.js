const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full DAO System Integration Tests", function () {
  let governanceToken;
  let reputationManager;
  let daoVoting;
  let owner, voter1, voter2, voter3, nonVoter;

  const INITIAL_SUPPLY = ethers.parseEther("100000");
  const TEST_TOKENS = ethers.parseEther("1000");
  const PROPOSAL_THRESHOLD = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    // Deploy Governance Token
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "Test DAO Token",
      "TDT",
      owner.address
    );
    await governanceToken.waitForDeployment();

    // Deploy Reputation Manager
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationManager = await ReputationManager.deploy(owner.address);
    await reputationManager.waitForDeployment();

    // Deploy DAO Voting
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy(
      await governanceToken.getAddress(),
      await reputationManager.getAddress(),
      owner.address
    );
    await daoVoting.waitForDeployment();

    // Setup permissions
    await governanceToken.addMinter(await daoVoting.getAddress());
    await reputationManager.addReputationUpdater(await daoVoting.getAddress());

    // Distribute tokens and register voters
    await governanceToken.mint(voter1.address, TEST_TOKENS);
    await governanceToken.mint(voter2.address, TEST_TOKENS);
    await governanceToken.mint(voter3.address, TEST_TOKENS);

    await daoVoting.registerVoter(voter1.address);
    await daoVoting.registerVoter(voter2.address);
    await daoVoting.registerVoter(voter3.address);

    // Set different reputation scores for testing weighted voting
    await reputationManager.updateReputation(voter1.address, 100); // Low reputation
    await reputationManager.updateReputation(voter2.address, 500); // Medium reputation
    await reputationManager.updateReputation(voter3.address, 900); // High reputation
  });

  describe("System Integration", function () {
    it("Should deploy all contracts with correct initial state", async function () {
      expect(await governanceToken.name()).to.equal("Test DAO Token");
      expect(await governanceToken.symbol()).to.equal("TDT");
      expect(await governanceToken.totalSupply()).to.equal(INITIAL_SUPPLY + (TEST_TOKENS * 3n));
      
      expect(await reputationManager.owner()).to.equal(owner.address);
      expect(await daoVoting.owner()).to.equal(owner.address);
    });

    it("Should have correct permissions setup", async function () {
      expect(await governanceToken.canMint(await daoVoting.getAddress())).to.be.true;
      expect(await reputationManager.reputationUpdaters(await daoVoting.getAddress())).to.be.true;
    });
  });

  describe("Weighted Voting System", function () {
    beforeEach(async function () {
      // Create a proposal
      await daoVoting.connect(voter1).submitProposal(
        "Test Weighted Voting",
        "Testing the weighted voting mechanism",
        0, // No minimum tokens required
        0  // No minimum reputation required
      );

      // Move time forward to start voting
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine", []);

      // Start voting
      await daoVoting.startVoting(1);
    });

    it("Should calculate correct voting weights", async function () {
      const weight1 = await daoVoting.getVotingPowerOf(voter1.address);
      const weight2 = await daoVoting.getVotingPowerOf(voter2.address);
      const weight3 = await daoVoting.getVotingPowerOf(voter3.address);

      // Higher reputation should result in higher voting power
      expect(weight3).to.be.gt(weight2);
      expect(weight2).to.be.gt(weight1);
      
      console.log(`Voting weights: Voter1: ${weight1}, Voter2: ${weight2}, Voter3: ${weight3}`);
    });

    it("Should record weighted votes correctly", async function () {
      await daoVoting.connect(voter1).castVote(1, true);  // Yes vote
      await daoVoting.connect(voter2).castVote(1, true);  // Yes vote
      await daoVoting.connect(voter3).castVote(1, false); // No vote

      const proposal = await daoVoting.proposals(1);
      
      expect(proposal.yesVotes).to.be.gt(0);
      expect(proposal.noVotes).to.be.gt(0);
      expect(proposal.totalVotingWeight).to.equal(proposal.yesVotes + proposal.noVotes);
    });

    it("Should prevent double voting", async function () {
      await daoVoting.connect(voter1).castVote(1, true);
      
      await expect(
        daoVoting.connect(voter1).castVote(1, false)
      ).to.be.revertedWith("Already voted on this proposal");
    });
  });

  describe("Proposal Lifecycle", function () {
    it("Should handle complete proposal lifecycle", async function () {
      // Create proposal
      await daoVoting.connect(voter1).submitProposal(
        "Lifecycle Test",
        "Testing proposal lifecycle",
        0,
        0
      );

      let proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(0); // Pending

      // Start voting
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      await daoVoting.startVoting(1);
      proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(1); // Active

      // Cast votes
      await daoVoting.connect(voter1).castVote(1, true);
      await daoVoting.connect(voter2).castVote(1, true);
      await daoVoting.connect(voter3).castVote(1, false);

      // End voting period
      await ethers.provider.send("evm_increaseTime", [604801]); // 7 days + 1 second
      await ethers.provider.send("evm_mine", []);

      // Finalize proposal
      await daoVoting.finalizeProposal(1);
      proposal = await daoVoting.proposals(1);
      
      // Should be either succeeded or defeated based on vote weights
      expect(proposal.state).to.be.oneOf([2n, 3n]); // Succeeded or Defeated
    });

    it("Should handle proposal cancellation", async function () {
      await daoVoting.connect(voter1).submitProposal(
        "Cancellation Test",
        "Testing proposal cancellation",
        0,
        0
      );

      // Proposer can cancel their own proposal
      await daoVoting.connect(voter1).cancelProposal(1);
      
      const proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(5); // Cancelled
    });
  });

  describe("Access Controls and Requirements", function () {
    it("Should enforce proposal threshold", async function () {
      // Remove all tokens from voter1
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);

      await expect(
        daoVoting.connect(voter1).submitProposal(
          "Insufficient Tokens",
          "Should fail",
          0,
          0
        )
      ).to.be.revertedWith("Insufficient tokens to create proposal");
    });

    it("Should enforce voting requirements", async function () {
      // Create proposal with high requirements
      await daoVoting.connect(voter1).submitProposal(
        "High Requirements",
        "Testing high voting requirements",
        ethers.parseEther("2000"), // More tokens than any voter has
        1000 // Maximum reputation
      );

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      await daoVoting.startVoting(1);

      // Should fail due to insufficient tokens
      await expect(
        daoVoting.connect(voter1).castVote(1, true)
      ).to.be.revertedWith("Insufficient tokens to vote");

      // Give voter1 enough tokens but they still lack reputation
      await governanceToken.mint(voter1.address, ethers.parseEther("2000"));
      
      await expect(
        daoVoting.connect(voter1).castVote(1, true)
      ).to.be.revertedWith("Insufficient reputation to vote");
    });

    it("Should only allow registered voters to participate", async function () {
      await expect(
        daoVoting.connect(nonVoter).submitProposal(
          "Unauthorized",
          "Should fail",
          0,
          0
        )
      ).to.be.revertedWith("Only registered voters can perform this action");
    });
  });

  describe("Reputation System Integration", function () {
    it("Should automatically initialize reputation for new voters", async function () {
      await daoVoting.registerVoter(nonVoter.address);
      
      const hasReputation = await reputationManager.hasActiveReputation(nonVoter.address);
      const reputationScore = await reputationManager.getReputationScore(nonVoter.address);
      
      expect(hasReputation).to.be.true;
      expect(reputationScore).to.equal(50); // Default reputation
    });

    it("Should affect voting power based on reputation changes", async function () {
      const initialWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      // Increase reputation
      await reputationManager.updateReputation(voter1.address, 800);
      const newWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      expect(newWeight).to.be.gt(initialWeight);
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update voting parameters", async function () {
      await daoVoting.updateVotingParameters(
        7200, // 2 hours voting delay
        86400, // 1 day voting period
        ethers.parseEther("500"), // Lower proposal threshold
        30 // 30% quorum
      );

      expect(await daoVoting.votingDelay()).to.equal(7200);
      expect(await daoVoting.votingPeriod()).to.equal(86400);
      expect(await daoVoting.proposalThreshold()).to.equal(ethers.parseEther("500"));
      expect(await daoVoting.quorumPercentage()).to.equal(30);
    });

    it("Should allow owner to update weight parameters", async function () {
      await daoVoting.updateWeightParameters(
        8000, // 80% token weight
        2000  // 20% reputation weight
      );

      expect(await daoVoting.tokenWeightPercentage()).to.equal(8000);
      expect(await daoVoting.reputationWeightPercentage()).to.equal(2000);
    });

    it("Should reject invalid weight parameters", async function () {
      await expect(
        daoVoting.updateWeightParameters(7000, 2000) // Sum is not 10000
      ).to.be.revertedWith("Weights must sum to 10000 basis points");
    });
  });

  describe("Gas Usage Analysis", function () {
    it("Should measure gas consumption for key operations", async function () {
      // Proposal creation
      const proposalTx = await daoVoting.connect(voter1).submitProposal(
        "Gas Test",
        "Measuring gas usage",
        0,
        0
      );
      const proposalReceipt = await proposalTx.wait();
      console.log(`Proposal creation gas: ${proposalReceipt.gasUsed}`);

      // Start voting
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      const startTx = await daoVoting.startVoting(1);
      const startReceipt = await startTx.wait();
      console.log(`Start voting gas: ${startReceipt.gasUsed}`);

      // Cast vote
      const voteTx = await daoVoting.connect(voter1).castVote(1, true);
      const voteReceipt = await voteTx.wait();
      console.log(`Vote casting gas: ${voteReceipt.gasUsed}`);

      // Finalize proposal
      await ethers.provider.send("evm_increaseTime", [604801]);
      await ethers.provider.send("evm_mine", []);
      
      const finalizeTx = await daoVoting.finalizeProposal(1);
      const finalizeReceipt = await finalizeTx.wait();
      console.log(`Finalize proposal gas: ${finalizeReceipt.gasUsed}`);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero voting power gracefully", async function () {
      // Deactivate reputation and remove tokens
      await reputationManager.deactivateUser(voter1.address);
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);

      const votingPower = await daoVoting.getVotingPowerOf(voter1.address);
      expect(votingPower).to.equal(0);
    });

    it("Should handle proposals with no votes", async function () {
      await daoVoting.connect(voter1).submitProposal(
        "No Votes Test",
        "Testing proposal with no votes",
        0,
        0
      );

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      await daoVoting.startVoting(1);

      // Fast forward past voting period without any votes
      await ethers.provider.send("evm_increaseTime", [604801]);
      await ethers.provider.send("evm_mine", []);

      await daoVoting.finalizeProposal(1);
      const proposal = await daoVoting.proposals(1);
      
      expect(proposal.state).to.equal(3); // Defeated due to no votes/quorum
    });
  });
});