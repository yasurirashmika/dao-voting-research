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
import { IDKitWidget } from "@worldcoin/idkit";
import "./DIDRegistration.css";

const DIDRegistration = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();

  const {
    contract: didContract,
    read: readDID,
    write: writeDID,
  } = useContract("DIDRegistry", DIDRegistryABI.abi);

  const {
    contract: daoContract,
    read: readDAO,
    write: writeDAO,
  } = useContract("PrivateDAOVoting", PrivateDAOVotingABI.abi);

  // --- STATE ---
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [worldcoinProof, setWorldcoinProof] = useState(null);
  const [popVerified, setPOPVerified] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [savedSignature, setSavedSignature] = useState(null);
  const [savedCommitment, setSavedCommitment] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_API_URL;

  const WORLDCOIN_APP_ID =
    process.env.REACT_APP_WORLDCOIN_APP_ID ||
    "app_staging_d8c887aaebe91f7a3a5dd472106bb54e";
  const WORLDCOIN_ACTION = process.env.REACT_APP_WORLDCOIN_ACTION || "dao_vote";

  const normalizedAddress = address?.toLowerCase();

  // Reset verification state when address changes
  useEffect(() => {
    setPOPVerified(false);
    setWorldcoinProof(null);
    setSecret("");
    setConfirmSecret("");
    setSavedSignature(null);
    setSavedCommitment(null);
  }, [normalizedAddress]);

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

  const verifyIdentityWithBackend = async () => {
    try {
      console.log("🔄 Sending to backend...");
      console.log("📤 Address (normalized):", normalizedAddress);
      console.log("📤 Worldcoin Proof:", worldcoinProof);

      const response = await fetch(`${BACKEND_URL}/issue-credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: normalizedAddress,
          worldcoinProof: worldcoinProof,
        }),
      });

      const data = await response.json();

      console.log("📥 Backend Response:", data);

      if (!data.success) {
        throw new Error(data.error || "Verification denied by issuer");
      }

      console.log("Backend verification successful!");
      return data.signature;
    } catch (error) {
      console.error("Backend Error:", error);
      throw error;
    }
  };

  // Worldcoin Success Handler
  const handleWorldcoinSuccess = (proof) => {
    console.log("Worldcoin Verification Success:", proof);
    console.log("📋 Proof Details:");
    console.log("  - Nullifier:", proof.nullifier_hash);
    console.log("  - Merkle Root:", proof.merkle_root);
    console.log("  - Verification Level:", proof.verification_level);
    console.log("  - Signal Used:", normalizedAddress);
    console.log("  - Proof:", proof.proof);
    console.log("  - Proof Generated At:", new Date().toISOString());

    setWorldcoinProof(proof);
    setPOPVerified(true);
    toast.success(
      "Identity verified! You can now complete registration.",
      "Proof of Personhood",
    );
  };

  // Worldcoin Error Handler
  const handleWorldcoinError = (error) => {
    console.error("Worldcoin Error:", error);
    toast.error(
      "Worldcoin verification failed. Please try again.",
      "Verification Error",
    );
  };

  // Main Registration Handler
  const handleRegister = async () => {
    if (!popVerified && !savedSignature) {
      toast.warning(
        "Please verify your identity with Worldcoin first",
        "Missing Verification",
      );
      return;
    }

    if (!secret || !confirmSecret) {
      toast.warning(
        "Please enter your secret in both fields",
        "Missing Fields",
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
      let signature = savedSignature;
      let commitment = savedCommitment;

      // Only get new commitment + signature if we don't have one saved
      if (!signature || !commitment) {
        setStatusText("Generating Identity...");
        commitment = await generateCommitment(secret);
        setSavedCommitment(commitment);

        setStatusText("Verifying with Issuer (Checking PoP + Stake)...");
        signature = await verifyIdentityWithBackend();
        setSavedSignature(signature);
        console.log("Received Signature:", signature);
      } else {
        console.log("♻️ Reusing saved signature for blockchain retry");
      }

      setStatusText("Registering on Blockchain...");
      const { hash } = await writeDID("registerVoterForDAO", [
        commitment,
        signature,
      ]);
      console.log("Registration Tx:", hash);

      toast.info(
        "Identity registered! Syncing voting tree...",
        "Step 1 Complete",
      );

      setStatusText("Syncing Voting System...");
      await new Promise((r) => setTimeout(r, 4000));
      const newRoot = await calculateNewRoot();
      console.log("🌳 New Root Calculated:", newRoot);

      const { hash: syncHash } = await writeDAO("updateVoterSetRoot", [
        newRoot,
      ]);
      console.log("Root Synced:", syncHash);

      toast.success(
        "Registration Complete! Save your secret file immediately.",
        "Success!",
      );
      downloadSecretBackup(secret, commitment);

      // Clear saved state after success
      setSavedSignature(null);
      setSavedCommitment(null);

      window.dispatchEvent(new Event("dao:registrationComplete"));
      localStorage.setItem("dao_registration_complete", "true");

      setTimeout(() => {
        checkRegistrationStatus();
      }, 2000);
    } catch (err) {
      console.error("Process error:", err);
      let msg = err.message || "Unknown error";
      if (msg.includes("User rejected")) msg = "Transaction rejected.";
      if (msg.includes("Worldcoin verification failed")) {
        msg = "Identity verification failed. Please try again.";
      }

      // If signature already saved, blockchain failed — don't reset Worldcoin
      if (!savedSignature) {
        setPOPVerified(false);
        setWorldcoinProof(null);
        toast.error(
          msg + " — Please re-verify with Worldcoin and try again.",
          "Registration Failed",
        );
      } else {
        toast.error(
          "Blockchain transaction failed. Click 'Complete Registration' to retry.",
          "Transaction Failed",
        );
      }
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
          <div className="success-icon">✔️</div>
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
            Prove you're a unique human with Worldcoin, then register your
            voting identity.
          </p>
        </div>

        <div className="did-registration-form">
          {/* STEP 1: Worldcoin Verification */}
          <div className="form-group">
            <label className="form-label">Step 1: Prove You're Human</label>
            {!popVerified && !savedSignature ? (
              <>
                <IDKitWidget
                  app_id={WORLDCOIN_APP_ID}
                  action={WORLDCOIN_ACTION}
                  signal={normalizedAddress}
                  onSuccess={handleWorldcoinSuccess}
                  onError={handleWorldcoinError}
                  verification_level="device"
                  enableTelemetry={true}
                >
                  {({ open }) => (
                    <Button
                      onClick={open}
                      fullWidth
                      variant="primary"
                      disabled={!normalizedAddress}
                    >
                      {normalizedAddress
                        ? "🌍 Verify with Worldcoin"
                        : "Connect Wallet First"}
                    </Button>
                  )}
                </IDKitWidget>
              </>
            ) : (
              <div
                className="success-badge"
                style={{
                  padding: "1rem",
                  backgroundColor: "#d1fae5",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>✅</span>
                <span style={{ fontWeight: "600", color: "#065f46" }}>
                  Verified Unique Human
                </span>
              </div>
            )}
          </div>

          {/* STEP 2: Secret Password (Only after PoP) */}
          {(popVerified || savedSignature) && (
            <>
              <div className="form-group">
                <label className="form-label">
                  Step 2: Create Secret Password
                </label>
                <div className="input-wrapper">
                  <input
                    type={showSecret ? "text" : "password"}
                    className="form-input"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Min 6 characters"
                    disabled={loading || !!savedSignature}
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
                    disabled={loading || !!savedSignature}
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
                {loading ? statusText : savedSignature ? "Retry Blockchain Transaction" : "Complete Registration"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default DIDRegistration;