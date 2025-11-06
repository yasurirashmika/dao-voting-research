import React from 'react';
import Card from '../../common/Card/Card';
import { formatLargeNumber } from '../../../utils/formatters';
import './VotingPower.css';

const VotingPower = ({ votingPower, delegatedTo, address }) => {
  const isDelegated = delegatedTo && delegatedTo !== address;

  return (
    <Card padding="medium" className="voting-power">
      <h3 className="voting-power-title">Your Voting Power</h3>
      
      <div className="voting-power-value">
        <span className="power-number">{formatLargeNumber(votingPower)}</span>
        <span className="power-label">Votes</span>
      </div>

      <div className="delegation-info">
        <span className="delegation-label">Delegated to:</span>
        <span className="delegation-value">
          {isDelegated ? `${delegatedTo.substring(0, 10)}...` : 'Self'}
        </span>
      </div>

      {isDelegated && (
        <p className="delegation-note">
          Your voting power is delegated to another address
        </p>
      )}
    </Card>
  );
};

export default VotingPower;
