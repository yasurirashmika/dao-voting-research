/* src/pages/ProposalDetails/ProposalDetails.jsx */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useProposals } from "../../hooks/useProposals";
import { useContract } from "../../hooks/useContract";
import { useDeployment } from "../../context/DeploymentContext";
import DAOVotingABI from "../../abis/DAOVoting.json";
import PrivateDAOVotingABI from "../../abis/PrivateDAOVoting.json";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Modal from "../../components/common/Modal/Modal";
import Loader from "../../components/common/Loader/Loader";
import Alert from "../../components/common/Alert/Alert";
import ReactMarkdown from "react-markdown";
import ZKVotingModule from "../../components/voting/ZKVotingModule/ZKVotingModule";
import {
  formatAddress,
  formatDate,
  formatLargeNumber,
  formatNumber,
} from "../../utils/formatters";
import {
  getProposalStateLabel,
  getProposalStateColor,
} from "../../utils/helpers";
import "./ProposalDetails.css";

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { mode } = useDeployment();

  // ✅ 1. Get refreshProposals from the hook
  const { getProposal, castVote, hasVoted, isContractReady, refreshProposals } = useProposals();

  const contractName = mode === "private" ? "PrivateDAOVoting" : "DAOVoting";
  const contractAbi = mode === "private" ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;
  const { write, read, contract } = useContract(contractName, contractAbi);

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [voteReason, setVoteReason] = useState("");
  const [userVote, setUserVote] = useState({ hasVoted: false, support: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const showAlert = (type, title, message, duration = 5000) => {
    setAlert({ type, title, message });
    if (duration) setTimeout(() => setAlert(null), duration);
  };

  const parseError = (error) => {
    const errorString = error?.message || error?.toString() || "Unknown error";
    if (errorString.includes("User denied"))
      return { title: "Cancelled", message: "Transaction cancelled." };
    if (errorString.includes("Already voted"))
      return { title: "Already Voted", message: "You have already voted." };
    return {
      title: "Failed",
      message: errorString.length > 100 ? "An error occurred." : errorString,
    };
  };

  const checkRegistration = useCallback(async () => {
    if (!contract || !address) return;
    if (mode === "private") {
      setIsRegistered(true);
      return;
    }
    try {
      const status = await read("registeredVoters", [address]);
      setIsRegistered(status);
    } catch (err) {
      console.error("Error checking registration:", err);
      setIsRegistered(false);
    }
  }, [contract, address, read, mode]);

  const loadProposalData = useCallback(async () => {
    if (!id || !isContractReady) return;

    // Only set loading on first load to prevent flickering during refresh
    if (!proposal) setLoading(true); 
    
    try {
      const data = await getProposal(id);
      if (!data) return;

      setProposal(data);

      if (address && isConnected) {
        const voted = await hasVoted(id, address);
        if (voted === true) {
          setUserVote({ hasVoted: true, support: null });
        } else if (Array.isArray(voted)) {
          setUserVote({ hasVoted: voted[0], support: voted[1] });
        } else if (typeof voted === "object") {
          setUserVote({
            hasVoted: voted.hasVotedOnProposal || voted.hasVoted,
            support: voted.support,
          });
        }
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
    } finally {
      setLoading(false);
    }
  }, [id, address, isConnected, getProposal, hasVoted, isContractReady]);

  useEffect(() => {
    if (contract && address) {
      checkRegistration();
    }
  }, [contract, address, checkRegistration]);

  useEffect(() => {
    loadProposalData();
  }, [loadProposalData]);

  // ✅ 2. New Handler for ZK Voting Success
  const handleZKVoteSuccess = async (voteChoice) => {
    console.log("🎉 ZK Vote Success Detected!");
    
    // Update local UI immediately so user sees feedback
    setUserVote({ 
        hasVoted: true, 
        support: voteChoice === "yes" 
    });

    // Wait a moment for blockchain to index, then refresh data
    setTimeout(async () => {
        console.log("🔄 Refreshing proposal data...");
        refreshProposals(); // Update global list
        await loadProposalData(); // Update this page details
    }, 2000);
  };

  const handleVoteClick = (support) => {
    if (!isConnected) {
      showAlert("warning", "Wallet Not Connected", "Please connect your wallet to vote.", 3000);
      return;
    }
    if (mode === "baseline" && !isRegistered) {
      showAlert("error", "Not Registered", "You must be a registered voter to participate.");
      return;
    }
    setSelectedVote(support);
    setShowVoteModal(true);
  };

  const handleSubmitVote = async () => {
    setActionLoading(true);
    try {
      await castVote(proposal.id, selectedVote);
      setShowVoteModal(false);
      setVoteReason("");
      
      setUserVote({ hasVoted: true, support: selectedVote });
      showAlert("success", "Vote Cast Successfully!", "Your vote has been recorded.");
      
      // ✅ Refresh data after standard voting
      refreshProposals();
      await loadProposalData();
      
    } catch (error) {
      const { title, message } = parseError(error);
      showAlert("error", title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVoting = async () => {
    if (!isConnected) return;
    setActionLoading(true);
    try {
      await write("startVoting", [proposal.id]);
      showAlert("success", "Voting Started!", "The voting period has begun.");
      refreshProposals();
      await loadProposalData();
    } catch (error) {
      const { title, message } = parseError(error);
      showAlert("error", title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeProposal = async () => {
    if (!isConnected) return;
    setActionLoading(true);
    try {
      await write("finalizeProposal", [proposal.id]);
      showAlert("success", "Proposal Finalized!", "The final results have been calculated.");
      refreshProposals();
      await loadProposalData();
    } catch (error) {
      const { title, message } = parseError(error);
      showAlert("error", title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelProposal = async () => {
    if (!isConnected) return;
    setActionLoading(true);
    try {
      await write("cancelProposal", [proposal.id]);
      showAlert("success", "Proposal Cancelled", "This proposal has been cancelled.");
      refreshProposals();
      await loadProposalData();
    } catch (error) {
      const { title, message } = parseError(error);
      showAlert("error", title, message);
    } finally {
      setActionLoading(false);
    }
  };

  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  if (loading)
    return (
      <div className="proposal-loading">
        <Loader size="large" text={!contract ? "Connecting..." : "Loading..."} />
      </div>
    );

  if (!proposal)
    return (
      <Card padding="large">
        <h2>Proposal Not Found</h2>
        <Button onClick={() => navigate("/proposals")}>Back</Button>
      </Card>
    );

  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const canVote = proposal.state === 1;
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
              <div className="markdown-content">
                <ReactMarkdown>{proposal.description}</ReactMarkdown>
              </div>
            </div>

            {/* Voting Section */}
            {canVote && (
              <div className="vote-actions">
                <h3>Cast Your Vote</h3>
                {timeRemaining && (
                  <div className="-noticeinfo">
                    ⏰ Time remaining: <strong>{timeRemaining}</strong>
                  </div>
                )}

                {userVote.hasVoted ? (
                  <div className="voted-notice">
                    {userVote.support ? "👍" : "👎"} You voted{" "}
                    {userVote.support ? "YES" : "NO"}
                  </div>
                ) : (
                  <>
                    {!isRegistered && mode === "baseline" && (
                      <div className="voting-closed-notice">
                        ⚠️ Voting Restricted - You are not registered in the
                        DAO. Only registered members can vote.
                      </div>
                    )}

                    {mode === "private" ? (
                      <div className="zk-voting-container" style={{ marginTop: '20px' }}>
                        {/* ✅ Pass the Success Handler Here */}
                        <ZKVotingModule 
                            preselectedProposalId={proposal.id} 
                            onVoteSuccess={handleZKVoteSuccess} 
                        />
                      </div>
                    ) : (
                      <div className="vote-buttons">
                        <Button
                          variant="success"
                          size="large"
                          fullWidth
                          onClick={() => handleVoteClick(true)}
                          disabled={actionLoading || !isRegistered}
                        >
                          Vote Yes 👍
                        </Button>
                        <Button
                          variant="danger"
                          size="large"
                          fullWidth
                          onClick={() => handleVoteClick(false)}
                          disabled={actionLoading || !isRegistered}
                        >
                          Vote No 👎
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Other States */}
            {proposal.state === 0 && (
              <div className="proposal-status-section">
                <Alert type="info" title="⏳ Proposal is Pending">
                  Voting starts: {formatDate(proposal.votingStart, "long")}
                </Alert>
                {isProposer && (
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleStartVoting}
                    disabled={actionLoading || !votingStarted}
                    loading={actionLoading}
                  >
                    {votingStarted
                      ? "Start Voting Period"
                      : "Waiting for scheduled start time"}
                  </Button>
                )}
              </div>
            )}

            {proposal.state === 1 && votingEnded && !userVote.hasVoted && (
              <div className="proposal-status-section">
                <Alert type="warning" title="⏱️ Voting Ended">
                  You missed the voting window for this proposal.
                </Alert>
              </div>
            )}

            {proposal.state === 1 && votingEnded && (
              <div className="proposal-status-section">
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={handleFinalizeProposal}
                  disabled={actionLoading}
                  loading={actionLoading}
                >
                  Finalize Proposal
                </Button>
              </div>
            )}

            {(proposal.state === 0 || proposal.state === 1) && isProposer && (
              <div className="proposal-status-section">
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

        <div className="proposal-sidebar">
          {/* Voting Requirements Card */}
          <Card padding="medium" className="requirements-card">
            <h3 className="sidebar-title">Voting Requirements</h3>
            <div className="info-item">
              {mode === "private" ? (
                <>
                  <span className="info-label">Min Reputation</span>
                  <span className="info-value">
                    {proposal.minReputationRequired || 0} Points
                  </span>
                </>
              ) : (
                <>
                  <span className="info-label">Min Tokens</span>
                  <span className="info-value">
                    {formatNumber(proposal.minTokensRequired || 0)} GOV
                  </span>
                </>
              )}
            </div>
          </Card>

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
                      width:
                        totalVotes > 0
                          ? `${(proposal.yesVotes / totalVotes) * 100}%`
                          : "0%",
                      backgroundColor: "#4CAF50",
                    }}
                  />
                </div>
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
                      width:
                        totalVotes > 0
                          ? `${(proposal.noVotes / totalVotes) * 100}%`
                          : "0%",
                      backgroundColor: "#F44336",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="total-votes">
              <span>Total Votes</span>
              <span className="total-votes-value">
                {formatLargeNumber(totalVotes)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Quorum Required</span>
              <span className="info-value">{formatLargeNumber(40000)}</span>
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
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        title="Cast Your Vote"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVote} loading={actionLoading}>
              Submit Vote
            </Button>
          </>
        }
      >
        <div className="vote-modal-content">
          <p>
            You are voting <strong>{selectedVote ? "YES" : "NO"}</strong> on
            this proposal.
          </p>
          <Input
            label="Reason (Optional)"
            multiline
            rows={4}
            value={voteReason}
            onChange={(e) => setVoteReason(e.target.value)}
            placeholder="Share why you're voting this way..."
          />
          <Alert type="warning" title="⚠️ Important">
            Your vote is final and will cost gas fees.
          </Alert>
        </div>
      </Modal>
    </div>
  );
};

export default ProposalDetails;