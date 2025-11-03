import React from 'react';
import Card from '../../common/Card/Card';
import './Stats.module.css';

const Stats = ({ stats }) => {
  const defaultStats = [
    { label: 'Voting Power', value: stats?.votingPower || '0', icon: '⚡' },
    { label: 'Proposals Created', value: stats?.proposalsCreated || '0', icon: '📝' },
    { label: 'Votes Cast', value: stats?.votesCast || '0', icon: '🗳️' },
    { label: 'Participation Rate', value: stats?.participationRate || '0%', icon: '📊' }
  ];

  return (
    <div className="stats-grid">
      {defaultStats.map((stat, index) => (
        <Card key={index} padding="medium" className="stat-card" hoverable>
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-info">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Stats;