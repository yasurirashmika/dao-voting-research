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
    }

    mapping(address => bool) public voters;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public proposalCount;
    address public admin;

    event VoterRegistered(address indexed voter);
    event ProposalCreated(uint256 indexed proposalId, string title, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalClosed(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyVoter() {
        require(voters[msg.sender], "Only registered voters can vote");
        _;
    }

    modifier validProposal(uint256 _proposalId) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        _;
    }

    function registerVoter(address _voter) external onlyAdmin {
        require(_voter != address(0), "Invalid voter address");
        require(!voters[_voter], "Voter already registered");

        voters[_voter] = true;
        emit VoterRegistered(_voter);
    }

    function createProposal(string memory _title, string memory _description) external onlyAdmin {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: _title,
            description: _description,
            yesVotes: 0,
            noVotes: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        emit ProposalCreated(proposalCount, _title, _description);
    }

    function vote(uint256 _proposalId, bool _support) external onlyVoter validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal is not active");
        require(!hasVoted[_proposalId][msg.sender], "You have already voted on this proposal");

        hasVoted[_proposalId][msg.sender] = true;

        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit VoteCast(_proposalId, msg.sender, _support);
    }

    function tallyVotes(uint256 _proposalId) external onlyAdmin validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal already closed");

        proposal.isActive = false;
        emit ProposalClosed(_proposalId, proposal.yesVotes, proposal.noVotes);
    }

    function getProposal(uint256 _proposalId) external view validProposal(_proposalId) returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 yesVotes,
        uint256 noVotes,
        bool isActive,
        uint256 createdAt
    ) {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.isActive,
            proposal.createdAt
        );
    }

    function hasUserVoted(uint256 _proposalId, address _user) external view returns (bool) {
        return hasVoted[_proposalId][_user];
    }

    function isVoterRegistered(address _user) external view returns (bool) {
        return voters[_user];
    }
}
