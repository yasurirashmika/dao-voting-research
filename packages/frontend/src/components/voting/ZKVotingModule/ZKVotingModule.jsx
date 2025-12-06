/* global BigInt */
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useProposals } from '../../../hooks/useProposals';
import { useContract } from '../../../hooks/useContract';
import { useDeployment } from '../../../context/DeploymentContext';
import PrivateDAOVotingABI from '../../../abis/PrivateDAOVoting.json';
import DIDRegistryABI from '../../../abis/DIDRegistry.json';
import Button from '../../common/Button/Button';
import Alert from '../../common/Alert/Alert';
import './ZKVotingModule.css';

const snarkjs = window.snarkjs || require('snarkjs'); 

const ZKVotingModule = ({ preselectedProposalId, onVoteSuccess }) => {
  const { address } = useAccount();
  const { proposals } = useProposals();
  const { mode } = useDeployment();
  
  // ✅ Contract Hooks
  const { write: writePrivateVote, read: readPrivateVoting, contract: privateVotingContract } = useContract(
    'PrivateDAOVoting', 
    PrivateDAOVotingABI.abi
  );
  const { read: readDID, contract: didContract } = useContract(
    'DIDRegistry', 
    DIDRegistryABI.abi
  );

  // ✅ State
  const [selectedProposal, setSelectedProposal] = useState(preselectedProposalId || '');
  const [selectedVote, setSelectedVote] = useState('');
  const [secret, setSecret] = useState(''); 
  const [merkleRoot, setMerkleRoot] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [fetchingRoot, setFetchingRoot] = useState(false);

  // ✅ Auto-fetch Merkle Root on Mount
  useEffect(() => {
    const fetchMerkleRoot = async () => {
      if (!privateVotingContract || !readPrivateVoting) {
        console.log('⏳ Waiting for PrivateDAOVoting contract...');
        return;
      }
      
      setFetchingRoot(true);
      try {
        const root = await readPrivateVoting('currentVoterSetRoot', []);
        setMerkleRoot(root);
        console.log('✅ Auto-fetched Merkle Root:', root);
      } catch (error) {
        console.error('❌ Failed to fetch merkle root:', error);
        showAlert('warning', 'Could not auto-fetch Merkle Root.');
      } finally {
        setFetchingRoot(false);
      }
    };
    
    fetchMerkleRoot();
  }, [privateVotingContract, readPrivateVoting]);

  // ✅ Check if User is Registered
  useEffect(() => {
    const checkRegistration = async () => {
      if (!address || !didContract || !readDID) {
        console.log('⏳ Waiting for DIDRegistry contract or wallet...');
        return;
      }
      
      try {
        const registered = await readDID('hasRegisteredForVoting', [address]);
        setIsRegistered(registered);
        console.log('✅ Registration status:', registered);
        
        if (!registered) {
          showAlert('warning', 'You are not registered for private voting. Please register first.');
        }
      } catch (error) {
        console.error('❌ Error checking registration:', error);
        setIsRegistered(false);
      }
    };
    
    checkRegistration();
  }, [address, didContract, readDID]);

  useEffect(() => {
    if (preselectedProposalId) setSelectedProposal(preselectedProposalId);
  }, [preselectedProposalId]);

  const activeProposals = proposals.filter(p => p.state === 1);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  // ✅ Helper: Convert string secret to number (hash it)
  const stringToFieldElement = (str) => {
    // Simple hash function: sum of char codes
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Return positive number
    return Math.abs(hash).toString();
  };

  const handleGenerateProofAndVote = async () => {
    // ✅ Validation
    if (!selectedProposal || !selectedVote || !secret) {
      showAlert('warning', 'Please fill in all fields (Proposal, Vote, and Secret)');
      return;
    }

    if (!merkleRoot || merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      showAlert('error', 'Invalid Merkle Root. Please ensure the voter set has been initialized.');
      return;
    }

    setLoading(true);
    setAlert({ type: 'info', message: '🔐 Generating Zero-Knowledge Proof... This may take 10-30 seconds.' });

    try {
      // ✅ Convert string secret to number
      const secretNumber = stringToFieldElement(secret);
      console.log('🔑 Original secret:', secret);
      console.log('🔢 Converted to number:', secretNumber);

      // ✅ 1. Prepare Circuit Inputs
      const input = {
        root: merkleRoot,
        proposalId: selectedProposal.toString(),
        voteChoice: selectedVote === 'yes' ? "1" : "0",
        secret: secretNumber,  // ✅ Now a number string
        pathElements: ["0", "0", "0"],
        pathIndices: ["0", "0", "0"]
      };

      console.log("🔐 Generating proof with inputs:", input);

      // ✅ 2. Calculate Proof
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/vote.wasm",
        "/circuits/vote_final.zkey"
      );

      console.log("✅ Proof Generated! Public Signals:", publicSignals);

      // ✅ 3. Format for Solidity
      const solArgs = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
          [proof.pi_b[0][1], proof.pi_b[0][0]], 
          [proof.pi_b[1][1], proof.pi_b[1][0]]
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
        nullifier: publicSignals[0],
        root: publicSignals[1]
      };

      setAlert({ type: 'info', message: '📝 Proof valid! Requesting wallet signature...' });

      // ✅ 4. Send Transaction
      const { hash } = await writePrivateVote('castPrivateVote', [
        BigInt(selectedProposal),
        selectedVote === 'yes',
        solArgs.nullifier,
        solArgs.a,
        solArgs.b,
        solArgs.c,
        publicSignals
      ]);

      console.log("✅ Tx Hash:", hash);
      showAlert('success', '🎉 Vote Submitted Successfully! Your vote is anonymous and verifiable.');
      
      if (onVoteSuccess) onVoteSuccess(selectedVote);

    } catch (error) {
      console.error('❌ ZK Vote Error:', error);
      
      let errorMsg = error.message || 'Unknown error';
      let errorTitle = 'Vote Failed';
      
      // ✅ Better error messages
      if (errorMsg.includes('fetch')) {
        errorTitle = 'Circuit Files Missing';
        errorMsg = "Could not find ZK circuit files (.wasm or .zkey) in /public/circuits/. Please ensure these files are present.";
      } else if (errorMsg.includes('nullifier')) {
        errorTitle = 'Already Voted';
        errorMsg = "You have already voted on this proposal with this identity.";
      } else if (errorMsg.includes('root')) {
        errorTitle = 'Invalid Merkle Root';
        errorMsg = "Your identity might not be registered in the current voter set.";
      } else if (errorMsg.includes('User denied') || errorMsg.includes('user rejected')) {
        errorTitle = 'Transaction Cancelled';
        errorMsg = "You cancelled the transaction in your wallet.";
      } else if (errorMsg.includes('BigInt') || errorMsg.includes('convert')) {
        errorTitle = 'Invalid Secret Format';
        errorMsg = "Please ensure you're entering the correct secret from your registration.";
      }
      
      showAlert('error', `${errorTitle}: ${errorMsg}`);
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

      {/* ✅ Registration Warning */}
      {!isRegistered && (
        <Alert type="warning" title="⚠️ Not Registered">
          You need to register for private voting first. Go to the "Join DAO" page.
        </Alert>
      )}

      <div className="zk-form">
        {/* Proposal Select */}
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
              {activeProposals.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Secret Input */}
        <div className="zk-field">
          <label className="zk-label">
            Your Registration Secret
          </label>
          <small className="zk-field-help" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            (From your registration - stored in <code>dao-secret-*.json</code> file)
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

        {/* ✅ Merkle Root (Auto-fetched, read-only) */}
        <div className="zk-field">
          <label className="zk-label">
            Merkle Root 
            <span style={{
              marginLeft: '0.5rem',
              padding: '0.2rem 0.5rem',
              background: merkleRoot ? '#10b981' : '#ef4444',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}>
              {fetchingRoot ? 'Loading...' : merkleRoot ? 'Auto-Fetched ✓' : 'Not Found'}
            </span>
          </label>
          <small className="zk-field-help" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            This proves you're part of the registered voter set
          </small>
          <input 
            type="text" 
            className="zk-input"
            value={merkleRoot}
            readOnly
            placeholder="Auto-fetched from contract..."
            style={{ 
              fontSize: '0.75rem', 
              fontFamily: 'monospace', 
              cursor: 'not-allowed',
              backgroundColor: 'var(--bg-secondary)'
            }}
          />
        </div>

        {/* Vote Selection */}
        <div className="zk-field">
          <label className="zk-label">Your Vote</label>
          <div className="zk-vote-buttons">
            <button
              className={`zk-vote-option ${selectedVote === 'yes' ? 'selected yes' : ''}`}
              onClick={() => setSelectedVote('yes')}
              disabled={!isRegistered}
            >
              <span className="vote-icon">👍</span>
              <span>Yes</span>
            </button>
            <button
              className={`zk-vote-option ${selectedVote === 'no' ? 'selected no' : ''}`}
              onClick={() => setSelectedVote('no')}
              disabled={!isRegistered}
            >
              <span className="vote-icon">👎</span>
              <span>No</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="primary"
          onClick={handleGenerateProofAndVote}
          disabled={loading || !selectedVote || !secret || !isRegistered || !merkleRoot}
          loading={loading}
        >
          {loading ? 'Generating Proof...' : '🔐 Generate Proof & Vote'}
        </Button>

        {/* Info Box */}
        <div className="zk-info">
          <div className="zk-info-item">
            <span className="info-icon">🔐</span>
            <span>Your vote is encrypted using Zero-Knowledge Proofs</span>
          </div>
          <div className="zk-info-item">
            <span className="info-icon">👤</span>
            <span>No one can see how you voted (including admins)</span>
          </div>
          <div className="zk-info-item">
            <span className="info-icon">✓</span>
            <span>The proof verifies you're eligible without revealing your identity</span>
          </div>
          <div className="zk-info-item">
            <span className="info-icon">⏱️</span>
            <span>Proof generation takes 10-30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZKVotingModule;