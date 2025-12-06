// src/components/voting/PublicRegistration/PublicRegistration.jsx (FIXED)
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import { useWallet } from '../../../context/WalletContext';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import GovernanceTokenABI from '../../../abis/GovernanceToken.json';
import Button from '../../common/Button/Button';
import Alert from '../../common/Alert/Alert';
import Card from '../../common/Card/Card';
import { formatNumber } from '../../../utils/formatters';
import './PublicRegistration.css';

const PublicRegistration = () => {
  const { address, isConnected } = useAccount();
  const { balance } = useWallet();
  
  // ✅ Get contract instances
  const { contract: votingContract, read: readVoting, write: writeVoting } = useContract('DAOVoting', DAOVotingABI.abi);
  const { contract: tokenContract, read: readToken } = useContract('GovernanceToken', GovernanceTokenABI.abi);

  const [isRegistered, setIsRegistered] = useState(false);
  const [minTokensRequired, setMinTokensRequired] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alert, setAlert] = useState(null);

  // ✅ Add contracts to dependency array
  useEffect(() => {
    checkRegistrationStatus();
  }, [address, votingContract, tokenContract, isConnected]);

  const checkRegistrationStatus = async () => {
    // ✅ CRITICAL: Check if wallet is connected
    if (!address || !isConnected) {
      setCheckingStatus(false);
      return;
    }

    // ✅ CRITICAL: Check if contracts are initialized
    if (!votingContract || !tokenContract) {
      console.log('⏳ PublicRegistration: Waiting for contracts to initialize...');
      setCheckingStatus(true);
      return;
    }

    setCheckingStatus(true);
    try {
      // Check if user is registered
      const registered = await readVoting('registeredVoters', [address]).catch(err => {
        console.warn('Failed to check registration:', err.message);
        return false;
      });
      setIsRegistered(registered);

      // Get minimum tokens required
      const minTokens = await readVoting('minTokensToRegister', []).catch(err => {
        console.warn('Failed to get min tokens:', err.message);
        return 0n;
      });
      setMinTokensRequired(Number(minTokens) / 1e18);

      // Get user's token balance
      const tokenBalance = await readToken('balanceOf', [address]).catch(err => {
        console.warn('Failed to get token balance:', err.message);
        return 0n;
      });
      setUserBalance(Number(tokenBalance) / 1e18);

    } catch (err) {
      console.error('Error checking registration:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleRegister = async () => {
    if (userBalance < minTokensRequired) {
      showAlert('error', 'Insufficient Tokens', 
        `You need at least ${formatNumber(minTokensRequired)} GOV tokens to register.`
      );
      return;
    }

    setLoading(true);

    try {
      const { hash } = await writeVoting('selfRegister', []);
      console.log('✅ Registration transaction:', hash);

      showAlert('success', 'Registration Successful!', 
        'You are now registered and can vote on proposals.'
      );

      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      const message = err.message?.includes('Already registered')
        ? 'You are already registered for voting'
        : err.message?.includes('Insufficient tokens')
        ? 'You do not have enough GOV tokens to register'
        : err.message?.includes('user rejected')
        ? 'Transaction was rejected'
        : 'Registration failed. Please try again.';
      
      showAlert('error', 'Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card padding="large">
        <div className="public-registration-loading">
          <div className="spinner"></div>
          <p>Checking registration status...</p>
        </div>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card padding="large">
        <Alert type="warning" title="Wallet Not Connected">
          Please connect your wallet to register for voting.
        </Alert>
      </Card>
    );
  }

  if (isRegistered) {
    return (
      <Card padding="large">
        <div className="public-registration-success">
          <div className="success-icon">✅</div>
          <h3>Already Registered</h3>
          <p>Your wallet is registered for public voting.</p>
          <div className="registration-stats">
            <div className="stat-item">
              <span className="stat-label">Your Balance</span>
              <span className="stat-value">{formatNumber(userBalance)} GOV</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const hasEnoughTokens = userBalance >= minTokensRequired;

  return (
    <Card padding="large">
      <div className="public-registration">
        <div className="public-registration-header">
          <h2 className="public-registration-title">📋 Register for Voting</h2>
          <p className="public-registration-description">
            Register your wallet to participate in DAO governance
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <div className="registration-requirements">
          <h3>Requirements</h3>
          <div className="requirement-item">
            <div className="requirement-check">
              {hasEnoughTokens ? '✅' : '❌'}
            </div>
            <div className="requirement-details">
              <div className="requirement-label">GOV Token Balance</div>
              <div className="requirement-value">
                You have: <strong>{formatNumber(userBalance)} GOV</strong>
                <br />
                Required: <strong>{formatNumber(minTokensRequired)} GOV</strong>
              </div>
            </div>
          </div>
        </div>

        {!hasEnoughTokens && (
          <Alert type="warning" title="Insufficient Tokens">
            You need at least {formatNumber(minTokensRequired)} GOV tokens to register. 
            Please acquire more tokens or contact an admin.
          </Alert>
        )}

        <Button
          onClick={handleRegister}
          loading={loading}
          disabled={loading || !hasEnoughTokens}
          fullWidth
        >
          {loading ? 'Registering...' : 'Register for Voting'}
        </Button>

        <div className="public-registration-info">
          <Alert type="info" title="Registration Benefits">
            <ul>
              <li>Vote on active governance proposals</li>
              <li>Your voting power is based on your GOV token balance</li>
              <li>Registration is a one-time process per wallet</li>
              <li>Free to register (only gas fees apply)</li>
            </ul>
          </Alert>
        </div>
      </div>
    </Card>
  );
};

export default PublicRegistration;