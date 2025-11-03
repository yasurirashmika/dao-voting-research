import React from 'react';
import Card from '../../common/Card/Card';
import { formatAddress, formatDate, formatLargeNumber, formatPercentage } from '../../../utils/formatters';
import { getProposalStateLabel, getProposalStateColor } from '../../../utils/helpers';
import './ProposalDetail.module.css';

const ProposalDetail = ({ proposal }) => {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

  return (
    <div className="proposal-detail">
      <Card padding="large">
        <div className="detail-header">
          <span 
            className="detail-status-badge"
            style={{ backgroundColor: getProposalStateColor(proposal.state) }}
          >
            {getProposalStateLabel(proposal.state)}
          </span>
          <h1 className="detail-title">{proposal.title}</h1>
          <div className="detail-meta">
            <span>Proposed by {formatAddress(proposal.proposer)}</span>
            <span>•</span>
            <span>{formatDate(proposal.createdAt, 'long')}</span>
          </div>
        </div>

        <div className="detail-description">
          <h3>Description</h3>
          <p>{proposal.description}</p>
        </div>
      </Card>

      <Card padding="medium" className="detail-voting">
        <h3>Voting Results</h3>
        
        <div className="vote-breakdown">
          <div className="vote-item vote-for">
            <div className="vote-item-header">
              <span className="vote-item-label">For</span>
              <span className="vote-item-value">{formatLargeNumber(proposal.forVotes)}</span>
            </div>
            <div className="vote-item-bar">
              <div 
                className="vote-item-fill"
                style={{ 
                  width: formatPercentage(proposal.forVotes, totalVotes),
                  backgroundColor: 'var(--color-vote-for)'
                }}
              />
            </div>
            <span className="vote-item-percentage">
              {formatPercentage(proposal.forVotes, totalVotes)}
            </span>
          </div>

          <div className="vote-item vote-against">
            <div className="vote-item-header">
              <span className="vote-item-label">Against</span>
              <span className="vote-item-value">{formatLargeNumber(proposal.againstVotes)}</span>
            </div>
            <div className="vote-item-bar">
              <div 
                className="vote-item-fill"
                style={{ 
                  width: formatPercentage(proposal.againstVotes, totalVotes),
                  backgroundColor: 'var(--color-vote-against)'
                }}
              />
            </div>
            <span className="vote-item-percentage">
              {formatPercentage(proposal.againstVotes, totalVotes)}
            </span>
          </div>

          <div className="vote-item vote-abstain">
            <div className="vote-item-header">
              <span className="vote-item-label">Abstain</span>
              <span className="vote-item-value">{formatLargeNumber(proposal.abstainVotes)}</span>
            </div>
            <div className="vote-item-bar">
              <div 
                className="vote-item-fill"
                style={{ 
                  width: formatPercentage(proposal.abstainVotes, totalVotes),
                  backgroundColor: 'var(--color-vote-abstain)'
                }}
              />
            </div>
            <span className="vote-item-percentage">
              {formatPercentage(proposal.abstainVotes, totalVotes)}
            </span>
          </div>
        </div>

        <div className="total-votes">
          <span>Total Votes</span>
          <span className="total-votes-value">{formatLargeNumber(totalVotes)}</span>
        </div>
      </Card>
    </div>
  );
};

export default ProposalDetail;