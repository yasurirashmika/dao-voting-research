/* src/hooks/useProposals.js */
import { useState, useEffect, useCallback, useRef } from "react";
import { useContract } from "./useContract";
import { useAccount } from "wagmi";
import { useDeployment } from "../context/DeploymentContext";
import DAOVotingABI from "../abis/DAOVoting.json";
import PrivateDAOVotingABI from "../abis/PrivateDAOVoting.json";

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
        throw error;
      }

      console.log(`⏳ Retry ${i + 1}/${maxRetries} after timeout...`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export const useProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 1. Add Trigger State for Refreshing
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  
  const { address } = useAccount();
  const { mode } = useDeployment();
  
  // Determine Contract & ABI based on Mode
  const contractName = mode === "private" ? "PrivateDAOVoting" : "DAOVoting";
  const abi = mode === "private" ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;

  const { contract, read, write } = useContract(contractName, abi);
  const isContractReady = !!contract;

  // 2. Refresh Function (Export this!)
  const refreshProposals = useCallback(() => {
    console.log("🔄 Triggering proposal refresh...");
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const fetchProposals = useCallback(async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      const proposalCount = await retryOperation(
        () => read("proposalCount", []),
        3,
        2000
      );

      const count = Number(proposalCount);
      console.log(`📊 Found ${count} proposals`);

      if (count === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      const contractCalls = [];
      for (let i = 1; i <= count; i++) {
        contractCalls.push({
          address: contract.address,
          abi: contract.abi,
          functionName: "proposals",
          args: [i],
        });
      }

      const results = await retryOperation(
        () => contract.publicClient.multicall({ contracts: contractCalls }),
        3,
        2000
      );

      const proposalData = results
        .map((result, index) => {
          if (result.status === "failure") {
            console.error(`Failed to fetch proposal ${index + 1}`, result.error);
            return null;
          }

          const p = result.result;
          let id, title, description, proposer, yesVotes, noVotes, totalVotingWeight, state, createdAt, votingStart, votingEnd;
          let minTokensRequired = 0;
          let minReputationRequired = 0;

          if (mode === "private") {
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
            minTokensRequired,
            minReputationRequired,
          };
        })
        .filter((p) => p !== null);

      setProposals(proposalData.reverse());
      setLoading(false);
      console.log(`Loaded ${proposalData.length} proposals`);
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [contract, read, mode]);

  const getProposal = useCallback(async (proposalId) => {
      if (!contract) {
        console.warn("⏳ Contract not initialized yet, skipping getProposal");
        return null; 
      }

      try {
        console.log(`📖 Fetching proposal #${proposalId}`);
        const p = await retryOperation(
          () => read("proposals", [proposalId]),
          3,
          2000
        );

        let id, title, description, proposer, yesVotes, noVotes, totalVotingWeight, state, createdAt, votingStart, votingEnd;
        let minTokensRequired = 0;
        let minReputationRequired = 0;

        if (mode === "private") {
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

        console.log(`Loaded proposal #${id}:`, title);
        return {
          id, title, description, proposer, yesVotes, noVotes, totalVotingWeight, state, createdAt, votingStart, votingEnd, minTokensRequired, minReputationRequired,
        };
      } catch (err) {
        console.error(`Error fetching proposal #${proposalId}:`, err);
        throw err;
      }
    },
    [contract, read, mode]
  );

  const createProposal = useCallback(async (title, description, minTokensRequired = 0, minReputationRequired = 0) => {
      if (!contract || !address) {
        throw new Error("Contract not initialized or wallet not connected");
      }

      try {
        let result;
        if (mode === "private") {
          console.log("✍️ Creating Private Proposal");
          result = await write("submitProposal", [title, description, minReputationRequired]);
        } else {
          console.log("✍️ Creating Public Proposal");
          result = await write("submitProposal", [title, description, minTokensRequired]);
        }

        console.log("Proposal created successfully:", result);
        // 3. Auto-refresh after creation
        refreshProposals(); 
        return result;
      } catch (err) {
        console.error("Error creating proposal:", err);
        throw err;
      }
    },
    [contract, write, address, refreshProposals, mode]
  );

  const castVote = useCallback(async (proposalId, support) => {
      if (!contract || !address) {
        throw new Error("Contract not initialized or wallet not connected");
      }

      try {
        if (mode === "private") {
          throw new Error("Private voting requires ZK Proof generation. Please use the specialized ZK voting component.");
        }

        console.log(`🗳️ Casting vote on proposal #${proposalId}: ${support ? "YES" : "NO"}`);
        const result = await write("castVote", [proposalId, support]);
        console.log("Vote cast successfully:", result);
        // 4. Auto-refresh after voting
        refreshProposals();
        return result;
      } catch (err) {
        console.error("Error casting vote:", err);
        throw err;
      }
    },
    [contract, write, address, refreshProposals, mode]
  );

  const hasVoted = useCallback(async (proposalId, voterAddress) => {
      if (!contract) return false;
      if (mode === "private") return false;

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
    [contract, read, address, mode]
  );

  const getVotingPower = useCallback(async (voterAddress) => {
      if (!contract) return 0;
      if (mode === "private") return 1;

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
    [contract, read, address, mode]
  );

  // 5. Effect now depends on refreshTrigger
  useEffect(() => {
    if (contract) {
      console.log("Fetch triggered by dependency change or refresh");
      fetchProposals();
    }
  }, [contract, fetchProposals, refreshTrigger]); // Add refreshTrigger here

  return {
    isContractReady,
    proposals,
    loading,
    error,
    refreshProposals,
    fetchProposals,
    getProposal,
    createProposal,
    castVote,
    hasVoted,
    getVotingPower,
  };
};

export default useProposals;