import React, { useState, useEffect } from 'react';
import './PerformanceMonitor.css';

const PerformanceMonitor = ({ metrics, metricsHistory, isMinimized = false, onToggleMinimize }) => {
  const [selectedTab, setSelectedTab] = useState('latency');
  const [showDetails, setShowDetails] = useState(false);

  // Get status color based on latency
  const getLatencyColor = (latency) => {
    if (latency < 100) return '#27ae60'; // Green - excellent
    if (latency < 300) return '#f39c12'; // Orange - good
    if (latency < 500) return '#e67e22'; // Dark orange - acceptable
    return '#e74c3c'; // Red - poor
  };

  // Get status color based on audio quality
  const getAudioQualityColor = (snr) => {
    if (snr > 20) return '#27ae60'; // Excellent
    if (snr > 10) return '#f39c12'; // Good
    if (snr > 5) return '#e67e22'; // Fair
    return '#e74c3c'; // Poor
  };

  // Calculate latency trend
  const getLatencyTrend = () => {
    if (metricsHistory.length < 2) return 'stable';
    const recent = metricsHistory.slice(-5);
    const avgRecent = recent.reduce((sum, m) => sum + m.endToEndLatency, 0) / recent.length;
    const avgPrevious = metricsHistory.slice(-10, -5).reduce((sum, m) => sum + m.endToEndLatency, 0) / 5;
    
    if (avgRecent < avgPrevious * 0.9) return 'improving';
    if (avgRecent > avgPrevious * 1.1) return 'degrading';
    return 'stable';
  };

  // Mini sparkline chart
  const renderSparkline = (data, key, color) => {
    if (!data || data.length === 0) return null;
    
    const values = data.slice(-20).map(d => d[key]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    const points = values.map((val, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width="100" height="30" className="sparkline">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  if (isMinimized) {
    return (
      <div className="performance-monitor-mini">
        <div className="mini-header" onClick={onToggleMinimize}>
          <span className="mini-title">📊 Performance</span>
          <span 
            className="latency-badge"
            style={{ backgroundColor: getLatencyColor(metrics.endToEndLatency) }}
          >
            {metrics.endToEndLatency}ms
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h3>📊 Performance Monitor</h3>
        <div className="header-actions">
          <button 
            className="btn-icon-small"
            onClick={() => setShowDetails(!showDetails)}
            title="Toggle details"
          >
            {showDetails ? '📉' : '📈'}
          </button>
          <button 
            className="btn-icon-small"
            onClick={onToggleMinimize}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-label">Latency</span>
          <span 
            className="stat-value"
            style={{ color: getLatencyColor(metrics.endToEndLatency) }}
          >
            {metrics.endToEndLatency}ms
          </span>
          <span className={`trend trend-${getLatencyTrend()}`}>
            {getLatencyTrend() === 'improving' ? '↓' : 
             getLatencyTrend() === 'degrading' ? '↑' : '→'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">WPM</span>
          <span className="stat-value">{metrics.wordsPerMinute}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Audio</span>
          <span 
            className="stat-value"
            style={{ color: getAudioQualityColor(metrics.signalToNoiseRatio) }}
          >
            {metrics.signalToNoiseRatio.toFixed(0)}dB
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{metrics.accuracyScore}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="monitor-tabs">
        <button 
          className={`tab ${selectedTab === 'latency' ? 'active' : ''}`}
          onClick={() => setSelectedTab('latency')}
        >
          Latency
        </button>
        <button 
          className={`tab ${selectedTab === 'audio' ? 'active' : ''}`}
          onClick={() => setSelectedTab('audio')}
        >
          Audio
        </button>
        <button 
          className={`tab ${selectedTab === 'transcription' ? 'active' : ''}`}
          onClick={() => setSelectedTab('transcription')}
        >
          Transcription
        </button>
        <button 
          className={`tab ${selectedTab === 'network' ? 'active' : ''}`}
          onClick={() => setSelectedTab('network')}
        >
          Network
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'latency' && (
          <div className="latency-panel">
            <div className="metric-row">
              <span className="metric-label">Audio Processing:</span>
              <span className="metric-value">{metrics.audioLatency}ms</span>
              {showDetails && renderSparkline(metricsHistory, 'audioLatency', '#3498db')}
            </div>
            <div className="metric-row">
              <span className="metric-label">Transcription:</span>
              <span className="metric-value">{metrics.transcriptionLatency}ms</span>
              {showDetails && renderSparkline(metricsHistory, 'transcriptionLatency', '#9b59b6')}
            </div>
            <div className="metric-row">
              <span className="metric-label">AI Response:</span>
              <span className="metric-value">{metrics.aiResponseLatency}ms</span>
              {showDetails && renderSparkline(metricsHistory, 'aiResponseLatency', '#e67e22')}
            </div>
            <div className="metric-row total">
              <span className="metric-label">End-to-End:</span>
              <span className="metric-value">{metrics.endToEndLatency}ms</span>
              {showDetails && renderSparkline(metricsHistory, 'endToEndLatency', getLatencyColor(metrics.endToEndLatency))}
            </div>
          </div>
        )}

        {selectedTab === 'audio' && (
          <div className="audio-panel">
            <div className="metric-row">
              <span className="metric-label">Sample Rate:</span>
              <span className="metric-value">{metrics.audioSampleRate / 1000}kHz</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Volume Level:</span>
              <span className="metric-value">{metrics.audioVolume.toFixed(1)}dB</span>
              <div className="volume-bar">
                <div 
                  className="volume-fill"
                  style={{ 
                    width: `${Math.max(0, (60 + metrics.audioVolume) / 60 * 100)}%`,
                    backgroundColor: metrics.audioVolume > -20 ? '#27ae60' : '#f39c12'
                  }}
                />
              </div>
            </div>
            <div className="metric-row">
              <span className="metric-label">Noise Floor:</span>
              <span className="metric-value">{metrics.noiseLevelDb.toFixed(1)}dB</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Signal/Noise:</span>
              <span 
                className="metric-value"
                style={{ color: getAudioQualityColor(metrics.signalToNoiseRatio) }}
              >
                {metrics.signalToNoiseRatio.toFixed(1)}dB
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Dropouts:</span>
              <span className="metric-value">{metrics.audioDropouts}</span>
            </div>
          </div>
        )}

        {selectedTab === 'transcription' && (
          <div className="transcription-panel">
            <div className="metric-row">
              <span className="metric-label">Words/Minute:</span>
              <span className="metric-value">{metrics.wordsPerMinute}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Chars/Second:</span>
              <span className="metric-value">{metrics.charactersPerSecond}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Partial Updates:</span>
              <span className="metric-value">{metrics.partialUpdatesCount}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Final Transcripts:</span>
              <span className="metric-value">{metrics.finalTranscriptsCount}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Accuracy Score:</span>
              <span 
                className="metric-value"
                style={{ 
                  color: metrics.accuracyScore > 90 ? '#27ae60' : 
                         metrics.accuracyScore > 70 ? '#f39c12' : '#e74c3c'
                }}
              >
                {metrics.accuracyScore}%
              </span>
            </div>
          </div>
        )}

        {selectedTab === 'network' && (
          <div className="network-panel">
            <div className="metric-row">
              <span className="metric-label">WebSocket Ping:</span>
              <span className="metric-value">{metrics.websocketPing}ms</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Reconnections:</span>
              <span className="metric-value">{metrics.websocketReconnects}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">API Latency:</span>
              <span className="metric-value">{metrics.httpApiLatency}ms</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Network Errors:</span>
              <span 
                className="metric-value"
                style={{ color: metrics.networkErrors > 0 ? '#e74c3c' : '#27ae60' }}
              >
                {metrics.networkErrors}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Session Info */}
      {showDetails && (
        <div className="session-info">
          <div className="info-row">
            <span>Session Duration:</span>
            <span>{Math.floor(metrics.sessionDuration / 60)}:{(metrics.sessionDuration % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="info-row">
            <span>Memory Usage:</span>
            <span>{metrics.memoryUsage}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;