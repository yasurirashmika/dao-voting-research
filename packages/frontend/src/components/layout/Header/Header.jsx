import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTheme } from '../../../context/ThemeContext';
import { useAdmin } from '../../../hooks/useAdmin';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { address } = useAccount();
  const { isOwner } = useAdmin();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin (contract owner)
  useEffect(() => {
    checkAdminStatus();
  }, [address]);

  const checkAdminStatus = async () => {
    console.log('🔍 Checking admin status...');
    console.log('📍 Connected address:', address);
    
    if (!address) {
      console.log('❌ No address connected');
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }
    
    try {
      setCheckingAdmin(true);
      const adminStatus = await isOwner();
      console.log('✅ Admin status:', adminStatus);
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('❌ Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  // DEBUG: Log current state
  useEffect(() => {
    console.log('=== HEADER STATE ===');
    console.log('Address:', address);
    console.log('Is Admin:', isAdmin);
    console.log('Checking Admin:', checkingAdmin);
  }, [address, isAdmin, checkingAdmin]);

  // Navigation links - conditionally add Admin link for contract owner
  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/proposals', label: 'Proposals' },
    { path: '/create-proposal', label: 'Create Proposal' },
    { path: '/dashboard', label: 'Dashboard' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', isAdmin: true }] : []),
  ];

  // DEBUG: Log nav links
  console.log('📋 Nav links:', navLinks.map(l => l.label));

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
          
          {/* DEBUG INDICATOR */}
          {checkingAdmin && (
            <span style={{ marginLeft: '1rem', color: '#999', fontSize: '0.85rem' }}>
              Checking admin...
            </span>
          )}
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