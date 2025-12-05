// src/pages/Dashboard/Dashboard.jsx (UPDATED - Line 28-36)
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useWallet } from "../../context/WalletContext";
import { useProposals } from "../../hooks/useProposals";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Loader from "../../components/common/Loader/Loader";
import VotingPower from "../../components/voting/VotingPower/VotingPower";
import WhaleAnalysis from "../../components/dashboard/WhaleAnalysis/WhaleAnalysis";
import { formatAddress } from "../../utils/formatters";
import "./Dashboard.css";
import { useDeployment } from "../../context/DeploymentContext";

const Dashboard = () => {
  const { address } = useAccount();
  const { balance, balanceSymbol } = useWallet();
  const { mode } = useDeployment();
  const { proposals, loading: proposalsLoading } = useProposals();

  const [userStats, setUserStats] = useState({
    proposalsCreated: 0,
    votesCast: 0,
  });

  // ✅ FIXED: Validate addresses properly
  const isValidAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return false;
    const trimmed = addr.trim();
    return trimmed.startsWith('0x') && 
           trimmed.length === 42 && 
           /^0x[0-9A-Fa-f]{40}$/.test(trimmed);
  };

  // ✅ Get test wallets from .env with validation
  const testWallets = React.useMemo(() => {
    const walletsString = process.env.REACT_APP_TEST_WALLETS;
    
    if (!walletsString) {
      console.log('ℹ️ No test wallets configured');
      return [];
    }

    const wallets = walletsString
      .split(",")
      .map((w) => w.trim())
      .filter(isValidAddress);

    console.log(`✅ Loaded ${wallets.length} valid test wallets`);
    return wallets;
  }, []);

  const loadDashboardData = useCallback(() => {
    // Calculate user stats from proposals
    const userProposals = proposals.filter(
      (p) => p.proposer.toLowerCase() === address?.toLowerCase()
    );

    // TODO: Implement actual vote counting by checking hasVoted for each proposal
    const votesCast = 0;

    setUserStats({
      proposalsCreated: userProposals.length,
      votesCast: votesCast,
    });
  }, [proposals, address]);

  useEffect(() => {
    if (address) {
      loadDashboardData();
    }
  }, [address, loadDashboardData]);

  // Filter active proposals (state = 1)
  const activeProposals = proposals.filter((p) => p.state === 1).slice(0, 5);

  // Get recent proposals for activity (last 5)
  const recentActivity = proposals.slice(0, 5).map((p) => ({
    type:
      p.proposer.toLowerCase() === address?.toLowerCase()
        ? "create"
        : "proposal",
    proposal: p.title,
    action:
      p.proposer.toLowerCase() === address?.toLowerCase()
        ? "Created"
        : "New Proposal",
    timestamp: p.createdAt * 1000,
  }));

  const formatTimeLeft = (votingEnd) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = votingEnd - now;

    if (timeLeft <= 0) return "Ended";

    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} left`;
    return "Less than 1 hour";
  };

  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  if (proposalsLoading) {
    return (
      <div className="dashboard-loading">
        <Loader size="large" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {formatAddress(address)}
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Stats Cards */}
        <div className="stats-grid">
          <Card padding="medium" className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <div className="stat-label">Proposals Created</div>
              <div className="stat-value">{userStats.proposalsCreated}</div>
            </div>
          </Card>

          <Card padding="medium" className="stat-card">
            <div className="stat-icon">🗳️</div>
            <div className="stat-info">
              <div className="stat-label">Votes Cast</div>
              <div className="stat-value">{userStats.votesCast}</div>
            </div>
          </Card>

          <Card padding="medium" className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-label">Wallet Balance</div>
              <div className="stat-value">
                {balance
                  ? `${parseFloat(balance).toFixed(4)} ${balanceSymbol}`
                  : "0"}
              </div>
            </div>
          </Card>

          <Card padding="medium" className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-label">Active Proposals</div>
              <div className="stat-value">{activeProposals.length}</div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          {/* Active Proposals */}
          <Card padding="large">
            <div className="section-header">
              <h2 className="section-title">Active Proposals</h2>
              <Link to="/proposals">
                <Button variant="ghost" size="small">
                  View All
                </Button>
              </Link>
            </div>

            {activeProposals.length === 0 ? (
              <div className="empty-state">
                <p>No active proposals at the moment</p>
                <Link to="/create-proposal">
                  <Button variant="primary" className="empty-state-button">
                    Create First Proposal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="proposals-list">
                {activeProposals.map((proposal) => (
                  <div key={proposal.id} className="proposal-item">
                    <div className="proposal-item-content">
                      <Link
                        to={`/proposals/${proposal.id}`}
                        className="proposal-item-title"
                      >
                        {proposal.title}
                      </Link>
                      <div className="proposal-item-meta">
                        <span className="proposal-status">Active</span>
                        <span>•</span>
                        <span>{formatTimeLeft(proposal.votingEnd)}</span>
                      </div>
                    </div>
                    <Link to={`/proposals/${proposal.id}`}>
                      <Button variant="secondary" size="small">
                        Vote
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card padding="large">
            <h2 className="section-title">Recent Activity</h2>

            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="activity-list">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === "create" ? "📝" : "🗳️"}
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">
                        <span className="activity-action">
                          {activity.action}
                        </span>
                        <span className="activity-proposal">
                          {activity.proposal}
                        </span>
                      </div>
                      <div className="activity-time">
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* ✅ Voting Power Widget */}
          <Card padding="medium">
            <VotingPower />
          </Card>

          {/* ✅ Whale Analysis - Only show if we have valid wallets */}
          {testWallets.length > 0 && (
            <Card padding="medium">
              <WhaleAnalysis testWallets={testWallets} />
            </Card>
          )}

          {/* Wallet Info */}
          <Card padding="medium">
            <h3 className="sidebar-title">Wallet Information</h3>
            <div className="wallet-info">
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">{formatAddress(address)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Network</span>
                <span className="info-value">Sepolia</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="medium">
            <h3 className="sidebar-title">Quick Actions</h3>
            <div className="quick-actions">
              <Link to="/create-proposal">
                <Button fullWidth icon="✏️">
                  Create Proposal
                </Button>
              </Link>
              <Link to="/proposals">
                <Button fullWidth variant="secondary" icon="🔍">
                  Browse Proposals
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;