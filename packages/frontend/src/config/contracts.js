// src/config/contracts.js (UPDATED)
// ⚠️ IMPORTANT: These are Phase 3 (Baseline) addresses
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet - Baseline System (Public Voting)
  11155111: {
    DAOVoting: "0xf29435b12F6494fd782bE3472AF8F6B9eD6E7676",
    GovernanceToken: "0x5aeE1C91651fcC0094fb2e9E6A51afaD9A8AC401",
    ReputationManager: "0x3AE3e68b226005a355F0E3BB039DB463eD88a4dD",
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