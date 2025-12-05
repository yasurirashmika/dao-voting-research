/* global BigInt */
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useProposals } from '../../../hooks/useProposals';
import { useContract } from '../../../hooks/useContract';
import { useDeployment } from '../../../context/DeploymentContext';
import PrivateDAOVotingABI from '../../../abis/PrivateDAOVoting.json';
import Button from '../../common/Button/Button';
import Alert from '../../common/Alert/Alert';
import './ZKVotingModule.css';

// ✅ Import SnarkJS (Moved below imports to fix ESLint error)
// Make sure to run: npm install snarkjs
const snarkjs = window.snarkjs || require('snarkjs'); 

const ZKVotingModule = ({ preselectedProposalId, onVoteSuccess }) => {
  const { address } = useAccount();
  const { proposals } = useProposals();
  const { mode } = useDeployment();
  
  const { write: writePrivateVote } = useContract('PrivateDAOVoting', PrivateDAOVotingABI.abi);

  const [selectedProposal, setSelectedProposal] = useState(preselectedProposalId || '');
  const [selectedVote, setSelectedVote] = useState('');
  
  // ✅ ZK Inputs (For testing/demo purposes, these are manual)
  const [secret, setSecret] = useState(''); 
  const [merkleRoot, setMerkleRoot] = useState(''); // Paste Root from contract/script
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (preselectedProposalId) setSelectedProposal(preselectedProposalId);
  }, [preselectedProposalId]);

  const activeProposals = proposals.filter(p => p.state === 1);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  const handleGenerateProofAndVote = async () => {
    if (!selectedProposal || !selectedVote || !secret) {
      showAlert('warning', 'Please fill in all fields (Proposal, Vote, and Secret)');
      return;
    }

    setLoading(true);
    setAlert({ type: 'info', message: '🔐 Generating REAL Zero-Knowledge Proof... (Please wait)' });

    try {
      // 1. Prepare Circuit Inputs
      // Ideally, pathElements/pathIndices come from a backend indexer.
      // For this demo, we use default "0" values which works for the FIRST user in a test tree.
      const input = {
        root: merkleRoot || "1383280414...", // Use input state or default
        proposalId: selectedProposal.toString(),
        voteChoice: selectedVote === 'yes' ? "1" : "0",
        secret: secret, 
        pathElements: ["0", "0", "0"], // Demo path for leaf 0
        pathIndices: ["0", "0", "0"]   // Demo indices for leaf 0
      };

      console.log("Generatig proof with inputs:", input);

      // 2. Calculate Proof (Browser uses WASM + ZKEY from public folder)
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/vote.wasm",       // ✅ Path to file you copied
        "/circuits/vote_final.zkey"  // ✅ Path to file you copied
      );

      console.log("✅ Proof Generated!", publicSignals);

      // 3. Format for Solidity
      const solArgs = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
        c: [proof.pi_c[0], proof.pi_c[1]],
        nullifier: publicSignals[0], // Nullifier is usually index 0
        root: publicSignals[1]       // Root is usually index 1
      };

      setAlert({ type: 'info', message: '📝 Proof valid! Requesting signature...' });

      // 4. Send Transaction
      // Note: We pass the public signals array directly as the last arg
      const { hash } = await writePrivateVote('castPrivateVote', [
        BigInt(selectedProposal),
        selectedVote === 'yes',
        solArgs.nullifier,
        solArgs.a,
        solArgs.b,
        solArgs.c,
        publicSignals // Pass full signals array
      ]);

      console.log("Tx Hash:", hash);
      showAlert('success', 'Vote Submitted Successfully!');
      
      if (onVoteSuccess) onVoteSuccess(selectedVote);

    } catch (error) {
      console.error('ZK Vote Error:', error);
      const msg = error.message?.includes('fetch') 
        ? "Could not find .wasm or .zkey files in /public/circuits/" 
        : error.message;
      showAlert('error', 'Vote Failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  if (mode !== 'private') return null;

  return (
    <div className="zk-voting-module">
      <div className="zk-header">
        <h3 className="zk-title">🔒 Private Voting</h3>
        <span className="zk-badge">Zero-Knowledge</span>
      </div>

      {alert && <Alert type={alert.type} onClose={() => setAlert(null)}>{alert.message}</Alert>}

      <div className="zk-form">
        {/* Proposal Select (only if not preselected) */}
        {!preselectedProposalId && (
            <div className="zk-field">
              <label className="zk-label">Select Proposal</label>
              <select 
                className="zk-select"
                value={selectedProposal}
                onChange={(e) => setSelectedProposal(e.target.value)}
              >
                <option value="">Choose...</option>
                {activeProposals.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
        )}

        {/* Secret Input */}
        <div className="zk-field">
            <label className="zk-label">Your Registration Secret</label>
            <input 
              type="password" 
              className="zk-input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="e.g. 123456"
            />
        </div>

        {/* Debug: Merkle Root Input */}
        <div className="zk-field">
            <label className="zk-label" style={{fontSize: '0.8rem'}}>Merkle Root (Debug)</label>
            <input 
              type="text" 
              className="zk-input"
              value={merkleRoot}
              onChange={(e) => setMerkleRoot(e.target.value)}
              placeholder="Paste current contract Root here..."
            />
        </div>

        <div className="zk-field">
          <label className="zk-label">Your Vote</label>
          <div className="zk-vote-buttons">
            <button
              className={`zk-vote-option ${selectedVote === 'yes' ? 'selected yes' : ''}`}
              onClick={() => setSelectedVote('yes')}
            >👍 Yes</button>
            <button
              className={`zk-vote-option ${selectedVote === 'no' ? 'selected no' : ''}`}
              onClick={() => setSelectedVote('no')}
            >👎 No</button>
          </div>
        </div>

        <Button
          fullWidth
          variant="primary"
          onClick={handleGenerateProofAndVote}
          disabled={loading || !selectedVote || !secret}
          loading={loading}
        >
          {loading ? 'Calculating Proof...' : 'Generate Proof & Vote'}
        </Button>
      </div>
    </div>
  );
};

export default ZKVotingModule;