import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DEPLOYMENT_MODE } from '../config/deploymentConfig';

const DeploymentContext = createContext();

export const useDeployment = () => {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }
  return context;
};

export const DeploymentProvider = ({ children }) => {
  // 1. Initialize State
  // Priority: LocalStorage -> Environment Variable -> Baseline Default
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('deployment_mode');
    const env = process.env.REACT_APP_DEPLOYMENT_MODE;
    return saved || env || DEPLOYMENT_MODE.BASELINE;
  });

  // 2. Persist State
  useEffect(() => {
    localStorage.setItem('deployment_mode', mode);
  }, [mode]);

  // 3. Memoize Info Object (for UI display)
  const deploymentInfo = useMemo(() => {
    if (mode === DEPLOYMENT_MODE.PRIVATE) {
      return {
        mode: 'Private',
        label: 'ZKP Private Voting',
        icon: '🔒',
        description: 'Zero-Knowledge Proofs + DID Registry + Reputation',
        color: '#9333ea'
      };
    }
    return {
      mode: 'Baseline',
      label: 'Public Voting',
      icon: '🔓',
      description: 'Standard Weighted Voting (Token Only)',
      color: '#3b82f6'
    };
  }, [mode]);

  // 4. Action: Toggle between modes
  const toggleMode = useCallback(() => {
    setMode(prev => 
      prev === DEPLOYMENT_MODE.BASELINE 
        ? DEPLOYMENT_MODE.PRIVATE 
        : DEPLOYMENT_MODE.BASELINE
    );
  }, []);

  // 5. Action: Switch to specific mode
  const switchMode = useCallback((targetMode) => {
    if (Object.values(DEPLOYMENT_MODE).includes(targetMode)) {
      setMode(targetMode);
    }
  }, []);

  // 6. Build Context Value
  const value = useMemo(() => ({
    mode,
    deploymentInfo,
    toggleMode,
    switchMode,
    DEPLOYMENT_MODE, // Export constants for consumers
    isPrivate: mode === DEPLOYMENT_MODE.PRIVATE,
    isBaseline: mode === DEPLOYMENT_MODE.BASELINE
  }), [mode, deploymentInfo, toggleMode, switchMode]);

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
};