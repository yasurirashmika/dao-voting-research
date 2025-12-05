// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IGovernanceToken.sol";

/**
 * @title Enhanced DAOVoting
 * @dev Standard DAO voting based purely on Governance Tokens (Public)
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

    mapping(address => bool) public registeredVoters;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // --- STATE VARIABLES ---
    uint256 public proposalCount;
    uint256 public voterCount; // ✅ ADDED THIS (Fixes the error)
    uint256 public minTokensToRegister = 1 ether; // ✅ MOVED UP (Cleaner code)

    uint256 public votingDelay = 1 hours;
    uint256 public votingPeriod = 7 days;
    uint256 public proposalThreshold = 1000 * 10 ** 18;
    uint256 public quorumPercentage = 40;

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
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            _governanceToken != address(0),
            "Invalid governance token address"
        );
        governanceToken = IGovernanceToken(_governanceToken);
    }

    /**
     * @dev Register a voter (Admin only)
     */
    function registerVoter(address _voter) external onlyOwner {
        require(_voter != address(0), "Invalid voter address");
        require(!registeredVoters[_voter], "Voter already registered");

        registeredVoters[_voter] = true;
        voterCount++; // Increment here as well to keep count accurate
        emit VoterRegistered(_voter);
    }

    /**
     * @dev Self-registration function for public voting
     */
    function selfRegister() external {
        require(!registeredVoters[msg.sender], "Already registered");
        require(
            governanceToken.balanceOf(msg.sender) >= minTokensToRegister,
            "Insufficient tokens to register"
        );

        registeredVoters[msg.sender] = true;
        voterCount++; // ✅ Now this variable exists!

        // Note: Emitting with 2 arguments (address, timestamp) implies you might need to update the event definition
        // The event VoterRegistered currently only takes (address).
        // I will emit the standard event defined at the top.
        emit VoterRegistered(msg.sender); 
    }

    // Set setter function (only owner)
    function setMinTokensToRegister(uint256 _minTokens) external onlyOwner {
        minTokensToRegister = _minTokens;
    }

    /**
     * @dev Check if address is registered
     */
    function isRegistered(address voter) external view returns (bool) {
        return registeredVoters[voter];
    }

    /**
     * @dev Submit a proposal
     */
    function submitProposal(
        string memory _title,
        string memory _description,
        uint256 _minTokensRequired
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
            minTokensRequired: _minTokensRequired
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
     * @dev Start voting period
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
     * @dev Cast a vote
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

        // Check voting requirements (Tokens Only)
        uint256 voterTokens = governanceToken.balanceOf(msg.sender);
        require(
            voterTokens >= proposal.minTokensRequired,
            "Insufficient tokens to vote"
        );

        // Calculate voting power
        uint256 votingWeight = calculateVotingWeight(msg.sender);
        require(votingWeight > 0, "No voting power");

        // Record vote
        hasVoted[_proposalId][msg.sender] = true;
        votes[_proposalId][msg.sender] = Vote({
            support: _support,
            weight: votingWeight,
            timestamp: block.timestamp
        });

        if (_support) {
            proposal.yesVotes += votingWeight;
        } else {
            proposal.noVotes += votingWeight;
        }
        proposal.totalVotingWeight += votingWeight;

        emit VoteCast(_proposalId, msg.sender, _support, votingWeight);
    }

    /**
     * @dev Calculate voting weight
     */
    function calculateVotingWeight(
        address voter
    ) public view returns (uint256) {
        uint256 tokenBalance = governanceToken.balanceOf(voter);
        return tokenBalance;
    }

    /**
     * @dev Finalize proposal
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

        // Simple Quorum: X% of Total Supply
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorumRequired = (totalSupply * quorumPercentage) / 100;

        if (proposal.totalVotingWeight < quorumRequired) {
            proposal.state = ProposalState.Defeated;
            emit ProposalStateChanged(_proposalId, ProposalState.Defeated);
            return;
        }

        if (proposal.yesVotes > proposal.noVotes) {
            proposal.state = ProposalState.Succeeded;
            emit ProposalStateChanged(_proposalId, ProposalState.Succeeded);
        } else {
            proposal.state = ProposalState.Defeated;
            emit ProposalStateChanged(_proposalId, ProposalState.Defeated);
        }
    }

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