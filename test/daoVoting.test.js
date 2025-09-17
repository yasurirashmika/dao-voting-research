import { expect } from "chai";
import hre from "hardhat";

describe("DAOVoting Contract", function () {
  let dao;
  let admin;
  let voter1;
  let voter2;

  beforeEach(async function () {
    [admin, voter1, voter2] = await hre.ethers.getSigners();
    const DAOFactory = await hre.ethers.getContractFactory("DAOVoting", admin);
    dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
  });

  it("should register voters", async function () {
    await dao.connect(admin).registerVoter(voter1.address);
    expect(await dao.voters(voter1.address)).to.equal(true);
  });

  it("should create a proposal", async function () {
    await dao.connect(admin).createProposal("Test Proposal", "Testing...");
    const proposal = await dao.proposals(1);
    expect(proposal.title).to.equal("Test Proposal");
  });

  it("should allow voter to vote", async function () {
    await dao.connect(admin).registerVoter(voter1.address);
    await dao.connect(admin).createProposal("Proposal 1", "Test voting");
    await dao.connect(voter1).vote(1, true);

    const proposal = await dao.proposals(1);
    expect(proposal.yesVotes).to.equal(1);
    
  });

   it("should tally votes", async function () {
    await dao.connect(admin).createProposal("Proposal 2", "Test tally");
    // Get the current proposal count to reference the correct proposal
    const proposalCount = await dao.proposalCount();
    await dao.connect(admin).tallyVotes(proposalCount);

    const proposal = await dao.proposals(proposalCount);
    expect(proposal.isActive).to.equal(false);
  });
});

