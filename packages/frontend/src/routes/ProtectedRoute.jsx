import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

const ProtectedRoute = ({ children }) => {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="protected-route-container">
        <div className="protected-route-message">
          <h2>Wallet Connection Required</h2>
          <p>Please connect your wallet to access this page.</p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;