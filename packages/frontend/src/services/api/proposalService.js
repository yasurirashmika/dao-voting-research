import ENV from '../../config/environment';

const API_BASE_URL = ENV.API_URL;

/**
 * Fetch all proposals from API
 */
export const fetchProposals = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals`);
    if (!response.ok) {
      throw new Error('Failed to fetch proposals');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }
};

/**
 * Fetch single proposal by ID
 */
export const fetchProposalById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch proposal');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching proposal:', error);
    throw error;
  }
};

/**
 * Create new proposal
 */
export const createProposal = async (proposalData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proposalData),
    });
    if (!response.ok) {
      throw new Error('Failed to create proposal');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }
};

/**
 * Update proposal
 */
export const updateProposal = async (id, proposalData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proposalData),
    });
    if (!response.ok) {
      throw new Error('Failed to update proposal');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating proposal:', error);
    throw error;
  }
};

export default {
  fetchProposals,
  fetchProposalById,
  createProposal,
  updateProposal
};