import React, { useState, useEffect } from 'react';
import { searchUsers } from '../utils/api';

const UserSearch = ({ onSelectUser, selectedUsers = [], placeholder = "Search users..." }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        const result = await searchUsers(query);
        if (result.success) {
          setSearchResults(result.data);
          setShowResults(true);
        }
        setIsLoading(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleUserSelect = (user) => {
    onSelectUser(user);
    setQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const isUserSelected = (userId) => {
    return selectedUsers.some(user => user._id === userId);
  };

  return (
    <div className="user-search">
      <div className="search-input-container">
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => {
            // Delay hiding results to allow clicking
            setTimeout(() => setShowResults(false), 150);
          }}
          onFocus={() => {
            if (searchResults.length > 0) setShowResults(true);
          }}
        />
        {isLoading && (
          <div className="search-loading">
            <span>Searching...</span>
          </div>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(user => (
            <div
              key={user._id}
              className={`search-result-item ${isUserSelected(user._id) ? 'selected' : ''}`}
              onClick={() => handleUserSelect(user)}
            >
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
              {isUserSelected(user._id) && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && query.length >= 2 && !isLoading && (
        <div className="search-results">
          <div className="no-results">No users found</div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;