import React, { useEffect } from 'react';
import useRealtimeTranscription from '../hooks/useRealtimeTranscription';
import './RealtimeTranscriber.css';

const RealtimeTranscriber = ({ 
  onTranscriptUpdate, 
  onError,
  autoStart = false,
  className = ''
}) => {
  const {
    isConnected,
    isRecording,
    connectionError,
    partialTranscript,
    finalTranscript,
    conversationHistory,
    startRecording,
    stopRecording,
    clearConversation,
    connect,
    disconnect,
    getStatus
  } = useRealtimeTranscription();

  // Update parent component with transcript changes
  useEffect(() => {
    if (onTranscriptUpdate) {
      onTranscriptUpdate({
        partial: partialTranscript,
        final: finalTranscript,
        conversation: conversationHistory,
        isRecording,
        isConnected
      });
    }
  }, [partialTranscript, finalTranscript, conversationHistory, isRecording, isConnected, onTranscriptUpdate]);

  // Handle errors
  useEffect(() => {
    if (connectionError && onError) {
      onError(connectionError);
    }
  }, [connectionError, onError]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isConnected && !isRecording) {
      startRecording();
    }
  }, [autoStart, isConnected, isRecording, startRecording]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      const success = await startRecording();
      if (!success) {
        console.error('Failed to start recording');
      }
    }
  };

  const handleClearConversation = () => {
    clearConversation();
  };

  const getConnectionStatus = () => {
    if (connectionError) return 'error';
    if (!isConnected) return 'disconnected';
    if (isRecording) return 'recording';
    return 'connected';
  };

  const getStatusIcon = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'recording': return '🔴';
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'recording': return 'Recording...';
      case 'connected': return 'Ready to record';
      case 'disconnected': return 'Connecting...';
      case 'error': return 'Connection error';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`realtime-transcriber ${className}`}>
      {/* Status Indicator */}
      <div className="transcriber-status">
        <div className={`status-indicator ${getConnectionStatus()}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="transcriber-controls">
        <button
          className={`btn-record ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleRecording}
          disabled={!isConnected || !!connectionError}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? '⏹️ Stop' : '🎤 Record'}
        </button>

        <button
          className="btn-clear"
          onClick={handleClearConversation}
          disabled={!conversationHistory && !partialTranscript}
          title="Clear conversation"
        >
          🧹 Clear
        </button>

        <button
          className="btn-reconnect"
          onClick={connect}
          disabled={isConnected}
          title="Reconnect"
        >
          🔄 Reconnect
        </button>
      </div>

      {/* Live Transcript Display */}
      <div className="transcript-display">
        {conversationHistory && (
          <div className="final-transcript">
            {conversationHistory}
          </div>
        )}
        
        {partialTranscript && (
          <div className="partial-transcript">
            <span className="typing-indicator">
              {partialTranscript}
              <span className="cursor">|</span>
            </span>
          </div>
        )}

        {!conversationHistory && !partialTranscript && (
          <div className="empty-transcript">
            {isRecording 
              ? "🎤 Listening... Start speaking to see live transcription"
              : "Click Record to start real-time speech transcription"
            }
          </div>
        )}
      </div>

      {/* Error Display */}
      {connectionError && (
        <div className="error-display">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{connectionError}</span>
        </div>
      )}

      {/* Debug Info (always visible for troubleshooting) */}
      <div className="debug-info">
        <details open>
          <summary>🔍 Debug Info (Click to minimize)</summary>
          <div style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px'}}>
            <div><strong>Connection:</strong> {isConnected ? '�﹢ YES' : '🔴 NO'}</div>
            <div><strong>Recording:</strong> {isRecording ? '�﹢ YES' : '🔴 NO'}</div>
            <div><strong>Partial:</strong> "{partialTranscript}" (length: {partialTranscript.length})</div>
            <div><strong>Conversation:</strong> "{conversationHistory}" (length: {conversationHistory.length})</div>
            <div><strong>Messages Received:</strong> {messageCount}</div>
            <div><strong>Error:</strong> {connectionError || 'None'}</div>
            <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
            <hr style={{margin: '8px 0'}}/>
            <pre style={{fontSize: '10px', margin: 0}}>{JSON.stringify(getStatus(), null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
};

export default RealtimeTranscriber;