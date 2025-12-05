import { useState, useEffect, useCallback, useRef } from "react";
import { useContract } from "./useContract";
import { useAccount } from "wagmi";
import DAOVotingABI from "../abis/DAOVoting.json";
import PrivateDAOVotingABI from "../abis/PrivateDAOVoting.json";

const DEPLOYMENT_MODE = process.env.REACT_APP_DEPLOYMENT_MODE || 'baseline';

/**
 * ✅ Retry helper for handling RPC timeouts
 */
const retryOperation = async (operation, maxRetries = 3, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      const isTimeout =
        error.message?.includes("timeout") ||
        error.message?.includes("took too long") ||
        error.message?.includes("timed out");

      if (i === maxRetries - 1 || !isTimeout) {
        throw error; // Last retry or non-timeout error
      }

      console.log(`⏳ Retry ${i + 1}/${maxRetries} after timeout...`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
    }
  }
};

export const useProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const hasFetchedRef = useRef(false);

  // 1. Determine Contract & ABI based on Mode
  const contractName = DEPLOYMENT_MODE === 'private' ? 'PrivateDAOVoting' : 'DAOVoting';
  const abi = DEPLOYMENT_MODE === 'private' ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;

  const { contract, read, write } = useContract(contractName, abi);

  /**
   * Fetch all proposals using Multicall (Batched Request)
   */
  const fetchProposals = useCallback(async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ 1. Get the total count with retry logic
      const proposalCount = await retryOperation(
        () => read("proposalCount", []),
        3,
        2000
      );

      const count = Number(proposalCount);

      if (count === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // 2. Prepare the Batch Request (Multicall)
      // We use the mapping 'proposals' directly to ensure we get the full struct
      const contractCalls = [];
      for (let i = 1; i <= count; i++) {
        contractCalls.push({
          address: contract.address,
          abi: contract.abi,
          functionName: "proposals",
          args: [i],
        });
      }

      // ✅ 3. Execute ONE network request for ALL proposals with retry
      const results = await retryOperation(
        () => contract.publicClient.multicall({ contracts: contractCalls }),
        3,
        2000
      );

      // 4. Process the results
      const proposalData = results
        .map((result, index) => {
          if (result.status === "failure") {
            console.error(
              `Failed to fetch proposal ${index + 1}`,
              result.error
            );
            return null;
          }

          const p = result.result;

          // ✅ MAPPING LOGIC FOR NEW STRUCTURES
          let id, title, description, proposer, yesVotes, noVotes, totalVotingWeight, state, createdAt, votingStart, votingEnd;
          let minTokensRequired = 0;
          let minReputationRequired = 0;

          if (DEPLOYMENT_MODE === 'private') {
             // PRIVATE STRUCT:
             // [0]id, [1]title, [2]desc, [3]proposer, [4]yes, [5]no, 
             // [6]state, [7]created, [8]start, [9]end, [10]root, [11]minReputation
             id = Number(p[0]);
             title = p[1];
             description = p[2];
             proposer = p[3];
             yesVotes = Number(p[4]);
             noVotes = Number(p[5]);
             state = Number(p[6]);
             createdAt = Number(p[7]);
             votingStart = Number(p[8]);
             votingEnd = Number(p[9]);
             // p[10] is root, ignored here
             minReputationRequired = Number(p[11]); 
             
             totalVotingWeight = yesVotes + noVotes; // Private usually just counts votes
          } else {
             // PUBLIC STRUCT:
             // [0]id, [1]title, [2]desc, [3]proposer, [4]yes, [5]no, [6]totalWeight, 
             // [7]state, [8]created, [9]start, [10]end, [11]minTokens
             id = Number(p[0]);
             title = p[1];
             description = p[2];
             proposer = p[3];
             yesVotes = Number(p[4]);
             noVotes = Number(p[5]);
             totalVotingWeight = Number(p[6]);
             state = Number(p[7]);
             createdAt = Number(p[8]);
             votingStart = Number(p[9]);
             votingEnd = Number(p[10]);
             minTokensRequired = Number(p[11]);
          }

          const isBlockNumber = votingStart < 946684800;

          return {
            id,
            title,
            description,
            proposer,
            yesVotes,
            noVotes,
            totalVotingWeight,
            state,
            createdAt,
            votingStart,
            votingEnd,
            isBlockNumber,
            minTokensRequired,
            minReputationRequired
          };
        })
        .filter((p) => p !== null);

      // Sort by newest first
      setProposals(proposalData.reverse());
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
        const p = await retryOperation(
          () => read("proposals", [proposalId]),
          3,
          2000
        );
        
        let id, title, description, proposer, yesVotes, noVotes, totalVotingWeight, state, createdAt, votingStart, votingEnd;
        let minTokensRequired = 0;
        let minReputationRequired = 0;

        if (DEPLOYMENT_MODE === 'private') {
             id = Number(p[0]);
             title = p[1];
             description = p[2];
             proposer = p[3];
             yesVotes = Number(p[4]);
             noVotes = Number(p[5]);
             state = Number(p[6]);
             createdAt = Number(p[7]);
             votingStart = Number(p[8]);
             votingEnd = Number(p[9]);
             minReputationRequired = Number(p[11]);
             totalVotingWeight = yesVotes + noVotes;
        } else {
             id = Number(p[0]);
             title = p[1];
             description = p[2];
             proposer = p[3];
             yesVotes = Number(p[4]);
             noVotes = Number(p[5]);
             totalVotingWeight = Number(p[6]);
             state = Number(p[7]);
             createdAt = Number(p[8]);
             votingStart = Number(p[9]);
             votingEnd = Number(p[10]);
             minTokensRequired = Number(p[11]);
        }

        return {
          id, title, description, proposer, yesVotes, noVotes,
          totalVotingWeight, state, createdAt, votingStart, votingEnd,
          minTokensRequired, minReputationRequired
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
        let result;
        
        if (DEPLOYMENT_MODE === 'private') {
             // 🔒 Private Contract only takes (title, description, minReputation)
             console.log("Creating Private Proposal with Rep Req:", minReputationRequired);
             result = await write("submitProposal", [
                title,
                description,
                minReputationRequired
             ]);
        } else {
             // 📢 Public Contract takes (title, desc, minTokens)
             console.log("Creating Public Proposal with Token Req:", minTokensRequired);
             result = await write("submitProposal", [
                title,
                description,
                minTokensRequired,
             ]);
        }

        console.log("Proposal created successfully:", result);
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
        if (DEPLOYMENT_MODE === 'private') {
            throw new Error("Private voting requires ZK Proof generation. Please use the specialized ZK voting component.");
        }

        const result = await write("castVote", [proposalId, support]);
        console.log("Vote cast successfully:", result);
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

      // Private voting uses Nullifiers, not address mapping.
      if (DEPLOYMENT_MODE === 'private') return false; 

      try {
        const voted = await retryOperation(
          () => read("hasVoted", [proposalId, voterAddress || address]),
          3,
          1500
        );
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
      
      if (DEPLOYMENT_MODE === 'private') return 1;

      try {
        const power = await retryOperation(
          () => read("getVotingPowerOf", [voterAddress || address]),
          3,
          1500
        );
        return Number(power);
      } catch (err) {
        console.error("Error getting voting power:", err);
        return 0;
      }
    },
    [contract, read, address]
  );

  useEffect(() => {
    if (contract && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchProposals();
    }
  }, [contract]);

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