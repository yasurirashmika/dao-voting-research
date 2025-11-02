const { ethers } = require("hardhat");

/**
 * Test helper utilities for DAO testing
 */

// Time manipulation helpers
const timeHelpers = {
  async increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  },

  async increaseTimeTo(timestamp) {
    const currentTime = await this.getCurrentTime();
    const timeDiff = timestamp - currentTime;
    if (timeDiff > 0) {
      await this.increaseTime(timeDiff);
    }
  },

  async getCurrentTime() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  },

  // Common time periods
  HOUR: 3600,
  DAY: 24 * 3600,
  WEEK: 7 * 24 * 3600,
  MONTH: 30 * 24 * 3600,
};

// Token helpers
const tokenHelpers = {
  parseTokens(amount) {
    return ethers.parseEther(amount.toString());
  },

  formatTokens(amount) {
    return ethers.formatEther(amount);
  },

  // Standard test amounts
  THOUSAND: ethers.parseEther("1000"),
  TEN_THOUSAND: ethers.parseEther("10000"),
  HUNDRED_THOUSAND: ethers.parseEther("100000"),
};

// Deployment helpers
const deploymentHelpers = {
  async deployFullSystem(deployer) {
    // Deploy Governance Token
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceToken.deploy(
      "Test DAO Token",
      "TDT",
      deployer.address
    );
    await governanceToken.waitForDeployment(); // v6 syntax

    // Deploy Reputation Manager
    const ReputationManager = await ethers.getContractFactory(
      "ReputationManager"
    );
    const reputationManager = await ReputationManager.deploy(deployer.address);
    await reputationManager.waitForDeployment(); // v6 syntax

    // Deploy DAO Voting
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = await DAOVoting.deploy(
      await governanceToken.getAddress(), // v6 syntax
      await reputationManager.getAddress(), // v6 syntax
      deployer.address
    );
    await daoVoting.waitForDeployment(); // v6 syntax

    // Setup permissions
    await governanceToken.addMinter(await daoVoting.getAddress()); // v6 syntax
    await reputationManager.addReputationUpdater(await daoVoting.getAddress()); // v6 syntax

    return {
      governanceToken,
      reputationManager,
      daoVoting,
    };
  },

  async setupVoters(contracts, voters, tokenAmount = tokenHelpers.THOUSAND) {
    const { governanceToken, daoVoting } = contracts;

    for (const voter of voters) {
      await governanceToken.mint(voter.address, tokenAmount);
      await daoVoting.registerVoter(voter.address);
    }
  },
};

// Proposal helpers
const proposalHelpers = {
  async createAndStartProposal(
    daoVoting,
    proposer,
    title = "Test Proposal",
    description = "Test Description"
  ) {
    await daoVoting.connect(proposer).submitProposal(title, description, 0, 0);

    // Wait for voting delay
    await timeHelpers.increaseTime(timeHelpers.HOUR + 1);

    // Start voting
    const proposalCount = await daoVoting.proposalCount();
    await daoVoting.startVoting(proposalCount);

    return proposalCount;
  },

  async endVotingPeriod(daoVoting, proposalId) {
    await timeHelpers.increaseTime(timeHelpers.WEEK + 1);
    await daoVoting.finalizeProposal(proposalId);
  },
};

// Expectation helpers
const expectHelpers = {
  async expectRevert(promise, errorMessage) {
    const { expect } = await import("chai");
    await expect(promise).to.be.revertedWith(errorMessage);
  },

  async expectEvent(transaction, eventName, args = {}) {
    const { expect } = await import("chai");
    const receipt = await transaction.wait();
    const event = receipt.logs?.find((e) => e.eventName === eventName); // v6 uses logs

    if (!event) {
      throw new Error(`Event ${eventName} not found in transaction`);
    }

    for (const [key, value] of Object.entries(args)) {
      expect(event.args[key]).to.equal(value);
    }
  },
};

// Gas measurement helpers
const gasHelpers = {
  async measureGas(transaction) {
    const receipt = await transaction.wait();
    return receipt.gasUsed;
  },

  async logGasUsage(label, transaction) {
    const gasUsed = await this.measureGas(transaction);
    console.log(`${label}: ${gasUsed.toString()} gas`);
    return gasUsed;
  },
};

// Reputation helpers
const reputationHelpers = {
  MIN_REPUTATION: 1,
  DEFAULT_REPUTATION: 50,
  MAX_REPUTATION: 1000,

  async setReputation(reputationManager, user, score) {
    await reputationManager.updateReputation(user, score);
  },

  async setReputations(reputationManager, users, scores) {
    for (let i = 0; i < users.length; i++) {
      await reputationManager.updateReputation(users[i], scores[i]);
    }
  },
};

module.exports = {
  timeHelpers,
  tokenHelpers,
  deploymentHelpers,
  proposalHelpers,
  expectHelpers,
  gasHelpers,
  reputationHelpers,
};
