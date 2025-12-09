/* global BigInt */
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useContract } from "../../../hooks/useContract";
import DIDRegistryABI from "../../../abis/DIDRegistry.json";
import PrivateDAOVotingABI from "../../../abis/PrivateDAOVoting.json"; // ✅ Import DAO ABI
import Button from "../../common/Button/Button";
import Card from "../../common/Card/Card";
import { buildPoseidon } from "circomlibjs";
import { useToast } from "../../../context/ToastContext"; // ✅ Use Toast Context
import "./DIDRegistration.css";

const DIDRegistration = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();

  // 1. Contract 1: DID Registry (For Registration)
  const { read: readDID, write: writeDID } = useContract(
    "DIDRegistry",
    DIDRegistryABI.abi
  );

  // 2. Contract 2: DAO Voting (For Syncing Root)
  const { read: readDAO, write: writeDAO } = useContract(
    "PrivateDAOVoting",
    PrivateDAOVotingABI.abi
  );

  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkRegistrationStatus();
  }, [address, readDID]);

  const checkRegistrationStatus = async () => {
    if (!address || !readDID) {
      setCheckingStatus(false);
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

  // ✅ Helper: Calculate Merkle Root
  const calculateNewRoot = async () => {
    console.log("🌳 Calculating new Merkle Root...");
    const poseidon = await buildPoseidon();
    const MERKLE_DEPTH = 5;

    // Fetch all voters (now including the one we just registered)
    const commitments = await readDAO("getAllVoterCommitments", []);

    // Convert to BigInt
    const leafBigInts = commitments.map((leaf) => {
      const cleaned = leaf.startsWith("0x") ? leaf.slice(2) : leaf;
      return BigInt("0x" + cleaned);
    });

    // Pad leaves
    const paddedLeaves = [...leafBigInts];
    const targetSize = 2 ** MERKLE_DEPTH;
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push(0n);
    }

    // Build Tree
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

  const handleRegister = async () => {
    if (!secret || !confirmSecret) {
      toast.warning(
        "Please enter your secret in both fields",
        "Missing Fields"
      );
      return;
    }
    if (secret !== confirmSecret) {
      toast.error("Secrets do not match! Please re-type them.", "Mismatch");
      return;
    }
    if (secret.length < 6) {
      toast.warning(
        "Please use at least 6 characters for your secret",
        "Weak Secret"
      );
      return;
    }

    setLoading(true);

    try {
      // --- STEP 1: GENERATE COMMITMENT ---
      setStatusText("Generating Identity...");
      const commitment = await generateCommitment(secret);

      // --- STEP 2: REGISTER ON BLOCKCHAIN ---
      setStatusText("Step 1/2: Registering Identity...");
      const { hash } = await writeDID("selfRegisterForVoting", [commitment]);
      console.log("✅ Registered:", hash);

      toast.info(
        "Identity registered! Now syncing with voting system... (Please sign the next transaction)",
        "Step 1 Complete"
      );

      // --- STEP 3: SYNC ROOT AUTOMATICALLY ---
      setStatusText("Step 2/2: Syncing Voting System...");

      // Wait a moment for the node to index the new voter
      await new Promise((r) => setTimeout(r, 3000));

      const newRoot = await calculateNewRoot();
      console.log("🌳 New Root Calculated:", newRoot);

      const { hash: syncHash } = await writeDAO("updateVoterSetRoot", [
        newRoot,
      ]);
      console.log("✅ Root Synced:", syncHash);

      // --- FINISH ---
      toast.success(
        "You are registered and the voting system is synced. Don't forget to save your backup!",
        "Setup Complete!"
      );
      downloadSecretBackup(secret, commitment);

      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);
    } catch (err) {
      console.error("Process error:", err);
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
          <h2 className="did-registration-title">🔐 Private Identity Setup</h2>
          <p className="did-registration-description">
            Create a secure secret to vote anonymously.
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
            disabled={loading || !secret || !confirmSecret}
            fullWidth
          >
            {loading ? statusText : "Create Identity & Register"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DIDRegistration;
