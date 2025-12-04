// src/components/layout/Header/Header.jsx (UPDATED - Optimized)
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTheme } from '../../../context/ThemeContext';
import { useDeployment } from '../../../context/DeploymentContext';
import { useContract } from '../../../hooks/useContract';
import DeploymentBadge from '../../common/DeploymentBadge/DeploymentBadge';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { deploymentInfo } = useDeployment();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false); // ✅ Track if we've checked

  const { contract, read } = useContract('DAOVoting', DAOVotingABI.abi);

  // ✅ OPTIMIZED: Only check admin status once when conditions are met
  const checkAdminStatus = useCallback(async () => {
    // Prevent multiple checks
    if (adminChecked || !address || !isConnected || !contract) {
      return;
    }
    
    console.log('🔍 Header: Checking admin status...');
    
    try {
      const ownerAddress = await read('owner', []);
      const adminStatus = ownerAddress.toLowerCase() === address.toLowerCase();
      
      console.log('✅ Is Admin:', adminStatus);
      setIsAdmin(adminStatus);
      setAdminChecked(true); // ✅ Mark as checked
    } catch (err) {
      console.error('❌ Error checking admin status:', err);
      setIsAdmin(false);
      setAdminChecked(true); // ✅ Still mark as checked to prevent retry loops
    }
  }, [address, isConnected, contract, read, adminChecked]);

  // ✅ Reset admin check when wallet changes
  useEffect(() => {
    setAdminChecked(false);
    setIsAdmin(false);
  }, [address, isConnected]);

  // ✅ Check admin status only once when ready
  useEffect(() => {
    if (!adminChecked && address && isConnected && contract) {
      checkAdminStatus();
    }
  }, [address, isConnected, contract, adminChecked, checkAdminStatus]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/proposals', label: 'Proposals' },
    { path: '/create-proposal', label: 'Create Proposal' },
    { path: '/dashboard', label: 'Dashboard' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', isAdmin: true }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="header-logo">
          <div className="logo-icon">🗳️</div>
          <span className="logo-text">DAO Voting</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''} ${link.isAdmin ? 'admin-link' : ''}`}
            >
              {link.label}
              {link.isAdmin && (
                <span className="admin-badge">⚡</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="header-actions">
          {/* Deployment Mode Toggle */}
          <button
            className="deployment-toggle-header"
            onClick={() => setShowDeploymentModal(!showDeploymentModal)}
            type="button"
            title="Switch deployment mode"
          >
            <span className="deploy-icon">{deploymentInfo.icon}</span>
            <span className="deploy-label">{deploymentInfo.mode}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Wallet Connect Button */}
          <div className="wallet-connect-wrapper">
            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            <span className="menu-icon">
              {mobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="mobile-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${isActive(link.path) ? 'active' : ''} ${link.isAdmin ? 'admin-link' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
              {link.isAdmin && (
                <span className="admin-badge">⚡</span>
              )}
            </Link>
          ))}
        </nav>
      )}

      {/* Deployment Switcher Modal */}
      {showDeploymentModal && (
        <div className="deployment-modal-overlay" onClick={() => setShowDeploymentModal(false)}>
          <div className="deployment-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowDeploymentModal(false)}
              type="button"
            >
              ✕
            </button>
            <DeploymentBadge variant="interactive" />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;