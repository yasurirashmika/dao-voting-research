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

    // Setup permissions - WAIT FOR EACH TRANSACTION
    const addMinterTx = await governanceToken.addMinter(await daoVoting.getAddress());
    await addMinterTx.wait(); // Wait for confirmation
    
    const addReputationUpdaterTx = await reputationManager.addReputationUpdater(await daoVoting.getAddress());
    await addReputationUpdaterTx.wait(); // Wait for confirmation

    // Distribute tokens and register voters - WAIT FOR EACH
    const mintVoter1Tx = await governanceToken.mint(voter1.address, TEST_TOKENS);
    await mintVoter1Tx.wait();
    
    const mintVoter2Tx = await governanceToken.mint(voter2.address, TEST_TOKENS);
    await mintVoter2Tx.wait();
    
    const mintVoter3Tx = await governanceToken.mint(voter3.address, TEST_TOKENS);
    await mintVoter3Tx.wait();

    const registerVoter1Tx = await daoVoting.registerVoter(voter1.address);
    await registerVoter1Tx.wait();
    
    const registerVoter2Tx = await daoVoting.registerVoter(voter2.address);
    await registerVoter2Tx.wait();
    
    const registerVoter3Tx = await daoVoting.registerVoter(voter3.address);
    await registerVoter3Tx.wait();

    // Set different reputation scores for testing weighted voting
    const setVoter1ReputationTx = await reputationManager.updateReputation(voter1.address, 100);
    await setVoter1ReputationTx.wait();
    
    const setVoter2ReputationTx = await reputationManager.updateReputation(voter2.address, 500);
    await setVoter2ReputationTx.wait();
    
    const setVoter3ReputationTx = await reputationManager.updateReputation(voter3.address, 900);
    await setVoter3ReputationTx.wait();
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
      const tx1 = await daoVoting.connect(voter1).submitProposal(
        "Test Weighted Voting",
        "Testing the weighted voting mechanism",
        0, // No minimum tokens required
        0  // No minimum reputation required
      );
      await tx1.wait();

      // Move time forward to start voting
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine", []);

      // Start voting
      const tx2 = await daoVoting.startVoting(1);
      await tx2.wait();
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
      const tx1 = await daoVoting.connect(voter1).castVote(1, true);
      await tx1.wait();
      
      const tx2 = await daoVoting.connect(voter2).castVote(1, true);
      await tx2.wait();
      
      const tx3 = await daoVoting.connect(voter3).castVote(1, false);
      await tx3.wait();

      const proposal = await daoVoting.proposals(1);
      
      expect(proposal.yesVotes).to.be.gt(0);
      expect(proposal.noVotes).to.be.gt(0);
      expect(proposal.totalVotingWeight).to.equal(proposal.yesVotes + proposal.noVotes);
    });

    it("Should prevent double voting", async function () {
      const tx1 = await daoVoting.connect(voter1).castVote(1, true);
      await tx1.wait();
      
      await expect(
        daoVoting.connect(voter1).castVote(1, false)
      ).to.be.revertedWith("Already voted on this proposal");
    });
  });

  describe("Proposal Lifecycle", function () {
    it("Should handle complete proposal lifecycle", async function () {
      // Create proposal
      const tx1 = await daoVoting.connect(voter1).submitProposal(
        "Lifecycle Test",
        "Testing proposal lifecycle",
        0,
        0
      );
      await tx1.wait();

      let proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(0); // Pending

      // Start voting
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      const tx2 = await daoVoting.startVoting(1);
      await tx2.wait();
      
      proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(1); // Active

      // Cast votes
      const tx3 = await daoVoting.connect(voter1).castVote(1, true);
      await tx3.wait();
      
      const tx4 = await daoVoting.connect(voter2).castVote(1, true);
      await tx4.wait();
      
      const tx5 = await daoVoting.connect(voter3).castVote(1, false);
      await tx5.wait();

      // End voting period
      await ethers.provider.send("evm_increaseTime", [604801]); // 7 days + 1 second
      await ethers.provider.send("evm_mine", []);

      // Finalize proposal
      const tx6 = await daoVoting.finalizeProposal(1);
      await tx6.wait();
      
      proposal = await daoVoting.proposals(1);
      
      // Should be either succeeded or defeated based on vote weights
      expect(proposal.state).to.be.oneOf([2n, 3n]); // Succeeded or Defeated
    });

    it("Should handle proposal cancellation", async function () {
      const tx1 = await daoVoting.connect(voter1).submitProposal(
        "Cancellation Test",
        "Testing proposal cancellation",
        0,
        0
      );
      await tx1.wait();

      // Proposer can cancel their own proposal
      const tx2 = await daoVoting.connect(voter1).cancelProposal(1);
      await tx2.wait();
      
      const proposal = await daoVoting.proposals(1);
      expect(proposal.state).to.equal(5); // Cancelled
    });
  });

  describe("Access Controls and Requirements", function () {
    it("Should enforce proposal threshold", async function () {
      // Remove all tokens from voter1
      const balance = await governanceToken.balanceOf(voter1.address);
      const tx1 = await governanceToken.connect(voter1).transfer(owner.address, balance);
      await tx1.wait();

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
      const tx1 = await daoVoting.connect(voter1).submitProposal(
        "High Requirements",
        "Testing high voting requirements",
        ethers.parseEther("2000"), // More tokens than any voter has
        1000 // Maximum reputation
      );
      await tx1.wait();

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      const tx2 = await daoVoting.startVoting(1);
      await tx2.wait();

      // Should fail due to insufficient tokens
      await expect(
        daoVoting.connect(voter1).castVote(1, true)
      ).to.be.revertedWith("Insufficient tokens to vote");

      // Give voter1 enough tokens but they still lack reputation
      const tx3 = await governanceToken.mint(voter1.address, ethers.parseEther("2000"));
      await tx3.wait();
      
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
      const tx1 = await daoVoting.registerVoter(nonVoter.address);
      await tx1.wait();
      
      const hasReputation = await reputationManager.hasActiveReputation(nonVoter.address);
      const reputationScore = await reputationManager.getReputationScore(nonVoter.address);
      
      expect(hasReputation).to.be.true;
      expect(reputationScore).to.equal(50); // Default reputation
    });

    it("Should affect voting power based on reputation changes", async function () {
      const initialWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      // Increase reputation
      const tx1 = await reputationManager.updateReputation(voter1.address, 800);
      await tx1.wait();
      
      const newWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      expect(newWeight).to.be.gt(initialWeight);
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update voting parameters", async function () {
      const tx1 = await daoVoting.updateVotingParameters(
        7200, // 2 hours voting delay
        86400, // 1 day voting period
        ethers.parseEther("500"), // Lower proposal threshold
        30 // 30% quorum
      );
      await tx1.wait();

      expect(await daoVoting.votingDelay()).to.equal(7200);
      expect(await daoVoting.votingPeriod()).to.equal(86400);
      expect(await daoVoting.proposalThreshold()).to.equal(ethers.parseEther("500"));
      expect(await daoVoting.quorumPercentage()).to.equal(30);
    });

    it("Should allow owner to update weight parameters", async function () {
      const tx1 = await daoVoting.updateWeightParameters(
        8000, // 80% token weight
        2000  // 20% reputation weight
      );
      await tx1.wait();

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
      const tx1 = await reputationManager.deactivateUser(voter1.address);
      await tx1.wait();
      
      const balance = await governanceToken.balanceOf(voter1.address);
      const tx2 = await governanceToken.connect(voter1).transfer(owner.address, balance);
      await tx2.wait();

      const votingPower = await daoVoting.getVotingPowerOf(voter1.address);
      expect(votingPower).to.equal(0);
    });

    it("Should handle proposals with no votes", async function () {
      const tx1 = await daoVoting.connect(voter1).submitProposal(
        "No Votes Test",
        "Testing proposal with no votes",
        0,
        0
      );
      await tx1.wait();

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      const tx2 = await daoVoting.startVoting(1);
      await tx2.wait();

      // Fast forward past voting period without any votes
      await ethers.provider.send("evm_increaseTime", [604801]);
      await ethers.provider.send("evm_mine", []);

      const tx3 = await daoVoting.finalizeProposal(1);
      await tx3.wait();
      
      const proposal = await daoVoting.proposals(1);
      
      expect(proposal.state).to.equal(3); // Defeated due to no votes/quorum
    });
  });
});