import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './WalletConnect.module.css';

const WalletConnect = ({ showBalance = true, showNetwork = true }) => {
  return (
    <div className="wallet-connect">
      <ConnectButton 
        showBalance={showBalance}
        chainStatus={showNetwork ? 'icon' : 'none'}
      />
    </div>
  );
};

export default WalletConnect;