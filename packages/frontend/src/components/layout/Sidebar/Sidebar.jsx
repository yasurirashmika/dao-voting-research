import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/proposals', label: 'Proposals', icon: '📋' },
    { path: '/create-proposal', label: 'Create', icon: '✏️' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      
      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Menu</h2>
          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive(item.path) ? 'sidebar-item-active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;