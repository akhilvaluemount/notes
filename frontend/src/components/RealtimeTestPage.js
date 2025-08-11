import React, { useState } from 'react';
import RealtimeTranscriber from './RealtimeTranscriber';
import './RealtimeTestPage.css';

const RealtimeTestPage = () => {
  const [transcriptData, setTranscriptData] = useState({
    partial: '',
    final: '',
    conversation: '',
    isRecording: false,
    isConnected: false
  });
  const [error, setError] = useState(null);

  const handleTranscriptUpdate = (data) => {
    setTranscriptData(data);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  return (
    <div className="realtime-test-page">
      <div className="test-header">
        <h1>🚀 AssemblyAI Realtime API Transcription Test</h1>
        <p>This demonstrates continuous speech-to-text with sub-second latency</p>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      <div className="test-content">
        {/* Realtime Transcriber Component */}
        <div className="transcriber-section">
          <h2>Real-time Transcriber</h2>
          <RealtimeTranscriber
            onTranscriptUpdate={handleTranscriptUpdate}
            onError={handleError}
            className="main-transcriber"
          />
        </div>

        {/* Live Data Display */}
        <div className="data-display">
          <h2>Live Transcript Data</h2>
          
          <div className="data-sections">
            <div className="data-section">
              <h3>📝 Partial (Live)</h3>
              <div className="data-content partial-data">
                {transcriptData.partial || (
                  <span className="empty-state">Start speaking to see live text appear...</span>
                )}
                {transcriptData.partial && <span className="live-cursor">|</span>}
              </div>
            </div>

            <div className="data-section">
              <h3>✅ Final (Last Complete)</h3>
              <div className="data-content final-data">
                {transcriptData.final || (
                  <span className="empty-state">Complete sentences will appear here</span>
                )}
              </div>
            </div>

            <div className="data-section">
              <h3>💬 Full Conversation</h3>
              <div className="data-content conversation-data">
                {transcriptData.conversation || (
                  <span className="empty-state">Complete conversation history will build up here</span>
                )}
              </div>
              <div className="conversation-stats">
                {transcriptData.conversation && (
                  <>
                    <span>📊 Words: {transcriptData.conversation.split(' ').length}</span>
                    <span>📏 Characters: {transcriptData.conversation.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="status-section">
          <h2>📡 Connection Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">WebSocket</span>
              <span className={`status-value ${transcriptData.isConnected ? 'connected' : 'disconnected'}`}>
                {transcriptData.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Recording</span>
              <span className={`status-value ${transcriptData.isRecording ? 'active' : 'inactive'}`}>
                {transcriptData.isRecording ? '🎤 Recording' : '⏸️ Stopped'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Latency</span>
              <span className="status-value">⚡ ~500ms</span>
            </div>
            <div className="status-item">
              <span className="status-label">Model</span>
              <span className="status-value">🤖 gpt-4o-mini-transcribe</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions-section">
          <h2>📖 How to Test</h2>
          <ol>
            <li><strong>Click "Record"</strong> to start real-time transcription</li>
            <li><strong>Speak clearly</strong> into your microphone</li>
            <li><strong>Watch the magic:</strong>
              <ul>
                <li>Words appear in real-time as you speak (Partial section)</li>
                <li>Complete sentences are finalized (Final section)</li>
                <li>Full conversation builds up over time</li>
              </ul>
            </li>
            <li><strong>Try technical terms:</strong> "React", "useState", "TypeScript", "components"</li>
            <li><strong>Test natural speech:</strong> Pause, continue, speak at different speeds</li>
          </ol>
        </div>

        {/* Comparison */}
        <div className="comparison-section">
          <h2>🆚 Chunked vs Realtime Comparison</h2>
          <div className="comparison-grid">
            <div className="comparison-item old-system">
              <h3>❌ Old Chunked System</h3>
              <ul>
                <li>⏱️ 3-6 second delays</li>
                <li>✂️ Words cut off at boundaries</li>
                <li>📦 Processes in chunks</li>
                <li>🔄 Manual deduplication needed</li>
                <li>🐌 Chunky user experience</li>
              </ul>
            </div>
            <div className="comparison-item new-system">
              <h3>✅ New Realtime System</h3>
              <ul>
                <li>⚡ ~500ms latency</li>
                <li>🎯 No word cutting</li>
                <li>🌊 Continuous streaming</li>
                <li>🤖 Built-in context awareness</li>
                <li>✨ Smooth live experience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTestPage;