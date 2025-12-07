/* global BigInt */
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useProposals } from "../../../hooks/useProposals";
import { useContract } from "../../../hooks/useContract";
import { useDeployment } from "../../../context/DeploymentContext";
import PrivateDAOVotingABI from "../../../abis/PrivateDAOVoting.json";
import DIDRegistryABI from "../../../abis/DIDRegistry.json";
import Button from "../../common/Button/Button";
import Alert from "../../common/Alert/Alert";
import "./ZKVotingModule.css";
import { ethers } from "ethers";
import { buildPoseidon } from "circomlibjs";

const snarkjs = window.snarkjs || require("snarkjs");

const ZKVotingModule = ({ preselectedProposalId, onVoteSuccess }) => {
  const { address } = useAccount();
  const { proposals } = useProposals();
  const { mode } = useDeployment();

  const {
    write: writePrivateVote,
    read: readPrivateVoting,
    contract: privateVotingContract,
  } = useContract("PrivateDAOVoting", PrivateDAOVotingABI.abi);
  const { read: readDID, contract: didContract } = useContract(
    "DIDRegistry",
    DIDRegistryABI.abi
  );

  const [selectedProposal, setSelectedProposal] = useState(
    preselectedProposalId || ""
  );
  const [selectedVote, setSelectedVote] = useState("");
  const [secret, setSecret] = useState("");
  const [merkleRoot, setMerkleRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [fetchingRoot, setFetchingRoot] = useState(false);

  useEffect(() => {
    const fetchMerkleRoot = async () => {
      if (!privateVotingContract || !readPrivateVoting) return;

      setFetchingRoot(true);
      try {
        const root = await readPrivateVoting("currentVoterSetRoot", []);
        setMerkleRoot(root);
        console.log("Auto-fetched Merkle Root:", root);
      } catch (error) {
        console.error("Failed to fetch merkle root:", error);
      } finally {
        setFetchingRoot(false);
      }
    };
    fetchMerkleRoot();
  }, [privateVotingContract, readPrivateVoting]);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!address || !didContract || !readDID) return;
      try {
        const registered = await readDID("hasRegisteredForVoting", [address]);
        setIsRegistered(registered);
        if (!registered) {
          showAlert(
            "warning",
            "You are not registered for private voting. Please register first."
          );
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setIsRegistered(false);
      }
    };
    checkRegistration();
  }, [address, didContract, readDID]);

  useEffect(() => {
    if (preselectedProposalId) setSelectedProposal(preselectedProposalId);
  }, [preselectedProposalId]);

  const activeProposals = proposals.filter((p) => p.state === 1);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === "success") setTimeout(() => setAlert(null), 5000);
  };

  // MUST MATCH registration script exactly
  const stringToFieldElement = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const buildMerkleTree = (leaves, depth = 20) => {
    const paddedLeaves = [...leaves];
    const targetSize = 2 ** depth;
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push(ethers.ZeroHash);
    }

    let currentLevel = paddedLeaves;
    const tree = [currentLevel];

    for (let level = 0; level < depth; level++) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        const parent = ethers.keccak256(ethers.concat([left, right]));
        nextLevel.push(parent);
      }
      currentLevel = nextLevel;
      tree.push(currentLevel);
    }
    return tree;
  };

  const getMerklePath = (tree, leafIndex, depth = 20) => {
    const pathElements = [];
    const pathIndices = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < depth; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      const sibling = tree[level][siblingIndex] || tree[level][currentIndex];
      pathElements.push(sibling);
      pathIndices.push(isRightNode ? 1 : 0);

      currentIndex = Math.floor(currentIndex / 2);
    }
    return { pathElements, pathIndices };
  };

  const handleGenerateProofAndVote = async () => {
    if (!selectedProposal || !selectedVote || !secret) {
      showAlert(
        "warning",
        "Please fill in all fields (Proposal, Vote, and Secret)"
      );
      return;
    }

    if (!merkleRoot || merkleRoot === ethers.ZeroHash) {
      showAlert(
        "error",
        "Invalid Merkle Root. Please ensure the voter set has been initialized."
      );
      return;
    }

    setLoading(true);
    setAlert({
      type: "info",
      message:
        "Generating Zero-Knowledge Proof... This may take 10-30 seconds.",
    });

    try {
      // Generate commitment - direct hash of string (matches original registration)
      const commitment = ethers.keccak256(ethers.toUtf8Bytes(secret));
      console.log("Original secret:", secret);
      console.log("Your commitment:", commitment);

      // Fetch Commitments
      const voterCount = await readPrivateVoting("getRegisteredVoterCount", []);
      if (voterCount === 0n) {
        throw new Error("No voters registered in the contract");
      }

      const commitments = [];
      for (let i = 0; i < Number(voterCount); i++) {
        const comm = await readPrivateVoting("getVoterCommitmentByIndex", [i]);
        commitments.push(comm);
      }
      console.log("Fetched commitments:", commitments);

      const leafIndex = commitments.findIndex(
        (c) => c.toLowerCase() === commitment.toLowerCase()
      );
      if (leafIndex === -1) {
        throw new Error(
          `Your commitment (${commitment}) not found in voter set. Did you register with this secret?`
        );
      }
      console.log("Your leaf index:", leafIndex);

      // Build Merkle Tree
      const MERKLE_TREE_DEPTH = 20;
      const tree = buildMerkleTree(commitments, MERKLE_TREE_DEPTH);
      const calculatedRoot = tree[tree.length - 1][0];
      console.log("Calculated root:", calculatedRoot);
      console.log("Contract root:", merkleRoot);

      if (calculatedRoot.toLowerCase() !== merkleRoot.toLowerCase()) {
        throw new Error(
          "Merkle root mismatch! Your local calculation does not match the contract."
        );
      }

      const { pathElements, pathIndices } = getMerklePath(
        tree,
        leafIndex,
        MERKLE_TREE_DEPTH
      );

      // Convert hex values to decimal strings for circuit input
      const hexToDec = (hex) => {
        const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
        return BigInt("0x" + cleaned).toString(10);
      };

      // For circuit input, convert commitment to number
      const secretForCircuit = hexToDec(commitment);

      const input = {
        root: hexToDec(merkleRoot),
        proposalId: selectedProposal.toString(),
        voteChoice: selectedVote === "yes" ? "1" : "0",
        secret: secretForCircuit,
        pathElements: pathElements.map((pe) => hexToDec(pe)),
        pathIndices: pathIndices.map((pi) => pi.toString()),
      };
      console.log("Circuit input preview:", {
        root: input.root.slice(0, 20) + "...",
        proposalId: input.proposalId,
        voteChoice: input.voteChoice,
        secret: input.secret,
        pathElementsLen: input.pathElements.length,
        firstPathElement: input.pathElements[0].slice(0, 20) + "...",
      });

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/vote.wasm",
        "/circuits/vote_final.zkey"
      );

      console.log("Proof Generated! Public Signals:", publicSignals);

      // Format proof for Solidity (all values must be BigInt)
      const formatProofValue = (val) => {
        if (typeof val === "bigint") return val;
        if (typeof val === "number") return BigInt(val);
        if (typeof val === "string") {
          if (val.startsWith("0x")) {
            return BigInt(val);
          }
          return BigInt(val);
        }
        throw new Error(`Cannot convert value to BigInt: ${val}`);
      };

      const solArgs = {
        a: [formatProofValue(proof.pi_a[0]), formatProofValue(proof.pi_a[1])],
        b: [
          [
            formatProofValue(proof.pi_b[0][1]),
            formatProofValue(proof.pi_b[0][0]),
          ],
          [
            formatProofValue(proof.pi_b[1][1]),
            formatProofValue(proof.pi_b[1][0]),
          ],
        ],
        c: [formatProofValue(proof.pi_c[0]), formatProofValue(proof.pi_c[1])],
        publicSignals: publicSignals.map(formatProofValue),
      };

      console.log("Formatted proof args");

      // Submit Transaction
      const { hash } = await writePrivateVote("castPrivateVote", [
        BigInt(selectedProposal),
        selectedVote === "yes",
        solArgs.publicSignals[0], // nullifier
        solArgs.a,
        solArgs.b,
        solArgs.c,
        solArgs.publicSignals,
      ]);

      console.log("Tx Hash:", hash);
      showAlert(
        "success",
        "Vote Submitted Successfully! Your vote is anonymous and verifiable."
      );
      if (onVoteSuccess) onVoteSuccess(selectedVote);
    } catch (error) {
      console.error("ZK Vote Error:", error);
      let msg = (error && error.message) || String(error) || "Unknown Error";

      if (msg.includes("commitment not found")) {
        msg =
          "Your secret doesn't match your registration. Please use the exact secret from your registration.";
      } else if (msg.includes("Circuit files") || msg.includes("fetch")) {
        msg = "Circuit files (.wasm or .zkey) not found in /public/circuits/";
      } else if (msg.includes("Assert Failed")) {
        msg = "Proof verification failed. Your Merkle path may be incorrect.";
      } else if (msg.includes("Merkle root mismatch")) {
        msg =
          "The voter set may have been updated. Please refresh and try again.";
      }

      showAlert("error", `Vote Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (mode !== "private") return null;

  return (
    <div className="zk-voting-module">
      <div className="zk-header">
        <h3 className="zk-title">Private Voting</h3>
        <span className="zk-badge">Zero-Knowledge</span>
      </div>

      {alert && (
        <Alert type={alert.type} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {!isRegistered && (
        <Alert type="warning" title="Not Registered">
          You need to register for private voting first. Go to the "Join DAO"
          page.
        </Alert>
      )}

      <div className="zk-form">
        {!preselectedProposalId && (
          <div className="zk-field">
            <label className="zk-label">Select Proposal</label>
            <select
              className="zk-select"
              value={selectedProposal}
              onChange={(e) => setSelectedProposal(e.target.value)}
              disabled={!isRegistered}
            >
              <option value="">Choose...</option>
              {activeProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="zk-field">
          <label className="zk-label">Your Registration Secret</label>
          <small
            className="zk-field-help"
            style={{ marginTop: "0.25rem", marginBottom: "0.5rem" }}
          >
            From your registration - stored in <code>dao-secret-*.json</code>{" "}
            file
          </small>
          <input
            type="password"
            className="zk-input"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="e.g. Yasuri"
            disabled={!isRegistered}
          />
        </div>

        <div className="zk-field">
          <label className="zk-label">
            Merkle Root
            <span
              style={{
                marginLeft: "0.5rem",
                padding: "0.2rem 0.5rem",
                background: merkleRoot ? "#10b981" : "#ef4444",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: "600",
              }}
            >
              {fetchingRoot
                ? "Loading..."
                : merkleRoot
                ? "Auto-Fetched"
                : "Not Found"}
            </span>
          </label>
          <input
            type="text"
            className="zk-input"
            value={merkleRoot}
            readOnly
            placeholder="Auto-fetched from contract..."
            style={{
              fontSize: "0.75rem",
              fontFamily: "monospace",
              cursor: "not-allowed",
              backgroundColor: "var(--bg-secondary)",
            }}
          />
        </div>

        <div className="zk-field">
          <label className="zk-label">Your Vote</label>
          <div className="zk-vote-buttons">
            <button
              className={`zk-vote-option ${
                selectedVote === "yes" ? "selected yes" : ""
              }`}
              onClick={() => setSelectedVote("yes")}
              disabled={!isRegistered}
            >
              <span className="vote-icon">👍</span>
              <span>Yes</span>
            </button>
            <button
              className={`zk-vote-option ${
                selectedVote === "no" ? "selected no" : ""
              }`}
              onClick={() => setSelectedVote("no")}
              disabled={!isRegistered}
            >
              <span className="vote-icon">👎</span>
              <span>No</span>
            </button>
          </div>
        </div>

        <Button
          fullWidth
          variant="primary"
          onClick={handleGenerateProofAndVote}
          disabled={
            loading || !selectedVote || !secret || !isRegistered || !merkleRoot
          }
          loading={loading}
        >
          {loading ? "Generating Proof..." : "Generate Proof & Vote"}
        </Button>

        <div className="zk-info">
          <div className="zk-info-item">
            <span className="info-icon">🔐</span>
            <span>Your vote is encrypted using Zero-Knowledge Proofs</span>
          </div>
          <div className="zk-info-item">
            <span className="info-icon">👤</span>
            <span>No one can see how you voted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZKVotingModule;
