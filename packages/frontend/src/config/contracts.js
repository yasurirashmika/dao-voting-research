// src/config/contracts.js (FIXED)
// ⚠️ IMPORTANT: These are Phase 3 (Baseline) addresses
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet - Baseline System (Public Voting)
  11155111: {
    DAOVoting: "0x9079c3be7123deD371509E05037668a77A90AbE9",
    GovernanceToken: "0x054b18F9eFE94Ee819bb93B64e7fDa3f71DCe071",
    ReputationManager: "0x662574C7F70930483B281A5155edF6aE318a9F71",
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