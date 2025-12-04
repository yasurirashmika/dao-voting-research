import React from 'react';
import { useDeployment } from '../../../context/DeploymentContext';
import { isReputationEnabled } from '../../../config/deploymentConfig';
import './DeploymentBadge.css';

const DeploymentBadge = ({ variant = 'interactive' }) => {
  const { mode, deploymentInfo, switchMode, DEPLOYMENT_MODE } = useDeployment();
  const hasReputation = isReputationEnabled(mode);

  // 1. Compact Variant (Navbar/Header)
  if (variant === 'compact') {
    return (
      <div className={`deployment-badge-compact ${mode === DEPLOYMENT_MODE.PRIVATE ? 'Private' : 'Baseline'}`}>
        <span className="badge-icon">{deploymentInfo.icon}</span>
        <span className="badge-label">{deploymentInfo.label}</span>
      </div>
    );
  }

  // 2. Interactive Variant (Dashboard/Sidebar)
  return (
    <div className="deployment-badge-interactive">
      
      {/* Header */}
      <div className="badge-header">
        <span className="badge-icon">{deploymentInfo.icon}</span>
        <h3 className="badge-title">{deploymentInfo.label}</h3>
      </div>

      {/* Switcher Buttons */}
      <div className="mode-switcher">
        <button 
          className={`mode-button ${mode === DEPLOYMENT_MODE.BASELINE ? 'active' : ''}`}
          onClick={() => switchMode(DEPLOYMENT_MODE.BASELINE)}
          disabled={mode === DEPLOYMENT_MODE.BASELINE}
        >
          <span className="mode-icon">🔓</span>
          <span className="mode-label">Baseline</span>
          {mode === DEPLOYMENT_MODE.BASELINE && <span className="check-mark">✓</span>}
        </button>

        <button 
          className={`mode-button ${mode === DEPLOYMENT_MODE.PRIVATE ? 'active' : ''}`}
          onClick={() => switchMode(DEPLOYMENT_MODE.PRIVATE)}
          disabled={mode === DEPLOYMENT_MODE.PRIVATE}
        >
          <span className="mode-icon">🔒</span>
          <span className="mode-label">ZKP</span>
          {mode === DEPLOYMENT_MODE.PRIVATE && <span className="check-mark">✓</span>}
        </button>
      </div>

      {/* Status List */}
      <div className="contracts-status">
        <h4 className="status-title">Active Components</h4>
        <ul className="status-list">
          <li className="status-item active">
            <span className="status-icon">✅</span>
            <span className="status-name">
              {mode === DEPLOYMENT_MODE.PRIVATE ? 'Private Voting Contract' : 'Standard Voting Contract'}
            </span>
          </li>
          
          <li className="status-item active">
            <span className="status-icon">✅</span>
            <span className="status-name">Governance Token</span>
          </li>

          <li className={`status-item ${hasReputation ? 'active' : 'disabled'}`}>
            <span className="status-icon">{hasReputation ? '✅' : '🚫'}</span>
            <span className="status-name">
              Reputation Manager {hasReputation ? '' : '(Disabled)'}
            </span>
          </li>

          {mode === DEPLOYMENT_MODE.PRIVATE && (
            <>
              <li className="status-item active">
                <span className="status-icon">✅</span>
                <span className="status-name">DID Registry</span>
              </li>
              <li className="status-item active">
                <span className="status-icon">✅</span>
                <span className="status-name">ZKP Verifier</span>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <div className="info-icon">💡</div>
        <p className="info-text">{deploymentInfo.description}</p>
      </div>

      {/* Instant Switch Notice */}
      <div className="instant-notice">
        <span className="instant-icon">⚡</span>
        <span className="instant-text">System switches instantly</span>
      </div>

    </div>
  );
};

export default DeploymentBadge;