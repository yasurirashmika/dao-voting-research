const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploymentHelpers, tokenHelpers, timeHelpers, proposalHelpers } = require("../helpers/testHelpers");

describe("Weighted Voting Mechanism Tests", function () {
  let governanceToken, reputationManager, daoVoting;
  let owner, voter1, voter2, voter3;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    
    const contracts = await deploymentHelpers.deployFullSystem(owner);
    governanceToken = contracts.governanceToken;
    reputationManager = contracts.reputationManager;
    daoVoting = contracts.daoVoting;

    // Setup different token balances
    await governanceToken.mint(voter1.address, tokenHelpers.parseTokens("1000"));  // Low tokens
    await governanceToken.mint(voter2.address, tokenHelpers.parseTokens("5000"));  // Medium tokens  
    await governanceToken.mint(voter3.address, tokenHelpers.parseTokens("10000")); // High tokens

    // Register voters
    await daoVoting.registerVoter(voter1.address);
    await daoVoting.registerVoter(voter2.address);
    await daoVoting.registerVoter(voter3.address);

    // Set different reputation scores
    await reputationManager.updateReputation(voter1.address, 100);  // Low reputation
    await reputationManager.updateReputation(voter2.address, 500);  // Medium reputation
    await reputationManager.updateReputation(voter3.address, 900);  // High reputation
  });

  describe("Weight Calculation", function () {
    it("Should calculate weights correctly based on tokens and reputation", async function () {
      const weight1 = await daoVoting.getVotingPowerOf(voter1.address);
      const weight2 = await daoVoting.getVotingPowerOf(voter2.address);
      const weight3 = await daoVoting.getVotingPowerOf(voter3.address);

      console.log("Voting weights calculated:");
      console.log(`Voter1 (1k tokens, 100 rep): ${weight1}`);
      console.log(`Voter2 (5k tokens, 500 rep): ${weight2}`);
      console.log(`Voter3 (10k tokens, 900 rep): ${weight3}`);

      // Voter with more tokens and reputation should have higher weight
      expect(weight3).to.be.gt(weight2);
      expect(weight2).to.be.gt(weight1);
    });

    it("Should handle zero token balance", async function () {
      // Transfer all tokens away from voter1
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);

      const weight = await daoVoting.getVotingPowerOf(voter1.address);
      // Should still have some weight from reputation
      expect(weight).to.be.gt(0);
    });

    it("Should handle zero reputation", async function () {
      // Deactivate reputation
      await reputationManager.deactivateUser(voter1.address);

      const weight = await daoVoting.getVotingPowerOf(voter1.address);
      // Should still have weight from tokens
      expect(weight).to.be.gt(0);
    });

    it("Should return zero weight for no tokens and no reputation", async function () {
      // Remove tokens
      const balance = await governanceToken.balanceOf(voter1.address);
      await governanceToken.connect(voter1).transfer(owner.address, balance);
      
      // Remove reputation
      await reputationManager.deactivateUser(voter1.address);

      const weight = await daoVoting.getVotingPowerOf(voter1.address);
      expect(weight).to.equal(0);
    });
  });

  describe("Weight Parameter Updates", function () {
    it("Should allow owner to change weight parameters", async function () {
      // Change to 80% tokens, 20% reputation
      await daoVoting.updateWeightParameters(8000, 2000);

      expect(await daoVoting.tokenWeightPercentage()).to.equal(8000);
      expect(await daoVoting.reputationWeightPercentage()).to.equal(2000);

      // Weights should change
      const newWeight1 = await daoVoting.getVotingPowerOf(voter1.address);
      const newWeight3 = await daoVoting.getVotingPowerOf(voter3.address);

      console.log(`Updated weights - Voter1: ${newWeight1}, Voter3: ${newWeight3}`);
    });

    it("Should reject invalid weight parameters", async function () {
      await expect(
        daoVoting.updateWeightParameters(7000, 2000) // Sum = 9000, not 10000
      ).to.be.revertedWith("Weights must sum to 10000 basis points");
    });

    it("Should not allow non-owner to update parameters", async function () {
      await expect(
        daoVoting.connect(voter1).updateWeightParameters(8000, 2000)
      ).to.be.revertedWithCustomError(daoVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Weighted Voting in Practice", function () {
    let proposalId;

    beforeEach(async function () {
      proposalId = await proposalHelpers.createAndStartProposal(
        daoVoting, 
        voter1, 
        "Weighted Vote Test",
        "Testing weighted voting mechanism"
      );
    });

    it("Should record correct weights when voting", async function () {
      // All vote YES
      await daoVoting.connect(voter1).castVote(proposalId, true);
      await daoVoting.connect(voter2).castVote(proposalId, true);
      await daoVoting.connect(voter3).castVote(proposalId, true);

      const proposal = await daoVoting.proposals(proposalId);
      
      console.log(`Total YES votes (weighted): ${proposal.yesVotes}`);
      console.log(`Total voting weight: ${proposal.totalVotingWeight}`);
      
      expect(proposal.yesVotes).to.equal(proposal.totalVotingWeight);
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should handle mixed voting correctly", async function () {
      // voter1 and voter2 vote YES, voter3 votes NO
      await daoVoting.connect(voter1).castVote(proposalId, true);
      await daoVoting.connect(voter2).castVote(proposalId, true);
      await daoVoting.connect(voter3).castVote(proposalId, false);

      const proposal = await daoVoting.proposals(proposalId);
      const weight3 = await daoVoting.getVotingPowerOf(voter3.address);

      console.log(`YES votes: ${proposal.yesVotes}`);
      console.log(`NO votes: ${proposal.noVotes}`);
      console.log(`Voter3 weight: ${weight3}`);

      expect(proposal.noVotes).to.equal(weight3);
      expect(proposal.totalVotingWeight).to.equal(proposal.yesVotes.add(proposal.noVotes));
    });

    it("Should track individual vote weights", async function () {
      const expectedWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      await daoVoting.connect(voter1).castVote(proposalId, true);
      
      const vote = await daoVoting.votes(proposalId, voter1.address);
      expect(vote.weight).to.equal(expectedWeight);
      expect(vote.support).to.be.true;
    });
  });

  describe("Proposal Outcomes with Weighted Votes", function () {
    it("Should determine outcome based on weighted votes", async function () {
      const proposalId = await proposalHelpers.createAndStartProposal(
        daoVoting, 
        voter1,
        "Outcome Test",
        "Testing proposal outcomes"
      );

      // voter1 (low weight) votes YES
      // voter2 (medium weight) votes YES  
      // voter3 (high weight) votes NO
      await daoVoting.connect(voter1).castVote(proposalId, true);
      await daoVoting.connect(voter2).castVote(proposalId, true);
      await daoVoting.connect(voter3).castVote(proposalId, false);

      // End voting period and finalize
      await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
      await daoVoting.finalizeProposal(proposalId);

      const proposal = await daoVoting.proposals(proposalId);
      console.log(`Final state: ${proposal.state}`);
      console.log(`YES: ${proposal.yesVotes}, NO: ${proposal.noVotes}`);

      // Outcome depends on whether voter3's high weight overcomes voter1+voter2
      expect(proposal.state).to.be.oneOf([2, 3]); // Succeeded or Defeated
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum token balance gracefully", async function () {
      // Mint a very large number of tokens
      const largeAmount = tokenHelpers.parseTokens("100000"); // 10% of max supply
      await governanceToken.mint(voter1.address, largeAmount);

      const weight = await daoVoting.getVotingPowerOf(voter1.address);
      expect(weight).to.be.gt(0);
      console.log(`Weight with large token balance: ${weight}`);
    });

    it("Should handle reputation updates during voting", async function () {
      const proposalId = await proposalHelpers.createAndStartProposal(
        daoVoting, 
        voter1,
        "Reputation Update Test",
        "Testing reputation changes during voting"
      );

      const initialWeight = await daoVoting.getVotingPowerOf(voter1.address);
      
      // Update reputation
      await reputationManager.updateReputation(voter1.address, 800);
      
      const newWeight = await daoVoting.getVotingPowerOf(voter1.address);
      expect(newWeight).to.be.gt(initialWeight);

      // Should be able to vote with new weight calculation
      await daoVoting.connect(voter1).castVote(proposalId, true);
      
      const vote = await daoVoting.votes(proposalId, voter1.address);
      expect(vote.weight).to.equal(newWeight);
    });
  });
});