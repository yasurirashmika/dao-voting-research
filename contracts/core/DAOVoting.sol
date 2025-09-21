// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DAOVoting {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        bool isActive;
        uint256 createdAt;
        uint256 votingDeadline;
    }

    mapping(address => bool) public registeredVoters;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public proposalCount;
    address public admin;

    // Events
    event VoterRegistered(address indexed voter);
    event ProposalCreated(uint256 indexed proposalId, string title, string description, uint256 votingDeadline);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);

    constructor() {
        admin = msg.sender;
    }

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyRegisteredVoter() {
        require(registeredVoters[msg.sender], "Only registered voters can perform this action");
        _;
    }

    modifier validProposal(uint256 _proposalId) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        _;
    }

    // Admin registers voters
    function registerVoter(address _voter) external onlyAdmin {
        require(_voter != address(0), "Invalid voter address");
        require(!registeredVoters[_voter], "Voter already registered");

        registeredVoters[_voter] = true;
        emit VoterRegistered(_voter);
    }

    // Any registered voter can submit a proposal
    function submitProposal(
        string memory _title,
        string memory _description,
        uint256 _votingDuration // in seconds
    ) external onlyRegisteredVoter {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_votingDuration > 0, "Duration must be > 0");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: _title,
            description: _description,
            yesVotes: 0,
            noVotes: 0,
            isActive: true,
            createdAt: block.timestamp,
            votingDeadline: block.timestamp + _votingDuration
        });

        emit ProposalCreated(proposalCount, _title, _description, block.timestamp + _votingDuration);
    }

    // Cast a vote on a proposal
    function castVote(uint256 _proposalId, bool _support) external onlyRegisteredVoter validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal is not active");
        require(block.timestamp <= proposal.votingDeadline, "Voting period has ended");
        require(!hasVoted[_proposalId][msg.sender], "You have already voted on this proposal");

        hasVoted[_proposalId][msg.sender] = true;

        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit VoteCast(_proposalId, msg.sender, _support);
    }

    // Finalize a proposal after voting deadline
    function finalizeProposal(uint256 _proposalId) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal already finalized");
        require(block.timestamp > proposal.votingDeadline, "Voting period not yet ended");

        proposal.isActive = false;
        emit ProposalFinalized(_proposalId, proposal.yesVotes, proposal.noVotes);
    }

    // View proposal details
    function getProposalDetails(uint256 _proposalId) external view validProposal(_proposalId) returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 yesVotes,
        uint256 noVotes,
        bool isActive,
        uint256 createdAt,
        uint256 votingDeadline
    ) {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.isActive,
            proposal.createdAt,
            proposal.votingDeadline
        );
    }

    // Check if user has voted on a proposal
    function hasUserVoted(uint256 _proposalId, address _user) external view returns (bool) {
        return hasVoted[_proposalId][_user];
    }

    // Check if an address is a registered voter
    function isVoterRegistered(address _user) external view returns (bool) {
        return registeredVoters[_user];
    }
}
