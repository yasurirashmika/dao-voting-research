import ENV from '../../config/environment';

const API_BASE_URL = ENV.API_URL;

/**
 * Fetch user profile
 */
export const fetchUserProfile = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${address}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (address, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${address}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Fetch user's voting history
 */
export const fetchUserVotingHistory = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${address}/votes`);
    if (!response.ok) {
      throw new Error('Failed to fetch voting history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching voting history:', error);
    throw error;
  }
};

/**
 * Fetch user's proposals
 */
export const fetchUserProposals = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${address}/proposals`);
    if (!response.ok) {
      throw new Error('Failed to fetch user proposals');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user proposals:', error);
    throw error;
  }
};

export default {
  fetchUserProfile,
  updateUserProfile,
  fetchUserVotingHistory,
  fetchUserProposals
};