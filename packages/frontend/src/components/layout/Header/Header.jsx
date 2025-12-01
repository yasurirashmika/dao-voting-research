import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTheme } from '../../../context/ThemeContext';
import { useContract } from '../../../hooks/useContract';
import DAOVotingABI from '../../../abis/DAOVoting.json';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // Get contract instance
  const { contract, read } = useContract('DAOVoting', DAOVotingABI.abi);

  // Check if user is admin (contract owner)
  useEffect(() => {
    checkAdminStatus();
  }, [address, contract]); // ✅ Re-check when contract OR address changes

  const checkAdminStatus = async () => {
    console.log('🔍 Header: Checking admin status...');
    console.log('📍 Connected address:', address);
    console.log('📦 Contract ready:', !!contract);
    
    if (!address || !isConnected) {
      console.log('❌ No address connected');
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    if (!contract) {
      console.log('⏳ Contract not ready yet');
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }
    
    try {
      setCheckingAdmin(true);
      
      // Call owner() directly from contract
      const ownerAddress = await read('owner', []);
      const adminStatus = ownerAddress.toLowerCase() === address.toLowerCase();
      
      console.log('👑 Contract Owner:', ownerAddress);
      console.log('👤 Current User:', address);
      console.log('✅ Is Admin:', adminStatus);
      
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('❌ Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  // Navigation links - conditionally add Admin link for contract owner
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
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
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
    </header>
  );
};

export default Header;