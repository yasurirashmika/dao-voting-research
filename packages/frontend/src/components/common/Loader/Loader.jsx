import React from 'react';
import './Loader.css';

const Loader = ({ 
  size = 'medium', 
  text = '', 
  fullScreen = false,
  variant = 'spinner'
}) => {
  const loaderClasses = [
    'loader',
    `loader-${size}`,
    `loader-${variant}`
  ].filter(Boolean).join(' ');

  const LoaderContent = () => (
    <div className="loader-container">
      <div className={loaderClasses}>
        {variant === 'spinner' && (
          <div className="spinner"></div>
        )}
        {variant === 'dots' && (
          <div className="dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
        {variant === 'pulse' && (
          <div className="pulse"></div>
        )}
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <LoaderContent />
      </div>
    );
  }

  return <LoaderContent />;
};

export default Loader;
