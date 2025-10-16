const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceToken Unit Tests", function () {
  let governanceToken;
  let owner, addr1, addr2;
  
  const INITIAL_SUPPLY = ethers.utils.parseEther("100000"); // 100k tokens
  const MAX_SUPPLY = ethers.utils.parseEther("1000000"); // 1M tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "Test Governance Token",
      "TGT",
      owner.address
    );
    await governanceToken.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await governanceToken.name()).to.equal("Test Governance Token");
      expect(await governanceToken.symbol()).to.equal("TGT");
    });

    it("Should set the deployer as owner", async function () {
      expect(await governanceToken.owner()).to.equal(owner.address);
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await governanceToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
      expect(await governanceToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      await governanceToken.mint(addr1.address, mintAmount);
      
      expect(await governanceToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow minting beyond max supply", async function () {
      const excessAmount = MAX_SUPPLY.add(1);
      
      await expect(
        governanceToken.mint(addr1.address, excessAmount)
      ).to.be.revertedWith("Would exceed max supply");
    });

    it("Should not allow non-owner to mint without permission", async function () {
      await expect(
        governanceToken.connect(addr1).mint(addr2.address, 1000)
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should allow authorized minter to mint", async function () {
      await governanceToken.addMinter(addr1.address);
      await governanceToken.connect(addr1).mint(addr2.address, 1000);
      
      expect(await governanceToken.balanceOf(addr2.address)).to.equal(1000);
    });
  });

  describe("Minter Management", function () {
    it("Should add and remove minters", async function () {
      expect(await governanceToken.canMint(addr1.address)).to.be.false;
      
      await governanceToken.addMinter(addr1.address);
      expect(await governanceToken.canMint(addr1.address)).to.be.true;
      
      await governanceToken.removeMinter(addr1.address);
      expect(await governanceToken.canMint(addr1.address)).to.be.false;
    });

    it("Should not allow non-owner to add minters", async function () {
      await expect(
        governanceToken.connect(addr1).addMinter(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Batch Operations", function () {
    it("Should batch mint to multiple recipients", async function () {
      const recipients = [addr1.address, addr2.address];
      const amounts = [1000, 2000];
      
      await governanceToken.batchMint(recipients, amounts);
      
      expect(await governanceToken.balanceOf(addr1.address)).to.equal(1000);
      expect(await governanceToken.balanceOf(addr2.address)).to.equal(2000);
    });

    it("Should reject batch mint with mismatched arrays", async function () {
      const recipients = [addr1.address, addr2.address];
      const amounts = [1000]; // Different length
      
      await expect(
        governanceToken.batchMint(recipients, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("Voting Power", function () {
    it("Should return correct voting power", async function () {
      const mintAmount = ethers.utils.parseEther("5000");
      await governanceToken.mint(addr1.address, mintAmount);
      
      const votingPower = await governanceToken.getVotingPower(addr1.address);
      expect(votingPower).to.equal(mintAmount);
    });
  });

  describe("Token Burns", function () {
    it("Should allow token holders to burn their tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      await governanceToken.mint(addr1.address, mintAmount);
      
      const burnAmount = ethers.utils.parseEther("500");
      await governanceToken.connect(addr1).burn(burnAmount);
      
      expect(await governanceToken.balanceOf(addr1.address)).to.equal(
        mintAmount.sub(burnAmount)
      );
    });
  });
});