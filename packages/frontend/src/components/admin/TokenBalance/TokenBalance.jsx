// src/components/admin/TokenBalance/TokenBalance.jsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenManagement } from '../../../hooks/useTokenManagement';
import Card from '../../common/Card/Card';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import { formatAddress } from '../../../utils/formatters';
import './TokenBalance.css';

const TokenBalance = () => {
  const { address } = useAccount();
  const { getTokenBalance, contract } = useTokenManagement();

  const [checkAddress, setCheckAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setCheckAddress(address);
      loadBalance(address);
    }
  }, [address]);

  const loadBalance = async (addr) => {
    if (!addr || !addr.startsWith('0x')) return;
    
    setLoading(true);
    try {
      const bal = await getTokenBalance(addr);
      setBalance(bal);
    } catch (err) {
      console.error('Error loading balance:', err);
      setBalance('Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = () => {
    loadBalance(checkAddress);
  };

  return (
    <Card padding="large">
      <h2 className="token-balance-title">Check Token Balance</h2>
      <p className="token-balance-description">
        View the DGT token balance of any address
      </p>

      <div className="token-balance-form">
        <Input
          label="Address"
          value={checkAddress}
          onChange={(e) => setCheckAddress(e.target.value)}
          placeholder="0x..."
          helperText="Enter any Ethereum address"
        />

        <Button
          onClick={handleCheck}
          loading={loading}
          disabled={!checkAddress || loading}
          fullWidth
        >
          Check Balance
        </Button>
      </div>

      {balance !== null && (
        <div className="token-balance-result">
          <div className="balance-address">
            {formatAddress(checkAddress)}
          </div>
          <div className="balance-amount">
            {loading ? '...' : Number(balance).toLocaleString()} DGT
          </div>
          {Number(balance) < 1000 && (
            <div className="balance-warning">
              ⚠️ Insufficient tokens to create proposals (needs 1,000 DGT)
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TokenBalance;