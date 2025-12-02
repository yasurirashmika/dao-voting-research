import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from './useContract';
import PrivateDAOVotingABI from '../abis/PrivateDAOVoting.json';
import { generateVoteProof } from '../utils/zkpUtils';

export const useZKPVoting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proofGenerating, setProofGenerating] = useState(false);
  const { address } = useAccount();

  const { contract, read, write } = useContract('PrivateDAOVoting', PrivateDAOVotingABI.abi);

  /**
   * Register voter commitment (Admin only)
   */
  const registerVoterCommitment = useCallback(async (commitment) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('registerVoter', [commitment]);
      console.log('Voter commitment registered:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error registering commitment:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Update voter set Merkle root (Admin only)
   */
  const updateVoterSetRoot = useCallback(async (root) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('updateVoterSetRoot', [root]);
      console.log('Voter set root updated:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error updating root:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Create a proposal
   */
  const createProposal = useCallback(async (title, description) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('submitProposal', [title, description]);
      console.log('Proposal created:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Start voting on a proposal
   */
  const startVoting = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('startVoting', [proposalId]);
      console.log('Voting started:', result);
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
   * Cast a private vote with zero-knowledge proof
   */
  const castPrivateVote = useCallback(async (
    proposalId,
    voteChoice,
    voterSecret,
    voterCommitments,
    voterIndex
  ) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setProofGenerating(true);
    setError(null);

    try {
      console.log('🔐 Generating zero-knowledge proof...');
      
      // Generate ZK proof (this happens client-side)
      const { proof, publicSignals, nullifier } = await generateVoteProof(
        voterSecret,
        proposalId,
        voteChoice ? 1 : 0,
        voterCommitments,
        voterIndex
      );

      setProofGenerating(false);
      console.log('✅ Proof generated, submitting to blockchain...');

      // Format proof for Solidity
      const solidityProof = formatProofForSolidity(proof, publicSignals);

      // Submit vote with proof
      const result = await write('castPrivateVote', [
        proposalId,
        voteChoice,
        nullifier,
        solidityProof.a,
        solidityProof.b,
        solidityProof.c,
        solidityProof.input
      ]);

      console.log('✅ Private vote cast:', result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error casting private vote:', err);
      setError(err.message);
      setLoading(false);
      setProofGenerating(false);
      throw err;
    }
  }, [contract, write, address]);

  /**
   * Finalize a proposal
   */
  const finalizeProposal = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('finalizeProposal', [proposalId]);
      console.log('Proposal finalized:', result);
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
   * Cancel a proposal
   */
  const cancelProposal = useCallback(async (proposalId) => {
    if (!contract || !address) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await write('cancelProposal', [proposalId]);
      console.log('Proposal cancelled:', result);
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
   * Get proposal details
   */
  const getProposal = useCallback(async (proposalId) => {
    if (!contract) return null;

    try {
      const proposal = await read('getProposal', [proposalId]);
      return {
        id: Number(proposal.id),
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        yesVotes: Number(proposal.yesVotes),
        noVotes: Number(proposal.noVotes),
        state: Number(proposal.state),
        createdAt: Number(proposal.createdAt),
        votingStart: Number(proposal.votingStart),
        votingEnd: Number(proposal.votingEnd),
        voterSetRoot: proposal.voterSetRoot
      };
    } catch (err) {
      console.error('Error getting proposal:', err);
      return null;
    }
  }, [contract, read]);

  /**
   * Check if nullifier has been used
   */
  const hasVoted = useCallback(async (proposalId, nullifier) => {
    if (!contract) return false;

    try {
      return await read('hasVoted', [proposalId, nullifier]);
    } catch (err) {
      console.error('Error checking vote status:', err);
      return false;
    }
  }, [contract, read]);

  /**
   * Check if commitment is registered
   */
  const isCommitmentRegistered = useCallback(async (commitment) => {
    if (!contract) return false;

    try {
      return await read('isCommitmentRegistered', [commitment]);
    } catch (err) {
      console.error('Error checking commitment:', err);
      return false;
    }
  }, [contract, read]);

  return {
    registerVoterCommitment,
    updateVoterSetRoot,
    createProposal,
    startVoting,
    castPrivateVote,
    finalizeProposal,
    cancelProposal,
    getProposal,
    hasVoted,
    isCommitmentRegistered,
    loading,
    error,
    proofGenerating
  };
};

/**
 * Helper: Format proof for Solidity contract
 */
function formatProofForSolidity(proof, publicSignals) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: publicSignals
  };
}

export default useZKPVoting;