// Proposal States
export const PROPOSAL_STATE = {
  PENDING: 0,
  ACTIVE: 1,
  CANCELED: 2,
  DEFEATED: 3,
  SUCCEEDED: 4,
  QUEUED: 5,
  EXPIRED: 6,
  EXECUTED: 7
};

export const PROPOSAL_STATE_LABELS = {
  [PROPOSAL_STATE.PENDING]: 'Pending',
  [PROPOSAL_STATE.ACTIVE]: 'Active',
  [PROPOSAL_STATE.CANCELED]: 'Canceled',
  [PROPOSAL_STATE.DEFEATED]: 'Defeated',
  [PROPOSAL_STATE.SUCCEEDED]: 'Succeeded',
  [PROPOSAL_STATE.QUEUED]: 'Queued',
  [PROPOSAL_STATE.EXPIRED]: 'Expired',
  [PROPOSAL_STATE.EXECUTED]: 'Executed'
};

// Vote Types
export const VOTE_TYPE = {
  AGAINST: 0,
  FOR: 1,
  ABSTAIN: 2
};

export const VOTE_TYPE_LABELS = {
  [VOTE_TYPE.AGAINST]: 'Against',
  [VOTE_TYPE.FOR]: 'For',
  [VOTE_TYPE.ABSTAIN]: 'Abstain'
};

// Time constants
export const TIME_CONSTANTS = {
  VOTING_DELAY: 1, // 1 block
  VOTING_PERIOD: 50400, // ~1 week in blocks (assuming 12s blocks)
  PROPOSAL_THRESHOLD: 1000, // Minimum tokens required to create proposal
  QUORUM_PERCENTAGE: 4 // 4% quorum
};

// Chain IDs
export const SUPPORTED_CHAINS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  MUMBAI: 80001,
  ARBITRUM: 42161
};

// API Endpoints
export const API_ENDPOINTS = {
  PROPOSALS: '/proposals',
  VOTES: '/votes',
  USERS: '/users',
  STATS: '/stats'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'dao_theme',
  RECENT_PROPOSALS: 'dao_recent_proposals',
  USER_PREFERENCES: 'dao_user_preferences'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50]
};

// Transaction Types
export const TX_TYPE = {
  CREATE_PROPOSAL: 'CREATE_PROPOSAL',
  VOTE: 'VOTE',
  EXECUTE: 'EXECUTE',
  CANCEL: 'CANCEL',
  QUEUE: 'QUEUE'
};

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_TOKENS: 'Insufficient governance tokens',
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  ALREADY_VOTED: 'You have already voted on this proposal',
  PROPOSAL_NOT_ACTIVE: 'Proposal is not active',
  INVALID_INPUT: 'Invalid input provided'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROPOSAL_CREATED: 'Proposal created successfully',
  VOTE_CAST: 'Vote cast successfully',
  PROPOSAL_EXECUTED: 'Proposal executed successfully',
  PROPOSAL_QUEUED: 'Proposal queued successfully'
};

// Regex Patterns
export const REGEX_PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  URL: /^https?:\/\/.+/
};

// IPFS Configuration
export const IPFS_CONFIG = {
  GATEWAY: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  PINATA_GATEWAY: 'https://gateway.pinata.cloud/ipfs/'
};

// Max values
export const MAX_VALUES = {
  PROPOSAL_TITLE_LENGTH: 100,
  PROPOSAL_DESCRIPTION_LENGTH: 5000,
  REASON_LENGTH: 500
};

export default {
  PROPOSAL_STATE,
  PROPOSAL_STATE_LABELS,
  VOTE_TYPE,
  VOTE_TYPE_LABELS,
  TIME_CONSTANTS,
  SUPPORTED_CHAINS,
  API_ENDPOINTS,
  STORAGE_KEYS,
  PAGINATION,
  TX_TYPE,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  IPFS_CONFIG,
  MAX_VALUES
};
