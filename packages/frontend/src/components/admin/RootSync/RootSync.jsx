/* global BigInt */
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useContract } from "../../../hooks/useContract"; 
import PrivateDAOVotingABI from "../../../abis/PrivateDAOVoting.json"; 
import { buildPoseidon } from "circomlibjs";
import Button from '../../common/Button/Button';
import Alert from "../../common/Alert/Alert";
import "./RootSync.css";

const RootSync = () => {
  const { address } = useAccount();
  const { 
    contract: daoContract, 
    read: readDAO, 
    write: writeDAO 
  } = useContract("PrivateDAOVoting", PrivateDAOVotingABI.abi);

  const [localRoot, setLocalRoot] = useState("");
  const [contractRoot, setContractRoot] = useState("");
  const [voterCount, setVoterCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null); 

  // 1. Fetch Data and Calculate Root
  const checkRoots = async () => {
    if (!daoContract) return;
    setLoading(true);
    setStatus(null);

    try {
      // A. Get Contract Root
      const currentRoot = await readDAO("currentVoterSetRoot", []);
      setContractRoot(currentRoot);

      // B. Get All Voters
      const commitments = await readDAO("getAllVoterCommitments", []);
      setVoterCount(commitments.length);

      if (commitments.length > 0) {
        // C. Calculate Local Root
        const calculatedRoot = await calculateMerkleRoot(commitments);
        setLocalRoot(calculatedRoot);
      } else {
        setLocalRoot(currentRoot); 
      }

    } catch (error) {
      console.error("Sync Check Error:", error);
      setStatus({ type: "error", message: "Failed to check sync status." });
    } finally {
      setLoading(false);
    }
  };

  // 2. Merkle Tree Logic
  const calculateMerkleRoot = async (leaves) => {
    const poseidon = await buildPoseidon();
    const MERKLE_DEPTH = 6; 

    // Convert to BigInt
    const leafBigInts = leaves.map((leaf) => {
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

  // 3. The Sync Action
  const handleSync = async () => {
    if (!localRoot) return;
    setSyncing(true);
    try {
      const { hash } = await writeDAO("updateVoterSetRoot", [localRoot]);
      setStatus({ 
        type: "success", 
        message: `Sync started! Tx: ${hash.slice(0, 10)}...` 
      });
      // Wait a bit and refresh
      setTimeout(checkRoots, 5000); 
    } catch (error) {
      console.error("Sync failed:", error);
      setStatus({ type: "error", message: "Transaction failed." });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkRoots();
  }, [daoContract]);

  // UI Helpers
  const isSynced = localRoot && contractRoot && localRoot.toLowerCase() === contractRoot.toLowerCase();

  return (
    <div className="root-sync-card">
      <div className="root-sync-header">
        <h2 className="root-sync-title">
          Voter Root Synchronization
        </h2>
        <div className={`root-sync-badge ${isSynced ? 'synced' : 'not-synced'}`}>
          {isSynced ? "✅ System Synced" : "⚠️ Sync Required"}
        </div>
      </div>

      <p className="root-sync-description">
        Calculates the Merkle Root from registered voters and updates the smart contract. 
        <strong> You must Sync before creating a new proposal.</strong>
      </p>

      {status && (
        <Alert type={status.type}>{status.message}</Alert>
      )}

      <div className="root-sync-grid">
        {/* Contract Root */}
        <div className="root-sync-box">
          <label className="root-sync-label">
            On-Chain Root
          </label>
          <code className={`root-sync-code ${isSynced ? 'match' : 'mismatch'}`}>
            {contractRoot || "Loading..."}
          </code>
        </div>

        {/* Local Root */}
        <div className="root-sync-box">
          <label className="root-sync-label">
            Calculated Root ({voterCount} Voters)
          </label>
          <code className="root-sync-code match">
            {localRoot || "Calculating..."}
          </code>
        </div>
      </div>

      <div className="root-sync-actions">
        {!isSynced && (
          <Button 
            variant="primary" 
            onClick={handleSync} 
            loading={syncing}
            disabled={loading || syncing || !localRoot}
          >
            🔄 Sync Voters to Blockchain
          </Button>
        )}
        
        <Button 
          variant="secondary" 
          onClick={checkRoots} 
          disabled={loading}
        >
          Check Status
        </Button>
      </div>
    </div>
  );
};

export default RootSync;