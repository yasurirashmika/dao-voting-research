import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useProposals } from "../../hooks/useProposals";
import { useVoting } from "../../hooks/useVoting";
import { useContract } from "../../hooks/useContract";
import DAOVotingABI from "../../abis/DAOVoting.json";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Modal from "../../components/common/Modal/Modal";
import Loader from "../../components/common/Loader/Loader";
import Alert from "../../components/common/Alert/Alert";
import {
  formatAddress,
  formatDate,
  formatLargeNumber,
} from "../../utils/formatters";
import "./ProposalDetails.css";

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { getProposal, proposals } = useProposals();
  const { castVote, getVote, loading: voteLoading } = useVoting();
  const { write } = useContract("DAOVoting", DAOVotingABI.abi);

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [voteReason, setVoteReason] = useState("");
  const [userVote, setUserVote] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // ✅ NEW: Alert state
  const [alert, setAlert] = useState(null);

  // ✅ NEW: Helper to show alerts
  const showAlert = (type, title, message, duration = 5000) => {
    setAlert({ type, title, message });
    if (duration) {
      setTimeout(() => setAlert(null), duration);
    }
  };

  // ✅ NEW: Parse MetaMask errors into user-friendly messages
  const parseError = (error) => {
    const errorString = error?.message || error?.toString() || 'Unknown error';
    
    if (errorString.includes('User denied') || errorString.includes('user rejected')) {
      return {
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction in MetaMask. No gas fees were charged.'
      };
    }
    
    if (errorString.includes('insufficient funds')) {
      return {
        title: 'Insufficient Funds',
        message: 'You don\'t have enough ETH to pay for gas fees.'
      };
    }
    
    if (errorString.includes('Already voted')) {
      return {
        title: 'Already Voted',
        message: 'You have already cast your vote on this proposal.'
      };
    }
    
    if (errorString.includes('Voting not yet started')) {
      return {
        title: 'Voting Not Started',
        message: 'The voting period for this proposal has not started yet.'
      };
    }
    
    if (errorString.includes('Voting period has ended')) {
      return {
        title: 'Voting Ended',
        message: 'The voting period for this proposal has ended.'
      };
    }
    
    if (errorString.includes('Insufficient tokens')) {
      return {
        title: 'Insufficient Tokens',
        message: 'You don\'t have enough tokens to vote on this proposal.'
      };
    }
    
    if (errorString.includes('Insufficient reputation')) {
      return {
        title: 'Insufficient Reputation',
        message: 'Your reputation score is too low to vote on this proposal.'
      };
    }
    
    return {
      title: 'Transaction Failed',
      message: errorString.length > 100 ? 'An error occurred. Please try again.' : errorString
    };
  };

  useEffect(() => {
    loadProposal();
  }, [id, proposals]);

  useEffect(() => {
    if (proposal && address) {
      checkUserVote();
    }
  }, [proposal, address]);

  const loadProposal = async () => {
    const existingProposal = proposals.find((p) => p.id === Number(id));

    if (existingProposal) {
      setProposal(existingProposal);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getProposal(id);
      setProposal(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading proposal:", error);
      setLoading(false);
    }
  };

  const checkUserVote = async () => {
    if (!address || !proposal) return;

    try {
      const vote = await getVote(id, address);
      setUserVote(vote);
    } catch (error) {
      console.error("Error checking vote:", error);
    }
  };

  const handleVoteClick = (support) => {
    if (!isConnected) {
      showAlert('warning', 'Wallet Not Connected', 'Please connect your wallet to vote.', 3000);
      return;
    }
    setSelectedVote(support);
    setShowVoteModal(true);
  };

  const handleSubmitVote = async () => {
    try {
      await castVote(proposal.id, selectedVote);
      setShowVoteModal(false);
      setVoteReason("");
      showAlert('success', 'Vote Cast Successfully!', 'Your vote has been recorded on the blockchain.');
      await loadProposal();
      await checkUserVote();
    } catch (error) {
      console.error("Error casting vote:", error);
      const { title, message } = parseError(error);
      showAlert('error', title, message);
    }
  };

  const handleStartVoting = async () => {
    if (!isConnected) {
      showAlert('warning', 'Wallet Not Connected', 'Please connect your wallet to start voting.');
      return;
    }

    setActionLoading(true);
    try {
      await write("startVoting", [proposal.id]);
      showAlert('success', 'Voting Started!', 'The voting period has begun.');
      await loadProposal();
    } catch (error) {
      console.error("Error starting voting:", error);
      const { title, message } = parseError(error);
      showAlert('error', title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeProposal = async () => {
    if (!isConnected) {
      showAlert('warning', 'Wallet Not Connected', 'Please connect your wallet to finalize.');
      return;
    }

    setActionLoading(true);
    try {
      await write("finalizeProposal", [proposal.id]);
      showAlert('success', 'Proposal Finalized!', 'The final results have been calculated.');
      await loadProposal();
    } catch (error) {
      console.error("Error finalizing proposal:", error);
      const { title, message } = parseError(error);
      showAlert('error', title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelProposal = async () => {
    if (!isConnected) {
      showAlert('warning', 'Wallet Not Connected', 'Please connect your wallet to cancel.');
      return;
    }

    setActionLoading(true);
    try {
      await write("cancelProposal", [proposal.id]);
      showAlert('success', 'Proposal Cancelled', 'This proposal has been cancelled.');
      await loadProposal();
    } catch (error) {
      console.error("Error canceling proposal:", error);
      const { title, message } = parseError(error);
      showAlert('error', title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const getProposalStateLabel = (state) => {
    const labels = [
      "Pending",
      "Active",
      "Passed",
      "Rejected",
      "Executed",
      "Canceled",
    ];
    return labels[state] || "Unknown";
  };

  const getProposalStateColor = (state) => {
    const colors = {
      0: "#FFA500",
      1: "#4CAF50",
      2: "#2196F3",
      3: "#F44336",
      4: "#9C27B0",
      5: "#757575",
    };
    return colors[state] || "#000000";
  };

  // ✅ NEW: Calculate time remaining
  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading || !proposal) {
    return (
      <div className="proposal-loading">
        <Loader size="large" text="Loading proposal..." />
      </div>
    );
  }

  if (!loading && !proposal) {
    return (
      <Card padding="large" className="proposal-not-found">
        <h2>Proposal Not Found</h2>
        <p>The proposal you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/proposals")}>
          Back to Proposals
        </Button>
      </Card>
    );
  }

  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const canVote = proposal.state === 1 && !userVote?.hasVoted;
  const isProposer = proposal.proposer.toLowerCase() === address?.toLowerCase();
  const currentTime = Math.floor(Date.now() / 1000);
  const votingEnded = currentTime > proposal.votingEnd;
  const votingStarted = currentTime >= proposal.votingStart;
  const timeRemaining = getTimeRemaining(proposal.votingEnd);

  return (
    <div className="proposal-details-page">
      <Button variant="ghost" onClick={() => navigate("/proposals")}>
        ← Back to Proposals
      </Button>

      {/* ✅ NEW: Alert display */}
      {alert && (
        <Alert 
          type={alert.type} 
          title={alert.title}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <div className="proposal-details-grid">
        <div className="proposal-main">
          <Card padding="large">
            <div className="proposal-header">
              <span
                className="proposal-status-badge"
                style={{
                  backgroundColor: getProposalStateColor(proposal.state),
                }}
              >
                {getProposalStateLabel(proposal.state)}
              </span>
              <h1 className="proposal-title">{proposal.title}</h1>
              <div className="proposal-meta">
                <span>Proposed by {formatAddress(proposal.proposer)}</span>
                <span>•</span>
                <span>{formatDate(proposal.createdAt, "long")}</span>
              </div>
            </div>

            <div className="proposal-description">
              <h3>Description</h3>
              <p>{proposal.description}</p>
            </div>

            {/* ✅ ENHANCED: Pending State */}
            {proposal.state === 0 && (
              <div className="proposal-status-section">
                <Alert type="info" title="⏳ Proposal is Pending">
                  <div>
                    <p style={{ marginBottom: '0.75rem' }}>
                      This proposal is waiting for the voting period to start.
                    </p>
                    <div style={{ fontSize: '0.9rem', color: 'inherit', opacity: 0.9 }}>
                      <div><strong>Voting starts:</strong> {formatDate(proposal.votingStart, 'long')}</div>
                      <div><strong>Voting ends:</strong> {formatDate(proposal.votingEnd, 'long')}</div>
                      <div><strong>Duration:</strong> 7 days</div>
                    </div>
                  </div>
                </Alert>
                
                {isProposer && (
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleStartVoting}
                    disabled={actionLoading || !votingStarted}
                    loading={actionLoading}
                    style={{ marginTop: '1rem' }}
                  >
                    {votingStarted ? 'Start Voting Period' : 'Waiting for scheduled start time'}
                  </Button>
                )}
              </div>
            )}

            {/* Vote Actions (Active State) */}
            {canVote && (
              <div className="vote-actions">
                <h3>Cast Your Vote</h3>
                {timeRemaining && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: '#0369a1'
                  }}>
                    ⏰ Time remaining: <strong>{timeRemaining}</strong>
                  </div>
                )}
                <div className="vote-buttons">
                  <Button
                    variant="success"
                    size="large"
                    fullWidth
                    onClick={() => handleVoteClick(true)}
                    disabled={voteLoading}
                  >
                    Vote Yes 👍
                  </Button>
                  <Button
                    variant="danger"
                    size="large"
                    fullWidth
                    onClick={() => handleVoteClick(false)}
                    disabled={voteLoading}
                  >
                    Vote No 👎
                  </Button>
                </div>
              </div>
            )}

            {/* Finalize Button */}
            {proposal.state === 1 && votingEnded && (
              <div className="proposal-status-section">
                <Alert type="warning" title="⏱️ Voting Period Ended">
                  This proposal needs to be finalized to calculate the final results and determine if it passed or was rejected.
                </Alert>
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={handleFinalizeProposal}
                  disabled={actionLoading}
                  loading={actionLoading}
                  style={{ marginTop: '1rem' }}
                >
                  Finalize Proposal
                </Button>
              </div>
            )}

            {/* User Vote Status */}
            {userVote?.hasVoted && (
              <div className="voted-notice">
                ✓ You voted {userVote.support ? "YES" : "NO"} on this proposal
              </div>
            )}

            {/* Cancel Button */}
            {(proposal.state === 0 || proposal.state === 1) && isProposer && (
              <div style={{ marginTop: "1rem" }}>
                <Button
                  variant="danger"
                  size="medium"
                  onClick={handleCancelProposal}
                  disabled={actionLoading}
                >
                  Cancel Proposal
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - same as before */}
        <div className="proposal-sidebar">
          <Card padding="medium">
            <h3 className="sidebar-title">Voting Results</h3>
            
            <div className="vote-breakdown">
              <div className="vote-item vote-for">
                <div className="vote-item-header">
                  <span className="vote-item-label">Yes</span>
                  <span className="vote-item-value">
                    {formatLargeNumber(proposal.yesVotes)}
                  </span>
                </div>
                <div className="vote-item-bar">
                  <div
                    className="vote-item-fill"
                    style={{
                      width: totalVotes > 0 ? `${(proposal.yesVotes / totalVotes) * 100}%` : "0%",
                      backgroundColor: "#4CAF50",
                    }}
                  />
                </div>
                <span className="vote-item-percentage">
                  {totalVotes > 0 ? `${((proposal.yesVotes / totalVotes) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>

              <div className="vote-item vote-against">
                <div className="vote-item-header">
                  <span className="vote-item-label">No</span>
                  <span className="vote-item-value">
                    {formatLargeNumber(proposal.noVotes)}
                  </span>
                </div>
                <div className="vote-item-bar">
                  <div
                    className="vote-item-fill"
                    style={{
                      width: totalVotes > 0 ? `${(proposal.noVotes / totalVotes) * 100}%` : "0%",
                      backgroundColor: "#F44336",
                    }}
                  />
                </div>
                <span className="vote-item-percentage">
                  {totalVotes > 0 ? `${((proposal.noVotes / totalVotes) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            </div>

            <div className="total-votes">
              <span>Total Votes</span>
              <span className="total-votes-value">
                {formatLargeNumber(totalVotes)}
              </span>
            </div>
          </Card>

          <Card padding="medium">
            <h3 className="sidebar-title">Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">
                  {getProposalStateLabel(proposal.state)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Proposal ID</span>
                <span className="info-value">#{proposal.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Voting Start</span>
                <span className="info-value">
                  {formatDate(proposal.votingStart)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Voting End</span>
                <span className="info-value">
                  {formatDate(proposal.votingEnd)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Voting Weight</span>
                <span className="info-value">
                  {formatLargeNumber(proposal.totalVotingWeight)}
                </span>
              </div>
              {timeRemaining && (
                <div className="info-item">
                  <span className="info-label">Time Remaining</span>
                  <span className="info-value" style={{ color: "#4CAF50", fontWeight: "bold" }}>
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Vote Modal */}
      <Modal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        title="Cast Your Vote"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVote} loading={voteLoading}>
              Submit Vote
            </Button>
          </>
        }
      >
        <div className="vote-modal-content">
          <p>
            You are voting <strong>{selectedVote ? "YES" : "NO"}</strong> on this proposal.
          </p>
          
          <Input
            label="Reason (Optional)"
            multiline
            rows={4}
            value={voteReason}
            onChange={(e) => setVoteReason(e.target.value)}
            placeholder="Share why you're voting this way..."
            helperText="Note: Vote reason is not stored on-chain in current contract"
          />

          <Alert type="warning" title="⚠️ Important">
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
              <li>Your vote is final and cannot be changed</li>
              <li>This will cost gas fees</li>
              {userVote?.weight && <li>Your voting weight: {userVote.weight}</li>}
            </ul>
          </Alert>
        </div>
      </Modal>
    </div>
  );
};

export default ProposalDetails;