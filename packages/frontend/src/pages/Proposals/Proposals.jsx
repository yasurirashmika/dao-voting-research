import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProposals } from '../../hooks/useProposals';
import { useDebounce } from '../../hooks/useDebounce';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Loader from '../../components/common/Loader/Loader';
import { formatAddress, formatDate, formatLargeNumber } from '../../utils/formatters';
import { getProposalStateLabel, getProposalStateColor } from '../../utils/helpers';
import { PROPOSAL_STATE } from '../../utils/constants';
import './Proposals.css';

const Proposals = () => {
  const { proposals, loading, error, fetchProposals } = useProposals();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const debouncedSearch = useDebounce(searchTerm, 500);

  const filterOptions = [
    { value: 'all', label: 'All Proposals' },
    { value: PROPOSAL_STATE.ACTIVE, label: 'Active' },
    { value: PROPOSAL_STATE.SUCCEEDED, label: 'Succeeded' },
    { value: PROPOSAL_STATE.DEFEATED, label: 'Defeated' },
    { value: PROPOSAL_STATE.EXECUTED, label: 'Executed' }
  ];

  // Filter and sort proposals
  const filteredProposals = proposals
    .filter(proposal => {
      const matchesSearch = 
        proposal.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        proposal.description.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesFilter = 
        filterState === 'all' || proposal.state === parseInt(filterState);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return b.createdAt - a.createdAt;
      } else if (sortBy === 'oldest') {
        return a.createdAt - b.createdAt;
      }
      return 0;
    });

  if (loading && proposals.length === 0) {
    return (
      <div className="proposals-loading">
        <Loader size="large" text="Loading proposals..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="proposals-error">
        <Card padding="large">
          <h2>Error Loading Proposals</h2>
          <p>{error}</p>
          <Button onClick={fetchProposals}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="proposals-page">
      {/* Header */}
      <div className="proposals-header">
        <div>
          <h1 className="proposals-title">Proposals</h1>
          <p className="proposals-subtitle">
            Browse and vote on active governance proposals
          </p>
        </div>
        <Link to="/create-proposal">
          <Button size="large" icon="✏️">Create Proposal</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card padding="medium" className="proposals-filters">
        <div className="filter-row">
          <Input
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="🔍"
            className="search-input"
          />

          <div className="filter-controls">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="filter-select"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Proposals List */}
      <div className="proposals-list">
        {filteredProposals.length === 0 ? (
          <Card padding="large" className="no-proposals">
            <div className="no-proposals-content">
              <span className="no-proposals-icon">🗳️</span>
              <h3>No proposals found</h3>
              <p>Try adjusting your filters or create a new proposal</p>
              <Link to="/create-proposal">
                <Button>Create Proposal</Button>
              </Link>
            </div>
          </Card>
        ) : (
          filteredProposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))
        )}
      </div>
    </div>
  );
};

// Proposal Card Component
const ProposalCard = ({ proposal }) => {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

  return (
    <Link to={`/proposals/${proposal.id}`} className="proposal-card-link">
      <Card hoverable padding="large" className="proposal-card">
        <div className="proposal-card-header">
          <div className="proposal-info">
            <h3 className="proposal-title">{proposal.title}</h3>
            <p className="proposal-meta">
              Proposed by {formatAddress(proposal.proposer)} • {formatDate(proposal.createdAt)}
            </p>
          </div>
          <span 
            className="proposal-status"
            style={{ backgroundColor: getProposalStateColor(proposal.state) }}
          >
            {getProposalStateLabel(proposal.state)}
          </span>
        </div>

        <p className="proposal-description">
          {proposal.description.substring(0, 200)}
          {proposal.description.length > 200 ? '...' : ''}
        </p>

        {/* Vote Progress */}
        <div className="vote-progress">
          <div className="vote-stats">
            <div className="vote-stat vote-for">
              <span className="vote-label">For</span>
              <span className="vote-value">{formatLargeNumber(proposal.forVotes)}</span>
            </div>
            <div className="vote-stat vote-against">
              <span className="vote-label">Against</span>
              <span className="vote-value">{formatLargeNumber(proposal.againstVotes)}</span>
            </div>
            <div className="vote-stat vote-abstain">
              <span className="vote-label">Abstain</span>
              <span className="vote-value">{formatLargeNumber(proposal.abstainVotes)}</span>
            </div>
          </div>

          <div className="progress-bar">
            <div 
              className="progress-segment progress-for"
              style={{ width: `${forPercentage}%` }}
            />
            <div 
              className="progress-segment progress-against"
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default Proposals;
