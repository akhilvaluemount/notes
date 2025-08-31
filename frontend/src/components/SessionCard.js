import React, { useState, useRef, useEffect } from 'react';
import './SessionCard.css';

const SessionCard = ({ session, onResume, onDelete, onView }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteClick = () => {
    setShowDropdown(false);
    onDelete(session);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'In Progress';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const questionCount = session.questions ? session.questions.length : 0;
  const lastActivity = session.updated_at || session.created_at;

  return (
    <div className="session-card">
      <div className="card-layout">
        <div className="card-left">
          <div className="session-card-header">
            <div className="session-title-section">
              <h3>{session.user_name}</h3>
              <span className="company-role">
                {session.company_name} • {session.role}
              </span>
            </div>
          </div>

          <div className="session-content">
            <div className="session-info-grid">
              <div className="info-item">
                <span className="info-label">Interviewer</span>
                <span className="info-value">{session.interviewer_name}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Questions</span>
                <span className="info-value">{questionCount}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">{formatDate(lastActivity)}</span>
              </div>
            </div>
            
            {session.technologies && session.technologies.length > 0 && (
              <div className="technologies-section">
                <span className="tech-label">Technologies</span>
                <div className="technologies-tags">
                  {session.technologies.slice(0, 4).map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                  ))}
                  {session.technologies.length > 4 && (
                    <span className="tech-tag-more">
                      +{session.technologies.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="session-actions">
            {session.status !== 'completed' && (
              <button 
                className="btn-primary"
                onClick={() => onResume(session)}
              >
                {session.status === 'paused' ? 'Resume' : 'Continue'}
              </button>
            )}
            
            <button 
              className="btn-secondary"
              onClick={() => onView(session)}
            >
              View Details
            </button>
          </div>
        </div>

        <div className="card-right">
          <div 
            className="session-status"
            style={{ backgroundColor: getStatusColor(session.status) }}
          >
            {getStatusText(session.status)}
          </div>
          <div className="dropdown-container" ref={dropdownRef}>
            <button 
              className="dropdown-trigger"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="More options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item delete-item"
                  onClick={handleDeleteClick}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCard;