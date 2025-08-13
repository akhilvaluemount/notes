import React, { useState, useEffect, useRef } from 'react';
import './TranscriptPanel.css';
import AudioRecorder from './AudioRecorder';
import MicrophoneSelector from './MicrophoneSelector';
import buttonConfig from '../config/buttonConfig';

const TranscriptPanel = ({ 
  conversation, 
  partialTranscript,
  messageCount = 0,
  autoScroll, 
  isProcessing, 
  onAskAI,
  // Header content props
  isRecording,
  onStartRecording,
  onStopRecording,
  onClearConversation,
  onToggleAutoScroll,
  recordingStatus,
  isConnected,
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
  }, [conversation, autoScroll]);

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
          <h1>Voice Transcription App</h1>
          <button 
            className={`settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
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
              <p>💡 Using AssemblyAI Realtime API for continuous transcription</p>
              <p>🎤 Default system microphone will be used</p>
            </div>
          </div>
        )}
        
        <div className="controls">
          <AudioRecorder
            isRecording={isRecording}
            onStart={onStartRecording}
            onStop={onStopRecording}
            isProcessing={isProcessing}
          />
          <button 
            onClick={onToggleAutoScroll} 
            className={`btn ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {/* Live Status Indicator */}
        <div className="status-bar">
          <div className="status-indicator">
            {recordingStatus === 'disconnected' && (
              <span className="disconnected">🔴 Connecting to Realtime API...</span>
            )}
            {recordingStatus === 'ready' && (
              <span className="ready">🟢 Ready to record (Realtime API)</span>
            )}
            {recordingStatus === 'recording' && (
              <span className="recording">🔴 Live transcription active</span>
            )}
          </div>
          
          {/* Show connection status */}
          <div className="connection-status">
            <span className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          
          {isProcessing && (
            <div className="processing-dots">
              <span>●</span><span>●</span><span>●</span>
            </div>
          )}
        </div>
        
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
        <button 
          onClick={onClearConversation} 
          className="btn btn-clear"
        >
          Clear All
        </button>
      </div>
      <div className="transcript-container" ref={panelRef}>
        {!conversation && !partialTranscript ? (
          <div className="empty-state">
            <p>No transcripts yet. Click Record to start live transcription with AssemblyAI Realtime API.</p>
          </div>
        ) : (
          <div className="conversation-block">
            {conversation && (
              <div className="final-transcript">
                {conversation}
              </div>
            )}
            {partialTranscript && (
              <div className="partial-transcript">
                <span className="typing-indicator">
                  {partialTranscript}
                  <span className="live-cursor">|</span>
                </span>
              </div>
            )}
            <div className="conversation-actions">
              {buttonConfig.map((button) => {
                const handleButtonClick = () => {
                  const currentTranscript = conversation || partialTranscript || '';
                  const customPrompt = button.prompt.replace('{transcript}', currentTranscript);
                  onAskAI(customPrompt);
                };

                return (
                  <button 
                    key={button.id}
                    onClick={handleButtonClick}
                    className={`btn ${button.id === 'ask-ai' ? 'btn-primary' : 'btn-secondary'} action-btn`}
                    disabled={isProcessing || (!conversation && !partialTranscript) || !(conversation?.trim() || partialTranscript?.trim())}
                    title={button.description}
                  >
                    <span className="btn-icon">{button.icon}</span>
                    {button.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;