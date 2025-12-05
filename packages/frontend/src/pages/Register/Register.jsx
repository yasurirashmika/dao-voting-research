import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useDeployment } from '../../context/DeploymentContext';
import { useContract } from '../../hooks/useContract';
import DIDRegistration from '../../components/voting/DIDRegistration/DIDRegistration';
import PublicRegistration from '../../components/voting/PublicRegistration/PublicRegistration';
import Alert from '../../components/common/Alert/Alert';
import DAOVotingABI from '../../abis/DAOVoting.json';
import './Register.css';

const Register = () => {
  const { mode } = useDeployment();
  const { address, isConnected } = useAccount();
  const { read } = useContract('DAOVoting', DAOVotingABI.abi);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      if(isConnected && address) {
        try {
            const owner = await read('owner', []);
            if(owner.toLowerCase() === address.toLowerCase()) {
                setIsAdmin(true);
            }
        } catch(e) { console.error(e); }
      }
    };
    checkAdmin();
  }, [address, isConnected, read]);

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
          <h1>Join the DAO</h1>
          <p>Create your identity to participate in governance.</p>
        </div>

        {mode === 'private' ? (
          <DIDRegistration />
        ) : (
          <PublicRegistration />
        )}

        {/* Link for people who are lost */}
        <div className="register-footer">
            <p>Already have an account? <span className="link" onClick={() => navigate('/dashboard')}>Go to Dashboard</span></p>
        </div>
      </div>
    </div>
  );
};

export default Register;