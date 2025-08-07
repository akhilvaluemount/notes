import React from 'react';
import './ResponsePanel.css';
import FormattedResponse from './FormattedResponse';

const ResponsePanel = ({ response, isLoading }) => {
  return (
    <div className="response-panel">
      <h2>AI Response</h2>
      <div className="response-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Processing your question...</p>
          </div>
        ) : response ? (
          <div className="response-content">
            <FormattedResponse response={response} />
          </div>
        ) : (
          <div className="empty-state">
            <p>Type a question or record speech, then click "Ask AI" to get a response</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsePanel;