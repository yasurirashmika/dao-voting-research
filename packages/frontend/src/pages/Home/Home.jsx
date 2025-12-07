import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import { useProposals } from '../../hooks/useProposals';
import { useContract } from '../../hooks/useContract';
import { useDeployment } from '../../context/DeploymentContext';
import DAOVotingABI from '../../abis/DAOVoting.json';
import PrivateDAOVotingABI from '../../abis/PrivateDAOVoting.json';
import './Home.css';

const Home = () => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { proposals, loading: proposalsLoading } = useProposals();
  const { mode } = useDeployment();
  
  const [registeredVoters, setRegisteredVoters] = useState(null);
  const [loadingVoters, setLoadingVoters] = useState(true);

  // ✅ FIX 1: Destructure 'contract' so we can check if it exists
  const { contract: publicContract, read: readPublicVoting } = useContract('DAOVoting', DAOVotingABI.abi);
  const { contract: privateContract, read: readPrivateVoting } = useContract('PrivateDAOVoting', PrivateDAOVotingABI.abi);

  // Fetch registered voter count
  useEffect(() => {
    const fetchVoterCount = async () => {
      // ✅ FIX 2: Check if the specific contract for the current mode is ready
      if (mode === 'public' && !publicContract) return;
      if (mode === 'private' && !privateContract) return;

      setLoadingVoters(true);
      try {
        if (mode === 'public') {
          const count = await readPublicVoting('voterCount', []);
          setRegisteredVoters(Number(count));
        } else if (mode === 'private') {
          const count = await readPrivateVoting('getRegisteredVoterCount', []);
          setRegisteredVoters(Number(count));
        }
      } catch (error) {
        console.error('Error fetching voter count:', error);
        setRegisteredVoters(0);
      } finally {
        setLoadingVoters(false);
      }
    };

    fetchVoterCount();
  }, [mode, publicContract, privateContract, readPublicVoting, readPrivateVoting]); // ✅ Dependencies updated

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
      label: 'Registered Voters', 
      value: loadingVoters ? '...' : registeredVoters !== null ? registeredVoters.toLocaleString() : '0',
      loading: loadingVoters
    },
    { 
      label: 'Total Votes Cast', 
      value: proposalsLoading ? '...' : totalVotesCast.toLocaleString(),
      loading: proposalsLoading
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
          <Card key={index} padding="medium" className="stat-card">
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