import React, { useState } from 'react';
import './VADSettings.css';

const VADSettings = ({ 
  sensitivity, 
  onSensitivityChange, 
  vadStats,
  disabled = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sensitivities = [
    { value: 'low', label: 'Low', description: 'More permissive - may capture noise' },
    { value: 'medium', label: 'Medium', description: 'Balanced detection' },
    { value: 'high', label: 'High', description: 'Strict - filters most noise' },
    { value: 'very-high', label: 'Very High', description: 'Very strict - only clear speech' }
  ];

  const handleSensitivityChange = (e) => {
    onSensitivityChange(e.target.value);
  };

  // Get current sensitivity label
  const getCurrentSensitivityLabel = () => {
    const current = sensitivities.find(s => s.value === sensitivity);
    return current ? current.label : 'High';
  };

  return (
    <div className={`vad-settings ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="vad-settings-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <h3>🎚️ Voice Detection Sensitivity</h3>
          {!isExpanded && (
            <span className="current-sensitivity">: {getCurrentSensitivityLabel()}</span>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="vad-content">
          <div className="sensitivity-selector">
            {sensitivities.map((sens) => (
              <label 
                key={sens.value} 
                className={`sensitivity-option ${sensitivity === sens.value ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="sensitivity"
                  value={sens.value}
                  checked={sensitivity === sens.value}
                  onChange={handleSensitivityChange}
                  disabled={disabled}
                />
                <div className="sensitivity-label">
                  <span className="sensitivity-name">{sens.label}</span>
                  <span className="sensitivity-description">{sens.description}</span>
                </div>
              </label>
            ))}
          </div>
          
          <div className="vad-info">
            <div className="vad-info-item">
              <span className="info-label">Current Noise Floor:</span>
              <span className="info-value">{(vadStats.noiseFloor * 100).toFixed(1)}%</span>
            </div>
            <div className="vad-info-item">
              <span className="info-label">Voice Threshold:</span>
              <span className="info-value">{(vadStats.voiceThreshold * 100).toFixed(1)}%</span>
            </div>
            <div className="vad-info-item">
              <span className="info-label">Detection Rate:</span>
              <span className="info-value">
                {vadStats.chunksProcessed > 0 
                  ? Math.round((vadStats.chunksProcessed / (vadStats.chunksProcessed + vadStats.chunksSkipped)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          
          <div className="vad-tips">
            <p className="tip">
              💡 <strong>Tip:</strong> If too much noise is being transcribed, increase sensitivity. 
              If speech is being missed, decrease sensitivity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VADSettings;