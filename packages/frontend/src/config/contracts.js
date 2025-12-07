// src/config/contracts.js (FIXED)
// ⚠️ IMPORTANT: These are Phase 3 (Baseline) addresses
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet - Baseline System (Public Voting)
  11155111: {
    DAOVoting: "0x070C035eb376B12cD1d3eA0E9D74E0130aE9e47e",
    GovernanceToken: "0xCF77340B958dA7D9ddB0A5976BE7972770d8233e",
    ReputationManager: "0xC46aEfD592d2C4Ab1c5203edA28f3b0cBec3f772",
  },
};

export const getContractAddress = (chainId, contractName) => {
  const network = CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  const address = network[contractName];
  if (!address) {
    throw new Error(
      `Contract ${contractName} not deployed on network ${chainId}`
    );
  }

  return address;
};

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Governance
  SUBMIT_PROPOSAL: "submitProposal",
  CAST_VOTE: "castVote",
  FINALIZE_PROPOSAL: "finalizeProposal",
  CANCEL_PROPOSAL: "cancelProposal",
  START_VOTING: "startVoting",
  GET_PROPOSAL_DETAILS: "getProposalDetails",
  CALCULATE_VOTING_WEIGHT: "calculateVotingWeight",
  GET_VOTING_POWER: "getVotingPowerOf",
  REGISTER_VOTER: "registerVoter",
  IS_VOTER_REGISTERED: "isVoterRegistered",

  // Token
  BALANCE_OF: "balanceOf",
  TOTAL_SUPPLY: "totalSupply",

  // Reputation
  GET_REPUTATION: "getReputation",
};

export const CONTRACT_EVENTS = {
  PROPOSAL_CREATED: "ProposalCreated",
  VOTE_CAST: "VoteCast",
  PROPOSAL_STATE_CHANGED: "ProposalStateChanged",
  VOTER_REGISTERED: "VoterRegistered",
};

export default {
  CONTRACT_ADDRESSES,
  getContractAddress,
  CONTRACT_FUNCTIONS,
  CONTRACT_EVENTS,
};