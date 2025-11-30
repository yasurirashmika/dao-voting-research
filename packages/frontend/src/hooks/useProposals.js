import { useState, useEffect, useCallback, useRef } from "react";
import { useContract } from "./useContract";
import { useAccount } from "wagmi";
import DAOVotingABI from "../abis/DAOVoting.json";

export const useProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const hasFetchedRef = useRef(false); // ✅ Prevent initial duplicate fetch

  const { contract, read, write } = useContract("DAOVoting", DAOVotingABI.abi);

  /**
   * Fetch all proposals
   */
  const fetchProposals = useCallback(async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      const proposalCount = await read("proposalCount", []);
      const proposalData = [];

      // Around line 35-55, update the proposal mapping:
for (let i = 1; i <= Number(proposalCount); i++) {
  try {
    const proposal = await read('getProposalDetails', [i]);
    
    // Check if timestamps look like block numbers (too small)
    const votingStart = Number(proposal[9]);
    const votingEnd = Number(proposal[10]);
    
    // If timestamp is less than year 2000 (946684800), it's probably a block number
    const isBlockNumber = votingStart < 946684800;
    
    proposalData.push({
      id: Number(proposal[0]),
      title: proposal[1],
      description: proposal[2],
      proposer: proposal[3],
      yesVotes: Number(proposal[4]),
      noVotes: Number(proposal[5]),
      totalVotingWeight: Number(proposal[6]),
      state: Number(proposal[7]),
      createdAt: Number(proposal[8]),
      votingStart: votingStart,
      votingEnd: votingEnd,
      isBlockNumber: isBlockNumber // Flag for display logic
    });
  } catch (err) {
    console.error(`Error fetching proposal ${i}:`, err);
  }
}

      setProposals(proposalData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [contract, read]);

  /**
   * Get single proposal by ID
   */
  const getProposal = useCallback(
    async (proposalId) => {
      if (!contract) throw new Error("Contract not initialized");

      try {
        const proposal = await read("getProposalDetails", [proposalId]);

        return {
          id: Number(proposal[0]),
          title: proposal[1],
          description: proposal[2],
          proposer: proposal[3],
          yesVotes: Number(proposal[4]),
          noVotes: Number(proposal[5]),
          totalVotingWeight: Number(proposal[6]),
          state: Number(proposal[7]),
          createdAt: Number(proposal[8]),
          votingStart: Number(proposal[9]),
          votingEnd: Number(proposal[10]),
        };
      } catch (err) {
        console.error("Error fetching proposal:", err);
        throw err;
      }
    },
    [contract, read]
  );

  /**
   * Create new proposal
   */
  const createProposal = useCallback(
    async (
      title,
      description,
      minTokensRequired = 0,
      minReputationRequired = 0
    ) => {
      if (!contract || !address) {
        throw new Error("Contract not initialized or wallet not connected");
      }

      try {
        // Call submitProposal function
        const result = await write("submitProposal", [
          title,
          description,
          minTokensRequired,
          minReputationRequired,
        ]);

        console.log("Proposal created successfully:", result);

        // Refresh proposals after creation
        await fetchProposals();

        return result;
      } catch (err) {
        console.error("Error creating proposal:", err);
        throw err;
      }
    },
    [contract, write, address, fetchProposals]
  );

  /**
   * Cast vote on proposal
   */
  const castVote = useCallback(
    async (proposalId, support) => {
      if (!contract || !address) {
        throw new Error("Contract not initialized or wallet not connected");
      }

      try {
        const result = await write("castVote", [proposalId, support]);

        console.log("Vote cast successfully:", result);

        // Refresh proposals after voting
        await fetchProposals();

        return result;
      } catch (err) {
        console.error("Error casting vote:", err);
        throw err;
      }
    },
    [contract, write, address, fetchProposals]
  );

  /**
   * Check if user has voted on a proposal
   */
  const hasVoted = useCallback(
    async (proposalId, voterAddress) => {
      if (!contract) return false;

      try {
        const voted = await read("hasVoted", [
          proposalId,
          voterAddress || address,
        ]);
        return voted;
      } catch (err) {
        console.error("Error checking vote status:", err);
        return false;
      }
    },
    [contract, read, address]
  );

  /**
   * Get user's voting power
   */
  const getVotingPower = useCallback(
    async (voterAddress) => {
      if (!contract) return 0;

      try {
        const power = await read("getVotingPowerOf", [voterAddress || address]);
        return Number(power);
      } catch (err) {
        console.error("Error getting voting power:", err);
        return 0;
      }
    },
    [contract, read, address]
  );

  // ✅ FIXED: Load proposals only once when contract is ready
  useEffect(() => {
    if (contract && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchProposals();
    }
  }, [contract]); // ✅ Only depend on contract, not fetchProposals

  return {
    proposals,
    loading,
    error,
    fetchProposals,
    getProposal,
    createProposal,
    castVote,
    hasVoted,
    getVotingPower,
  };
};

export default useProposals;