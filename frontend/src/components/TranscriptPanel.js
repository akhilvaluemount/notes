import React, { useState, useEffect, useRef } from 'react';
import './TranscriptPanel.css';
import AudioRecorder from './AudioRecorder';
import AudioLevelMeter from './AudioLevelMeter';
import MicrophoneSelector from './MicrophoneSelector';
import VADSettings from './VADSettings';

const TranscriptPanel = ({ 
  conversation, 
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
  chunkCounterRef,
  // Text input props
  textInput,
  onTextInputChange,
  onTextSubmit,
  isLoadingAI,
  error,
  // VAD props
  audioLevel,
  isVoiceActive,
  vadStats,
  // Microphone props
  selectedMicrophone,
  onMicrophoneSelect,
  // VAD sensitivity
  onSensitivityChange
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
            
            {/* VAD Settings */}
            <VADSettings
              sensitivity={vadStats.sensitivity}
              onSensitivityChange={onSensitivityChange}
              vadStats={vadStats}
              disabled={isRecording}
            />
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
            {recordingStatus === 'idle' && <span>🎙️ Ready to record</span>}
            {recordingStatus === 'listening' && (
              <span className="listening">🔴 Listening... (Chunk #{chunkCounterRef.current})</span>
            )}
            {recordingStatus === 'processing' && (
              <span className="processing">⚡ Transcribing speech...</span>
            )}
          </div>
          
          {/* Audio Level Meter - show when recording */}
          {isRecording && (
            <AudioLevelMeter 
              level={audioLevel}
              isVoiceActive={isVoiceActive}
              noiseFloor={vadStats.noiseFloor}
              voiceThreshold={vadStats.voiceThreshold}
              showThresholds={true}
            />
          )}
          
          {/* VAD Stats - show when recording */}
          {isRecording && (
            <div className="vad-stats">
              <span className="stat-item">
                📊 Processed: {vadStats.chunksProcessed}
              </span>
              <span className="stat-item">
                ⏭️ Skipped: {vadStats.chunksSkipped}
              </span>
              <span className="stat-item">
                🤫 Noise: {Math.round(vadStats.noiseFloor * 1000)}
              </span>
            </div>
          )}
          
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