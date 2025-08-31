import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, onFilterChange, filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleStatusFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    onFilterChange({
      ...filters,
      status: value === 'all' ? null : value
    });
  };

  const handleSortChange = (e) => {
    const [field, order] = e.target.value.split('-');
    setSortBy(field);
    setSortOrder(order);
    onFilterChange({
      ...filters,
      sortBy: field,
      sortOrder: order
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('updated_at');
    setSortOrder('desc');
    onSearch('');
    onFilterChange({
      status: null,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
  };

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search by company, role, interviewer name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <div className="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
      </div>

      <div className="filter-controls">
        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={handleSortChange}
          className="filter-select"
        >
          <option value="updated_at-desc">Recently Updated</option>
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="company_name-asc">Company (A-Z)</option>
          <option value="company_name-desc">Company (Z-A)</option>
          <option value="user_name-asc">Name (A-Z)</option>
          <option value="user_name-desc">Name (Z-A)</option>
        </select>

        {(searchTerm || statusFilter !== 'all' || sortBy !== 'updated_at' || sortOrder !== 'desc') && (
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;