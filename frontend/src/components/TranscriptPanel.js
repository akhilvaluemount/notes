import React, { useState, useEffect, useRef } from 'react';
import './TranscriptPanel.css';
import AudioRecorder from './AudioRecorder';
import MicrophoneSelector from './MicrophoneSelector';
import buttonConfig from '../config/buttonConfig';

const TranscriptPanel = ({ 
  conversation, 
  partialTranscript,
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
  

  useEffect(() => {
    if (autoScroll && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [conversation, messageHistory, autoScroll]);

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
          <form onSubmit={onTextSubmit} className="text-input-form">
            <input
              type="text"
              value={textInput}
              onChange={onTextInputChange}
              placeholder="Type your question here (e.g., 'What are Angular pipes?')"
              className="text-input-field"
              disabled={isLoadingAI}
            />
            <button 
              type="submit" 
              className="btn btn-primary text-submit-btn"
              disabled={!textInput.trim() || isLoadingAI}
            >
              {isLoadingAI ? 'Processing...' : 'Ask AI'}
            </button>
          </form>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Transcript Content */}
      <div className="transcript-section-header">
        <h2>Live Transcript</h2>
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
            <p>No transcripts yet. Click Record to start live transcription with AssemblyAI Realtime API.</p>
          </div>
        ) : (
          <div className="messages-container">
            {messageHistory
              .map((message, index) => {
                const isLatest = index === messageHistory.length - 1;
                const isCurrentMessage = message.id === currentMessageId;
                
                // For current message, show accumulated text + partial
                let displayText = message.text || '';
                if (isCurrentMessage && partialTranscript) {
                  // Show existing text plus current partial
                  displayText = message.text ? 
                    `${message.text} ${partialTranscript}` : 
                    partialTranscript;
                }
                
                // Skip completely empty messages
                if (!displayText?.trim() && !isCurrentMessage) return null;
                
                return (
                  <div 
                    key={message.id} 
                    className={`message-block ${isLatest ? 'latest-message' : 'older-message'} ${message.isPartial ? 'partial-message' : 'final-message'} ${message.hasSilenceGap ? 'has-silence-gap' : ''}`}
                  >
                    {message.hasSilenceGap && (
                      <div className="silence-indicator">
                        <span>⏸️ Silence detected - continuing in same message...</span>
                      </div>
                    )}
                    <div className="message-content">
                      {isCurrentMessage && message.isPartial ? (
                        <>
                          {message.text && <span>{message.text} </span>}
                          {partialTranscript && (
                            <span className="typing-indicator">
                              {partialTranscript}
                              <span className="live-cursor">|</span>
                            </span>
                          )}
                        </>
                      ) : (
                        displayText
                      )}
                    </div>
                    
                    {message.text?.trim() && (
                      <div className={`message-actions ${isLatest ? 'always-visible' : 'hover-visible'}`}>
                        {buttonConfig.map((button) => {
                          const handleButtonClick = () => {
                            const customPrompt = button.prompt.replace('{transcript}', message.text);
                            onAskAI(customPrompt);
                          };

                          return (
                            <button 
                              key={button.id}
                              onClick={handleButtonClick}
                              className={`btn ${button.id === 'ask-ai' ? 'btn-primary' : 'btn-secondary'} action-btn`}
                              disabled={isProcessing || !message.text?.trim()}
                              title={button.description}
                            >
                              <span className="btn-icon">{button.icon}</span>
                              {button.label}
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
                    {partialTranscript}
                    <span className="live-cursor">|</span>
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