import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import GovernanceTokenABI from '../../../abis/GovernanceToken.json';
import ReputationManagerABI from '../../../abis/ReputationManager.json';
import Loader from '../../common/Loader/Loader';
import './VotingPower.css';

const VotingPower = ({ userAddress }) => {
  const { address: connectedAddress } = useAccount();
  const targetAddress = userAddress || connectedAddress;

  const [votingData, setVotingData] = useState({
    totalVotingPower: 0,
    tokenBalance: 0,
    reputationScore: 0,
    reputationWeight: 0,
    loading: true,
    error: null
  });

  const { read: readDAO } = useContract('DAOVoting', DAOVotingABI.abi);
  const { read: readToken } = useContract('GovernanceToken', GovernanceTokenABI.abi);
  const { read: readReputation } = useContract('ReputationManager', ReputationManagerABI.abi);

  useEffect(() => {
    if (targetAddress) {
      loadVotingPower();
    }
  }, [targetAddress]);

  const loadVotingPower = async () => {
    try {
      setVotingData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel
      const [totalPower, tokenBalance, reputationScore, reputationWeight] = await Promise.all([
        readDAO('calculateVotingWeight', [targetAddress]).catch(() => 0),
        readToken('balanceOf', [targetAddress]).catch(() => 0n),
        readReputation('getReputationScore', [targetAddress]).catch(() => 0),
        readReputation('getReputationWeight', [targetAddress]).catch(() => 0)
      ]);

      setVotingData({
        totalVotingPower: Number(totalPower),
        tokenBalance: Number(tokenBalance),
        reputationScore: Number(reputationScore),
        reputationWeight: Number(reputationWeight),
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading voting power:', error);
      setVotingData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load voting power'
      }));
    }
  };

  if (votingData.loading) {
    return (
      <div className="voting-power-loading">
        <Loader size="small" />
      </div>
    );
  }

  if (votingData.error) {
    return (
      <div className="voting-power-error">
        <span className="error-icon">⚠️</span>
        <span>{votingData.error}</span>
      </div>
    );
  }

  const formatTokens = (amount) => {
    const tokens = Number(amount) / 1e18;
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(2)}K`;
    }
    return tokens.toFixed(2);
  };

  const getReputationLevel = (score) => {
    if (score >= 800) return { label: 'Excellent', color: '#4CAF50' };
    if (score >= 600) return { label: 'Good', color: '#2196F3' };
    if (score >= 400) return { label: 'Average', color: '#FF9800' };
    if (score >= 200) return { label: 'Fair', color: '#FF5722' };
    return { label: 'New', color: '#9E9E9E' };
  };

  const reputationLevel = getReputationLevel(votingData.reputationScore);

  return (
    <div className="voting-power-widget">
      <div className="voting-power-header">
        <h3 className="voting-power-title">Voting Power</h3>
        <div className="total-power">
          {votingData.totalVotingPower.toLocaleString()}
        </div>
      </div>

      <div className="voting-power-breakdown">
        {/* Token Power */}
        <div className="power-item">
          <div className="power-item-header">
            <span className="power-icon">🪙</span>
            <span className="power-label">Token Balance</span>
          </div>
          <div className="power-value">{formatTokens(votingData.tokenBalance)}</div>
          <div className="power-bar">
            <div 
              className="power-bar-fill token-fill"
              style={{ width: '70%' }}
              title="70% weight from tokens"
            />
          </div>
          <div className="power-weight">70% weight</div>
        </div>

        {/* Reputation Power */}
        <div className="power-item">
          <div className="power-item-header">
            <span className="power-icon">⭐</span>
            <span className="power-label">Reputation Score</span>
          </div>
          <div className="power-value">
            {votingData.reputationScore}
            <span 
              className="reputation-badge"
              style={{ backgroundColor: reputationLevel.color }}
            >
              {reputationLevel.label}
            </span>
          </div>
          <div className="power-bar">
            <div 
              className="power-bar-fill reputation-fill"
              style={{ 
                width: `${(votingData.reputationWeight / 100)}%`,
              }}
              title={`${(votingData.reputationWeight / 100).toFixed(1)}% reputation weight`}
            />
          </div>
          <div className="power-weight">30% weight (max)</div>
        </div>
      </div>

      <div className="voting-power-info">
        <div className="info-icon">💡</div>
        <div className="info-text">
          Voting power combines your token balance (70%) and reputation score (30%)
        </div>
      </div>
    </div>
  );
};

export default VotingPower;