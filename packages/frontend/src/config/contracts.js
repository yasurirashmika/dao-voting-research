// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet
  11155111: {
    DAOGovernance: process.env.REACT_APP_DAO_GOVERNANCE_CONTRACT || '0x...',
    GovernanceToken: process.env.REACT_APP_GOVERNANCE_TOKEN_CONTRACT || '0x...',
    Treasury: process.env.REACT_APP_TREASURY_CONTRACT || '0x...'
  },
  // Ethereum Mainnet
  1: {
    DAOGovernance: '0x...',
    GovernanceToken: '0x...',
    Treasury: '0x...'
  },
  // Polygon
  137: {
    DAOGovernance: '0x...',
    GovernanceToken: '0x...',
    Treasury: '0x...'
  }
};

// Get contract address by network and contract name
export const getContractAddress = (chainId, contractName) => {
  const network = CONTRACT_ADDRESSES[chainId];
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  
  const address = network[contractName];
  if (!address || address === '0x...') {
    throw new Error(`Contract ${contractName} not deployed on network ${chainId}`);
  }
  
  return address;
};

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Governance
  PROPOSE: 'propose',
  CAST_VOTE: 'castVote',
  CAST_VOTE_WITH_REASON: 'castVoteWithReason',
  EXECUTE: 'execute',
  CANCEL: 'cancel',
  QUEUE: 'queue',
  GET_VOTES: 'getVotes',
  PROPOSAL_STATE: 'state',
  PROPOSAL_VOTES: 'proposalVotes',
  
  // Token
  DELEGATE: 'delegate',
  BALANCE_OF: 'balanceOf',
  TOTAL_SUPPLY: 'totalSupply',
  
  // Treasury
  WITHDRAW: 'withdraw',
  DEPOSIT: 'deposit'
};

// Event names
export const CONTRACT_EVENTS = {
  PROPOSAL_CREATED: 'ProposalCreated',
  VOTE_CAST: 'VoteCast',
  PROPOSAL_EXECUTED: 'ProposalExecuted',
  PROPOSAL_CANCELED: 'ProposalCanceled',
  PROPOSAL_QUEUED: 'ProposalQueued',
  DELEGATE_CHANGED: 'DelegateChanged',
  DELEGATE_VOTES_CHANGED: 'DelegateVotesChanged'
};

export default {
  CONTRACT_ADDRESSES,
  getContractAddress,
  CONTRACT_FUNCTIONS,
  CONTRACT_EVENTS
};
