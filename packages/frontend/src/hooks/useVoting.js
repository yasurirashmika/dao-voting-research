import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from './useContract';
import DAOVotingABI from '../abis/DAOVoting.json';

export const useVoting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();

  const { contract, read, write } = useContract('DAOVoting', DAOVotingABI.abi);

  /**
   * Cast a vote on a proposal
   */
  const castVote = useCallback(async (proposalId, support) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('castVote', [proposalId, support]);
      console.log('Vote cast successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error casting vote:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Start voting period for a proposal
   */
  const startVoting = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('startVoting', [proposalId]);
      console.log('Voting started successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error starting voting:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Finalize a proposal after voting ends
   */
  const finalizeProposal = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('finalizeProposal', [proposalId]);
      console.log('Proposal finalized successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error finalizing proposal:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Cancel a proposal (proposer or owner only)
   */
  const cancelProposal = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('cancelProposal', [proposalId]);
      console.log('Proposal cancelled successfully:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error cancelling proposal:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Calculate voting weight for an address (tokens + reputation)
   */
  const calculateVotingWeight = useCallback(async (voterAddress) => {
    if (!contract) return 0;

    try {
      const weight = await read('calculateVotingWeight', [voterAddress || address]);
      return Number(weight);
    } catch (err) {
      console.error('Error calculating voting weight:', err);
      return 0;
    }
  }, [contract, read, address]);

  /**
   * Get voting power of an address
   */
  const getVotingPowerOf = useCallback(async (voterAddress) => {
    if (!contract) return 0;

    try {
      const power = await read('getVotingPowerOf', [voterAddress || address]);
      return Number(power);
    } catch (err) {
      console.error('Error getting voting power:', err);
      return 0;
    }
  }, [contract, read, address]);

  /**
   * Get vote details for a specific proposal and voter
   */
  const getVote = useCallback(async (proposalId, voterAddress) => {
    if (!contract) return null;

    try {
      const vote = await read('getVote', [proposalId, voterAddress || address]);
      return {
        hasVoted: vote.hasVotedOnProposal,
        support: vote.support,
        weight: Number(vote.weight),
        timestamp: Number(vote.timestamp)
      };
    } catch (err) {
      console.error('Error getting vote:', err);
      return null;
    }
  }, [contract, read, address]);

  /**
   * Check if user has voted on a proposal
   */
  const hasVotedOnProposal = useCallback(async (proposalId, voterAddress) => {
    if (!contract) return false;

    try {
      const vote = await getVote(proposalId, voterAddress);
      return vote ? vote.hasVoted : false;
    } catch (err) {
      console.error('Error checking vote status:', err);
      return false;
    }
  }, [contract, getVote]);

  /**
   * Get voting parameters
   */
  const getVotingParameters = useCallback(async () => {
    if (!contract) return null;

    try {
      const votingDelay = await read('votingDelay', []);
      const votingPeriod = await read('votingPeriod', []);
      const proposalThreshold = await read('proposalThreshold', []);
      const quorumPercentage = await read('quorumPercentage', []);
      
      return {
        votingDelay: Number(votingDelay),
        votingPeriod: Number(votingPeriod),
        proposalThreshold: proposalThreshold.toString(),
        quorumPercentage: Number(quorumPercentage)
      };
    } catch (err) {
      console.error('Error getting voting parameters:', err);
      return null;
    }
  }, [contract, read]);

  return {
    castVote,
    startVoting,
    finalizeProposal,
    cancelProposal,
    calculateVotingWeight,
    getVotingPowerOf,
    getVote,
    hasVotedOnProposal,
    getVotingParameters,
    loading,
    error
  };
};

export default useVoting;