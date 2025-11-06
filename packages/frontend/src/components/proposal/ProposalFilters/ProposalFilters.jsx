import React from 'react';
import Card from '../../common/Card/Card';
import Input from '../../common/Input/Input';
import { PROPOSAL_STATE } from '../../../utils/constants';
import './ProposalFilters.css';

const ProposalFilters = ({ 
  searchTerm, 
  onSearchChange, 
  filterState, 
  onFilterChange,
  sortBy,
  onSortChange 
}) => {
  const filterOptions = [
    { value: 'all', label: 'All Proposals' },
    { value: PROPOSAL_STATE.ACTIVE, label: 'Active' },
    { value: PROPOSAL_STATE.SUCCEEDED, label: 'Succeeded' },
    { value: PROPOSAL_STATE.DEFEATED, label: 'Defeated' },
    { value: PROPOSAL_STATE.EXECUTED, label: 'Executed' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  return (
    <Card padding="medium" className="proposal-filters">
      <div className="filter-row">
        <Input
          placeholder="Search proposals..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          icon="🔍"
          className="search-input"
        />

        <div className="filter-controls">
          <select
            value={filterState}
            onChange={(e) => onFilterChange(e.target.value)}
            className="filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="filter-select"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};

export default ProposalFilters;
