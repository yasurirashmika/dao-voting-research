// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IGovernanceToken.sol";
import "../interfaces/IReputationManager.sol";

/**
 * @title Enhanced DAOVoting
 * @dev Advanced DAO voting with weighted voting mechanism (tokens + reputation)
 */
contract DAOVoting is Ownable, ReentrancyGuard {
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
        uint256 minReputationRequired;
    }

    struct Vote {
        bool support;
        uint256 weight;
        uint256 timestamp;
    }

    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Cancelled
    }

    IGovernanceToken public governanceToken;
    IReputationManager public reputationManager;

    mapping(address => bool) public registeredVoters;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public proposalCount;
    uint256 public votingDelay = 1 hours; // Time between proposal creation and voting start
    uint256 public votingPeriod = 7 days; // Voting duration
    uint256 public proposalThreshold = 1000 * 10 ** 18; // Min tokens to create proposal
    uint256 public quorumPercentage = 40; // 40% of total supply needed for quorum

    // Weight calculation parameters (basis points, 10000 = 100%)
    uint256 public tokenWeightPercentage = 7000; // 70% weight from tokens
    uint256 public reputationWeightPercentage = 3000; // 30% weight from reputation

    event VoterRegistered(address indexed voter);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string description,
        uint256 votingStart,
        uint256 votingEnd
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalStateChanged(
        uint256 indexed proposalId,
        ProposalState newState
    );
    event VotingParametersUpdated(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumPercentage
    );
    event WeightParametersUpdated(
        uint256 tokenWeight,
        uint256 reputationWeight
    );

    modifier validProposal(uint256 _proposalId) {
        require(
            _proposalId > 0 && _proposalId <= proposalCount,
            "Invalid proposal ID"
        );
        _;
    }

    modifier onlyRegisteredVoter() {
        require(
            registeredVoters[msg.sender],
            "Only registered voters can perform this action"
        );
        _;
    }

    constructor(
        address _governanceToken,
        address _reputationManager,
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            _governanceToken != address(0),
            "Invalid governance token address"
        );
        require(
            _reputationManager != address(0),
            "Invalid reputation manager address"
        );

        governanceToken = IGovernanceToken(_governanceToken);
        reputationManager = IReputationManager(_reputationManager);
    }

    /**
     * @dev Register a voter (now also initializes reputation)
     */
    function registerVoter(address _voter) external onlyOwner {
        require(_voter != address(0), "Invalid voter address");
        require(!registeredVoters[_voter], "Voter already registered");

        registeredVoters[_voter] = true;

        // Initialize reputation if not already done
        if (!reputationManager.hasActiveReputation(_voter)) {
            reputationManager.initializeReputation(_voter);
        }

        emit VoterRegistered(_voter);
    }

    /**
     * @dev Submit a proposal (enhanced with requirements)
     */
    function submitProposal(
        string memory _title,
        string memory _description,
        uint256 _minTokensRequired,
        uint256 _minReputationRequired
    ) external onlyRegisteredVoter nonReentrant {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(
            governanceToken.balanceOf(msg.sender) >= proposalThreshold,
            "Insufficient tokens to create proposal"
        );

        proposalCount++;
        uint256 votingStart = block.timestamp + votingDelay;
        uint256 votingEnd = votingStart + votingPeriod;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: _title,
            description: _description,
            proposer: msg.sender,
            yesVotes: 0,
            noVotes: 0,
            totalVotingWeight: 0,
            state: ProposalState.Pending,
            createdAt: block.timestamp,
            votingStart: votingStart,
            votingEnd: votingEnd,
            minTokensRequired: _minTokensRequired,
            minReputationRequired: _minReputationRequired
        });

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            _title,
            _description,
            votingStart,
            votingEnd
        );
    }

    /**
     * @dev Start voting period for a proposal
     */
    function startVoting(
        uint256 _proposalId
    ) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.state == ProposalState.Pending,
            "Proposal not in pending state"
        );
        require(
            block.timestamp >= proposal.votingStart,
            "Voting period not yet started"
        );

        proposal.state = ProposalState.Active;
        emit ProposalStateChanged(_proposalId, ProposalState.Active);
    }

    /**
     * @dev Cast a weighted vote on a proposal
     */
    function castVote(
        uint256 _proposalId,
        bool _support
    ) external onlyRegisteredVoter validProposal(_proposalId) nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(
            block.timestamp >= proposal.votingStart,
            "Voting not yet started"
        );
        require(
            block.timestamp <= proposal.votingEnd,
            "Voting period has ended"
        );
        require(
            !hasVoted[_proposalId][msg.sender],
            "Already voted on this proposal"
        );

        // Check voting requirements
        uint256 voterTokens = governanceToken.balanceOf(msg.sender);
        uint256 voterReputation = reputationManager.getReputationScore(
            msg.sender
        );

        require(
            voterTokens >= proposal.minTokensRequired,
            "Insufficient tokens to vote"
        );
        require(
            voterReputation >= proposal.minReputationRequired,
            "Insufficient reputation to vote"
        );

        // Calculate weighted voting power
        uint256 votingWeight = calculateVotingWeight(msg.sender);
        require(votingWeight > 0, "No voting power");

        // Record the vote
        hasVoted[_proposalId][msg.sender] = true;
        votes[_proposalId][msg.sender] = Vote({
            support: _support,
            weight: votingWeight,
            timestamp: block.timestamp
        });

        // Update proposal vote counts
        if (_support) {
            proposal.yesVotes += votingWeight;
        } else {
            proposal.noVotes += votingWeight;
        }
        proposal.totalVotingWeight += votingWeight;

        emit VoteCast(_proposalId, msg.sender, _support, votingWeight);
    }

    /**
     * @dev Calculate voting weight for an address (tokens + reputation)
     */
    function calculateVotingWeight(
        address voter
    ) public view returns (uint256) {
        uint256 tokenBalance = governanceToken.balanceOf(voter);
        uint256 reputationScore = reputationManager.getReputationScore(voter);

        if (tokenBalance == 0 && reputationScore == 0) {
            return 0;
        }

        // Normalize token balance (assume max reasonable balance for scaling)
        uint256 maxTokens = governanceToken.totalSupply() / 10; // 10% of total supply as reference
        uint256 normalizedTokens = tokenBalance > maxTokens
            ? maxTokens
            : tokenBalance;
        uint256 tokenWeight = (normalizedTokens * tokenWeightPercentage) /
            maxTokens;

        // Get reputation weight (already in basis points)
        uint256 reputationWeight = (reputationManager.getReputationWeight(
            voter
        ) * reputationWeightPercentage) / 10000;

        return tokenWeight + reputationWeight;
    }

    /**
     * @dev Finalize a proposal after voting ends
     */
    function finalizeProposal(
        uint256 _proposalId
    ) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(
            block.timestamp > proposal.votingEnd,
            "Voting period not ended"
        );

        // Check if quorum was reached
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorumRequired = (totalSupply * quorumPercentage) / 100;

        if (proposal.totalVotingWeight < quorumRequired) {
            proposal.state = ProposalState.Defeated;
            emit ProposalStateChanged(_proposalId, ProposalState.Defeated);
            return;
        }

        // Determine outcome based on vote results
        if (proposal.yesVotes > proposal.noVotes) {
            proposal.state = ProposalState.Succeeded;
            emit ProposalStateChanged(_proposalId, ProposalState.Succeeded);
        } else {
            proposal.state = ProposalState.Defeated;
            emit ProposalStateChanged(_proposalId, ProposalState.Defeated);
        }
    }

    /**
     * @dev Cancel a proposal (only by proposer or owner)
     */
    function cancelProposal(
        uint256 _proposalId
    ) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Only proposer or owner can cancel"
        );
        require(
            proposal.state == ProposalState.Pending ||
                proposal.state == ProposalState.Active,
            "Cannot cancel finalized proposal"
        );

        proposal.state = ProposalState.Cancelled;
        emit ProposalStateChanged(_proposalId, ProposalState.Cancelled);
    }

    /**
     * @dev Update voting parameters (only owner)
     */
    function updateVotingParameters(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumPercentage
    ) external onlyOwner {
        require(_votingDelay <= 7 days, "Voting delay too long");
        require(
            _votingPeriod >= 1 days && _votingPeriod <= 30 days,
            "Invalid voting period"
        );
        require(
            _quorumPercentage > 0 && _quorumPercentage <= 100,
            "Invalid quorum percentage"
        );

        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumPercentage = _quorumPercentage;

        emit VotingParametersUpdated(
            _votingDelay,
            _votingPeriod,
            _proposalThreshold,
            _quorumPercentage
        );
    }

    /**
     * @dev Update weight calculation parameters (only owner)
     */
    function updateWeightParameters(
        uint256 _tokenWeightPercentage,
        uint256 _reputationWeightPercentage
    ) external onlyOwner {
        require(
            _tokenWeightPercentage + _reputationWeightPercentage == 10000,
            "Weights must sum to 10000 basis points"
        );

        tokenWeightPercentage = _tokenWeightPercentage;
        reputationWeightPercentage = _reputationWeightPercentage;

        emit WeightParametersUpdated(
            _tokenWeightPercentage,
            _reputationWeightPercentage
        );
    }

    // View functions
    function getProposalDetails(
        uint256 _proposalId
    )
        external
        view
        validProposal(_proposalId)
        returns (
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
        )
    {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.totalVotingWeight,
            proposal.state,
            proposal.createdAt,
            proposal.votingStart,
            proposal.votingEnd
        );
    }

    function getVote(
        uint256 _proposalId,
        address _voter
    )
        external
        view
        returns (
            bool hasVotedOnProposal,
            bool support,
            uint256 weight,
            uint256 timestamp
        )
    {
        hasVotedOnProposal = hasVoted[_proposalId][_voter];
        if (hasVotedOnProposal) {
            Vote memory vote = votes[_proposalId][_voter];
            return (true, vote.support, vote.weight, vote.timestamp);
        }
        return (false, false, 0, 0);
    }

    function isVoterRegistered(address _user) external view returns (bool) {
        return registeredVoters[_user];
    }

    function getVotingPowerOf(address _voter) external view returns (uint256) {
        return calculateVotingWeight(_voter);
    }
}
