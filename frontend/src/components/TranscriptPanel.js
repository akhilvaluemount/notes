import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TranscriptPanel.css';
import AudioRecorder from './AudioRecorder';
import MicrophoneSelector from './MicrophoneSelector';
import buttonConfig from '../config/buttonConfig';

const TranscriptPanel = ({ 
  conversation, 
  partialTranscript,
  newWords = [],
  messageCount = 0,
  messageHistory = [],
  currentMessageId,
  autoScroll, 
  isProcessing, 
  onAskAI,
  // Header content props
  isRecording,
  onStartRecording,
  onStopRecording,
  onClearConversation,
  onCreateNewMessage,
  onToggleAutoScroll,
  recordingStatus,
  isConnected,
  connectionState,
  // Text input props
  textInput,
  onTextInputChange,
  onTextSubmit,
  isLoadingAI,
  error,
  // Microphone props (for compatibility)
  selectedMicrophone,
  onMicrophoneSelect
}) => {
  const panelRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const lastPartialRef = useRef('');
  

  useEffect(() => {
    if (autoScroll && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [conversation, messageHistory, autoScroll]);

  // Split partial transcript into existing words and new words for animation
  const getWordsForDisplay = useCallback((fullText, newWordsArray) => {
    if (!fullText) return { existingWords: [], newWords: [] };
    
    const allWords = fullText.split(' ').filter(word => word.trim());
    const newWordsCount = newWordsArray.length;
    
    // If we have new words, split the text
    if (newWordsCount > 0 && allWords.length >= newWordsCount) {
      const existingWords = allWords.slice(0, allWords.length - newWordsCount);
      const actualNewWords = allWords.slice(-newWordsCount);
      return { existingWords, newWords: actualNewWords };
    }
    
    // If no new words detected, treat all words as existing (static)
    return { existingWords: allWords, newWords: [] };
  }, []);

  // Stable word animation key generation
  const getStableWordKey = useCallback((messageId, word, index, isNew = false) => {
    const prefix = isNew ? 'new' : 'existing';
    return `${messageId}-${prefix}-word-${index}-${word}`;
  }, []);

  // Close settings when clicking ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showSettings]);

  // Handle message click to enable editing
  const handleMessageClick = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditedTexts(prev => ({
      ...prev,
      [messageId]: currentText || ''
    }));
  };

  // Handle text change while editing
  const handleEditChange = (messageId, newText) => {
    setEditedTexts(prev => ({
      ...prev,
      [messageId]: newText
    }));
  };

  // Handle save edit (on blur or enter key)
  const handleSaveEdit = (messageId) => {
    setEditingMessageId(null);
    // The edited text stays in editedTexts for persistence
  };

  // Get display text for a message (edited or original)
  const getDisplayText = (message) => {
    return editedTexts[message.id] !== undefined ? editedTexts[message.id] : message.text;
  };

  return (
    <div className="transcript-panel">
      {/* Header Section */}
      <div className="transcript-header">
        <div className="header-title-row">
          <h1>MOKITA</h1>
          <div className="header-controls">
            {/* All control icons in header */}
            <AudioRecorder
              isRecording={isRecording}
              onStart={onStartRecording}
              onStop={onStopRecording}
              isProcessing={isProcessing}
            />
            <button 
              onClick={onToggleAutoScroll} 
              className={`btn-icon ${autoScroll ? 'btn-icon-active' : 'btn-icon-inactive'}`}
              title={`Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'}`}
            >
              {autoScroll ? '⬇️' : '⏸️'}
            </button>
            
            {/* Status indicators */}
            <div className="header-status-icons">
              {/* Recording Status */}
              <span 
                className={`status-icon ${recordingStatus === 'disconnected' ? 'status-disconnected' : recordingStatus === 'ready' ? 'status-ready' : 'status-recording'}`}
                title={
                  recordingStatus === 'disconnected' ? 'Connecting to Realtime API...' :
                  recordingStatus === 'ready' ? 'Ready to record (Realtime API)' :
                  'Live transcription active'
                }
              >
                {recordingStatus === 'disconnected' && '🔗'}
                {recordingStatus === 'ready' && '✅'}
                {recordingStatus === 'recording' && '🔴'}
              </span>

              {/* Connection Status */}
              <span 
                className={`status-icon connection-${connectionState}`}
                title={
                  connectionState === 'connected' ? 'Connected & Streaming' :
                  connectionState === 'silence_detected' ? 'Silence - Keep-alive chunks active' :
                  connectionState === 'disconnected' ? 'Disconnected' :
                  'Reconnecting...'
                }
              >
                {connectionState === 'connected' && '🌐'}
                {connectionState === 'silence_detected' && '⏸️'}
                {connectionState === 'disconnected' && '❌'}
                {connectionState === 'reconnecting' && '🔄'}
              </span>

              {/* Processing Indicator */}
              {isProcessing && (
                <span className="status-icon status-processing" title="Processing audio data">
                  ⚡
                </span>
              )}
            </div>
            
            <button 
              className={`settings-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        
        {/* Settings Panel - Toggleable */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h3>⚙️ Settings</h3>
              <button 
                className="close-settings-btn"
                onClick={() => setShowSettings(false)}
                title="Close Settings (ESC)"
              >
                ✕
              </button>
            </div>
            
            {/* Microphone Selector */}
            <MicrophoneSelector
              selectedDeviceId={selectedMicrophone}
              onDeviceSelect={onMicrophoneSelect}
              disabled={isRecording}
              showRefresh={true}
            />
            
            <div className="settings-info">
              <p>💡 Zero wake-up delay with continuous session management</p>
              <p>🎤 Enhanced noise suppression active</p>
              <p>🔇 Confidence filtering prevents random words</p>
              <p>📡 Keep-alive chunks maintain session during silence</p>
            </div>
          </div>
        )}
        
        
        {/* Text Input Section */}
        <div className="text-input-section">
          <div className="text-input-form">
            <input
              type="text"
              value={textInput}
              onChange={onTextInputChange}
              placeholder="Type your question here (e.g., 'What are Angular pipes?')"
              className="text-input-field"
              disabled={isLoadingAI}
            />
            
            {/* Inline Action Buttons */}
            <div className="text-input-actions">
              {buttonConfig.map((button) => {
                const handleQuickAction = () => {
                  if (textInput.trim()) {
                    const customPrompt = button.prompt.replace('{transcript}', textInput);
                    onAskAI(customPrompt);
                  }
                };

                return (
                  <button 
                    key={button.id}
                    onClick={handleQuickAction}
                    className={`btn-icon-only ${button.id === 'ask-ai' ? 'btn-icon-primary' : 'btn-icon-secondary'}`}
                    disabled={!textInput.trim() || isLoadingAI}
                    title={`${button.icon} ${button.label} - ${button.description}`}
                  >
                    {button.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Transcript Content */}
      <div className="transcript-section-header">
        <h2>Discussion</h2>
        <div className="transcript-header-buttons">
          <button 
            onClick={onCreateNewMessage}
            className="btn-icon btn-icon-secondary"
            disabled={!isRecording || !messageHistory.length}
            title="Start a new message block"
          >
            ➕
          </button>
          <button 
            onClick={onClearConversation} 
            className="btn-icon btn-icon-danger"
            title="Clear all messages"
          >
            🧹
          </button>
        </div>
      </div>
      <div className="transcript-container" ref={panelRef}>
        {messageHistory.length === 0 && !partialTranscript ? (
          <div className="empty-state">
            <p>No discussion yet. Click Record to start capturing your thoughts and ideas.</p>
          </div>
        ) : (
          <div className="messages-container">
            {messageHistory
              .map((message, index) => {
                const isLatest = index === messageHistory.length - 1;
                const isCurrentMessage = message.id === currentMessageId;
                const isEditing = editingMessageId === message.id;
                
                // For current message, show accumulated text + partial
                let displayText = getDisplayText(message);
                if (isCurrentMessage && partialTranscript && !isEditing) {
                  // Show existing text plus current partial
                  displayText = displayText ? 
                    `${displayText} ${partialTranscript}` : 
                    partialTranscript;
                }
                
                // Skip completely empty messages
                if (!displayText?.trim() && !isCurrentMessage) return null;
                
                return (
                  <div 
                    key={message.id} 
                    className={`message-block ${isLatest ? 'latest-message' : 'older-message'} ${message.isPartial ? 'partial-message' : 'final-message'} ${message.silenceSegmented ? 'silence-segmented' : ''}`}
                  >
                    {message.silenceSegmented && (
                      <div className="silence-segmentation-indicator">
                        <span>🔇 Auto-segmented after 10-second silence</span>
                      </div>
                    )}
                    <div className="message-content">
                      {isEditing ? (
                        <textarea
                          className="message-edit-input"
                          value={editedTexts[message.id] || ''}
                          onChange={(e) => handleEditChange(message.id, e.target.value)}
                          onBlur={() => handleSaveEdit(message.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(message.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditedTexts(prev => {
                                const newTexts = {...prev};
                                delete newTexts[message.id];
                                return newTexts;
                              });
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="message-text-content"
                          onClick={() => handleMessageClick(message.id, displayText)}
                          title="Click to edit"
                        >
                          {isCurrentMessage && message.isPartial && partialTranscript && !isEditing ? (
                            (() => {
                              const { existingWords, newWords: wordsToAnimate } = getWordsForDisplay(partialTranscript, newWords);
                              
                              return (
                                <>
                                  {/* Existing words (static, no animation) */}
                                  {existingWords.length > 0 && (
                                    <span className="message-text-static">
                                      {existingWords.map((word, idx) => (
                                        <span 
                                          key={getStableWordKey(message.id, word, idx, false)}
                                          className="static-word"
                                        >
                                          {word}{idx < existingWords.length - 1 || wordsToAnimate.length > 0 ? ' ' : ''}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  
                                  {/* New words (animated) */}
                                  {wordsToAnimate.length > 0 && (
                                    <span className="typing-indicator">
                                      {wordsToAnimate.map((word, idx) => (
                                        <span 
                                          key={getStableWordKey(message.id, word, existingWords.length + idx, true)}
                                          className="streaming-word"
                                          style={{
                                            animationDelay: `${idx * 50}ms`
                                          }}
                                        >
                                          {word}{idx < wordsToAnimate.length - 1 ? ' ' : ''}
                                        </span>
                                      ))}
                                      <span className="live-cursor">|</span>
                                    </span>
                                  )}
                                  
                                  {/* Show cursor even if no new words */}
                                  {wordsToAnimate.length === 0 && existingWords.length > 0 && (
                                    <span className="live-cursor">|</span>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <span className="message-text-static">{displayText}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {displayText?.trim() && (
                      <div className={`message-actions ${isLatest ? 'always-visible' : 'hover-visible'}`}>
                        {buttonConfig.map((button) => {
                          const handleButtonClick = () => {
                            const customPrompt = button.prompt.replace('{transcript}', displayText);
                            onAskAI(customPrompt);
                          };

                          return (
                            <button 
                              key={button.id}
                              onClick={handleButtonClick}
                              className={`btn-icon-only ${button.id === 'ask-ai' ? 'btn-icon-primary' : 'btn-icon-secondary'}`}
                              disabled={isProcessing || !displayText?.trim()}
                              title={`${button.icon} ${button.label} - ${button.description}`}
                            >
                              {button.icon}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
              .filter(Boolean)}
            
            {/* Show current partial transcript if there's no message for it yet */}
            {partialTranscript && !messageHistory.find(m => m.id === currentMessageId) && (
              <div className="message-block latest-message partial-message">
                <div className="message-content">
                  <span className="typing-indicator">
                    {(() => {
                      const { existingWords, newWords: wordsToAnimate } = getWordsForDisplay(partialTranscript, newWords);
                      
                      return (
                        <>
                          {/* Existing words (static) */}
                          {existingWords.length > 0 && (
                            <span className="message-text-static">
                              {existingWords.map((word, idx) => (
                                <span 
                                  key={`orphan-existing-${idx}-${word}`}
                                  className="static-word"
                                >
                                  {word}{idx < existingWords.length - 1 || wordsToAnimate.length > 0 ? ' ' : ''}
                                </span>
                              ))}
                            </span>
                          )}
                          
                          {/* New words (animated) */}
                          {wordsToAnimate.map((word, idx) => (
                            <span 
                              key={`orphan-new-${existingWords.length + idx}-${word}`}
                              className="streaming-word"
                              style={{
                                animationDelay: `${idx * 50}ms`
                              }}
                            >
                              {word}{idx < wordsToAnimate.length - 1 ? ' ' : ''}
                            </span>
                          ))}
                          
                          <span className="live-cursor">|</span>
                        </>
                      );
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;