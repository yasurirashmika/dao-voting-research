// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DAOVoting {
    struct Proposal {
        uint id;
        string title;
        string description;
        uint yesVotes;
        uint noVotes;
        bool isActive;
    }

    mapping(address => bool) public voters;
    mapping(uint => Proposal) public proposals;
    uint public proposalCount;
    address public admin;

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

    function registerVoter(address _voter) external onlyAdmin {
        voters[_voter] = true;
    }

    function createProposal(string memory _title, string memory _description) external onlyAdmin {
        proposalCount++;
        proposals[proposalCount] = Proposal(proposalCount, _title, _description, 0, 0, true);
    }

    function vote(uint _proposalId, bool _support) external onlyVoter {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal is not active");

        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
    }

    function tallyVotes(uint _proposalId) external onlyAdmin {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.isActive, "Proposal already closed");
        proposal.isActive = false;
    }
}
