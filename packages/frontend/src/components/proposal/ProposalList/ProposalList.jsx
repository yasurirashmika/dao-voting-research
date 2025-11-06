import React from 'react';
import ProposalCard from '../ProposalCard/ProposalCard';
import Loader from '../../common/Loader/Loader';
import Card from '../../common/Card/Card';
import './ProposalList.css';

const ProposalList = ({ proposals, loading, error }) => {
  if (loading) {
    return (
      <div className="proposal-list-loading">
        <Loader size="large" text="Loading proposals..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="large" className="proposal-list-error">
        <h3>Error Loading Proposals</h3>
        <p>{error}</p>
      </Card>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <Card padding="large" className="proposal-list-empty">
        <div className="empty-state">
          <span className="empty-icon">🗳️</span>
          <h3>No proposals found</h3>
          <p>Try adjusting your filters or create a new proposal</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="proposal-list">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
};

export default ProposalList;
