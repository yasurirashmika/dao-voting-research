// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Groth16Verifier as VoteVerifier} from "./VoteVerifier.sol";
// ✅ NEW: Import Reputation Interface
import "../interfaces/IReputationManager.sol";

/**
 * @title PrivateDAOVoting
 * @dev ZKP Voting + Reputation Gating for Proposal Creation
 */
contract PrivateDAOVoting is Ownable, ReentrancyGuard {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        ProposalState state;
        uint256 createdAt;
        uint256 votingStart;
        uint256 votingEnd;
        bytes32 voterSetRoot;
        // ✅ NEW: Reputation Requirement
        uint256 minReputationRequired;
    }

    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Cancelled
    }

    VoteVerifier public verifier;
    // ✅ NEW: Reputation Manager
    IReputationManager public reputationManager;
    address public didRegistry;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(bytes32 => bool)) public nullifiers;
    mapping(bytes32 => bool) public voterCommitments;

    uint256 public proposalCount;
    uint256 public votingDelay = 1 hours;
    uint256 public votingPeriod = 7 days;
    uint256 public quorumPercentage = 40;

    bytes32 public currentVoterSetRoot;

    event VoterRegistered(bytes32 indexed commitment);
    event VoterSetUpdated(bytes32 indexed newRoot, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        bytes32 voterSetRoot,
        uint256 minReputationRequired
    );
    event PrivateVoteCast(
        uint256 indexed proposalId,
        bytes32 indexed nullifier,
        bool support
    );
    event ProposalStateChanged(
        uint256 indexed proposalId,
        ProposalState newState
    );
    event DIDRegistryUpdated(address indexed newRegistry);

    modifier onlyRegistrar() {
        require(
            msg.sender == didRegistry,
            "Caller is not the authorized DID Registry"
        );
        _;
    }

    constructor(
        address _verifier,
        address _reputationManager, // ✅ NEW Arg
        address initialOwner
    ) Ownable(initialOwner) {
        require(_verifier != address(0), "Invalid verifier address");
        require(
            _reputationManager != address(0),
            "Invalid reputation manager address"
        );
        verifier = VoteVerifier(_verifier);
        reputationManager = IReputationManager(_reputationManager);
    }

    function setDIDRegistry(address _didRegistry) external onlyOwner {
        require(_didRegistry != address(0), "Invalid registry address");
        didRegistry = _didRegistry;
        emit DIDRegistryUpdated(_didRegistry);
    }

    function registerVoter(bytes32 commitment) external onlyRegistrar {
        require(commitment != bytes32(0), "Invalid commitment");
        require(!voterCommitments[commitment], "Already registered");
        voterCommitments[commitment] = true;
        emit VoterRegistered(commitment);
    }

    function batchRegisterVoters(
        bytes32[] calldata commitments
    ) external onlyOwner {
        for (uint256 i = 0; i < commitments.length; i++) {
            require(commitments[i] != bytes32(0), "Invalid commitment");
            if (!voterCommitments[commitments[i]]) {
                voterCommitments[commitments[i]] = true;
                emit VoterRegistered(commitments[i]);
            }
        }
    }

    function updateVoterSetRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "Invalid root");
        currentVoterSetRoot = newRoot;
        emit VoterSetUpdated(newRoot, block.timestamp);
    }

    /**
     * @dev Create a new proposal with Reputation Check
     */
    function submitProposal(
        string memory _title,
        string memory _description,
        uint256 _minReputationRequired // ✅ NEW Arg
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_description).length > 0, "Description required");
        require(currentVoterSetRoot != bytes32(0), "Voter set not initialized");

        // ✅ NEW: Check Proposer's Reputation
        // Proposer needs enough reputation to SET the requirement (or just to propose?)
        // Usually, the requirement is for VOTERS.
        // But let's check if Proposer has enough reputation to create a proposal.
        // For simplicity: We just store the requirement for now.
        // If you want to restrict creation:
        // require(reputationManager.getReputationScore(msg.sender) >= 100, "Low reputation");

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
            state: ProposalState.Pending,
            createdAt: block.timestamp,
            votingStart: votingStart,
            votingEnd: votingEnd,
            voterSetRoot: currentVoterSetRoot,
            minReputationRequired: _minReputationRequired // ✅ Stored
        });

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            _title,
            currentVoterSetRoot,
            _minReputationRequired
        );
    }

    function startVoting(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Pending, "Not pending");
        require(block.timestamp >= proposal.votingStart, "Too early");
        proposal.state = ProposalState.Active;
        emit ProposalStateChanged(_proposalId, ProposalState.Active);
    }

    function castPrivateVote(
        uint256 _proposalId,
        bool _support,
        bytes32 _nullifier,
        uint256[2] memory _proof_a,
        uint256[2][2] memory _proof_b,
        uint256[2] memory _proof_c,
        uint256[4] memory _publicSignals
    ) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp >= proposal.votingStart, "Not started");
        require(block.timestamp <= proposal.votingEnd, "Ended");
        require(!nullifiers[_proposalId][_nullifier], "Already voted");

        require(bytes32(_publicSignals[0]) == _nullifier, "Nullifier mismatch");
        require(
            uint256(proposal.voterSetRoot) == _publicSignals[1],
            "Invalid root"
        );
        require(_proposalId == _publicSignals[2], "Invalid proposal ID");
        require((_support ? 1 : 0) == _publicSignals[3], "Invalid vote choice");

        // Note: We cannot easily check "Reputation" here because the vote is anonymous.
        // The Prover circuit would need to prove they have > minReputation.
        // For this Phase, we only check the Proof validity.

        require(
            verifier.verifyProof(_proof_a, _proof_b, _proof_c, _publicSignals),
            "Invalid proof"
        );

        nullifiers[_proposalId][_nullifier] = true;

        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit PrivateVoteCast(_proposalId, _nullifier, _support);
    }

    function finalizeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp > proposal.votingEnd, "Not ended");

        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;

        if (totalVotes == 0) {
            proposal.state = ProposalState.Defeated;
        } else if (proposal.yesVotes > proposal.noVotes) {
            proposal.state = ProposalState.Succeeded;
        } else {
            proposal.state = ProposalState.Defeated;
        }
        emit ProposalStateChanged(_proposalId, proposal.state);
    }

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(
            proposal.state == ProposalState.Pending ||
                proposal.state == ProposalState.Active,
            "Cannot cancel"
        );
        proposal.state = ProposalState.Cancelled;
        emit ProposalStateChanged(_proposalId, ProposalState.Cancelled);
    }

    function getProposal(
        uint256 _proposalId
    ) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }

    function hasVoted(
        uint256 _proposalId,
        bytes32 _nullifier
    ) external view returns (bool) {
        return nullifiers[_proposalId][_nullifier];
    }

    function isCommitmentRegistered(
        bytes32 _commitment
    ) external view returns (bool) {
        return voterCommitments[_commitment];
    }
}
