// src/components/admin/TokenMinting/TokenMinting.jsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenManagement } from '../../../hooks/useTokenManagement';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Alert from '../../common/Alert/Alert';
import { formatAddress } from '../../../utils/formatters';
import './TokenMinting.css';

const TokenMinting = ({ onMintSuccess }) => {
  const { address } = useAccount();
  const {
    mintTokens,
    getTokenBalance,
    getTotalSupply,
    getMaxSupply,
    canMint,
    loading,
    contract
  } = useTokenManagement();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientBalance, setRecipientBalance] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [maxSupply, setMaxSupply] = useState('1000000');
  const [isMinter, setIsMinter] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (contract && address) {
      loadTokenInfo();
      checkMinterStatus();
    }
  }, [contract, address]);

  useEffect(() => {
    if (recipientAddress && recipientAddress.startsWith('0x')) {
      loadRecipientBalance();
    }
  }, [recipientAddress]);

  const loadTokenInfo = async () => {
    try {
      const [supply, max] = await Promise.all([
        getTotalSupply(),
        getMaxSupply()
      ]);
      setTotalSupply(supply);
      setMaxSupply(max);
    } catch (err) {
      console.error('Error loading token info:', err);
    }
  };

  const loadRecipientBalance = async () => {
    try {
      const balance = await getTokenBalance(recipientAddress);
      setRecipientBalance(balance);
    } catch (err) {
      console.error('Error loading recipient balance:', err);
      setRecipientBalance('0');
    }
  };

  const checkMinterStatus = async () => {
    try {
      const canMintStatus = await canMint(address);
      setIsMinter(canMintStatus);
    } catch (err) {
      console.error('Error checking minter status:', err);
      setIsMinter(false);
    }
  };

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleMint = async () => {
    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      showAlert('error', 'Invalid Address', 'Please enter a valid Ethereum address.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showAlert('error', 'Invalid Amount', 'Please enter a positive token amount.');
      return;
    }

    const remaining = Number(maxSupply) - Number(totalSupply);
    if (Number(amount) > remaining) {
      showAlert('error', 'Exceeds Max Supply', `Only ${remaining.toFixed(2)} tokens can be minted.`);
      return;
    }

    try {
      await mintTokens(recipientAddress, amount);
      showAlert('success', 'Tokens Minted!', `Successfully minted ${amount} DGT to ${formatAddress(recipientAddress)}`);
      
      // Reset form
      setRecipientAddress('');
      setAmount('');
      
      // Reload info
      await loadTokenInfo();
      
      if (onMintSuccess) {
        onMintSuccess();
      }
    } catch (err) {
      const message = err.message.includes('Not authorized')
        ? 'You are not authorized to mint tokens. Only the owner or approved minters can mint.'
        : err.message.includes('exceed max supply')
        ? 'This would exceed the maximum token supply.'
        : 'Failed to mint tokens. Please try again.';
      
      showAlert('error', 'Minting Failed', message);
    }
  };

  const handleQuickMint = (quickAmount) => {
    setAmount(quickAmount.toString());
  };

  if (!contract) {
    return (
      <Card padding="large">
        <p>Loading token contract...</p>
      </Card>
    );
  }

  if (!isMinter) {
    return (
      <Card padding="large">
        <Alert type="warning" title="No Minting Permission">
          You are not authorized to mint tokens. Only the contract owner or approved minters can mint tokens.
        </Alert>
      </Card>
    );
  }

  const supplyPercentage = (Number(totalSupply) / Number(maxSupply)) * 100;

  return (
    <Card padding="large">
      <h2 className="token-minting-title">Mint Governance Tokens</h2>
      <p className="token-minting-description">
        Mint new DGT tokens to any address. Tokens are required to create proposals.
      </p>

      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Supply Info */}
      <div className="token-supply-info">
        <div className="supply-stat">
          <span className="supply-label">Total Supply</span>
          <span className="supply-value">{Number(totalSupply).toLocaleString()} DGT</span>
        </div>
        <div className="supply-stat">
          <span className="supply-label">Max Supply</span>
          <span className="supply-value">{Number(maxSupply).toLocaleString()} DGT</span>
        </div>
        <div className="supply-progress-bar">
          <div 
            className="supply-progress-fill" 
            style={{ width: `${supplyPercentage}%` }}
          />
        </div>
        <span className="supply-percentage">{supplyPercentage.toFixed(2)}% minted</span>
      </div>

      {/* Minting Form */}
      <div className="token-minting-form">
        <Input
          label="Recipient Address"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="0x..."
          helperText={recipientAddress && recipientAddress.startsWith('0x') 
            ? `Current balance: ${Number(recipientBalance).toLocaleString()} DGT` 
            : 'Enter the address to receive tokens'}
        />

        <Input
          label="Amount (DGT)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
          helperText={`Remaining mintable: ${(Number(maxSupply) - Number(totalSupply)).toLocaleString()} DGT`}
        />

        {/* Quick Amount Buttons */}
        <div className="quick-amount-buttons">
          <span className="quick-amount-label">Quick amounts:</span>
          <Button size="small" variant="secondary" onClick={() => handleQuickMint(100)}>
            100
          </Button>
          <Button size="small" variant="secondary" onClick={() => handleQuickMint(1000)}>
            1,000
          </Button>
          <Button size="small" variant="secondary" onClick={() => handleQuickMint(5000)}>
            5,000
          </Button>
          <Button size="small" variant="secondary" onClick={() => handleQuickMint(10000)}>
            10,000
          </Button>
        </div>

        <Button
          onClick={handleMint}
          loading={loading}
          disabled={!recipientAddress || !amount || loading}
          fullWidth
        >
          Mint Tokens
        </Button>
      </div>

      <Alert type="info" title="💡 Token Requirements" className="token-info-alert">
        Users need <strong>1,000 DGT</strong> to create proposals. Consider minting this amount for active governance participants.
      </Alert>
    </Card>
  );
};

export default TokenMinting;