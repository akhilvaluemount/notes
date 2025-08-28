import React, { useRef, useEffect, useState, useCallback } from 'react';
import './CameraCapture.css';
import buttonConfig, { BUTTON_IDS } from '../config/buttonConfig';

const CameraCapture = ({ 
  isOpen, 
  onClose, 
  selectedCameraId, 
  onPhotoCapture,
  onCodeAnalysis, // New prop for code analysis
  messageId = null // Associated message ID for context
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [videoConstraints, setVideoConstraints] = useState({
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 }
  });
  
  // Selection/crop state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  
  const videoContainerRef = useRef(null);
  const selectionOverlayRef = useRef(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(false);

      const constraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: videoConstraints.width,
          height: videoConstraints.height,
          facingMode: selectedCameraId ? undefined : 'user'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          const video = videoRef.current;
          console.log(`🎥 Camera stream started: ${video.videoWidth}x${video.videoHeight}`);
          console.log(`📺 Video element size: ${video.clientWidth}x${video.clientHeight}`);
          setIsStreaming(true);
        };
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError(`Failed to start camera: ${err.message}`);
    }
  }, [selectedCameraId, videoConstraints]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  }, []);

  // Get video element dimensions and position
  const getVideoRect = useCallback(() => {
    if (!videoRef.current) return null;
    return videoRef.current.getBoundingClientRect();
  }, []);

  // Convert screen coordinates to video coordinates
  const screenToVideoCoords = useCallback((screenX, screenY) => {
    const videoRect = getVideoRect();
    const video = videoRef.current;
    
    if (!videoRect || !video) return { x: 0, y: 0 };
    
    const scaleX = video.videoWidth / videoRect.width;
    const scaleY = video.videoHeight / videoRect.height;
    
    return {
      x: (screenX - videoRect.left) * scaleX,
      y: (screenY - videoRect.top) * scaleY
    };
  }, [getVideoRect]);

  // Convert video coordinates to screen coordinates
  const videoToScreenCoords = useCallback((videoX, videoY) => {
    const videoRect = getVideoRect();
    const video = videoRef.current;
    
    if (!videoRect || !video) return { x: 0, y: 0 };
    
    const scaleX = videoRect.width / video.videoWidth;
    const scaleY = videoRect.height / video.videoHeight;
    
    return {
      x: videoX * scaleX + videoRect.left,
      y: videoY * scaleY + videoRect.top
    };
  }, [getVideoRect]);

  // Handle mouse down on video for selection
  const handleMouseDown = useCallback((e) => {
    if (!isSelectionMode || capturedPhoto) return;
    
    e.preventDefault();
    const coords = screenToVideoCoords(e.clientX, e.clientY);
    
    // Check if clicking on existing selection handles
    if (selection && isPointInSelection(coords.x, coords.y, selection)) {
      const handle = getResizeHandle(coords.x, coords.y, selection);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart(coords);
        return;
      }
      // If clicking inside selection, start moving
      setIsResizing(true);
      setResizeHandle('move');
      setDragStart(coords);
      return;
    }
    
    // Start new selection
    setIsSelecting(true);
    setDragStart(coords);
    setSelection({
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0
    });
  }, [isSelectionMode, capturedPhoto, selection, screenToVideoCoords]);

  // Handle mouse move for selection
  const handleMouseMove = useCallback((e) => {
    if (!isSelectionMode || capturedPhoto) return;
    
    const coords = screenToVideoCoords(e.clientX, e.clientY);
    
    if (isSelecting && dragStart) {
      // Update selection size
      const width = coords.x - dragStart.x;
      const height = coords.y - dragStart.y;
      
      setSelection({
        x: width < 0 ? coords.x : dragStart.x,
        y: height < 0 ? coords.y : dragStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } else if (isResizing && dragStart && selection) {
      // Handle resizing or moving
      updateSelection(coords, dragStart, selection, resizeHandle);
    }
  }, [isSelectionMode, capturedPhoto, isSelecting, isResizing, dragStart, selection, resizeHandle, screenToVideoCoords]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setIsResizing(false);
    setDragStart(null);
    setResizeHandle(null);
  }, []);

  // Helper functions for selection manipulation
  const isPointInSelection = useCallback((x, y, sel) => {
    return x >= sel.x && x <= sel.x + sel.width && y >= sel.y && y <= sel.y + sel.height;
  }, []);

  const getResizeHandle = useCallback((x, y, sel) => {
    const handleSize = 10; // Handle size in video coordinates
    const handles = {
      'nw': { x: sel.x, y: sel.y },
      'ne': { x: sel.x + sel.width, y: sel.y },
      'sw': { x: sel.x, y: sel.y + sel.height },
      'se': { x: sel.x + sel.width, y: sel.y + sel.height },
      'n': { x: sel.x + sel.width / 2, y: sel.y },
      's': { x: sel.x + sel.width / 2, y: sel.y + sel.height },
      'w': { x: sel.x, y: sel.y + sel.height / 2 },
      'e': { x: sel.x + sel.width, y: sel.y + sel.height / 2 }
    };
    
    for (const [handle, pos] of Object.entries(handles)) {
      if (Math.abs(x - pos.x) <= handleSize && Math.abs(y - pos.y) <= handleSize) {
        return handle;
      }
    }
    return null;
  }, []);

  const updateSelection = useCallback((currentCoords, startCoords, currentSelection, handle) => {
    const dx = currentCoords.x - startCoords.x;
    const dy = currentCoords.y - startCoords.y;
    
    let newSelection = { ...currentSelection };
    
    switch (handle) {
      case 'move':
        newSelection.x += dx;
        newSelection.y += dy;
        break;
      case 'nw':
        newSelection.x += dx;
        newSelection.y += dy;
        newSelection.width -= dx;
        newSelection.height -= dy;
        break;
      case 'ne':
        newSelection.y += dy;
        newSelection.width += dx;
        newSelection.height -= dy;
        break;
      case 'sw':
        newSelection.x += dx;
        newSelection.width -= dx;
        newSelection.height += dy;
        break;
      case 'se':
        newSelection.width += dx;
        newSelection.height += dy;
        break;
      case 'n':
        newSelection.y += dy;
        newSelection.height -= dy;
        break;
      case 's':
        newSelection.height += dy;
        break;
      case 'w':
        newSelection.x += dx;
        newSelection.width -= dx;
        break;
      case 'e':
        newSelection.width += dx;
        break;
    }
    
    // Ensure positive dimensions
    if (newSelection.width < 0) {
      newSelection.x += newSelection.width;
      newSelection.width = -newSelection.width;
    }
    if (newSelection.height < 0) {
      newSelection.y += newSelection.height;
      newSelection.height = -newSelection.height;
    }
    
    setSelection(newSelection);
    setDragStart(currentCoords);
  }, []);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode);
    setSelection(null);
  }, [isSelectionMode]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      console.error('Video or canvas not ready for capture');
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (isSelectionMode && selection && selection.width > 0 && selection.height > 0) {
        // Capture only the selected area
        canvas.width = selection.width;
        canvas.height = selection.height;

        // Draw only the selected portion
        context.drawImage(
          video,
          selection.x, selection.y, selection.width, selection.height, // Source rectangle
          0, 0, selection.width, selection.height // Destination rectangle
        );

        console.log('Capturing cropped area:', selection);
      } else {
        // Capture full video frame
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const photoUrl = URL.createObjectURL(blob);
          const photoData = {
            blob,
            url: photoUrl,
            width: canvas.width,
            height: canvas.height,
            timestamp: new Date().toISOString(),
            messageId: messageId,
            isCropped: isSelectionMode && selection && selection.width > 0 && selection.height > 0,
            originalSelection: selection
          };
          
          setCapturedPhoto(photoData);
          console.log('Photo captured successfully:', photoData);
        } else {
          setError('Failed to create photo blob');
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error('Error capturing photo:', err);
      setError(`Failed to capture photo: ${err.message}`);
      setIsCapturing(false);
    }
  }, [isStreaming, messageId, isSelectionMode, selection]);

  // Send captured photo
  const sendPhoto = useCallback(() => {
    if (capturedPhoto && onPhotoCapture) {
      onPhotoCapture(capturedPhoto);
      setCapturedPhoto(null);
      onClose();
    }
  }, [capturedPhoto, onPhotoCapture, onClose]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
      setCapturedPhoto(null);
    }
  }, [capturedPhoto]);

  // Handle code analysis with specific prompts
  const handleCodeAnalysis = useCallback((buttonId) => {
    if (!capturedPhoto || !onCodeAnalysis) return;
    
    const button = buttonConfig.find(btn => btn.id === buttonId);
    if (!button) return;
    
    onCodeAnalysis({
      ...capturedPhoto,
      prompt: button.prompt,
      messageId: messageId
    });
    
    setCapturedPhoto(null);
    onClose();
  }, [capturedPhoto, onCodeAnalysis, messageId, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    // Clean up captured photo
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
      setCapturedPhoto(null);
    }
    
    // Stop camera
    stopCamera();
    
    // Close modal
    onClose();
  }, [capturedPhoto, stopCamera, onClose]);

  // Add mouse event listeners when in selection mode
  useEffect(() => {
    if (!isSelectionMode) return;

    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelectionMode, handleMouseMove, handleMouseUp]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
      // Automatically enable selection mode when camera opens
      setIsSelectionMode(true);
      setSelection(null);
    } else {
      stopCamera();
      // Reset selection mode when closing
      setIsSelectionMode(false);
      setSelection(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto.url);
      }
      stopCamera();
    };
  }, [capturedPhoto, stopCamera]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="camera-capture-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="camera-capture-modal">
        <div className="camera-header">
          <h3>📷 Camera Capture</h3>
          <button className="close-btn" onClick={handleClose} title="Close">
            ✕
          </button>
        </div>

        <div className="camera-content">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} className="error-dismiss">✕</button>
            </div>
          )}

          {!capturedPhoto ? (
            // Live camera view
            <div 
              ref={videoContainerRef}
              className="camera-preview"
              onMouseDown={handleMouseDown}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`video-preview ${!isStreaming ? 'loading' : ''}`}
                style={{ pointerEvents: isSelectionMode ? 'none' : 'auto' }}
              />
              
              {/* Selection Overlay */}
              {isSelectionMode && isStreaming && (
                <div 
                  ref={selectionOverlayRef}
                  className="selection-overlay"
                >
                  {selection && (
                    <div 
                      className="selection-box"
                      style={{
                        left: `${(selection.x / videoRef.current?.videoWidth || 1) * 100}%`,
                        top: `${(selection.y / videoRef.current?.videoHeight || 1) * 100}%`,
                        width: `${(selection.width / videoRef.current?.videoWidth || 1) * 100}%`,
                        height: `${(selection.height / videoRef.current?.videoHeight || 1) * 100}%`,
                      }}
                    >
                      {/* Resize handles */}
                      <div className="resize-handle nw-resize" data-handle="nw"></div>
                      <div className="resize-handle ne-resize" data-handle="ne"></div>
                      <div className="resize-handle sw-resize" data-handle="sw"></div>
                      <div className="resize-handle se-resize" data-handle="se"></div>
                      <div className="resize-handle n-resize" data-handle="n"></div>
                      <div className="resize-handle s-resize" data-handle="s"></div>
                      <div className="resize-handle w-resize" data-handle="w"></div>
                      <div className="resize-handle e-resize" data-handle="e"></div>
                    </div>
                  )}
                </div>
              )}
              
              {!isStreaming && !error && (
                <div className="camera-loading">
                  <div className="loading-spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}

              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            // Captured photo preview
            <div className="photo-preview">
              <img
                src={capturedPhoto.url}
                alt="Captured photo"
                className="captured-image"
              />
            </div>
          )}
        </div>

        <div className="camera-controls">
          {!capturedPhoto ? (
            // Camera controls
            <div className="camera-actions">
              {/* Selection Mode Toggle */}
              <button
                onClick={toggleSelectionMode}
                className={`selection-mode-btn ${isSelectionMode ? 'active' : ''}`}
                disabled={!isStreaming}
                title={isSelectionMode ? 'Exit Selection Mode' : 'Enable Selection Mode - Crop specific area'}
              >
                {isSelectionMode ? '📐 Exit Crop' : '📐 Crop Area'}
              </button>
              
              {/* Clear Selection */}
              {isSelectionMode && selection && (
                <button
                  onClick={clearSelection}
                  className="clear-selection-btn"
                  title="Clear Selection"
                >
                  🗑️ Clear
                </button>
              )}
              
              <button
                onClick={capturePhoto}
                disabled={!isStreaming || isCapturing || (isSelectionMode && (!selection || selection.width === 0 || selection.height === 0))}
                className="capture-btn"
                title={isSelectionMode ? 'Capture Selected Area' : 'Take Photo'}
              >
                {isCapturing ? '📷 Capturing...' : isSelectionMode ? '📷 Capture Area' : '📷 Capture'}
              </button>
              
              <button
                onClick={handleClose}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          ) : (
            // Photo review controls
            <div className="photo-actions">
              <button
                onClick={retakePhoto}
                className="retake-btn"
              >
                🔄 Retake
              </button>
              
              <button
                onClick={sendPhoto}
                className="send-btn"
              >
                ✅ Send Photo
              </button>
              
              {/* Code Analysis Buttons */}
              {onCodeAnalysis && (
                <>
                  <button
                    onClick={() => handleCodeAnalysis(BUTTON_IDS.CODE_OUTPUT)}
                    className="code-analysis-btn code-output-btn"
                    title="Show output and explain execution"
                  >
                    🖥️ Code Output
                  </button>
                  
                  <button
                    onClick={() => handleCodeAnalysis(BUTTON_IDS.CODE_EXECUTION)}
                    className="code-analysis-btn code-steps-btn"
                    title="Step-by-step code execution"
                  >
                    🔍 Code Steps
                  </button>
                </>
              )}
              
              <button
                onClick={handleClose}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {capturedPhoto && (
          <div className="photo-info">
            <span className="photo-details">
              {capturedPhoto.width} × {capturedPhoto.height} • {Math.round(capturedPhoto.blob.size / 1024)}KB
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;