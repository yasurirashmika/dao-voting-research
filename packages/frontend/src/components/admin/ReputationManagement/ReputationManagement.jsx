import React, { useState } from 'react';
import { useContract } from '../../../hooks/useContract';
import ReputationManagerABI from '../../../abis/ReputationManager.json';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Alert from '../../common/Alert/Alert';
import { useToast } from '../../../context/ToastContext';
import './ReputationManagement.css';

const ReputationManagement = () => {
  const toast = useToast();
  const [targetAddress, setTargetAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [currentScore, setCurrentScore] = useState(null);

  const { contract, read, write } = useContract(
    'ReputationManager',
    ReputationManagerABI.abi
  );

  const handleCheckReputation = async () => {
    if (!targetAddress || !contract) return;
    
    if (!targetAddress.startsWith('0x') || targetAddress.length !== 42) {
        toast.warning("Please enter a valid Ethereum address", "Invalid Address");
        return;
    }

    setChecking(true);
    setCurrentScore(null);
    try {
      const score = await read('getReputationScore', [targetAddress]);
      setCurrentScore(score.toString());
    } catch (error) {
      console.error("Error checking rep:", error);
      toast.error("Failed to fetch reputation score.");
    } finally {
      setChecking(false);
    }
  };

  const handleInitialize = async () => {
    if (!targetAddress || !contract) return;
    setLoading(true);
    try {
      const { hash } = await write('initializeReputation', [targetAddress]);
      console.log("Tx Hash:", hash);
      
      // UPDATED: Text matches the contract's actual behavior (50 Points)
      toast.success("Reputation Initialized! User now has 50 points.", "Success");
      
      setTimeout(handleCheckReputation, 2000);
    } catch (error) {
      console.error("Init Error:", error);
      let msg = error.message || "Transaction failed";
      
      if (msg.includes("Already initialized")) {
          msg = "This user has already been initialized.";
      } else if (msg.includes("User denied")) {
          msg = "Transaction rejected.";
      }
      
      toast.error(msg, "Initialization Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="large" className="reputation-card">
      <h2 className="section-title">Reputation Management</h2>
      <p className="section-description">
        Initialize reputation for new DAO members so they can create proposals.
      </p>

      <div className="reputation-form">
        <div className="rep-input-group">
          <div className="rep-input-wrapper">
            <Input
              label="User Address"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={handleCheckReputation}
            disabled={!targetAddress || checking}
            className="rep-check-btn"
          >
            {checking ? "..." : "Check"}
          </Button>
        </div>

        {currentScore !== null && (
          <div className="rep-score-display">
            <span className="rep-score-label">Current Score:</span>
            <strong className="rep-score-value">{currentScore} Points</strong>
          </div>
        )}

        {/* UPDATED: Button Text */}
        <Button
          fullWidth
          variant="primary"
          onClick={handleInitialize}
          loading={loading}
          disabled={!targetAddress || loading}
        >
          Initialize Reputation (Grant 50 Points)
        </Button>

        {/* UPDATED: Info Text */}
        <Alert type="info" title="Requirement Note">
          Users need at least <strong>50 Reputation Points</strong> to create a proposal. 
          Initialization grants them exactly 50 points, allowing them to propose immediately.
        </Alert>
      </div>
    </Card>
  );
};

export default ReputationManagement;