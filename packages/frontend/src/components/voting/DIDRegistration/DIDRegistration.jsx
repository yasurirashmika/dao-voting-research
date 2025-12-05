// src/components/voting/DIDRegistration/DIDRegistration.jsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import DIDRegistryABI from '../../../abis/DIDRegistry.json';
import Button from '../../common/Button/Button';
import Alert from '../../common/Alert/Alert';
import Card from '../../common/Card/Card';
import { keccak256, toUtf8Bytes } from 'ethers';
import './DIDRegistration.css';

const DIDRegistration = () => {
  const { address, isConnected } = useAccount();
  const { contract: didContract, read: readDID, write: writeDID } = useContract('DIDRegistry', DIDRegistryABI.abi);

  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    checkRegistrationStatus();
  }, [address, didContract]);

  const checkRegistrationStatus = async () => {
    if (!address || !didContract) {
      setCheckingStatus(false);
      return;
    }

    setCheckingStatus(true);
    try {
      // Check if user has registered for voting
      const registered = await readDID('hasRegisteredForVoting', [address]);
      setIsRegistered(registered);
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

  const generateCommitment = (userSecret) => {
    // Hash the secret to create a commitment
    // In production, this should be: hash(secret + salt)
    const commitment = keccak256(toUtf8Bytes(userSecret));
    return commitment;
  };

  const handleRegister = async () => {
    if (!secret || !confirmSecret) {
      showAlert('warning', 'Missing Fields', 'Please enter your secret in both fields');
      return;
    }

    if (secret !== confirmSecret) {
      showAlert('error', 'Mismatch', 'Secrets do not match!');
      return;
    }

    if (secret.length < 6) {
      showAlert('warning', 'Weak Secret', 'Please use at least 6 characters for your secret');
      return;
    }

    setLoading(true);

    try {
      // 1. Generate commitment from secret
      const commitment = generateCommitment(secret);
      console.log('📝 Generated commitment:', commitment);

      // 2. Call self-registration function
      const { hash } = await writeDID('selfRegisterForVoting', [
        commitment,
        'GovernanceCredential' // Credential type
      ]);

      console.log('✅ Registration transaction:', hash);

      showAlert('success', 'Registration Successful!', 
        'Your DID has been created and you are registered for private voting. ' +
        'IMPORTANT: Save your secret securely - you will need it to vote!'
      );

      // Download secret as a backup
      downloadSecretBackup(secret, commitment);

      // Refresh status
      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      const message = err.message?.includes('Sybil')
        ? 'You are already registered for voting'
        : err.message?.includes('user rejected')
        ? 'Transaction was rejected'
        : 'Registration failed. Please try again.';
      
      showAlert('error', 'Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSecretBackup = (userSecret, commitment) => {
    const backup = {
      secret: userSecret,
      commitment: commitment,
      address: address,
      timestamp: new Date().toISOString(),
      warning: 'Keep this file secure! You need the secret to vote privately.'
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dao-voting-secret-${address.slice(0, 6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingStatus) {
    return (
      <Card padding="large">
        <div className="did-registration-loading">
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
          Please connect your wallet to register for private voting.
        </Alert>
      </Card>
    );
  }

  if (isRegistered) {
    return (
      <Card padding="large">
        <div className="did-registration-success">
          <div className="success-icon">✅</div>
          <h3>Already Registered</h3>
          <p>Your wallet is registered for private voting.</p>
          <Alert type="info" title="Remember Your Secret">
            You need to enter the same secret you used during registration when casting private votes.
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="large">
      <div className="did-registration">
        <div className="did-registration-header">
          <h2 className="did-registration-title">🔐 Register for Private Voting</h2>
          <p className="did-registration-description">
            Create your decentralized identity (DID) and register for anonymous voting
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <div className="did-registration-form">
          <div className="form-group">
            <label className="form-label">Choose a Secret</label>
            <input
              type="password"
              className="form-input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter a secret (min 6 characters)"
              disabled={loading}
            />
            <small className="form-helper">
              This secret will be used to generate your anonymous voting credential. Keep it secure!
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Secret</label>
            <input
              type="password"
              className="form-input"
              value={confirmSecret}
              onChange={(e) => setConfirmSecret(e.target.value)}
              placeholder="Re-enter your secret"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleRegister}
            loading={loading}
            disabled={loading || !secret || !confirmSecret}
            fullWidth
          >
            {loading ? 'Registering...' : 'Register for Private Voting'}
          </Button>
        </div>

        <div className="did-registration-info">
          <Alert type="info" title="Important Information">
            <ul>
              <li>Your secret will be used to generate a cryptographic commitment</li>
              <li>You will need this same secret every time you want to vote privately</li>
              <li>A backup file will be downloaded - store it securely</li>
              <li>Registration is a one-time process per wallet address</li>
            </ul>
          </Alert>
        </div>
      </div>
    </Card>
  );
};

export default DIDRegistration;