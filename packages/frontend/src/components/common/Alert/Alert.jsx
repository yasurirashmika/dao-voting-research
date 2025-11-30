import React from 'react';
import './Alert.css';

const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  onClose,
  icon 
}) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const defaultIcon = icon || icons[type];

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-icon">{defaultIcon}</div>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{children}</div>
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;