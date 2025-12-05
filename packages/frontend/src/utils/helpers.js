import { PROPOSAL_STATE, PROPOSAL_STATE_LABELS } from './constants';

/**
 * Get proposal state label
 * @param {number} state - Proposal state number
 * @returns {string} State label
 */
export const getProposalStateLabel = (state) => {
  return PROPOSAL_STATE_LABELS[state] || 'Unknown';
};

/**
 * Get proposal state color
 * @param {number} state - Proposal state number
 * @returns {string} CSS color variable
 */
export const getProposalStateColor = (state) => {
  const colorMap = {
    [PROPOSAL_STATE.PENDING]: '#FFA500', 
    [PROPOSAL_STATE.ACTIVE]: '#4CAF50',
    [PROPOSAL_STATE.PASSED]: '#2196F3',
    [PROPOSAL_STATE.REJECTED]: '#F44336',
    [PROPOSAL_STATE.EXECUTED]: '#9C27B0',
    [PROPOSAL_STATE.CANCELED]: '#757575'
  };
  
  return colorMap[state] || '#000000';
};

/**
 * Check if proposal is active
 * @param {number} state - Proposal state
 * @returns {boolean} Is active
 */
export const isProposalActive = (state) => {
  return state === PROPOSAL_STATE.ACTIVE;
};

/**
 * Check if user can vote on proposal
 * @param {number} state - Proposal state
 * @param {boolean} hasVoted - Has user already voted
 * @returns {boolean} Can vote
 */
export const canVoteOnProposal = (state, hasVoted) => {
  return isProposalActive(state) && !hasVoted;
};

/**
 * Calculate quorum percentage
 * @param {number} forVotes - Votes in favor
 * @param {number} totalSupply - Total token supply
 * @returns {number} Quorum percentage
 */
export const calculateQuorum = (forVotes, totalSupply) => {
  if (!totalSupply || totalSupply === 0) return 0;
  return (forVotes / totalSupply) * 100;
};

/**
 * Calculate vote percentages
 * @param {number} forVotes - For votes
 * @param {number} againstVotes - Against votes
 * @param {number} abstainVotes - Abstain votes
 * @returns {object} Vote percentages
 */
export const calculateVotePercentages = (forVotes, againstVotes, abstainVotes) => {
  const total = forVotes + againstVotes + abstainVotes;
  
  if (total === 0) {
    return { for: 0, against: 0, abstain: 0 };
  }
  
  return {
    for: (forVotes / total) * 100,
    against: (againstVotes / total) * 100,
    abstain: (abstainVotes / total) * 100
  };
};

/**
 * Sort proposals by date
 * @param {array} proposals - Array of proposals
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {array} Sorted proposals
 */
export const sortProposalsByDate = (proposals, order = 'desc') => {
  return [...proposals].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.startBlock);
    const dateB = new Date(b.createdAt || b.startBlock);
    
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

/**
 * Filter proposals by state
 * @param {array} proposals - Array of proposals
 * @param {number|array} states - State(s) to filter by
 * @returns {array} Filtered proposals
 */
export const filterProposalsByState = (proposals, states) => {
  const stateArray = Array.isArray(states) ? states : [states];
  return proposals.filter(p => stateArray.includes(p.state));
};

/**
 * Search proposals
 * @param {array} proposals - Array of proposals
 * @param {string} query - Search query
 * @returns {array} Matching proposals
 */
export const searchProposals = (proposals, query) => {
  if (!query || query.trim() === '') return proposals;
  
  const lowerQuery = query.toLowerCase();
  
  return proposals.filter(p => 
    (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
    (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
    (p.proposer && p.proposer.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Paginate array
 * @param {array} items - Items to paginate
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {object} Paginated result
 */
export const paginate = (items, page = 1, pageSize = 10) => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

/**
 * Debounce function
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default {
  getProposalStateLabel,
  getProposalStateColor,
  isProposalActive,
  canVoteOnProposal,
  calculateQuorum,
  calculateVotePercentages,
  sortProposalsByDate,
  filterProposalsByState,
  searchProposals,
  paginate,
  debounce,
  copyToClipboard,
  generateId,
  sleep,
  truncateText
};
