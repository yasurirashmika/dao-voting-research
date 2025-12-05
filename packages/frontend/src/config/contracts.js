// src/config/contracts.js (FIXED)
// ⚠️ IMPORTANT: These are Phase 3 (Baseline) addresses
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet - Baseline System (Public Voting)
  11155111: {
    DAOVoting: "0x951EB6e2af83a0574531D7007Be675cFe75Ab492",
    GovernanceToken: "0xD72AB3c2e7482b39235E06A15e797f0C8b31ddfE",
    ReputationManager: "0xd74591eeB4544BC4bd6BbF5E2BE7b7e8f8BA7ddE",
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