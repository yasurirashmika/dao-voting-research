import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-icon">🗳️</div>
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-text">
          Oops! The page you're looking for doesn't exist.
          It might have been moved or deleted.
        </p>
        <div className="not-found-actions">
          <Link to="/">
            <Button size="large">Go to Home</Button>
          </Link>
          <Link to="/proposals">
            <Button size="large" variant="secondary">View Proposals</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
