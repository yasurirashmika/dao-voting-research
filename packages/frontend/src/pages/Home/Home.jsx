import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import { useProposals } from '../../hooks/useProposals';
import './Home.css';

const Home = () => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { proposals, loading: proposalsLoading } = useProposals();

  // Calculate total votes cast across all proposals
  const totalVotesCast = proposals.reduce((sum, p) => {
    return sum + (Number(p.yesVotes) || 0) + (Number(p.noVotes) || 0);
  }, 0);

  // Calculate real stats from blockchain data
  const stats = [
    { 
      label: 'Total Proposals', 
      value: proposals.length.toString(),
      loading: proposalsLoading
    },
    { 
      label: 'Active Votes', 
      value: proposals.filter(p => p.state === 1).length.toString(),
      loading: proposalsLoading
    },
    { 
      label: 'Registered voters who can participate in governance', 
      value: '—',
      loading: false,
      tooltip: 'Go to Admin panel to register voters'
    },
    { 
      label: 'Total Votes Cast', 
      value: proposalsLoading ? '...' : totalVotesCast.toLocaleString(),
      loading: proposalsLoading,
      tooltip: 'Sum of all Yes and No votes across all proposals'
    }
  ];

  const features = [
    {
      icon: '📝',
      title: 'Create Proposals',
      description: 'Submit proposals for community consideration and voting'
    },
    {
      icon: '🗳️',
      title: 'Cast Votes',
      description: 'Vote on active proposals with your governance tokens'
    },
    {
      icon: '📊',
      title: 'Track Progress',
      description: 'Monitor proposal status and voting results in real-time'
    },
    {
      icon: '🔒',
      title: 'Secure & Transparent',
      description: 'All votes are recorded on-chain for complete transparency'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Decentralized Governance
            <span className="hero-gradient"> Made Simple</span>
          </h1>
          <p className="hero-description">
            Empower your community with transparent, on-chain voting. Create proposals,
            cast votes, and shape the future of your DAO together.
          </p>
          <div className="hero-actions">
            {isConnected ? (
              <>
                <Link to="/proposals">
                  <Button size="large">View Proposals</Button>
                </Link>
                <Link to="/create-proposal">
                  <Button size="large" variant="outline">
                    Create Proposal
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/proposals">
                  <Button size="large">Explore Proposals</Button>
                </Link>
                <Button 
                  size="large" 
                  variant="secondary"
                  onClick={openConnectModal}
                >
                  Connect Wallet to Start
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="hero-illustration">
          <div className="illustration-card">
            <span className="illustration-icon">🗳️</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        {stats.map((stat, index) => (
          <Card key={index} padding="medium" className="stat-card" title={stat.tooltip}>
            {stat.loading ? (
              <div className="stat-value">...</div>
            ) : (
              <div className="stat-value">{stat.value}</div>
            )}
            <div className="stat-label">{stat.label}</div>
          </Card>
        ))}
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose DAO Voting?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <Card key={index} hoverable padding="large" className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Card padding="large" className="cta-card">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Join thousands of DAO members making decisions together
          </p>
          <Link to="/proposals">
            <Button size="large">View Active Proposals</Button>
          </Link>
        </Card>
      </section>
    </div>
  );
};

export default Home;