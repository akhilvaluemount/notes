import React, { useEffect, useRef } from 'react';
import './TranscriptPanel.css';

const TranscriptPanel = ({ conversation, autoScroll, isProcessing, onAskAI }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (autoScroll && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [conversation, autoScroll]);

  return (
    <div className="transcript-panel">
      <h2>Live Transcript</h2>
      <div className="transcript-container" ref={panelRef}>
        {!conversation ? (
          <div className="empty-state">
            <p>No transcripts yet. Start recording to see live transcription.</p>
          </div>
        ) : (
          <div className="conversation-block">
            <div className="conversation-text">
              {conversation}
            </div>
            <div className="conversation-actions">
              <button 
                onClick={() => onAskAI()}
                className="btn btn-primary ask-ai-btn"
                disabled={isProcessing || !conversation || !conversation.trim()}
              >
                Ask AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;