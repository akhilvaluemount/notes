import React, { useState, useEffect } from 'react';
import './MicrophoneSelector.css';

const MicrophoneSelector = ({ 
  selectedDeviceId, 
  onDeviceSelect, 
  disabled = false,
  showRefresh = true 
}) => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get list of audio input devices
  const getAudioDevices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First request permission if not already granted
      if (!hasPermission) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately as we just needed permission
          stream.getTracks().forEach(track => track.stop());
          setHasPermission(true);
        } catch (err) {
          console.error('Microphone permission denied:', err);
          setError('Microphone permission required');
          setIsLoading(false);
          return;
        }
      }

      // Get all devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio input devices
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      // Format device list
      const formattedDevices = audioInputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
        groupId: device.groupId
      }));
      
      setDevices(formattedDevices);
      
      // If no device is selected and we have devices, select the first one
      if (!selectedDeviceId && formattedDevices.length > 0) {
        onDeviceSelect(formattedDevices[0].deviceId);
      }
      
      console.log('Found audio devices:', formattedDevices);
    } catch (err) {
      console.error('Error getting audio devices:', err);
      setError('Failed to get microphone list');
    } finally {
      setIsLoading(false);
    }
  };

  // Load devices on mount
  useEffect(() => {
    getAudioDevices();
  }, []);

  // Listen for device changes (when devices are plugged in/unplugged)
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('Audio devices changed, refreshing list...');
      getAudioDevices();
    };

    // Add event listener for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [hasPermission]);

  const handleDeviceChange = (event) => {
    const newDeviceId = event.target.value;
    onDeviceSelect(newDeviceId);
    console.log('Selected microphone:', newDeviceId);
  };

  const handleRefresh = () => {
    getAudioDevices();
  };

  if (error && !hasPermission) {
    return (
      <div className="microphone-selector error-state">
        <span className="error-message">🎤 {error}</span>
        <button 
          onClick={getAudioDevices} 
          className="btn-request-permission"
          disabled={isLoading}
        >
          Grant Permission
        </button>
      </div>
    );
  }

  // Get selected device name
  const getSelectedDeviceName = () => {
    const device = devices.find(d => d.deviceId === selectedDeviceId);
    return device ? device.label : 'No microphone selected';
  };

  return (
    <div className={`microphone-selector ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="selector-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <label>
            🎤 Microphone
          </label>
          {!isExpanded && selectedDeviceId && (
            <span className="selected-device-preview">: {getSelectedDeviceName()}</span>
          )}
        </div>
        {showRefresh && isExpanded && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }} 
            className="btn-refresh"
            disabled={isLoading || disabled}
            title="Refresh device list"
          >
            🔄
          </button>
        )}
      </div>
      
      {isExpanded && (
        <div className="selector-content">
          {isLoading ? (
            <div className="loading-state">Detecting microphones...</div>
          ) : devices.length === 0 ? (
            <div className="empty-state">No microphones detected</div>
          ) : (
            <select
              id="microphone-select"
              value={selectedDeviceId || ''}
              onChange={handleDeviceChange}
              disabled={disabled}
              className="microphone-select"
            >
              {!selectedDeviceId && (
                <option value="">Select a microphone</option>
              )}
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          )}
          
          {error && hasPermission && (
            <div className="error-hint">{error}</div>
          )}
          
          {devices.length > 0 && (
            <div className="device-count">
              {devices.length} microphone{devices.length !== 1 ? 's' : ''} available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MicrophoneSelector;