import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../common/Card/Card';
import { formatAddress, formatDate, formatLargeNumber } from '../../../utils/formatters';
import { getProposalStateLabel, getProposalStateColor } from '../../../utils/helpers';
import './ProposalCard.css';

const ProposalCard = ({ proposal }) => {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

  return (
    <Link to={`/proposals/${proposal.id}`} className="proposal-card-link">
      <Card hoverable padding="large" className="proposal-card">
        <div className="proposal-card-header">
          <div className="proposal-info">
            <h3 className="proposal-card-title">{proposal.title}</h3>
            <p className="proposal-meta">
              Proposed by {formatAddress(proposal.proposer)} • {formatDate(proposal.createdAt)}
            </p>
          </div>
          <span 
            className="proposal-status-badge"
            style={{ backgroundColor: getProposalStateColor(proposal.state) }}
          >
            {getProposalStateLabel(proposal.state)}
          </span>
        </div>

        <p className="proposal-card-description">
          {proposal.description.substring(0, 200)}
          {proposal.description.length > 200 ? '...' : ''}
        </p>

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

export default ProposalCard;
