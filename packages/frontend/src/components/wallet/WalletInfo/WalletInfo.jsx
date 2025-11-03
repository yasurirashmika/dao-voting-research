import React from 'react';
import { useAccount, useBalance, useEnsName } from 'wagmi';
import { formatAddress } from '../../../utils/formatters';
import Card from '../../common/Card/Card';
import './WalletInfo.module.css';

const WalletInfo = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });

  if (!isConnected) {
    return (
      <Card padding="medium" className="wallet-info-card">
        <p className="wallet-info-message">Please connect your wallet</p>
      </Card>
    );
  }

  return (
    <Card padding="medium" className="wallet-info-card">
      <h3 className="wallet-info-title">Wallet Information</h3>
      
      <div className="wallet-info-content">
        <div className="wallet-info-item">
          <span className="wallet-info-label">Address</span>
          <span className="wallet-info-value">
            {ensName || formatAddress(address)}
          </span>
        </div>

        {balance && (
          <div className="wallet-info-item">
            <span className="wallet-info-label">Balance</span>
            <span className="wallet-info-value">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WalletInfo;