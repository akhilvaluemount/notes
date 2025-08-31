import React from 'react';
import './SessionManager.css';

const SessionManager = ({ 
  currentSession, 
  onNewSession, 
  onEndSession, 
  onPauseSession, 
  onResumeSession 
}) => {
  if (!currentSession) {
    return (
      <div className="session-manager no-session">
        <div className="session-info">
          <span className="session-status">No Active Session</span>
          <p>Start a new interview session to track questions and answers</p>
        </div>
        <button className="btn-primary" onClick={onNewSession}>
          Start New Session
        </button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusAction = () => {
    switch (currentSession.status) {
      case 'active':
        return (
          <>
            <button className="btn-warning" onClick={onPauseSession}>
              Pause Session
            </button>
            <button className="btn-danger" onClick={onEndSession}>
              End Session
            </button>
          </>
        );
      case 'paused':
        return (
          <>
            <button className="btn-success" onClick={onResumeSession}>
              Resume Session
            </button>
            <button className="btn-danger" onClick={onEndSession}>
              End Session
            </button>
          </>
        );
      case 'completed':
        return (
          <button className="btn-primary" onClick={onNewSession}>
            Start New Session
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="session-manager active-session">
      <div className="session-header">
        <div className="session-title">
          <h3>{currentSession.user_name} @ {currentSession.company_name}</h3>
          <span 
            className="session-status-badge"
            style={{ backgroundColor: getStatusColor(currentSession.status) }}
          >
            {currentSession.status.toUpperCase()}
          </span>
        </div>
        <button className="btn-secondary btn-sm" onClick={onNewSession}>
          New Session
        </button>
      </div>
      
      <div className="session-details">
        <div className="detail-item">
          <span className="label">Role:</span>
          <span className="value">{currentSession.role}</span>
        </div>
        <div className="detail-item">
          <span className="label">Interviewer:</span>
          <span className="value">{currentSession.interviewer_name}</span>
        </div>
        <div className="detail-item">
          <span className="label">Started:</span>
          <span className="value">{formatDate(currentSession.created_at)}</span>
        </div>
        {currentSession.technologies && currentSession.technologies.length > 0 && (
          <div className="detail-item">
            <span className="label">Technologies:</span>
            <div className="technologies-list">
              {currentSession.technologies.map((tech, index) => (
                <span key={index} className="tech-tag">{tech}</span>
              ))}
            </div>
          </div>
        )}
        <div className="detail-item">
          <span className="label">Questions:</span>
          <span className="value">{currentSession.questions ? currentSession.questions.length : 0}</span>
        </div>
      </div>
      
      <div className="session-actions">
        {getStatusAction()}
      </div>
    </div>
  );
};

export default SessionManager;