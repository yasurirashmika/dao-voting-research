import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useProposals } from "../../hooks/useProposals";
import { useContract } from "../../hooks/useContract";
import DAOVotingABI from "../../abis/DAOVoting.json";
import PrivateDAOVotingABI from "../../abis/PrivateDAOVoting.json";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Modal from "../../components/common/Modal/Modal";
import Loader from "../../components/common/Loader/Loader";
import Alert from "../../components/common/Alert/Alert";
import ReactMarkdown from "react-markdown";
import {
  formatAddress,
  formatDate,
  formatLargeNumber,
  formatNumber
} from "../../utils/formatters";
import {
  getProposalStateLabel,
  getProposalStateColor 
} from "../../utils/helpers";
import "./ProposalDetails.css";

const DEPLOYMENT_MODE = process.env.REACT_APP_DEPLOYMENT_MODE || "baseline";

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // ✅ Consolidated hook usage
  const { getProposal, castVote, hasVoted } = useProposals();

  // ✅ Dynamic Contract Selection for Admin Actions (Start/Cancel/Finalize)
  const contractName =
    DEPLOYMENT_MODE === "private" ? "PrivateDAOVoting" : "DAOVoting";
  const contractAbi =
    DEPLOYMENT_MODE === "private" ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;
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
    if (duration) {
      setTimeout(() => setAlert(null), duration);
    }
  };

  const parseError = (error) => {
    const errorString = error?.message || error?.toString() || "Unknown error";
    if (errorString.includes("User denied"))
      return {
        title: "Transaction Cancelled",
        message: "You cancelled the transaction.",
      };
    if (errorString.includes("Already voted"))
      return {
        title: "Already Voted",
        message: "You have already voted on this proposal.",
      };
    return {
      title: "Transaction Failed",
      message: errorString.length > 100 ? "An error occurred." : errorString,
    };
  };

  // ✅ Check Registration (Public Only)
  useEffect(() => {
    if (contract && address) {
      if (DEPLOYMENT_MODE === "baseline") {
        checkRegistration();
      } else {
        // In private mode, registration is handled by DID, but for UI state we allow interaction
        setIsRegistered(true);
      }
    }
  }, [contract, address]);

  const checkRegistration = async () => {
    try {
      // Public contract uses 'registeredVoters' mapping
      const status = await read("registeredVoters", [address]);
      setIsRegistered(status);
    } catch (err) {
      console.error("Error checking registration:", err);
    }
  };

  // ✅ Load Proposal Data
  const loadProposalData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getProposal(id);
      setProposal(data);

      // Check vote status
      if (address && isConnected) {
        const voted = await hasVoted(id, address);

        if (voted === true) {
          setUserVote({ hasVoted: true, support: null });
        } else if (Array.isArray(voted)) {
          // Handle if return is [hasVoted, support, weight, time]
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
  };

  //  proposal refresh without causing loops
  useEffect(() => {
    if (id) {
      loadProposalData();
    }
  }, [id]); // Only re-load when proposal ID changes

  useEffect(() => {
    loadProposalData();
  }, [id, address, isConnected]);

  const handleVoteClick = (support) => {
    if (!isConnected) {
      showAlert(
        "warning",
        "Wallet Not Connected",
        "Please connect your wallet to vote.",
        3000
      );
      return;
    }
    if (DEPLOYMENT_MODE === "baseline" && !isRegistered) {
      showAlert(
        "error",
        "Not Registered",
        "You must be a registered voter to participate."
      );
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

      // Optimistic update
      setUserVote({
        hasVoted: true,
        support: selectedVote,
      });

      showAlert(
        "success",
        "Vote Cast Successfully!",
        "Your vote has been recorded."
      );
      await loadProposalData();
    } catch (error) {
      const { title, message } = parseError(error);
      showAlert("error", title, message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Admin Actions ---

  const handleStartVoting = async () => {
    if (!isConnected) return;
    setActionLoading(true);
    try {
      await write("startVoting", [proposal.id]);
      showAlert("success", "Voting Started!", "The voting period has begun.");
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
      showAlert(
        "success",
        "Proposal Finalized!",
        "The final results have been calculated."
      );
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
      showAlert(
        "success",
        "Proposal Cancelled",
        "This proposal has been cancelled."
      );
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
        <Loader
          size="large"
          text={!contract ? "Connecting..." : "Loading..."}
        />
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
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "6px",
                      color: "#0369a1",
                    }}
                  >
                    ⏰ Time remaining: <strong>{timeRemaining}</strong>
                  </div>
                )}

                {userVote.hasVoted ? (
                  <div
                    className="voted-status-card"
                    style={{
                      padding: "1.5rem",
                      backgroundColor: userVote.support ? "#f6ffed" : "#fff1f0",
                      border: `1px solid ${
                        userVote.support ? "#b7eb8f" : "#ffa39e"
                      }`,
                      borderRadius: "8px",
                      textAlign: "center",
                      marginTop: "1rem",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      {userVote.support ? "👍" : "👎"}
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        color: userVote.support ? "#389e0d" : "#cf1322",
                      }}
                    >
                      You voted {userVote.support ? "YES" : "NO"}
                    </h3>
                    <p
                      style={{
                        margin: "0.5rem 0 0 0",
                        color: "#666",
                        fontSize: "0.9rem",
                      }}
                    >
                      Your vote has been recorded on the blockchain.
                    </p>
                  </div>
                ) : (
                  <>
                    {!isRegistered && DEPLOYMENT_MODE === "baseline" && (
                      <div
                        style={{
                          border: "1px solid #ffccc7",
                          backgroundColor: "#fff2f0",
                          padding: "1rem",
                          borderRadius: "8px",
                          textAlign: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <p
                          style={{
                            color: "#ff4d4f",
                            fontWeight: "600",
                            marginBottom: "0.5rem",
                          }}
                        >
                          ⚠️ Voting Restricted
                        </p>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: "#595959",
                            marginBottom: "0",
                          }}
                        >
                          You are not registered in the DAO. Only registered
                          members can vote.
                        </p>
                      </div>
                    )}

                    {/* ✅ CONDITIONAL VOTING INTERFACE */}
                    {DEPLOYMENT_MODE === "private" ? (
                      <div style={{ marginTop: "1rem" }}>
                        <Alert type="info" title="🔒 Private Voting">
                          Voting on this proposal requires generating a
                          Zero-Knowledge Proof. Please use the{" "}
                          <strong>ZK Voting Module</strong> on your Dashboard to
                          cast your vote anonymously.
                        </Alert>
                      </div>
                    ) : (
                      <div className="vote-buttons">
                        <Button
                          variant="success"
                          size="large"
                          fullWidth
                          onClick={() => handleVoteClick(true)}
                          disabled={actionLoading || !isRegistered}
                          style={
                            !isRegistered
                              ? { opacity: 0.5, cursor: "not-allowed" }
                              : {}
                          }
                        >
                          Vote Yes 👍
                        </Button>
                        <Button
                          variant="danger"
                          size="large"
                          fullWidth
                          onClick={() => handleVoteClick(false)}
                          disabled={actionLoading || !isRegistered}
                          style={
                            !isRegistered
                              ? { opacity: 0.5, cursor: "not-allowed" }
                              : {}
                          }
                        >
                          Vote No 👎
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Other States (Pending, Ended) */}
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
                    style={{ marginTop: "1rem" }}
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
              <div
                className="proposal-status-section"
                style={{ marginTop: "1rem" }}
              >
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

        <div className="proposal-sidebar">
          {/* ✅ NEW: Voting Requirements Card */}
          <Card padding="medium" className="requirements-card">
            <h3>Voting Requirements</h3>
            <div
              className="requirement-item"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {DEPLOYMENT_MODE === "private" ? (
                <>
                  <span className="req-label" style={{ color: "#666" }}>
                    Min Reputation
                  </span>
                  <span
                    className="req-value"
                    style={{ fontWeight: "bold", color: "#2196F3" }}
                  >
                    {proposal.minReputationRequired || 0} Points
                  </span>
                </>
              ) : (
                <>
                  <span className="req-label" style={{ color: "#666" }}>
                    Min Tokens
                  </span>
                  <span
                    className="req-value"
                    style={{ fontWeight: "bold", color: "#4CAF50" }}
                  >
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
            {/* New Quorum Warning */}
            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.85rem",
                color: "#666",
                borderTop: "1px solid #eee",
                paddingTop: "0.5rem",
              }}
            >
              Quorum Required: <strong>{formatLargeNumber(40000)}</strong>
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
            <ul
              style={{
                margin: "0.5rem 0 0 0",
                paddingLeft: "1.25rem",
                fontSize: "0.9rem",
              }}
            >
              <li>Your vote is final.</li>
              <li>This will cost gas fees.</li>
            </ul>
          </Alert>
        </div>
      </Modal>
    </div>
  );
};

export default ProposalDetails;
