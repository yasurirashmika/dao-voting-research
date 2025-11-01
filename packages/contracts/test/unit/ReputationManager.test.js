const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationManager Unit Tests", function () {
  let reputationManager;
  let owner, updater1, updater2, user1, user2, user3;

  beforeEach(async function () {
    [owner, updater1, updater2, user1, user2, user3] = await ethers.getSigners();

    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationManager = await ReputationManager.deploy(owner.address);
    await reputationManager.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await reputationManager.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await reputationManager.MAX_REPUTATION()).to.equal(1000);
      expect(await reputationManager.MIN_REPUTATION()).to.equal(1);
      expect(await reputationManager.DEFAULT_REPUTATION()).to.equal(50);
    });
  });

  describe("Reputation Updater Management", function () {
    it("Should allow owner to add reputation updater", async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      expect(await reputationManager.reputationUpdaters(updater1.address)).to.be.true;
    });

    it("Should emit ReputationUpdaterAdded event", async function () {
      await expect(reputationManager.addReputationUpdater(updater1.address))
        .to.emit(reputationManager, "ReputationUpdaterAdded")
        .withArgs(updater1.address);
    });

    it("Should allow owner to remove reputation updater", async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.removeReputationUpdater(updater1.address);
      expect(await reputationManager.reputationUpdaters(updater1.address)).to.be.false;
    });

    it("Should not allow non-owner to add updater", async function () {
      await expect(
        reputationManager.connect(user1).addReputationUpdater(updater1.address)
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");
    });

    it("Should not allow adding zero address as updater", async function () {
      await expect(
        reputationManager.addReputationUpdater(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid updater address");
    });

    it("Should not allow double addition of updater", async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await expect(
        reputationManager.addReputationUpdater(updater1.address)
      ).to.be.revertedWith("Already a reputation updater");
    });
  });

  describe("Reputation Initialization", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
    });

    it("Should initialize reputation with default score", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      
      const score = await reputationManager.getReputationScore(user1.address);
      const hasActive = await reputationManager.hasActiveReputation(user1.address);
      
      expect(score).to.equal(50);
      expect(hasActive).to.be.true;
    });

    it("Should emit UserActivated and ReputationUpdated events", async function () {
      const timestamp = await getCurrentTimestamp();
      await expect(reputationManager.connect(updater1).initializeReputation(user1.address))
        .to.emit(reputationManager, "UserActivated")
        .withArgs(user1.address)
        .and.to.emit(reputationManager, "ReputationUpdated")
        .withArgs(user1.address, 50, timestamp + 1);
    });

    it("Should not allow non-updater to initialize", async function () {
      await expect(
        reputationManager.connect(user1).initializeReputation(user2.address)
      ).to.be.revertedWith("Not authorized to update reputation");
    });

    it("Should not allow initializing zero address", async function () {
      await expect(
        reputationManager.connect(updater1).initializeReputation(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid user address");
    });

    it("Should not allow double initialization", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      await expect(
        reputationManager.connect(updater1).initializeReputation(user1.address)
      ).to.be.revertedWith("User already has reputation");
    });
  });

  describe("Reputation Updates", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);
    });

    it("Should update reputation score", async function () {
      await reputationManager.connect(updater1).updateReputation(user1.address, 750);
      
      const score = await reputationManager.getReputationScore(user1.address);
      expect(score).to.equal(750);
    });

    it("Should emit ReputationUpdated event", async function () {
      const timestamp = await getCurrentTimestamp();
      await expect(reputationManager.connect(updater1).updateReputation(user1.address, 750))
        .to.emit(reputationManager, "ReputationUpdated")
        .withArgs(user1.address, 750, timestamp + 1); // +1 for next block
    });

    it("Should not allow updating uninitialized user", async function () {
      await expect(
        reputationManager.connect(updater1).updateReputation(user2.address, 750)
      ).to.be.revertedWith("User reputation not initialized");
    });

    it("Should not allow score below minimum", async function () {
      await expect(
        reputationManager.connect(updater1).updateReputation(user1.address, 0)
      ).to.be.revertedWith("Score out of range");
    });

    it("Should not allow score above maximum", async function () {
      await expect(
        reputationManager.connect(updater1).updateReputation(user1.address, 1001)
      ).to.be.revertedWith("Score out of range");
    });

    it("Should allow owner to update even without updater role", async function () {
      await reputationManager.connect(owner).updateReputation(user1.address, 800);
      
      const score = await reputationManager.getReputationScore(user1.address);
      expect(score).to.equal(800);
    });
  });

  describe("Batch Operations", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      await reputationManager.connect(updater1).initializeReputation(user2.address);
      await reputationManager.connect(updater1).initializeReputation(user3.address);
    });

    it("Should batch update multiple users", async function () {
      const users = [user1.address, user2.address, user3.address];
      const scores = [100, 500, 900];

      await reputationManager.connect(updater1).batchUpdateReputation(users, scores);

      expect(await reputationManager.getReputationScore(user1.address)).to.equal(100);
      expect(await reputationManager.getReputationScore(user2.address)).to.equal(500);
      expect(await reputationManager.getReputationScore(user3.address)).to.equal(900);
    });

    it("Should reject batch update with mismatched arrays", async function () {
      const users = [user1.address, user2.address];
      const scores = [100]; // Different length

      await expect(
        reputationManager.connect(updater1).batchUpdateReputation(users, scores)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should emit events for each batch update", async function () {
      const users = [user1.address, user2.address];
      const scores = [200, 300];

      const tx = await reputationManager.connect(updater1).batchUpdateReputation(users, scores);
      const receipt = await tx.wait();

      // Should have 2 ReputationUpdated events
      const events = receipt.events.filter(e => e.event === "ReputationUpdated");
      expect(events).to.have.length(2);
    });
  });

  describe("User Activation/Deactivation", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);
    });

    it("Should deactivate user", async function () {
      await reputationManager.connect(updater1).deactivateUser(user1.address);

      expect(await reputationManager.hasActiveReputation(user1.address)).to.be.false;
      expect(await reputationManager.getReputationScore(user1.address)).to.equal(0);
    });

    it("Should emit UserDeactivated event", async function () {
      await expect(reputationManager.connect(updater1).deactivateUser(user1.address))
        .to.emit(reputationManager, "UserDeactivated")
        .withArgs(user1.address);
    });

    it("Should reactivate user", async function () {
      await reputationManager.connect(updater1).deactivateUser(user1.address);
      await reputationManager.connect(updater1).reactivateUser(user1.address);

      expect(await reputationManager.hasActiveReputation(user1.address)).to.be.true;
    });

    it("Should not deactivate already inactive user", async function () {
      await reputationManager.connect(updater1).deactivateUser(user1.address);
      
      await expect(
        reputationManager.connect(updater1).deactivateUser(user1.address)
      ).to.be.revertedWith("User already inactive");
    });

    it("Should not reactivate already active user", async function () {
      await expect(
        reputationManager.connect(updater1).reactivateUser(user1.address)
      ).to.be.revertedWith("User already active");
    });
  });

  describe("Reputation Weight Calculation", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
    });

    it("Should calculate correct weight for minimum reputation", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      await reputationManager.connect(updater1).updateReputation(user1.address, 1);

      const weight = await reputationManager.getReputationWeight(user1.address);
      expect(weight).to.equal(100); // 1% in basis points
    });

    it("Should calculate correct weight for maximum reputation", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      await reputationManager.connect(updater1).updateReputation(user1.address, 1000);

      const weight = await reputationManager.getReputationWeight(user1.address);
      expect(weight).to.equal(10000); // 100% in basis points
    });

    it("Should calculate correct weight for default reputation", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);

      const weight = await reputationManager.getReputationWeight(user1.address);
      // Default reputation is 50, so weight = 100 + ((50-1) * 9900) / 999 = 100 + (49 * 9900) / 999 = 100 + 485100 / 999 = 100 + 485 = 585
      expect(weight).to.equal(585);
    });

    it("Should return zero weight for inactive user", async function () {
      await reputationManager.connect(updater1).initializeReputation(user1.address);
      await reputationManager.connect(updater1).deactivateUser(user1.address);

      const weight = await reputationManager.getReputationWeight(user1.address);
      expect(weight).to.equal(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);
    });

    it("Should return correct reputation data", async function () {
      await reputationManager.connect(updater1).updateReputation(user1.address, 750);

      const [score, lastUpdated, isActive] = await reputationManager.getReputationData(user1.address);
      
      expect(score).to.equal(750);
      expect(isActive).to.be.true;
      expect(lastUpdated).to.be.gt(0);
    });

    it("Should return zero score for non-existent user", async function () {
      const score = await reputationManager.getReputationScore(user2.address);
      expect(score).to.equal(0);
    });

    it("Should return false for non-existent user active status", async function () {
      const hasActive = await reputationManager.hasActiveReputation(user2.address);
      expect(hasActive).to.be.false;
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-updater/non-owner to update reputation", async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);

      await expect(
        reputationManager.connect(user2).updateReputation(user1.address, 500)
      ).to.be.revertedWith("Not authorized to update reputation");
    });

    it("Should not allow non-updater/non-owner to initialize reputation", async function () {
      await expect(
        reputationManager.connect(user1).initializeReputation(user2.address)
      ).to.be.revertedWith("Not authorized to update reputation");
    });

    it("Should not allow non-updater/non-owner to deactivate user", async function () {
      await reputationManager.addReputationUpdater(updater1.address);
      await reputationManager.connect(updater1).initializeReputation(user1.address);

      await expect(
        reputationManager.connect(user2).deactivateUser(user1.address)
      ).to.be.revertedWith("Not authorized to update reputation");
    });
  });

  // Helper function to get current timestamp
  async function getCurrentTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});