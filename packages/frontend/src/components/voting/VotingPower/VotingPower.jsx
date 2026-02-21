import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import { useDeployment } from '../../../context/DeploymentContext';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import PrivateDAOVotingABI from '../../../abis/PrivateDAOVoting.json';
import GovernanceTokenABI from '../../../abis/GovernanceToken.json';
import ReputationManagerABI from '../../../abis/ReputationManager.json';
import Loader from '../../common/Loader/Loader';
import './VotingPower.css';

const VotingPower = ({ userAddress }) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { mode } = useDeployment();
  const targetAddress = userAddress || connectedAddress;

  const [votingData, setVotingData] = useState({
    totalVotingPower: 0,
    tokenBalance: 0,
    reputationScore: 0,
    reputationWeight: 0,
    loading: true,
    error: null
  });

  // 1. Dynamic Voting Contract (Switches based on Mode)
  const votingContractName = mode === 'private' ? 'PrivateDAOVoting' : 'DAOVoting';
  const votingContractABI = mode === 'private' ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;
  
  const { contract: votingContract, read: readVoting } = useContract(votingContractName, votingContractABI);
  const { contract: tokenContract, read: readToken } = useContract('GovernanceToken', GovernanceTokenABI.abi);
  const { contract: reputationContract, read: readReputation } = useContract('ReputationManager', ReputationManagerABI.abi);

  useEffect(() => {
    loadVotingPower();
  }, [targetAddress, votingContract, tokenContract, reputationContract, isConnected, mode]);

  const loadVotingPower = async () => {
    // 1. Check Wallet Connection
    if (!targetAddress || !isConnected) {
      setVotingData(prev => ({ ...prev, loading: false, totalVotingPower: 0 }));
      return;
    }

    // 2. Check Contract Initialization
    // We always need the Token contract. 
    if (!tokenContract) {
      setVotingData(prev => ({ ...prev, loading: true }));
      return;
    }

    try {
      setVotingData(prev => ({ ...prev, loading: true, error: null }));

      // A. Get Token Balance (Common for both modes)
      const balanceBigInt = await readToken('balanceOf', [targetAddress]).catch(err => {
        console.warn('Failed to get token balance:', err.message);
        return 0n;
      });
      const tokenBalance = Number(balanceBigInt);

      let totalPower = 0;
      let repScore = 0;
      let repWeight = 0;

      // B. Calculate Power based on Mode
      if (mode === 'private') {
        // --- PRIVATE MODE ---
        // The Private DAO uses Reputation Score as the primary metric for influence.
        // It does NOT have a 'calculateVotingWeight' function.
        if (reputationContract) {
            const [score, weight] = await Promise.all([
                readReputation('getReputationScore', [targetAddress]).catch(() => 0),
                readReputation('getReputationWeight', [targetAddress]).catch(() => 0)
            ]);
            
            repScore = Number(score);
            repWeight = Number(weight);
            // In Private Mode, Effective Power = Reputation Score
            totalPower = repScore; 
        }
      } else {
        // --- BASELINE MODE ---
        // In Baseline, Voting Power is directly based on Token Balance.
        // We can double check calculateVotingWeight if it exists (for delegation), 
        // otherwise default to balance.
        if (votingContract) {
             const weight = await readVoting('calculateVotingWeight', [targetAddress]).catch(() => tokenBalance);
             totalPower = Number(weight);
        } else {
             totalPower = tokenBalance;
        }
        
        // No reputation in baseline
        repScore = 0;
        repWeight = 0;
      }

      setVotingData({
        totalVotingPower: totalPower,
        tokenBalance: tokenBalance,
        reputationScore: repScore,
        reputationWeight: repWeight,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading voting power:', error);
      setVotingData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data'
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
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(2)}K`;
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
  const hasReputation = mode === 'private' && reputationContract;

  return (
    <div className="voting-power-widget">
      <div className="voting-power-header">
        <h3 className="voting-power-title">Governance Power</h3>
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
              style={{ width: hasReputation ? '70%' : '100%' }}
            />
          </div>
          <div className="power-weight">{hasReputation ? '70% weight' : '100% weight'}</div>
        </div>

        {/* Reputation Power - Only in Private Mode */}
        {hasReputation && (
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
                  width: `${Math.min(100, (votingData.reputationWeight / 100))}%`,
                }}
              />
            </div>
            <div className="power-weight">30% weight (max)</div>
          </div>
        )}
      </div>

      <div className="voting-power-info">
        <div className="info-icon">💡</div>
        <div className="info-text">
          {hasReputation 
            ? 'Governance power combines your token balance (70%) and reputation score (30%)'
            : 'Governance power is based on your token balance (100%)'}
        </div>
      </div>
    </div>
  );
};

export default VotingPower;