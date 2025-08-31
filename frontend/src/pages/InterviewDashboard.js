import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
import SearchBar from '../components/SearchBar';
import SessionSetup from '../components/SessionSetup';
import ErrorBoundary from '../components/ErrorBoundary';
import useSessionManager from '../hooks/useSessionManager';
import './InterviewDashboard.css';

const InterviewDashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });
  const [isSessionSetupOpen, setIsSessionSetupOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});

  const {
    existingSessions,
    isLoadingSessions,
    sessionError,
    createSession,
    deleteSession,
    loadExistingSessions
  } = useSessionManager();

  // Load sessions on component mount
  useEffect(() => {
    loadExistingSessions();
  }, [loadExistingSessions]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let result = [...existingSessions];

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(session =>
        session.company_name.toLowerCase().includes(searchLower) ||
        session.role.toLowerCase().includes(searchLower) ||
        session.interviewer_name.toLowerCase().includes(searchLower) ||
        session.user_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (filters.status) {
      result = result.filter(session => session.status === filters.status);
    }

    // Sort sessions
    result.sort((a, b) => {
      const { sortBy, sortOrder } = filters;
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    return result;
  }, [existingSessions, searchTerm, filters]);

  const handleCreateSession = async (sessionData) => {
    try {
      const newSession = await createSession(sessionData);
      setIsSessionSetupOpen(false);
      // Navigate to the interview interface with the new session
      navigate(`/interview/${newSession._id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const handleResumeSession = (session) => {
    navigate(`/interview/${session._id}`);
  };

  const handleViewSession = (session) => {
    navigate(`/interview/${session._id}`);
  };

  const handleDeleteSession = async (session) => {
    if (window.confirm(`Are you sure you want to delete the interview session with ${session.company_name}?`)) {
      try {
        setIsDeleting(prev => ({ ...prev, [session._id]: true }));
        await deleteSession(session._id);
      } catch (error) {
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
      } finally {
        setIsDeleting(prev => ({ ...prev, [session._id]: false }));
      }
    }
  };

  const getEmptyStateMessage = () => {
    if (searchTerm || filters.status) {
      return {
        title: 'No sessions found',
        message: 'Try adjusting your search criteria or filters.',
        action: null
      };
    }
    return {
      title: 'No interview sessions yet',
      message: 'Create your first interview session to get started.',
      action: 'Create New Interview'
    };
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className="interview-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Interview Sessions</h1>
          <p className="header-subtitle">
            Manage and track your interview sessions
          </p>
        </div>
        <button 
          className="new-interview-btn"
          onClick={() => setIsSessionSetupOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Interview
        </button>
      </header>

      <div className="dashboard-content">
        {existingSessions.length > 0 && (
          <SearchBar
            onSearch={setSearchTerm}
            onFilterChange={setFilters}
            filters={filters}
          />
        )}

        {sessionError && (
          <div className="error-message">
            <p>Error loading sessions: {sessionError}</p>
            <button onClick={loadExistingSessions}>Retry</button>
          </div>
        )}

        {isLoadingSessions ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading interview sessions...</p>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="sessions-container">
            <div className="sessions-grid">
              {filteredSessions.map((session) => (
                <ErrorBoundary key={session._id}>
                  <SessionCard
                    session={session}
                    onResume={handleResumeSession}
                    onView={handleViewSession}
                    onDelete={handleDeleteSession}
                    isDeleting={isDeleting[session._id]}
                  />
                </ErrorBoundary>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
            </div>
            <h2>{emptyState.title}</h2>
            <p>{emptyState.message}</p>
            {emptyState.action && (
              <button 
                className="empty-state-btn"
                onClick={() => setIsSessionSetupOpen(true)}
              >
                {emptyState.action}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Session Setup Modal */}
      <ErrorBoundary>
        <SessionSetup
          isOpen={isSessionSetupOpen}
          onClose={() => setIsSessionSetupOpen(false)}
          onCreateSession={handleCreateSession}
        />
      </ErrorBoundary>
    </div>
  );
};

export default InterviewDashboard;