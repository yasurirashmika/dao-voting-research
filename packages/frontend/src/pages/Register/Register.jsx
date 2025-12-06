import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useDeployment } from '../../context/DeploymentContext';
import { useContract } from '../../hooks/useContract';
import DIDRegistration from '../../components/voting/DIDRegistration/DIDRegistration';
import PublicRegistration from '../../components/voting/PublicRegistration/PublicRegistration';
import Alert from '../../components/common/Alert/Alert';
import DAOVotingABI from '../../abis/DAOVoting.json';
import PrivateDAOVotingABI from '../../abis/PrivateDAOVoting.json';
import './Register.css';

const Register = () => {
  const { mode, isPrivate } = useDeployment();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(false);

  const contractName = isPrivate ? 'PrivateDAOVoting' : 'DAOVoting';
  const contractAbi = isPrivate ? PrivateDAOVotingABI.abi : DAOVotingABI.abi;
  
  const { contract, read } = useContract(contractName, contractAbi);

  //  check admin AFTER contract is ready
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isConnected || !address || !contract) {
        setIsAdmin(false);
        return;
      }

      try {
        const owner = await read('owner', []);
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [address, isConnected, contract, read]);

  return (
    <div className="register-page">
      <div className="register-container">
        
        {/* Admin Specific Message */}
        {isAdmin && (
          <div className="admin-register-notice">
            <Alert type="info" title="Admin Setup">
              As an Admin, you are setting up your personal voting identity. 
              This is separate from your administrative privileges.
            </Alert>
          </div>
        )}

        <div className="register-header">
          <h1 className="register-title">Join the DAO</h1>
          <p className="register-subtitle">Create your identity to participate in governance.</p>
        </div>

        {/* Render appropriate registration component */}
        {isPrivate ? (
          <DIDRegistration />
        ) : (
          <PublicRegistration />
        )}

        {/* Link for people who are lost */}
        <div className="register-footer">
          <p>
            Already registered? {' '}
            <span className="link" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;