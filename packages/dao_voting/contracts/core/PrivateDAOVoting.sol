// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// Fix: SnarkJS generates 'contract Verifier', so we alias it to VoteVerifier here
import { Groth16Verifier as VoteVerifier } from "./VoteVerifier.sol";

/**
 * @title PrivateDAOVoting
 * @dev Zero-knowledge proof enabled DAO voting with privacy guarantees
 * @notice Uses zk-SNARKs to enable private voting while preventing double-voting
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
        bytes32 voterSetRoot; // Merkle root of eligible voters
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

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(bytes32 => bool)) public nullifiers; // proposalId => nullifier => used
    mapping(bytes32 => bool) public voterCommitments; // commitment => registered

    uint256 public proposalCount;
    uint256 public votingDelay = 1 hours;
    uint256 public votingPeriod = 7 days;
    uint256 public quorumPercentage = 40;

    bytes32 public currentVoterSetRoot; // Current Merkle root

    event VoterRegistered(bytes32 indexed commitment);
    event VoterSetUpdated(bytes32 indexed newRoot, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        bytes32 voterSetRoot
    );
    event PrivateVoteCast(
        uint256 indexed proposalId,
        bytes32 indexed nullifier,
        bool support
    );
    event ProposalStateChanged(uint256 indexed proposalId, ProposalState newState);

    constructor(address _verifier, address initialOwner) Ownable(initialOwner) {
        require(_verifier != address(0), "Invalid verifier address");
        verifier = VoteVerifier(_verifier);
    }

    /**
     * @dev Register voter commitment (off-chain identity verification required)
     * @param commitment Hash of voter's secret
     */
    function registerVoter(bytes32 commitment) external onlyOwner {
        require(commitment != bytes32(0), "Invalid commitment");
        require(!voterCommitments[commitment], "Already registered");

        voterCommitments[commitment] = true;
        emit VoterRegistered(commitment);
    }

    /**
     * @dev Batch register voters
     */
    function batchRegisterVoters(bytes32[] calldata commitments) external onlyOwner {
        for (uint256 i = 0; i < commitments.length; i++) {
            require(commitments[i] != bytes32(0), "Invalid commitment");
            require(!voterCommitments[commitments[i]], "Duplicate commitment");
            
            voterCommitments[commitments[i]] = true;
            emit VoterRegistered(commitments[i]);
        }
    }

    /**
     * @dev Update voter set Merkle root
     * @param newRoot New Merkle root of voter commitments
     */
    function updateVoterSetRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "Invalid root");
        currentVoterSetRoot = newRoot;
        emit VoterSetUpdated(newRoot, block.timestamp);
    }

    /**
     * @dev Create a new proposal
     */
    function submitProposal(
        string memory _title,
        string memory _description
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_description).length > 0, "Description required");
        require(currentVoterSetRoot != bytes32(0), "Voter set not initialized");

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
            voterSetRoot: currentVoterSetRoot
        });

        emit ProposalCreated(proposalCount, msg.sender, _title, currentVoterSetRoot);
    }

    /**
     * @dev Start voting on a proposal
     */
    function startVoting(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Pending, "Not pending");
        require(block.timestamp >= proposal.votingStart, "Too early");

        proposal.state = ProposalState.Active;
        emit ProposalStateChanged(_proposalId, ProposalState.Active);
    }

    /**
     * @dev Cast a private vote using zero-knowledge proof
     * @param _proposalId Proposal ID
     * @param _support Vote choice (true = yes, false = no)
     * @param _nullifier Unique nullifier to prevent double voting
     * @param _proof_a zk-SNARK proof A
     * @param _proof_b zk-SNARK proof B
     * @param _proof_c zk-SNARK proof C
     * @param _publicSignals [nullifier, root, proposalId, voteChoice]
     */
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
        
        // 1. Checks
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp >= proposal.votingStart, "Not started");
        require(block.timestamp <= proposal.votingEnd, "Ended");
        require(!nullifiers[_proposalId][_nullifier], "Already voted");

        // 2. Validate Public Signals Logic
        // Verify that the Nullifier passed in matches the one in the proof
        require(bytes32(_publicSignals[0]) == _nullifier, "Nullifier mismatch");
        // Verify Merkle Root matches the proposal's root
        require(uint256(proposal.voterSetRoot) == _publicSignals[1], "Invalid root");
        // Verify Proposal ID matches
        require(_proposalId == _publicSignals[2], "Invalid proposal ID");
        // Verify Vote Choice matches the boolean support (1=Yes, 0=No)
        require((_support ? 1 : 0) == _publicSignals[3], "Invalid vote choice");

        // 3. Verify zk-SNARK proof
        require(
            verifier.verifyProof(
                _proof_a,
                _proof_b,
                _proof_c,
                _publicSignals
            ),
            "Invalid proof"
        );

        // 4. Register Vote
        nullifiers[_proposalId][_nullifier] = true;

        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit PrivateVoteCast(_proposalId, _nullifier, _support);
    }

    /**
     * @dev Finalize proposal after voting ends
     */
    function finalizeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp > proposal.votingEnd, "Not ended");

        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        
        // Simple majority logic
        if (totalVotes == 0) {
            proposal.state = ProposalState.Defeated;
        } else if (proposal.yesVotes > proposal.noVotes) {
            proposal.state = ProposalState.Succeeded;
        } else {
            proposal.state = ProposalState.Defeated;
        }

        emit ProposalStateChanged(_proposalId, proposal.state);
    }

    /**
     * @dev Cancel proposal (proposer or owner only)
     */
    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(
            proposal.state == ProposalState.Pending || proposal.state == ProposalState.Active,
            "Cannot cancel"
        );

        proposal.state = ProposalState.Cancelled;
        emit ProposalStateChanged(_proposalId, ProposalState.Cancelled);
    }

    // View functions
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }

    function hasVoted(uint256 _proposalId, bytes32 _nullifier) external view returns (bool) {
        return nullifiers[_proposalId][_nullifier];
    }

    function isCommitmentRegistered(bytes32 _commitment) external view returns (bool) {
        return voterCommitments[_commitment];
    }
}