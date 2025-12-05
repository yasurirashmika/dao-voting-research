import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useTheme } from "../../../context/ThemeContext";
import { useDeployment } from "../../../context/DeploymentContext";
import { useContract } from "../../../hooks/useContract";
import DeploymentBadge from "../../common/DeploymentBadge/DeploymentBadge";
import DAOVotingABI from "../../../abis/DAOVoting.json";
import DIDRegistryABI from "../../../abis/DIDRegistry.json"; // Import DID ABI
import "./Header.css";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { deploymentInfo, mode } = useDeployment();
  const location = useLocation();
  const { address, isConnected } = useAccount();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false); // New State

  // Contract hooks
  const { contract: daoContract, read: readDAO } = useContract(
    "DAOVoting",
    DAOVotingABI.abi
  );
  const { contract: didContract, read: readDID } = useContract(
    "DIDRegistry",
    DIDRegistryABI.abi
  );

  // ✅ Check Status (Admin & Registration)
  const checkUserStatus = useCallback(async () => {
    if (!address || !isConnected) {
      setIsAdmin(false);
      setIsRegistered(false);
      return;
    }

    try {
      // 1. Check Admin Status
      if (daoContract) {
        const ownerAddress = await readDAO("owner", []);
        setIsAdmin(ownerAddress.toLowerCase() === address.toLowerCase());
      }

      // 2. Check Registration Status based on Mode
      let registered = false;
      if (mode === "public" && daoContract) {
        registered = await readDAO("isRegistered", [address]);
      } else if (mode === "private" && didContract) {
        // For private, we check if they have a Registered DID for voting
        registered = await readDID("hasRegisteredForVoting", [address]);
      }
      setIsRegistered(registered);
    } catch (err) {
      console.error("❌ Error checking status:", err);
    }
  }, [address, isConnected, daoContract, didContract, readDAO, readDID, mode]);

  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

  // ✅ Dynamic Navigation Links
  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/proposals", label: "Proposals" },

    // Only show "Join DAO" if connected BUT NOT registered
    ...(isConnected && !isRegistered
      ? [{ path: "/register", label: "Join DAO", highlight: true }]
      : []),

    // Show Dashboard if connected (regardless of registration, but usually after)
    ...(isConnected ? [{ path: "/dashboard", label: "Dashboard" }] : []),

    // Only show Create Proposal if Registered
    ...(isRegistered
      ? [{ path: "/create-proposal", label: "Create Proposal" }]
      : []),

    // Admin Link
    ...(isAdmin ? [{ path: "/admin", label: "Admin", isAdmin: true }] : []),
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
              className={`nav-link ${isActive(link.path) ? "active" : ""} ${
                link.isAdmin ? "admin-link" : ""
              } ${link.highlight ? "highlight-link" : ""}`}
            >
              {link.label}
              {link.isAdmin && <span className="admin-badge">⚡</span>}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="header-actions">
          <button
            className="deployment-toggle-header"
            onClick={() => setShowDeploymentModal(!showDeploymentModal)}
          >
            <span className="deploy-icon">{deploymentInfo.icon}</span>
            <span className="deploy-label">{deploymentInfo.mode}</span>
          </button>

          <button onClick={toggleTheme} className="theme-toggle">
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <div className="wallet-connect-wrapper">
            <ConnectButton />
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="menu-icon">{mobileMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav & Modal Code (Keep existing) */}
      {mobileMenuOpen && (
        <nav className="mobile-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${
                isActive(link.path) ? "active" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {showDeploymentModal && (
        <div
          className="deployment-modal-overlay"
          onClick={() => setShowDeploymentModal(false)}
        >
          <div
            className="deployment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowDeploymentModal(false)}
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
