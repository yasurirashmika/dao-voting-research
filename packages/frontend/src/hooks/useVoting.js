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
   * Cast vote on proposal
   * @param {number} proposalId - Proposal ID
   * @param {boolean} support - true for YES, false for NO
   */
  const castVote = useCallback(async (proposalId, support) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Convert support to boolean if needed
      const voteSupport = support === true || support === 'FOR' || support === 1;
      
      const result = await write('castVote', [proposalId, voteSupport]);
      
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
   * Cast vote with reason (Note: Current contract doesn't have this, so we'll use regular castVote)
   */
  const castVoteWithReason = useCallback(async (proposalId, support, reason) => {
    // For now, just use regular castVote since contract doesn't have castVoteWithReason
    console.log('Vote reason (not stored on-chain):', reason);
    return await castVote(proposalId, support);
  }, [castVote]);

  /**
   * Check if user has voted on a proposal
   */
  const hasVoted = useCallback(async (proposalId, voterAddress) => {
    if (!contract) return false;
    
    try {
      const voted = await read('hasVoted', [proposalId, voterAddress || address]);
      return voted;
    } catch (err) {
      console.error('Error checking vote status:', err);
      return false;
    }
  }, [contract, read, address]);

  /**
   * Get vote details for a specific voter on a proposal
   */
  const getVote = useCallback(async (proposalId, voterAddress) => {
    if (!contract) return null;
    
    try {
      const voteData = await read('getVote', [proposalId, voterAddress || address]);
      
      return {
        hasVoted: voteData[0],
        support: voteData[1],
        weight: Number(voteData[2]),
        timestamp: Number(voteData[3])
      };
    } catch (err) {
      console.error('Error getting vote:', err);
      return null;
    }
  }, [contract, read, address]);

  /**
   * Get user's voting power
   */
  const getVotingPower = useCallback(async (voterAddress) => {
    if (!contract) return 0;
    
    try {
      const power = await read('getVotingPowerOf', [voterAddress || address]);
      return Number(power);
    } catch (err) {
      console.error('Error getting voting power:', err);
      return 0;
    }
  }, [contract, read, address]);

  return {
    castVote,
    castVoteWithReason,
    hasVoted,
    getVote,
    getVotingPower,
    loading,
    error
  };
};

export default useVoting;