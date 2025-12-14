/* global BigInt */
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useContract } from "../../../hooks/useContract";
import DIDRegistryABI from "../../../abis/DIDRegistry.json";
import PrivateDAOVotingABI from "../../../abis/PrivateDAOVoting.json";
import Button from "../../common/Button/Button";
import Card from "../../common/Card/Card";
import { buildPoseidon } from "circomlibjs";
import { useToast } from "../../../context/ToastContext";
import "./DIDRegistration.css";

const DIDRegistration = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();

  // 1. Contract 1: DID Registry
  const {
    contract: didContract,
    read: readDID,
    write: writeDID,
  } = useContract("DIDRegistry", DIDRegistryABI.abi);

  // 2. Contract 2: DAO Voting
  const {
    contract: daoContract,
    read: readDAO,
    write: writeDAO,
  } = useContract("PrivateDAOVoting", PrivateDAOVotingABI.abi);

  // --- NEW STATE: National ID ---
  const [nationalID, setNationalID] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  // --- CONFIG: Backend URL ---
  const BACKEND_URL = "http://localhost:3001";

  useEffect(() => {
    checkRegistrationStatus();
  }, [address, didContract]);

  const checkRegistrationStatus = async () => {
    if (!address || !didContract) {
      setCheckingStatus(true);
      return;
    }

    setCheckingStatus(true);
    try {
      const registered = await readDID("hasRegisteredForVoting", [address]);
      setIsRegistered(registered);
    } catch (err) {
      console.error("Error checking registration:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // --- HELPER 1: Identity/Secret Logic ---
  const stringToNumber = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const generateCommitment = async (userSecret) => {
    const poseidon = await buildPoseidon();
    const secretNumber = stringToNumber(userSecret);
    const poseidonHash = poseidon.F.toString(poseidon([secretNumber]));
    const commitment =
      "0x" + BigInt(poseidonHash).toString(16).padStart(64, "0");
    return commitment;
  };

  // --- HELPER 2: Merkle Tree Syncing ---
  const calculateNewRoot = async () => {
    console.log("🌳 Calculating new Merkle Root...");
    const poseidon = await buildPoseidon();
    const MERKLE_DEPTH = 6;

    const commitments = await readDAO("getAllVoterCommitments", []);

    const leafBigInts = commitments.map((leaf) => {
      const cleaned = leaf.startsWith("0x") ? leaf.slice(2) : leaf;
      return BigInt("0x" + cleaned);
    });

    const paddedLeaves = [...leafBigInts];
    const targetSize = 2 ** MERKLE_DEPTH;
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push(0n);
    }

    let currentLevel = paddedLeaves;
    for (let i = 0; i < MERKLE_DEPTH; i++) {
      const nextLevel = [];
      for (let j = 0; j < currentLevel.length; j += 2) {
        const left = currentLevel[j];
        const right = currentLevel[j + 1];
        const hash = poseidon([left, right]);
        const hashStr = poseidon.F.toString(hash);
        nextLevel.push(BigInt(hashStr));
      }
      currentLevel = nextLevel;
    }

    return "0x" + currentLevel[0].toString(16).padStart(64, "0");
  };

  // --- HELPER 3: Backend Verification ---
  const verifyIdentityWithBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/issue-credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ FIX: Send BOTH address and nationalID
        body: JSON.stringify({
          userAddress: address,
          nationalID: nationalID,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Verification denied by issuer");
      }
      return data.signature;
    } catch (error) {
      console.error("Backend Error:", error);
      // Pass the error message up so toast can display it (e.g. "Insufficient Stake")
      throw error;
    }
  };

  const handleRegister = async () => {
    if (!secret || !confirmSecret) {
      toast.warning(
        "Please enter your secret in both fields",
        "Missing Fields"
      );
      return;
    }
    if (secret !== confirmSecret) {
      toast.error("Secrets do not match!", "Mismatch");
      return;
    }
    if (secret.length < 6) {
      toast.warning("Secret must be at least 6 characters", "Weak Secret");
      return;
    }

    setLoading(true);

    try {
      // --- STEP 1: GENERATE COMMITMENT ---
      setStatusText("Generating Identity...");
      const commitment = await generateCommitment(secret);

      // --- STEP 2: GET SIGNATURE FROM BACKEND ---
      setStatusText("Verifying with Issuer...");
      const signature = await verifyIdentityWithBackend();
      console.log("✅ Received Signature:", signature);

      // --- STEP 3: REGISTER ON BLOCKCHAIN ---
      setStatusText("Registering on Blockchain...");

      const { hash } = await writeDID("registerVoterForDAO", [
        commitment,
        signature,
      ]);
      console.log("✅ Registration Tx:", hash);

      toast.info(
        "Identity registered! Syncing voting tree...",
        "Step 1 Complete"
      );

      // --- STEP 4: SYNC ROOT AUTOMATICALLY ---
      setStatusText("Syncing Voting System...");

      await new Promise((r) => setTimeout(r, 4000));
      const newRoot = await calculateNewRoot();
      console.log("🌳 New Root Calculated:", newRoot);

      const { hash: syncHash } = await writeDAO("updateVoterSetRoot", [
        newRoot,
      ]);
      console.log("✅ Root Synced:", syncHash);

      // --- FINISH ---
      toast.success(
        "Registration Complete! Save your secret file immediately.",
        "Success!"
      );
      downloadSecretBackup(secret, commitment);

      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);
    } catch (err) {
      console.error("Process error:", err);
      // Display the specific error from the backend (e.g., "Insufficient Stake")
      let msg = err.message || "Unknown error";
      if (msg.includes("User rejected")) msg = "Transaction rejected.";
      toast.error(msg, "Registration Failed");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const downloadSecretBackup = (userSecret, commitment) => {
    const backup = {
      secret: userSecret,
      commitment: commitment,
      address: address,
      timestamp: new Date().toISOString(),
      warning: "Keep this file secure! You need the secret to vote privately.",
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
        <div className="did-registration-warning">
          ⚠️ Please connect your wallet to register for private voting.
        </div>
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
          <div
            className="info-box"
            style={{
              marginTop: "1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
            <p style={{ margin: 0, lineHeight: "1.5", color: "#555" }}>
              When voting, you will be asked for the <strong>Secret</strong> you
              created during registration.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="large">
      <div className="did-registration">
        <div className="did-registration-header">
          <h2 className="did-registration-title">🔐 Verified Identity Setup</h2>
          <p className="did-registration-description">
            Your address will be verified by the Issuer before registration.
          </p>
        </div>

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
              >
                {showSecret ? "🙈" : "👁️"}
              </button>
            </div>
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
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <Button
            onClick={handleRegister}
            loading={loading}
            disabled={loading || !secret || !confirmSecret || !nationalID}
            fullWidth
          >
            {loading ? statusText : "Verify & Register"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DIDRegistration;
