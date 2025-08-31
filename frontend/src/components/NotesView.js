import React, { useState, useEffect, useRef } from 'react';
import FormattedResponse from './FormattedResponse';
import { extractMetadataFromResponse } from '../utils/metadataExtractor';
import './NotesView.css';

const NotesView = () => {
  const [aiResponse, setAiResponse] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleString());
  const [isStreaming, setIsStreaming] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Connected - Real-time sync active');
  const [fontSize, setFontSize] = useState('medium');
  const [currentMetadata, setCurrentMetadata] = useState({ language: null, topic: null });
  
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    // Try to get initial response from sessionStorage (for new tab)
    const sessionResponse = sessionStorage.getItem('initialAiResponse');
    if (sessionResponse) {
      setAiResponse(sessionResponse);
      
      // Extract metadata
      const { language, topic } = extractMetadataFromResponse(sessionResponse);
      setCurrentMetadata({ language, topic });
      
      // Save to localStorage for persistence
      localStorage.setItem('notesAiResponse', sessionResponse);
      localStorage.setItem('notesMetadata', JSON.stringify({ language, topic }));
      localStorage.setItem('notesLastUpdate', new Date().toLocaleString());
      // Clear sessionStorage after reading
      sessionStorage.removeItem('initialAiResponse');
    } else {
      // Try to restore from localStorage (for refresh)
      const savedResponse = localStorage.getItem('notesAiResponse');
      const savedMetadata = localStorage.getItem('notesMetadata');
      const savedLastUpdate = localStorage.getItem('notesLastUpdate');
      
      if (savedResponse) {
        setAiResponse(savedResponse);
        if (savedMetadata) {
          try {
            const metadata = JSON.parse(savedMetadata);
            setCurrentMetadata(metadata);
          } catch (e) {
            console.log('Failed to parse saved metadata:', e);
          }
        }
        if (savedLastUpdate) {
          setLastUpdate(savedLastUpdate);
        }
      }
    }
    
    // Restore font size preference
    const savedFontSize = localStorage.getItem('notesFontSize');
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }

    // Initialize BroadcastChannel for real-time synchronization
    broadcastChannelRef.current = new BroadcastChannel('ai-response-sync');
    
    // Listen for AI response updates
    const handleBroadcastMessage = (event) => {
      if (event.data.type === 'ai-response-update') {
        console.log('Received AI response update in notes view:', event.data.response);
        const newResponse = event.data.response;
        const newUpdateTime = new Date().toLocaleString();
        
        // Extract metadata
        const { language, topic } = extractMetadataFromResponse(newResponse);
        
        setAiResponse(newResponse);
        setCurrentMetadata({ language, topic });
        setLastUpdate(newUpdateTime);
        
        // Save to localStorage for persistence
        localStorage.setItem('notesAiResponse', newResponse);
        localStorage.setItem('notesMetadata', JSON.stringify({ language, topic }));
        localStorage.setItem('notesLastUpdate', newUpdateTime);
        
        // Flash sync indicator
        setSyncStatus('Syncing...');
        setTimeout(() => {
          setSyncStatus('Connected - Real-time sync active');
        }, 300);
      } else if (event.data.type === 'ai-streaming-start') {
        setIsStreaming(true);
        console.log('AI streaming started in notes view');
      } else if (event.data.type === 'ai-streaming-end') {
        setIsStreaming(false);
        console.log('AI streaming ended in notes view');
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);
    
    // Cleanup
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('notesFontSize', size);
  };

  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'small':
        return 'font-size-small';
      case 'large':
        return 'font-size-large';
      case 'extra-large':
        return 'font-size-extra-large';
      default:
        return 'font-size-medium';
    }
  };

  return (
    <div className="notes-view">
      <div className="notes-container">
        <div className={`notes-content-area ${getFontSizeClass()}`}>
          <div className="formatted-content">
            {aiResponse ? (
              <>
                <FormattedResponse 
                  response={aiResponse} 
                  language={currentMetadata.language} 
                  topic={currentMetadata.topic} 
                />
                {isStreaming && (
                  <div className="streaming-indicator">
                    <span className="typing-cursor">|</span>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>No response received yet. Waiting for AI response...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="notes-footer">
        <div className="footer-left">
          <h1>📝 Mokita Notes</h1>
          <div className="timestamp-footer">
            <span className="last-updated">
              Last updated: <span>{lastUpdate}</span>
            </span>
          </div>
        </div>
        <div className="footer-controls">
          <div className="sync-status">
            <span className={`sync-indicator ${isStreaming ? 'streaming' : ''}`}></span>
            <span>{syncStatus}</span>
          </div>
          
          {/* Font Size Controls in Footer */}
          <div className="font-size-controls-footer">
            <button 
              className={`font-btn-footer ${fontSize === 'small' ? 'active' : ''}`}
              onClick={() => handleFontSizeChange('small')}
              title="Small"
            >
              <span style={{ fontSize: '16px' }}>A</span>
            </button>
            <button 
              className={`font-btn-footer ${fontSize === 'medium' ? 'active' : ''}`}
              onClick={() => handleFontSizeChange('medium')}
              title="Medium"
            >
              <span style={{ fontSize: '20px' }}>A</span>
            </button>
            <button 
              className={`font-btn-footer ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => handleFontSizeChange('large')}
              title="Large"
            >
              <span style={{ fontSize: '24px' }}>A</span>
            </button>
            <button 
              className={`font-btn-footer ${fontSize === 'extra-large' ? 'active' : ''}`}
              onClick={() => handleFontSizeChange('extra-large')}
              title="Extra Large"
            >
              <span style={{ fontSize: '28px' }}>A</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesView;