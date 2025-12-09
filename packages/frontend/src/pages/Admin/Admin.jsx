import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAdmin } from '../../hooks/useAdmin';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Alert from '../../components/common/Alert/Alert';
import Loader from '../../components/common/Loader/Loader';
import { formatAddress } from '../../utils/formatters';
import './Admin.css';
import TokenMinting from '../../components/admin/TokenMinting/TokenMinting';
import TokenBalance from '../../components/admin/TokenBalance/TokenBalance';
import RootSync from '../../components/admin/RootSync/RootSync';
import ReputationManagement from '../../components/admin/ReputationManagement/ReputationManagement'; // ✅ Import Reputation Component

const Admin = () => {
  const { address, isConnected } = useAccount();
  const {
    registerVoter,
    isRegisteredVoter,
    isOwner,
    loading,
    error,
    contract
  } = useAdmin();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [voterAddress, setVoterAddress] = useState('');
  const [batchAddresses, setBatchAddresses] = useState('');
  const [alert, setAlert] = useState(null);
  const [registeredVoters, setRegisteredVoters] = useState([]);

  // Test wallets
  const testWallets = [
    address,
    // Add other test wallets here if needed
  ].filter(Boolean);

  useEffect(() => {
    if (isConnected && contract) {
      checkAdminStatus();
    } else if (!isConnected) {
      setCheckingAdmin(false);
    }
  }, [address, isConnected, contract]); 

  useEffect(() => {
    if (isAdmin && contract) {
      loadRegisteredVoters();
    }
  }, [isAdmin, contract]);

  const showAlert = (type, title, message, duration = 5000) => {
    setAlert({ type, title, message });
    if (duration) {
      setTimeout(() => setAlert(null), duration);
    }
  };

  const checkAdminStatus = async () => {
    if (!address || !isConnected) {
      setCheckingAdmin(false);
      setIsAdmin(false);
      return;
    }

    if (!contract) {
      return; 
    }

    setCheckingAdmin(true);

    try {
      const adminStatus = await isOwner();
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('❌ Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const loadRegisteredVoters = async () => {
    if (!contract) return; 

    const voters = [];
    
    for (const addr of testWallets) {
      if (!addr) continue;
      try {
        const registered = await isRegisteredVoter(addr);
        voters.push({ address: addr, registered });
      } catch (err) {
        console.error(`Error checking ${addr}:`, err);
        voters.push({ address: addr, registered: false, error: true });
      }
    }
    
    setRegisteredVoters(voters);
  };

  const handleRegisterVoter = async () => {
    if (!voterAddress || !voterAddress.startsWith('0x')) {
      showAlert('error', 'Invalid Address', 'Please enter a valid Ethereum address.');
      return;
    }

    try {
      await registerVoter(voterAddress);
      showAlert('success', 'Voter Registered!', `Successfully registered ${formatAddress(voterAddress)}`);
      setVoterAddress('');
      await loadRegisteredVoters();
    } catch (err) {
      console.error('Registration error:', err);
      const message = err.message.includes('Already registered') 
        ? 'This address is already registered as a voter.'
        : err.message.includes('Ownable: caller is not the owner')
        ? 'Only the contract owner can register voters.'
        : 'Failed to register voter. Please try again.';
      showAlert('error', 'Registration Failed', message);
    }
  };

  const handleBatchRegister = async () => {
    const addresses = batchAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.startsWith('0x'));

    if (addresses.length === 0) {
      showAlert('error', 'No Valid Addresses', 'Please enter valid Ethereum addresses (one per line).');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const addr of addresses) {
        try {
          await registerVoter(addr);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed to register ${addr}:`, err);
        }
      }

      showAlert(
        'success',
        'Batch Registration Complete',
        `Registered ${successCount} voters. ${errorCount > 0 ? `${errorCount} failed.` : ''}`
      );
      setBatchAddresses('');
      await loadRegisteredVoters();
    } catch (err) {
      showAlert('error', 'Batch Registration Failed', 'An error occurred during batch registration.');
    }
  };

  const handleRegisterTestWallet = async (walletAddress) => {
    try {
      await registerVoter(walletAddress);
      showAlert('success', 'Voter Registered!', `Successfully registered ${formatAddress(walletAddress)}`);
      await loadRegisteredVoters();
    } catch (err) {
      const message = err.message.includes('Already registered')
        ? 'This address is already registered.'
        : 'Failed to register voter.';
      showAlert('error', 'Registration Failed', message);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="admin-page admin-loading">
        <Loader size="large" text="Verifying admin access..." />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="admin-page">
        <Card padding="large" className="admin-not-connected">
          <h2>Please Connect Your Wallet</h2>
          <p>You need to connect your wallet to access the admin panel.</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <Card padding="large">
          <Alert type="error" title="Access Denied">
            You don't have permission to access the admin panel. Only the contract owner can access this page.
          </Alert>
          <div className="admin-access-denied">
            <p><strong>Your Address:</strong></p>
            <code className="admin-address-display">{address}</code>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage voters and DAO settings</p>
        <div className="admin-owner-badge">
          <span className="admin-owner-status">✓ Owner Access</span>
          <span className="admin-divider">|</span>
          <span className="admin-owner-address">{formatAddress(address)}</span>
        </div>
      </div>

      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <div className="admin-grid">
        {/* Row 1: Critical System Sync */}
        <div style={{ gridColumn: '1 / -1' }}>
           <RootSync />
        </div>

        {/* Row 2: Voter Registration */}
        <Card padding="large">
          <h2 className="section-title">Register Single Voter</h2>
          <p className="section-description">
            Register a new voter by entering their Ethereum address
          </p>
          <div className="admin-register-form">
            <div className="admin-input-wrapper">
              <Input
                label="Voter Address"
                value={voterAddress}
                onChange={(e) => setVoterAddress(e.target.value)}
                placeholder="0x..."
                helperText="Enter a valid Ethereum address"
              />
            </div>
            <Button
              onClick={handleRegisterVoter}
              loading={loading}
              disabled={!voterAddress || loading}
            >
              Register
            </Button>
          </div>
        </Card>

        <Card padding="large">
          <h2 className="section-title">Batch Register Voters</h2>
          <p className="section-description">
            Register multiple voters at once (one address per line)
          </p>
          <Input
            label="Addresses"
            multiline
            rows={6}
            value={batchAddresses}
            onChange={(e) => setBatchAddresses(e.target.value)}
            placeholder={'0x123...\n0x456...\n0x789...'}
            helperText="Paste Ethereum addresses, one per line"
          />
          <Button
            onClick={handleBatchRegister}
            loading={loading}
            disabled={!batchAddresses || loading}
            className="admin-batch-button"
            fullWidth
          >
            Register All
          </Button>
        </Card>

        {/* Row 3: Reputation Management (NEW) */}
        <div style={{ gridColumn: '1 / -1' }}>
           {/* Note: This takes full width for better usability */}
           <ReputationManagement />
        </div>

        {/* Row 4: Token Management */}
        <TokenMinting onMintSuccess={loadRegisteredVoters} />
        <TokenBalance />

        {/* Row 5: Stats & Quick Actions */}
        <Card padding="large">
          <h2 className="section-title">Quick Register Test Wallets</h2>
          <div className="test-wallets-list">
            {registeredVoters.map((voter, index) => (
              <div key={voter.address} className="test-wallet-item">
                <div className="test-wallet-info">
                  <div className="test-wallet-label">
                    Wallet {index + 1}: {formatAddress(voter.address)}
                  </div>
                  <div className="test-wallet-address">
                    {voter.address}
                  </div>
                </div>
                <div className="test-wallet-action">
                  {voter.error ? (
                    <span className="wallet-status-error">Error</span>
                  ) : voter.registered ? (
                    <span className="wallet-status-registered">✓ Registered</span>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => handleRegisterTestWallet(voter.address)}
                      loading={loading}
                    >
                      Register
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="large">
          <h2 className="section-title">Voter Statistics</h2>
          <div className="voter-stats">
            <div className="stat-item">
              <div className="stat-value">
                {registeredVoters.filter(v => v.registered).length}
              </div>
              <div className="stat-label">Registered Voters</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {registeredVoters.filter(v => !v.registered && !v.error).length}
              </div>
              <div className="stat-label">Pending Registration</div>
            </div>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={loadRegisteredVoters}
            className="admin-refresh-button"
          >
            Refresh Status
          </Button>
        </Card>
        
      </div>
    </div>
  );
};

export default Admin;