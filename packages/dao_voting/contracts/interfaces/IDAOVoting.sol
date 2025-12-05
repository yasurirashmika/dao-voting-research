// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDAOVoting
 * @dev Interface for DAO voting functionality (Public Baseline)
 */
interface IDAOVoting {
    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Cancelled
    }
    
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVotingWeight;
        ProposalState state;
        uint256 createdAt;
        uint256 votingStart;
        uint256 votingEnd;
        uint256 minTokensRequired;
        // Removed: minReputationRequired
    }
    
    struct Vote {
        bool support;
        uint256 weight;
        uint256 timestamp;
    }
    
    // Events
    event VoterRegistered(address indexed voter);
    event ProposalCreated(
        uint256 indexed proposalId, 
        address indexed proposer,
        string title, 
        string description, 
        uint256 votingStart,
        uint256 votingEnd
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalStateChanged(uint256 indexed proposalId, ProposalState newState);
    event VotingParametersUpdated(uint256 votingDelay, uint256 votingPeriod, uint256 proposalThreshold, uint256 quorumPercentage);
    // Removed: WeightParametersUpdated
    
    // Core voting functions
    function registerVoter(address voter) external;
    
    // Updated: Removed minReputationRequired
    function submitProposal(
        string memory title,
        string memory description,
        uint256 minTokensRequired
    ) external;

    function startVoting(uint256 proposalId) external;
    function castVote(uint256 proposalId, bool support) external;
    function finalizeProposal(uint256 proposalId) external;
    function cancelProposal(uint256 proposalId) external;
    
    // Parameter management
    function updateVotingParameters(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumPercentage
    ) external;
    
    // Removed: updateWeightParameters
    
    // View functions
    function calculateVotingWeight(address voter) external view returns (uint256);
    function getProposalDetails(uint256 proposalId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        address proposer,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 totalVotingWeight,
        ProposalState state,
        uint256 createdAt,
        uint256 votingStart,
        uint256 votingEnd
    );
    function getVote(uint256 proposalId, address voter) external view returns (
        bool hasVotedOnProposal,
        bool support,
        uint256 weight,
        uint256 timestamp
    );
    function isVoterRegistered(address user) external view returns (bool);
    function getVotingPowerOf(address voter) external view returns (uint256);
}