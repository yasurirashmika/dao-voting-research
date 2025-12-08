/* global BigInt */
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../../../hooks/useContract';
import DIDRegistryABI from '../../../abis/DIDRegistry.json';
import Button from '../../common/Button/Button';
import Alert from '../../common/Alert/Alert';
import Card from '../../common/Card/Card';
import { buildPoseidon } from 'circomlibjs';
import './DIDRegistration.css';

const DIDRegistration = () => {
  const { address, isConnected } = useAccount();
  const { contract: didContract, read: readDID, write: writeDID } = useContract('DIDRegistry', DIDRegistryABI.abi);

  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  
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
    setTimeout(() => setAlert(null), 7000);
  };

  // ✅ CRITICAL FIX: Convert string to number (same algorithm as voting module)
  const stringToNumber = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // ✅ CRITICAL FIX: Use Poseidon instead of Keccak256
  const generateCommitment = async (userSecret) => {
    const poseidon = await buildPoseidon();
    const secretNumber = stringToNumber(userSecret);
    const poseidonHash = poseidon.F.toString(poseidon([secretNumber]));
    const commitment = '0x' + BigInt(poseidonHash).toString(16).padStart(64, '0');
    return commitment;
  };

  const handleRegister = async () => {
    setAlert(null);

    if (!secret || !confirmSecret) {
      showAlert('warning', 'Missing Fields', 'Please enter your secret in both fields');
      return;
    }

    if (secret !== confirmSecret) {
      showAlert('error', 'Mismatch', 'Secrets do not match! Please re-type them.');
      return;
    }

    if (secret.length < 6) {
      showAlert('warning', 'Weak Secret', 'Please use at least 6 characters for your secret');
      return;
    }

    setLoading(true);

    try {
      // Generate Poseidon commitment
      const commitment = await generateCommitment(secret);
      console.log('📝 Generated Poseidon commitment:', commitment);

      const { hash } = await writeDID('selfRegisterForVoting', [commitment]);

      console.log('✅ Registration transaction:', hash);

      showAlert('success', 'Registration Successful!', 
        'Your Decentralized Identity is created! We are downloading your Secret Key backup now. KEEP IT SAFE.'
      );

      downloadSecretBackup(secret, commitment);

      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      
      let title = 'Registration Failed';
      let message = 'An unexpected error occurred. Please check console.';

      if (err.message) {
        if (err.message.includes('User rejected') || err.message.includes('rejected the request')) {
          title = 'Transaction Cancelled';
          message = 'You rejected the transaction in your wallet.';
        } else if (err.message.includes('Sybil') || err.message.includes('Already registered')) {
          title = 'Already Registered';
          message = 'This wallet address is already registered for voting.';
        } else if (err.message.includes('length mismatch')) {
          message = 'Data format error. Please refresh the page and try again.';
        } else {
           message = err.message.slice(0, 100) + '...';
        }
      }
      
      showAlert('error', title, message);
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
    a.download = `dao-secret-${address.slice(0, 6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingStatus) {
    return (
      <Card padding="large">
        <div className="did-registration-loading">
          <div className="spinner"></div>
          <p>Verifying identity status...</p>
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
          <h3>Identity Verified</h3>
          <p>You are already registered for private voting.</p>
          <Alert type="info" title="Important">
            When voting, you will be asked for the <strong>Secret</strong> you created during registration.
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="large">
      <div className="did-registration">
        <div className="did-registration-header">
          <h2 className="did-registration-title">🔐 Private Identity Setup</h2>
          <p className="did-registration-description">
            Create a secure secret to vote anonymously. We do not store this secret.
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <div className="did-registration-form">
          <div className="form-group">
            <label className="form-label">Create Secret Password</label>
            <div className="input-wrapper">
                <input
                  type={showSecret ? "text" : "password"}
                  className="form-input"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Min 6 characters"
                  disabled={loading}
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowSecret(!showSecret)}
                  title={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? '🙈' : '👁️'}
                </button>
            </div>
            <small className="form-helper">
              Write this down or save the backup file. It cannot be recovered.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Secret</label>
            <div className="input-wrapper">
                <input
                  type={showSecret ? "text" : "password"}
                  className="form-input"
                  value={confirmSecret}
                  onChange={(e) => setConfirmSecret(e.target.value)}
                  placeholder="Re-enter secret"
                  disabled={loading}
                />
            </div>
          </div>

          <Button
            onClick={handleRegister}
            loading={loading}
            disabled={loading || !secret || !confirmSecret}
            fullWidth
          >
            {loading ? 'Registering on Blockchain...' : 'Create Identity & Register'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DIDRegistration;