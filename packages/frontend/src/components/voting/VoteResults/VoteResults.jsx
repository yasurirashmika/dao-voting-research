import React from 'react';
import Card from '../../common/Card/Card';
import { formatLargeNumber, formatPercentage } from '../../../utils/formatters';
import './VoteResults.module.css';

const VoteResults = ({ forVotes, againstVotes, abstainVotes }) => {
  const totalVotes = forVotes + againstVotes + abstainVotes;

  return (
    <Card padding="medium" className="vote-results">
      <h3 className="vote-results-title">Voting Results</h3>
      
      <div className="vote-breakdown">
        <div className="vote-item vote-for">
          <div className="vote-item-header">
            <span className="vote-item-label">For</span>
            <span className="vote-item-value">{formatLargeNumber(forVotes)}</span>
          </div>
          <div className="vote-item-bar">
            <div 
              className="vote-item-fill"
              style={{ 
                width: formatPercentage(forVotes, totalVotes),
                backgroundColor: 'var(--color-vote-for)'
              }}
            />
          </div>
          <span className="vote-item-percentage">
            {formatPercentage(forVotes, totalVotes)}
          </span>
        </div>

        <div className="vote-item vote-against">
          <div className="vote-item-header">
            <span className="vote-item-label">Against</span>
            <span className="vote-item-value">{formatLargeNumber(againstVotes)}</span>
          </div>
          <div className="vote-item-bar">
            <div 
              className="vote-item-fill"
              style={{ 
                width: formatPercentage(againstVotes, totalVotes),
                backgroundColor: 'var(--color-vote-against)'
              }}
            />
          </div>
          <span className="vote-item-percentage">
            {formatPercentage(againstVotes, totalVotes)}
          </span>
        </div>

        <div className="vote-item vote-abstain">
          <div className="vote-item-header">
            <span className="vote-item-label">Abstain</span>
            <span className="vote-item-value">{formatLargeNumber(abstainVotes)}</span>
          </div>
          <div className="vote-item-bar">
            <div 
              className="vote-item-fill"
              style={{ 
                width: formatPercentage(abstainVotes, totalVotes),
                backgroundColor: 'var(--color-vote-abstain)'
              }}
            />
          </div>
          <span className="vote-item-percentage">
            {formatPercentage(abstainVotes, totalVotes)}
          </span>
        </div>
      </div>

      <div className="total-votes">
        <span>Total Votes</span>
        <span className="total-votes-value">{formatLargeNumber(totalVotes)}</span>
      </div>
    </Card>
  );
};

export default VoteResults;