import React, { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useAdmin } from "../../hooks/useAdmin";
import { useVoterDiscovery } from "../../hooks/useVoterDiscovery"; // Import Auto-Discovery
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Alert from "../../components/common/Alert/Alert";
import Loader from "../../components/common/Loader/Loader";
import { formatAddress } from "../../utils/formatters";
import "./Admin.css";
import TokenMinting from "../../components/admin/TokenMinting/TokenMinting";
import TokenBalance from "../../components/admin/TokenBalance/TokenBalance";
import RootSync from "../../components/admin/RootSync/RootSync";
import ReputationManagement from "../../components/admin/ReputationManagement/ReputationManagement";

const Admin = () => {
  const { address, isConnected } = useAccount();
  const { registerVoter, isRegisteredVoter, isOwner, loading, contract } =
    useAdmin();

  // Auto-discover wallets from blockchain events
  const { discoveredWallets } = useVoterDiscovery();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [voterAddress, setVoterAddress] = useState("");
  const [batchAddresses, setBatchAddresses] = useState("");
  const [alert, setAlert] = useState(null);
  const [registeredVoters, setRegisteredVoters] = useState([]);

  // Merge current user + auto-discovered wallets (No hardcoding needed)
  const allWallets = useMemo(() => {
    const unique = new Set([address, ...discoveredWallets]);
    return Array.from(unique).filter(Boolean);
  }, [address, discoveredWallets]);

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
  }, [isAdmin, contract, allWallets]); // Reload when new wallets are discovered

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

    if (!contract) return;

    setCheckingAdmin(true);

    try {
      const adminStatus = await isOwner();
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const loadRegisteredVoters = async () => {
    if (!contract) return;

    const voters = [];

    // Loop through dynamically discovered wallets
    for (const addr of allWallets) {
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
    if (!voterAddress || !voterAddress.startsWith("0x")) {
      showAlert(
        "error",
        "Invalid Address",
        "Please enter a valid Ethereum address."
      );
      return;
    }

    try {
      await registerVoter(voterAddress);
      showAlert(
        "success",
        "Voter Registered!",
        `Successfully registered ${formatAddress(voterAddress)}`
      );
      setVoterAddress("");
      await loadRegisteredVoters();
    } catch (err) {
      console.error("Registration error:", err);
      const message = err.message.includes("Already registered")
        ? "This address is already registered as a voter."
        : "Failed to register voter. Please try again.";
      showAlert("error", "Registration Failed", message);
    }
  };

  const handleBatchRegister = async () => {
    const addresses = batchAddresses
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr.startsWith("0x"));

    if (addresses.length === 0) {
      showAlert(
        "error",
        "No Valid Addresses",
        "Please enter valid Ethereum addresses (one per line)."
      );
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
        }
      }

      showAlert(
        "success",
        "Batch Registration Complete",
        `Registered ${successCount} voters. ${
          errorCount > 0 ? `${errorCount} failed.` : ""
        }`
      );
      setBatchAddresses("");
      await loadRegisteredVoters();
    } catch (err) {
      showAlert(
        "error",
        "Batch Registration Failed",
        "An error occurred during batch registration."
      );
    }
  };

  const handleRegisterTestWallet = async (walletAddress) => {
    try {
      await registerVoter(walletAddress);
      showAlert(
        "success",
        "Voter Registered!",
        `Successfully registered ${formatAddress(walletAddress)}`
      );
      await loadRegisteredVoters();
    } catch (err) {
      const message = err.message.includes("Already registered")
        ? "This address is already registered."
        : "Failed to register voter.";
      showAlert("error", "Registration Failed", message);
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
            You don't have permission to access the admin panel.
          </Alert>
          <div className="admin-access-denied">
            <p>
              <strong>Your Address:</strong>
            </p>
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
        <Alert
          type={alert.type}
          title={alert.title}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <div className="admin-grid">
        {/* Row 1: System Sync */}
        <div style={{ gridColumn: "1 / -1" }}>
          <RootSync />
        </div>

        {/* Row 2: Registration Forms */}
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
            placeholder={"0x123...\n0x456..."}
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

        {/* Row 3: Reputation Management */}
        <div style={{ gridColumn: "1 / -1" }}>
          <ReputationManagement />
        </div>

        {/* Row 4: Token Management */}
        <TokenMinting onMintSuccess={loadRegisteredVoters} />
        <TokenBalance />

        {/* Row 5: Stats & Auto-Discovered Wallets */}
        <Card padding="large">
          <h2 className="section-title">Known Wallets (Auto-Detected)</h2>
          <p className="section-description">
            Wallets that have interacted with the DAO.
          </p>

          <div className="test-wallets-list">
            {registeredVoters.length === 0 && (
              <p style={{ color: "#888" }}>No activity detected yet.</p>
            )}

            {registeredVoters.map((voter, index) => (
              <div key={voter.address} className="test-wallet-item">
                <div className="test-wallet-info">
                  <div className="test-wallet-label">Wallet {index + 1}</div>
                  <div className="test-wallet-address">{voter.address}</div>
                </div>
                <div className="test-wallet-action">
                  {voter.error ? (
                    <span className="wallet-status-error">Error</span>
                  ) : voter.registered ? (
                    <span className="wallet-status-registered">
                      ✓ Registered
                    </span>
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
                {registeredVoters.filter((v) => v.registered).length}
              </div>
              <div className="stat-label">Registered Voters</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {
                  registeredVoters.filter((v) => !v.registered && !v.error)
                    .length
                }
              </div>
              <div className="stat-label">Unregistered Visitors</div>
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
