import React from 'react';
import './SessionCard.css';

const SessionCard = ({ session, onResume, onDelete, onView }) => {
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
      <div className="session-card-header">
        <div className="session-title">
          <h3>{session.user_name}</h3>
          <span className="company-role">
            {session.company_name} • {session.role}
          </span>
        </div>
        <div 
          className="session-status"
          style={{ backgroundColor: getStatusColor(session.status) }}
        >
          {getStatusText(session.status)}
        </div>
      </div>

      <div className="session-details">
        <div className="detail-item">
          <span className="detail-label">Interviewer:</span>
          <span className="detail-value">{session.interviewer_name}</span>
        </div>
        
        {session.technologies && session.technologies.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">Technologies:</span>
            <div className="technologies-tags">
              {session.technologies.slice(0, 3).map((tech, index) => (
                <span key={index} className="tech-tag">{tech}</span>
              ))}
              {session.technologies.length > 3 && (
                <span className="tech-tag-more">
                  +{session.technologies.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="detail-item">
          <span className="detail-label">Questions:</span>
          <span className="detail-value">{questionCount}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Last Updated:</span>
          <span className="detail-value">{formatDate(lastActivity)}</span>
        </div>
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
        
        <button 
          className="btn-danger"
          onClick={() => onDelete(session)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default SessionCard;