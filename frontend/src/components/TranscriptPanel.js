import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TranscriptPanel.css';
import AudioRecorder from './AudioRecorder';
import MicrophoneSelector from './MicrophoneSelector';
import CameraSelector from './CameraSelector';
import CameraCapture from './CameraCapture';
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
  onMicrophoneSelect,
  // Camera props
  selectedCamera,
  onCameraSelect,
  onPhotoCapture,
  // Role props
  selectedRole,
  currentRoleData,
  rolesConfig,
  onRoleSelect,
  // Q&A history for tracking processed transcripts
  qaHistory = [],
  // Message management props
  onDeleteGroup,
  onMergeGroups
}) => {
  const panelRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  // Debug logs for transcript state updates (only when there's actual content)
  useEffect(() => {
    if (partialTranscript) {
      console.log('🎯 TranscriptPanel: partialTranscript updated:', partialTranscript);
    }
    if (messageHistory && messageHistory.length > 0) {
      console.log('🎯 TranscriptPanel: messageHistory updated:', messageHistory.length, 'messages');
    }
  }, [conversation, partialTranscript, messageHistory]);

  // Helper function to replace all prompt placeholders
  const replacePromptPlaceholders = useCallback((prompt, transcript) => {
    return prompt
      .replace('{transcript}', transcript)
      .replace('{role}', currentRoleData?.name || 'Developer')
      .replace('{technologies}', currentRoleData?.technologies || 'various technologies');
  }, [currentRoleData]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  const [clickedGroupId, setClickedGroupId] = useState(null);
  const [hoverTimeouts, setHoverTimeouts] = useState({});
  const [processedGroups, setProcessedGroups] = useState(new Set());
  
  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentCaptureMessageId, setCurrentCaptureMessageId] = useState(null);
  
  // Text input image attachment state
  const [attachedImage, setAttachedImage] = useState(null);
  const fileInputRef = useRef(null);
  

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

  // Frontend logic: Group messages by 10-second gaps for display
  const groupMessagesByTimeGap = useCallback((messages) => {
    if (!messages || messages.length === 0) return [];
    
    const GAP_THRESHOLD = 10000; // 10 seconds in milliseconds
    const groups = [];
    let currentGroup = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageTime = new Date(message.timestamp).getTime();
      
      if (currentGroup.length === 0) {
        // First message in group
        currentGroup.push(message);
      } else {
        const lastMessage = currentGroup[currentGroup.length - 1];
        const lastTime = new Date(lastMessage.timestamp).getTime();
        const timeDifference = messageTime - lastTime;
        
        if (timeDifference > GAP_THRESHOLD) {
          // Gap is more than 10 seconds, start new group
          groups.push({
            id: `group_${groups.length}`,
            messages: [...currentGroup],
            startTime: currentGroup[0].timestamp,
            endTime: currentGroup[currentGroup.length - 1].timestamp,
            hasTimeGap: groups.length > 0
          });
          currentGroup = [message];
        } else {
          // Gap is less than 10 seconds, add to current group
          currentGroup.push(message);
        }
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        id: `group_${groups.length}`,
        messages: [...currentGroup],
        startTime: currentGroup[0].timestamp,
        endTime: currentGroup[currentGroup.length - 1].timestamp,
        hasTimeGap: groups.length > 0
      });
    }
    
    return groups;
  }, []);

  // Get grouped messages for display
  const messageGroups = groupMessagesByTimeGap(messageHistory);

  // Handle mouse enter with 2-second delay
  const handleMouseEnter = useCallback((groupId, isLatest) => {
    // Latest message group shows buttons immediately
    if (isLatest) {
      setHoveredGroupId(groupId);
      return;
    }

    // For older messages, set a 3-second delay
    const timeoutId = setTimeout(() => {
      setHoveredGroupId(groupId);
    }, 3000);

    setHoverTimeouts(prev => ({
      ...prev,
      [groupId]: timeoutId
    }));
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback((groupId) => {
    // Clear any pending timeout
    if (hoverTimeouts[groupId]) {
      clearTimeout(hoverTimeouts[groupId]);
      setHoverTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[groupId];
        return newTimeouts;
      });
    }

    // Hide buttons unless clicked
    if (clickedGroupId !== groupId) {
      setHoveredGroupId(null);
    }
  }, [hoverTimeouts, clickedGroupId]);

  // Handle double-click to toggle buttons
  const handleDoubleClick = useCallback((groupId, isLatest) => {
    // Latest message always shows buttons, so no need to toggle
    if (isLatest) return;

    if (clickedGroupId === groupId) {
      // Hide buttons
      setClickedGroupId(null);
      setHoveredGroupId(null);
    } else {
      // Show buttons
      setClickedGroupId(groupId);
      setHoveredGroupId(groupId);
    }
  }, [clickedGroupId]);

  // Check if buttons should be visible for a group
  const shouldShowButtons = useCallback((groupId, isLatest) => {
    return isLatest || hoveredGroupId === groupId || clickedGroupId === groupId;
  }, [hoveredGroupId, clickedGroupId]);

  // Check if a group has been automatically processed by comparing with Q&A history
  const isAutoProcessed = useCallback((group) => {
    if (!qaHistory || qaHistory.length === 0) return false;
    
    // Get the combined text from the group
    const groupText = group.messages
      .map(msg => getDisplayText(msg))
      .filter(text => text?.trim())
      .join(' ')
      .trim();
    
    if (!groupText) return false;
    
    // Check if any Q&A entry's question contains or matches this group's text
    return qaHistory.some(qa => {
      if (!qa.question) return false;
      
      // Normalize both texts for comparison (remove extra whitespace, convert to lowercase)
      const normalizedQuestion = qa.question.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedGroupText = groupText.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check if the question contains the group text or vice versa (allowing for some variation)
      return normalizedQuestion.includes(normalizedGroupText) || 
             normalizedGroupText.includes(normalizedQuestion) ||
             // Also check for exact matches
             normalizedQuestion === normalizedGroupText;
    });
  }, [qaHistory]);

  // Handle delete group
  const handleDeleteGroup = useCallback((groupId) => {
    const groupToDelete = messageGroups.find(g => g.id === groupId);
    if (!groupToDelete) return;
    
    // Remove all messages in this group from the message history
    // Since we don't have direct access to setMessageHistory, we need to add this as a prop
    if (onDeleteGroup) {
      onDeleteGroup(groupToDelete.messages.map(msg => msg.id));
    }
  }, [messageGroups]);

  // Handle merge with adjacent group
  const handleMergeGroup = useCallback((groupId, direction) => {
    const currentGroupIndex = messageGroups.findIndex(g => g.id === groupId);
    if (currentGroupIndex === -1) return;
    
    let targetGroupIndex;
    if (direction === 'up' && currentGroupIndex > 0) {
      targetGroupIndex = currentGroupIndex - 1;
    } else if (direction === 'down' && currentGroupIndex < messageGroups.length - 1) {
      targetGroupIndex = currentGroupIndex + 1;
    } else {
      return; // No valid merge target
    }
    
    const currentGroup = messageGroups[currentGroupIndex];
    const targetGroup = messageGroups[targetGroupIndex];
    
    if (onMergeGroups) {
      onMergeGroups(currentGroup.messages.map(msg => msg.id), targetGroup.messages.map(msg => msg.id), direction);
    }
  }, [messageGroups]);

  // Handle camera capture
  const handleCameraCapture = useCallback((groupId) => {
    setCurrentCaptureMessageId(groupId);
    setIsCameraOpen(true);
  }, []);

  // Handle camera capture from text input
  const handleTextInputCameraCapture = useCallback(() => {
    setCurrentCaptureMessageId('text-input'); // Special ID for text input captures
    setIsCameraOpen(true);
  }, []);

  // Handle photo captured
  const handlePhotoCapture = useCallback((photoData) => {
    if (currentCaptureMessageId === 'text-input') {
      // For text input captures, attach the image to the input box
      setAttachedImage({
        file: photoData.blob,
        preview: photoData.url,
        name: `Camera_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`,
        size: photoData.blob.size
      });
    } else if (onPhotoCapture && currentCaptureMessageId) {
      // For message group captures, process immediately as before
      const messageGroup = messageGroups.find(g => g.id === currentCaptureMessageId);
      const contextText = messageGroup ? 
        messageGroup.messages
          .map(msg => getDisplayText(msg))
          .filter(text => text?.trim())
          .join(' ') : '';
      
      onPhotoCapture({
        ...photoData,
        messageId: currentCaptureMessageId,
        contextText: contextText
      });
    }
    setIsCameraOpen(false);
    setCurrentCaptureMessageId(null);
  }, [onPhotoCapture, currentCaptureMessageId, messageGroups, setAttachedImage]);

  // Handle camera modal close
  const handleCameraClose = useCallback(() => {
    setIsCameraOpen(false);
    setCurrentCaptureMessageId(null);
  }, []);

  // Handle image file selection
  const handleImageSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('Image file too large. Please select an image smaller than 10MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedImage({
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file.');
    }
    
    // Clear the input so the same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  // Handle attach image button click
  const handleAttachImageClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle remove attached image
  const handleRemoveAttachedImage = useCallback(() => {
    setAttachedImage(null);
  }, []);

  // Handle text input with image submission
  const handleTextWithImageSubmit = useCallback(async (buttonConfig = null) => {
    if (!textInput.trim() && !attachedImage) {
      return;
    }

    if (attachedImage) {
      // Convert file to base64 for API call
      const base64 = attachedImage.preview.split(',')[1];
      
      // Create vision prompt
      const visionPrompt = textInput.trim() || 'Please analyze this image and describe what you see in detail.';
      
      const photoData = {
        blob: attachedImage.file,
        url: attachedImage.preview,
        width: 0, // Will be set by image load
        height: 0, // Will be set by image load
        timestamp: new Date().toISOString(),
        messageId: 'text-input-with-image',
        contextText: visionPrompt
      };

      // Call the photo capture handler which will handle the API call
      onPhotoCapture(photoData);
      
      // Clear the text input and attached image
      onTextInputChange({ target: { value: '' } });
      setAttachedImage(null);
    } else if (buttonConfig && textInput.trim()) {
      // Regular text-only submission
      const customPrompt = replacePromptPlaceholders(buttonConfig.prompt, textInput);
      onAskAI(customPrompt);
    }
  }, [textInput, attachedImage, onPhotoCapture, onTextInputChange, onAskAI, replacePromptPlaceholders]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverTimeouts).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
  }, [hoverTimeouts]);

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

            {/* Camera Selector */}
            <CameraSelector
              selectedDeviceId={selectedCamera}
              onDeviceSelect={onCameraSelect}
              disabled={false}
              showRefresh={true}
            />

            {/* Role Selector */}
            <div className="settings-section">
              <h4>🎯 Interview Role</h4>
              <div className="role-dropdown-container">
                <select
                  className="role-dropdown"
                  value={selectedRole}
                  onChange={(e) => onRoleSelect(e.target.value)}
                >
                  {rolesConfig?.roles ? rolesConfig.roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  )) : (
                    <option value="frontend">Loading roles...</option>
                  )}
                </select>
              </div>
              {currentRoleData && (
                <div className="technologies-display">
                  <h5>📚 Technologies:</h5>
                  <p>{currentRoleData.technologies}</p>
                </div>
              )}
            </div>
            
            <div className="settings-info">
              <p>💡 Zero wake-up delay with continuous session management</p>
              <p>🎤 Enhanced noise suppression active</p>
              <p>🔇 Confidence filtering prevents random words</p>
              <p>📡 Keep-alive chunks maintain session during silence</p>
              <p>📷 Camera integration with GPT-4 Vision for image analysis</p>
            </div>
          </div>
        )}
        
        
        {/* Text Input Section */}
        <div className="text-input-section">
          {/* Image Preview */}
          {attachedImage && (
            <div className="attached-image-preview">
              <div className="image-preview-container">
                <img 
                  src={attachedImage.preview} 
                  alt={attachedImage.name}
                  className="preview-image"
                />
                <div className="image-info">
                  <span className="image-name">{attachedImage.name}</span>
                  <span className="image-size">{Math.round(attachedImage.size / 1024)}KB</span>
                </div>
                <button 
                  onClick={handleRemoveAttachedImage}
                  className="remove-image-btn"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="text-input-form">
            <input
              type="text"
              value={textInput}
              onChange={onTextInputChange}
              placeholder={attachedImage ? "Ask a question about this image..." : "Type your question here (e.g., 'What are Angular pipes?')"}
              className="text-input-field"
              disabled={isLoadingAI}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (textInput.trim() || attachedImage) && !isLoadingAI) {
                  e.preventDefault();
                  if (attachedImage) {
                    // Handle image + text submission
                    handleTextWithImageSubmit();
                  } else {
                    // Regular text submission
                    const firstButton = buttonConfig[0];
                    handleTextWithImageSubmit(firstButton);
                  }
                }
              }}
            />
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            
            {/* Inline Action Buttons */}
            <div className="text-input-actions">
              {/* Camera capture button for text input - now attaches to input */}
              <button 
                onClick={handleTextInputCameraCapture}
                className="btn-icon-only btn-icon-camera"
                disabled={isLoadingAI}
                title="📷 Capture Photo - Take a photo and attach it to input box"
              >
                📷
              </button>
              
              {!attachedImage ? (
                // Regular text-only buttons
                <>
                  {buttonConfig.map((button) => {
                    const handleQuickAction = () => {
                      if (textInput.trim()) {
                        handleTextWithImageSubmit(button);
                      }
                    };

                    return (
                      <button 
                        key={button.id}
                        onClick={handleQuickAction}
                        className={`btn-icon-only ${button.id === '100' ? 'btn-icon-primary' : 'btn-icon-secondary'}`}
                        disabled={!textInput.trim() || isLoadingAI}
                        title={`${button.icon} ${button.label} - ${button.description}${button.id === '100' ? ' (Press Enter)' : ''}`}
                      >
                        {button.icon}
                      </button>
                    );
                  })}
                </>
              ) : (
                // Image analysis button when image is attached
                <button 
                  onClick={() => handleTextWithImageSubmit()}
                  className="btn-icon-only btn-icon-primary"
                  disabled={isLoadingAI}
                  title="🔍 Analyze Image - Send image with text for AI analysis (Press Enter)"
                >
                  🔍
                </button>
              )}
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
            {messageGroups.map((group, groupIndex) => {
              const isLatest = groupIndex === messageGroups.length - 1;
              const showButtons = shouldShowButtons(group.id, isLatest);
              const isManuallyProcessed = processedGroups.has(group.id);
              const isAutomaticallyProcessed = isAutoProcessed(group);
              const isProcessed = isManuallyProcessed || isAutomaticallyProcessed;
              const canMergeUp = groupIndex > 0;
              const canMergeDown = groupIndex < messageGroups.length - 1;
              
              return (
                <div key={group.id} className="message-group">
                  {/* Render all messages in this group as a single combined block */}
                  <div 
                    className={`message-block ${isLatest ? 'latest-message' : 'older-message'} final-message ${isProcessed ? 'processed-transcript' : 'unprocessed-transcript'}`}
                    onMouseEnter={() => handleMouseEnter(group.id, isLatest)}
                    onMouseLeave={() => handleMouseLeave(group.id)}
                    onDoubleClick={() => handleDoubleClick(group.id, isLatest)}
                  >
                    {/* Message Management Icons */}
                    <div className="message-management-icons">
                      {/* Delete icon */}
                      <button 
                        className="message-icon-btn delete-btn"
                        onClick={() => handleDeleteGroup(group.id)}
                        title="Delete this message group"
                      >
                        🗑️
                      </button>
                      
                      {/* Merge icons */}
                      {canMergeUp && (
                        <button 
                          className="message-icon-btn merge-btn"
                          onClick={() => handleMergeGroup(group.id, 'up')}
                          title="Add current message to end of previous message"
                        >
                          ⬆️
                        </button>
                      )}
                      {canMergeDown && (
                        <button 
                          className="message-icon-btn merge-btn"
                          onClick={() => handleMergeGroup(group.id, 'down')}
                          title="Add current message to beginning of next message"
                        >
                          ⬇️
                        </button>
                      )}
                    </div>

                  <div className="message-content">
                    <div className="message-text-content">
                      {group.messages.map((message, messageIndex) => {
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
                          <span key={message.id} className="message-segment">
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
                              <span onClick={() => handleMessageClick(message.id, displayText)} title="Click to edit">
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
                                  <span className="message-text-static">
                                    {displayText}
                                    {messageIndex < group.messages.length - 1 ? ' ' : ''}
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                  
                  {/* Show actions for the entire group */}
                  {group.messages.some(msg => getDisplayText(msg)?.trim()) && (
                    <div className={`message-actions ${showButtons ? 'always-visible' : 'hover-visible'}`}>
                      {buttonConfig.map((button) => {
                        const handleButtonClick = () => {
                          // Combine all text from the group
                          const combinedText = group.messages
                            .map(msg => getDisplayText(msg))
                            .filter(text => text?.trim())
                            .join(' ');
                          const customPrompt = replacePromptPlaceholders(button.prompt, combinedText);
                          
                          // Mark this group as processed
                          setProcessedGroups(prev => new Set([...prev, group.id]));
                          
                          onAskAI(customPrompt);
                        };

                        return (
                          <button 
                            key={button.id}
                            onClick={handleButtonClick}
                            className={`btn-icon-only ${button.id === '100' ? 'btn-icon-primary' : 'btn-icon-secondary'}`}
                            disabled={isProcessing || !group.messages.some(msg => getDisplayText(msg)?.trim())}
                            title={`${button.icon} ${button.label} - ${button.description}`}
                          >
                            {button.icon}
                          </button>
                        );
                      })}
                      
                      {/* Camera capture button */}
                      <button 
                        onClick={() => handleCameraCapture(group.id)}
                        className="btn-icon-only btn-icon-camera"
                        disabled={isProcessing || !group.messages.some(msg => getDisplayText(msg)?.trim())}
                        title="📷 Capture Photo - Take a photo and analyze it with AI"
                      >
                        📷
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
            
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

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={handleCameraClose}
        selectedCameraId={selectedCamera}
        onPhotoCapture={handlePhotoCapture}
        onCodeAnalysis={onPhotoCapture} // Use same handler for code analysis
        messageId={currentCaptureMessageId}
      />
    </div>
  );
};

export default TranscriptPanel;