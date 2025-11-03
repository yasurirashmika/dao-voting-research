import React from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { formatAddress, formatTokenAmount } from '../../utils/formatters';
import './Dashboard.module.css';

const Dashboard = () => {
  const { address } = useAccount();
  const { balance, balanceSymbol } = useWallet();

  // Mock data - replace with actual blockchain data
  const userStats = {
    votingPower: '1,234',
    proposalsCreated: 5,
    votescast: 23,
    delegatedTo: address
  };

  const recentActivity = [
    { type: 'vote', proposal: 'Increase Treasury Allocation', action: 'Voted For', time: '2 hours ago' },
    { type: 'create', proposal: 'Update Governance Parameters', action: 'Created', time: '1 day ago' },
    { type: 'vote', proposal: 'Community Fund Distribution', action: 'Voted Against', time: '3 days ago' }
  ];

  const activeProposals = [
    { id: 1, title: 'Increase Treasury Allocation', status: 'Active', timeLeft: '2 days' },
    { id: 2, title: 'Update Governance Parameters', status: 'Active', timeLeft: '5 days' }
  ];

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
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-label">Voting Power</div>
              <div className="stat-value">{userStats.votingPower}</div>
            </div>
          </Card>

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
              <div className="stat-value">{userStats.votescast}</div>
            </div>
          </Card>

          <Card padding="medium" className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-label">Wallet Balance</div>
              <div className="stat-value">
                {balance ? `${parseFloat(balance).toFixed(4)} ${balanceSymbol}` : '0'}
              </div>
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
                <Button variant="ghost" size="small">View All</Button>
              </Link>
            </div>

            <div className="proposals-list">
              {activeProposals.map((proposal) => (
                <div key={proposal.id} className="proposal-item">
                  <div className="proposal-item-content">
                    <Link to={`/proposals/${proposal.id}`} className="proposal-item-title">
                      {proposal.title}
                    </Link>
                    <div className="proposal-item-meta">
                      <span className="proposal-status">{proposal.status}</span>
                      <span>•</span>
                      <span>{proposal.timeLeft} left</span>
                    </div>
                  </div>
                  <Link to={`/proposals/${proposal.id}`}>
                    <Button variant="secondary" size="small">Vote</Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card padding="large">
            <h2 className="section-title">Recent Activity</h2>
            
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'vote' ? '🗳️' : '📝'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <span className="activity-action">{activity.action}</span>
                      <span className="activity-proposal">{activity.proposal}</span>
                    </div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* Wallet Info */}
          <Card padding="medium">
            <h3 className="sidebar-title">Wallet Information</h3>
            <div className="wallet-info">
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">{formatAddress(address)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Delegated To</span>
                <span className="info-value">
                  {userStats.delegatedTo === address ? 'Self' : formatAddress(userStats.delegatedTo)}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="medium">
            <h3 className="sidebar-title">Quick Actions</h3>
            <div className="quick-actions">
              <Link to="/create-proposal">
                <Button fullWidth icon="✏️">Create Proposal</Button>
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