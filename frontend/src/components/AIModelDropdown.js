import React, { useState, useEffect } from 'react';
import './MicrophoneSelector.css'; // Reuse the same styles

const AIModelDropdown = ({ disabled = false }) => {
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedAIModel') || 'chatgpt';
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const models = [
    { 
      value: 'chatgpt', 
      label: 'ChatGPT Mini 4.0',
      icon: '🤖'
    },
    { 
      value: 'claude', 
      label: 'Claude 3.5 Sonnet',
      icon: '🧠'
    }
  ];

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('selectedAIModel', newModel);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('aiModelChanged', { 
      detail: { model: newModel } 
    }));
  };

  const getCurrentModelLabel = () => {
    const current = models.find(m => m.value === selectedModel);
    return current ? `${current.icon} ${current.label}` : '🤖 ChatGPT Mini 4.0';
  };

  // Listen for external model changes
  useEffect(() => {
    const handleExternalChange = () => {
      const savedModel = localStorage.getItem('selectedAIModel');
      if (savedModel && savedModel !== selectedModel) {
        setSelectedModel(savedModel);
      }
    };

    window.addEventListener('storage', handleExternalChange);
    return () => window.removeEventListener('storage', handleExternalChange);
  }, [selectedModel]);

  return (
    <div className={`microphone-selector ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="selector-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <label>
            🧠 AI Model
          </label>
          {!isExpanded && (
            <span className="selected-device-preview">: {getCurrentModelLabel()}</span>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="selector-content">
          <select
            id="ai-model-select"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={disabled}
            className="microphone-select"
          >
            {models.map(model => (
              <option key={model.value} value={model.value}>
                {model.icon} {model.label}
              </option>
            ))}
          </select>
          
          <div className="device-count">
            {models.length} AI models available
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelDropdown;