import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import { useDeployment } from '../../../context/DeploymentContext';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import PrivateDAOVotingABI from '../../../abis/PrivateDAOVoting.json'; // ✅ Import Private ABI
import GovernanceTokenABI from '../../../abis/GovernanceToken.json';
import Loader from '../../common/Loader/Loader';
import './WhaleAnalysis.css';

const WhaleAnalysis = ({ testWallets = [] }) => {
  const { address: connectedAddress } = useAccount();
  const { mode } = useDeployment(); // ✅ Get current mode
  const [whaleData, setWhaleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPower, setTotalPower] = useState(0);

  // ✅ Dynamic Contract Selection based on mode
  const daoContractName = mode === 'private' ? 'PrivateDAOVoting' : 'DAOVoting';
  const daoContractABI = mode === 'private' ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;

  const { contract: daoContract, read: readDAO } = useContract(daoContractName, daoContractABI);
  const { contract: tokenContract, read: readToken } = useContract('GovernanceToken', GovernanceTokenABI.abi);

  useEffect(() => {
    loadWhaleAnalysis();
    // ✅ Re-run when contracts or mode change
  }, [testWallets, connectedAddress, daoContract, tokenContract, mode]);

  // Helper to check if function exists in ABI to prevent "Function not found" errors
  const hasFunction = (abi, funcName) => {
    return abi?.some(item => item.name === funcName && item.type === 'function');
  };

  const loadWhaleAnalysis = async () => {
    // ✅ Safety Check: Don't run if contracts aren't ready
    if (!tokenContract || !daoContract) {
        return;
    }

    setLoading(true);
    try {
      const walletsToAnalyze = testWallets.length > 0 
        ? testWallets 
        : [connectedAddress];

      const walletPromises = walletsToAnalyze.map(async (wallet) => {
        if (!wallet) return null;

        try {
          // 1. Fetch Token Balance (Always needed)
          const balanceBigInt = await readToken('balanceOf', [wallet]).catch(() => 0n);
          // Convert to readable number (assuming 18 decimals)
          const balanceNum = Number(balanceBigInt) / 1e18;

          let votingPower = 0;

          // 2. Fetch Voting Power based on Mode
          if (mode === 'private') {
             // 🔒 Private Mode
             // Check if function exists in ABI first to avoid "AbiFunctionNotFoundError"
             if (hasFunction(daoContractABI, 'calculateVotingWeight')) {
                 const weight = await readDAO('calculateVotingWeight', [wallet]).catch((err) => {
                     console.warn(`Weight calc failed for ${wallet}:`, err.message);
                     return 0;
                 });
                 votingPower = Number(weight);
             } else {
                 // Fallback: If ABI is missing function (e.g. old ABI), default to 0 or logic
                 // For now, we avoid crashing. We could use balanceNum as a loose proxy if needed.
                 // console.warn("calculateVotingWeight missing from PrivateDAO ABI");
                 votingPower = 0; 
             }
          } else {
             // 🌐 Baseline Mode: Voting Power = Token Balance
             votingPower = balanceNum; 
          }

          return {
            address: wallet,
            votingPower: votingPower,
            tokenBalance: balanceNum,
            isConnected: wallet.toLowerCase() === connectedAddress?.toLowerCase()
          };
        } catch (err) {
          console.error(`Error loading data for ${wallet}:`, err);
          return null;
        }
      });

      const results = (await Promise.all(walletPromises)).filter(r => r !== null);
      
      // Sort by voting power (descending)
      results.sort((a, b) => b.votingPower - a.votingPower);

      // Calculate total power
      const total = results.reduce((sum, w) => sum + w.votingPower, 0);
      
      // Add percentage
      const dataWithPercentage = results.map(wallet => ({
        ...wallet,
        percentage: total > 0 ? (wallet.votingPower / total) * 100 : 0
      }));

      setWhaleData(dataWithPercentage);
      setTotalPower(total);
    } catch (error) {
      console.error('Error loading whale analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getWhaleStatus = (percentage) => {
    if (percentage >= 30) return { label: 'Whale', color: '#F44336', icon: '🐋' };
    if (percentage >= 15) return { label: 'Large Holder', color: '#FF9800', icon: '🦈' };
    if (percentage >= 5) return { label: 'Regular Voter', color: '#4CAF50', icon: '🐟' };
    return { label: 'Small Holder', color: '#9E9E9E', icon: '🐠' };
  };

  const getBarColor = (percentage) => {
    if (percentage >= 30) return 'linear-gradient(90deg, #F44336, #E91E63)';
    if (percentage >= 15) return 'linear-gradient(90deg, #FF9800, #FFC107)';
    if (percentage >= 5) return 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    return 'linear-gradient(90deg, #9E9E9E, #BDBDBD)';
  };

  if (loading) {
    return (
      <div className="whale-analysis-loading">
        <Loader size="medium" text="Analyzing voting power..." />
      </div>
    );
  }

  if (whaleData.length === 0) {
    return (
      <div className="whale-analysis-empty">
        <span className="empty-icon">📊</span>
        <p>No voting power data available</p>
      </div>
    );
  }

  return (
    <div className="whale-analysis">
      <div className="whale-header">
        <h3 className="whale-title">
          <span className="title-icon">🐋</span>
          Voting Power Distribution
        </h3>
        <div className="whale-total">
          <span className="total-label">Total Power</span>
          <span className="total-value">{totalPower.toLocaleString()}</span>
        </div>
      </div>

      <div className="whale-list">
        {whaleData.map((wallet, index) => {
          const status = getWhaleStatus(wallet.percentage);
          
          return (
            <div 
              key={wallet.address} 
              className={`whale-item ${wallet.isConnected ? 'connected' : ''}`}
            >
              <div className="whale-rank">#{index + 1}</div>
              
              <div className="whale-info">
                <div className="whale-address-row">
                  <span className="whale-address">
                    {formatAddress(wallet.address)}
                    {wallet.isConnected && (
                      <span className="connected-badge">You</span>
                    )}
                  </span>
                  <span 
                    className="whale-status"
                    style={{ color: status.color }}
                  >
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="whale-stats">
                  <div className="stat">
                    <span className="stat-label">Voting Power</span>
                    <span className="stat-value">{wallet.votingPower.toLocaleString()}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Tokens</span>
                    <span className="stat-value">{wallet.tokenBalance.toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Control</span>
                    <span className="stat-value">{wallet.percentage.toFixed(2)}%</span>
                  </div>
                </div>

                <div className="whale-bar">
                  <div 
                    className="whale-bar-fill"
                    style={{ 
                      width: `${wallet.percentage}%`,
                      background: getBarColor(wallet.percentage)
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {whaleData.length > 0 && whaleData[0].percentage > 30 && (
        <div className="whale-warning">
          <span className="warning-icon">⚠️</span>
          <div className="warning-text">
            <strong>High Power Concentration Detected</strong>
            <p>The top wallet controls {whaleData[0].percentage.toFixed(1)}% of voting power, which may affect governance decentralization.</p>
          </div>
        </div>
      )}

      <div className="whale-summary">
        <div className="summary-item">
          <span className="summary-icon">👥</span>
          <div className="summary-data">
            <span className="summary-label">Total Voters</span>
            <span className="summary-value">{whaleData.length}</span>
          </div>
        </div>
        <div className="summary-item">
          <span className="summary-icon">🏆</span>
          <div className="summary-data">
            <span className="summary-label">Top 3 Control</span>
            <span className="summary-value">
              {whaleData.slice(0, 3).reduce((sum, w) => sum + w.percentage, 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhaleAnalysis;