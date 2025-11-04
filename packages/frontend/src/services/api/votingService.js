import ENV from '../../config/environment';

const API_BASE_URL = ENV.API_URL;

/**
 * Fetch votes for a proposal
 */
export const fetchVotesByProposal = async (proposalId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/votes/proposal/${proposalId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch votes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching votes:', error);
    throw error;
  }
};

/**
 * Fetch user's vote on a proposal
 */
export const fetchUserVote = async (proposalId, userAddress) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/votes/proposal/${proposalId}/user/${userAddress}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch user vote');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user vote:', error);
    throw error;
  }
};

/**
 * Record vote
 */
export const recordVote = async (voteData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voteData),
    });
    if (!response.ok) {
      throw new Error('Failed to record vote');
    }
    return await response.json();
  } catch (error) {
    console.error('Error recording vote:', error);
    throw error;
  }
};

export default {
  fetchVotesByProposal,
  fetchUserVote,
  recordVote
};