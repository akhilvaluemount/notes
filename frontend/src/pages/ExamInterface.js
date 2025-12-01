import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import buttonConfig from '../config/buttonConfig';
import FormattedResponse from '../components/FormattedResponse';
import './ExamInterface.css';

// API base URL - same as interview interface
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001'
);

function ExamInterface() {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const panelRef = useRef(null);

  const examData = location.state || {};
  const [cameraError, setCameraError] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [testingMode, setTestingMode] = useState(false);
  const [testingStreamUrl, setTestingStreamUrl] = useState('');
  const [selectedTestStream, setSelectedTestStream] = useState('mcq'); // 'mcq' or 'code'
  // Removed detailedAnswer state - always use detailed MCQ
  const [languageInput, setLanguageInput] = useState('Python'); // Language input value
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  const [panelTheme, setPanelTheme] = useState('light'); // 'light', 'dark', or 'transparent'
  const [fontSize, setFontSize] = useState('s'); // 'xxs', 'xs', 's', 'n' (normal)
  const [showSettings, setShowSettings] = useState(false); // Settings panel visibility
  const [showExamMenu, setShowExamMenu] = useState(false); // Exam details menu visibility
  const [waitingForUsbCamera, setWaitingForUsbCamera] = useState(false); // Waiting for USB camera to be connected
  const [captureMode, setCaptureMode] = useState(null); // null (black screen), 'window', 'tab', 'screen', or 'camera'
  const [availableCameras, setAvailableCameras] = useState([]); // List of video input devices
  const [selectedCameraId, setSelectedCameraId] = useState(''); // Currently selected camera deviceId
  const [showCameraDropdown, setShowCameraDropdown] = useState(false); // Toggle camera selector
  const [capturedImagePreview, setCapturedImagePreview] = useState(null); // For testing - shows captured image
  const [isTypingCode, setIsTypingCode] = useState(false); // Typing code state
  const [typingCountdown, setTypingCountdown] = useState(0); // Countdown before typing starts

  // Refs for USB camera polling
  const usbCameraCheckIntervalRef = useRef(null);

  // Comprehensive programming languages list for various exams and certifications
  const programmingLanguages = [
    // Core Programming Languages
    'Python', 'JavaScript', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'TypeScript', 'Scala', 'R',
    'Perl', 'Haskell', 'Lua', 'Dart', 'Elixir', 'Clojure', 'F#',
    'Objective-C', 'Shell/Bash', 'SQL', 'MATLAB', 'Groovy', 'Assembly',

    // Web Development
    'HTML', 'CSS', 'SCSS', 'SASS', 'LESS', 'React', 'Angular', 'Vue.js',
    'Node.js', 'Express.js', 'Next.js', 'Nuxt.js', 'Svelte', 'Django',
    'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails', 'Laravel',
    'ASP.NET', '.NET Core', 'jQuery', 'Bootstrap', 'Tailwind CSS',

    // Mobile Development
    'React Native', 'Flutter', 'Ionic', 'Xamarin', 'SwiftUI',
    'Android (Java)', 'Android (Kotlin)', 'iOS (Swift)', 'iOS (Objective-C)',

    // Database & Query Languages
    'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQL Server', 'SQLite',
    'Redis', 'Cassandra', 'DynamoDB', 'Firebase', 'GraphQL', 'PL/SQL',

    // Scripting & Automation
    'PowerShell', 'Batch', 'VBScript', 'AutoHotkey', 'AppleScript',

    // Data Science & ML
    'Python (Data Science)', 'R (Statistics)', 'Julia', 'SAS', 'SPSS',

    // Cloud & DevOps
    'Terraform', 'Ansible', 'Docker', 'Kubernetes', 'CloudFormation',

    // Other Languages
    'COBOL', 'Fortran', 'Pascal', 'Lisp', 'Prolog', 'Erlang',
    'Visual Basic', 'Delphi', 'Ada', 'Scheme', 'Racket', 'OCaml',
    'Solidity', 'Verilog', 'VHDL', 'LabVIEW'
  ].sort(); // Sort alphabetically

  // Filter languages based on input
  const filteredLanguages = programmingLanguages.filter(lang =>
    lang.toLowerCase().includes(languageInput.toLowerCase())
  );

  // Panel docking state - tracks which side the panel is docked to
  const [dockedSide, setDockedSide] = useState(null); // 'left', 'right', 'top', 'bottom', or null

  // Panel resize state
  const [panelSize, setPanelSize] = useState({ width: 480, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Panel drag state - for moving floating panel
  const [panelPosition, setPanelPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

  // Filter buttons for MCQ and Code - only show base buttons, we'll switch prompts based on checkbox
  const examButtons = buttonConfig.filter(btn =>
    ['unified-mcq', 'hackerrank-code', 'advanced-analysis'].includes(btn.id)
  );

  // Enumerate available cameras on mount
  useEffect(() => {
    enumerateCameras();
    // Listen for device changes (camera plugged/unplugged)
    navigator.mediaDevices.addEventListener('devicechange', enumerateCameras);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateCameras);
    };
  }, []);

  // Auto-start screen capture in Electron mode, cleanup on unmount
  useEffect(() => {
    // In Electron mode, auto-start screen capture for entire screen
    if (isElectron()) {
      setCaptureMode('screen');
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        startScreenCapture('monitor');
      }, 500);
      return () => {
        clearTimeout(timer);
        stopCamera();
        stopUsbCameraPolling();
      };
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
      stopUsbCameraPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle testing mode toggle - show default testing stream
  useEffect(() => {
    if (testingMode) {
      // Set testing stream based on selected radio button
      if (selectedTestStream === 'mcq') {
        // IndiaBIX Time and Distance MCQ question stream (local)
        setTestingStreamUrl('/sample-images/mcq-sample.png');
      } else if (selectedTestStream === 'code') {
        // HackerRank Python coding question stream (local)
        setTestingStreamUrl('/sample-images/code-sample.png');
      } else if (selectedTestStream === 'logical') {
        // Logical Reasoning question stream (local)
        setTestingStreamUrl('/sample-images/logical-reasoning.png');
      }
    } else {
      // Clear testing stream when returning to camera mode
      setTestingStreamUrl('');
    }
  }, [testingMode, selectedTestStream]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLanguageSuggestions && !event.target.closest('.language-autocomplete')) {
        setShowLanguageSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageSuggestions]);

  // Close camera dropdown when clicking outside (separate handler with click event)
  useEffect(() => {
    const handleCameraDropdownClose = (event) => {
      // Don't close if clicking inside the camera dropdown or camera option
      if (event.target.closest('.camera-dropdown-menu') ||
          event.target.closest('.camera-option-item') ||
          event.target.closest('.camera-dropdown-btn')) {
        return;
      }
      if (showCameraDropdown && !event.target.closest('.camera-option')) {
        setShowCameraDropdown(false);
      }
    };

    // Use click event (fires after mousedown) so dropdown items can be clicked
    document.addEventListener('click', handleCameraDropdownClose);
    return () => {
      document.removeEventListener('click', handleCameraDropdownClose);
    };
  }, [showCameraDropdown]);


  // Enumerate all available cameras
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);

      // Auto-select first camera if none selected
      if (!selectedCameraId && cameras.length > 0) {
        setSelectedCameraId(cameras[0].deviceId);
      }
      console.log('Available cameras:', cameras.map(c => c.label || 'Unnamed Camera'));
    } catch (err) {
      console.error('Error enumerating cameras:', err);
    }
  };

  // Start camera with optional specific deviceId
  const startCamera = async (deviceId = null) => {
    try {
      // Use provided deviceId, or selectedCameraId, or find any available camera
      let targetDeviceId = deviceId || selectedCameraId;

      // If no deviceId specified, enumerate and pick first available
      if (!targetDeviceId) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        if (cameras.length > 0) {
          targetDeviceId = cameras[0].deviceId;
          setSelectedCameraId(targetDeviceId);
          setAvailableCameras(cameras);
        }
      }

      if (!targetDeviceId) {
        console.log('No camera available');
        setWaitingForUsbCamera(true);
        setCameraError('');
        return;
      }

      const constraints = {
        video: {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Add listener for stream disconnection
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log('Camera stream disconnected');
          setWaitingForUsbCamera(true);
          setCameraError('');
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          streamRef.current = null;
        });
      });

      // Clear waiting state and error
      setWaitingForUsbCamera(false);
      setCameraError('');
      stopUsbCameraPolling();

      // Find camera label for logging
      const camera = availableCameras.find(c => c.deviceId === targetDeviceId);
      console.log('Camera started successfully:', camera?.label || 'Unknown Camera');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Camera initialization failed. Please verify access permissions.');
      setWaitingForUsbCamera(false);
    }
  };

  // Select and switch to a different camera
  const selectCamera = async (deviceId) => {
    console.log('Selecting camera with deviceId:', deviceId);
    setSelectedCameraId(deviceId);
    setShowCameraDropdown(false);
    setCaptureMode('camera'); // Ensure we're in camera mode
    stopCamera();
    await startCamera(deviceId);
    console.log('Camera switched successfully');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Start polling for USB camera detection
  const startUsbCameraPolling = () => {
    // Clear any existing interval first
    stopUsbCameraPolling();

    console.log('Starting USB camera polling...');

    // Check for USB camera every 2 seconds
    usbCameraCheckIntervalRef.current = setInterval(async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Look for USB camera
        const usbCamera = videoDevices.find(device => {
          const label = device.label.toLowerCase();
          return !label.includes('built-in') &&
                 !label.includes('facetime') &&
                 !label.includes('integrated');
        });

        // If USB camera detected, start it
        if (usbCamera) {
          console.log('USB camera detected during polling:', usbCamera.label);
          stopUsbCameraPolling();
          startCamera(); // This will handle starting the camera
        }
      } catch (err) {
        console.error('Error checking for USB camera:', err);
      }
    }, 2000); // Check every 2 seconds
  };

  // Stop polling for USB camera
  const stopUsbCameraPolling = () => {
    if (usbCameraCheckIntervalRef.current) {
      clearInterval(usbCameraCheckIntervalRef.current);
      usbCameraCheckIntervalRef.current = null;
      console.log('USB camera polling stopped');
    }
  };

  // Check if running in Electron
  const isElectron = () => {
    return window.electronAPI && window.electronAPI.isElectron;
  };

  // Start screen capture with surface type preference
  // surfaceType: 'browser' (tab), 'window', or 'monitor' (entire screen)
  const startScreenCapture = async (surfaceType = 'monitor') => {
    try {
      console.log(`Starting screen capture with preference: ${surfaceType}...`);
      console.log('Running in Electron:', isElectron());

      // Use standard getDisplayMedia - works in both browser and Electron
      // In Electron, we've set up setDisplayMediaRequestHandler to handle this
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: surfaceType, // Preference hint: 'browser', 'window', or 'monitor'
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Add listener for when user stops screen sharing
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing stopped by user');
        // Switch back to camera mode
        setCaptureMode('camera');
        startCamera();
      });

      // Clear any errors and waiting states
      setWaitingForUsbCamera(false);
      setCameraError('');
      stopUsbCameraPolling(); // Stop USB camera polling if running

      console.log('Screen capture started successfully');
    } catch (err) {
      console.error('Error starting screen capture:', err);
      // Silently switch back to camera mode on error (no popup)
      setCaptureMode('camera');
    }
  };

  const handleEndExam = () => {
    if (window.confirm('Are you sure you want to end this exam session?')) {
      stopCamera();
      navigate('/');
    }
  };

  // Get sample stream based on selected radio button
  const getSampleStream = async () => {
    // Use the currently displayed testing stream (already set by radio button selection)
    const streamUrl = testingStreamUrl;

    if (!streamUrl) {
      throw new Error('Stream source not initialized');
    }

    // Fetch the stream and convert to blob
    const response = await fetch(streamUrl);
    const blob = await response.blob();
    return blob;
  };

  // Capture current camera frame as stream
  const captureFrame = () => {
    return new Promise((resolve, reject) => {
      try {
        if (!videoRef.current) {
          reject(new Error('Visual feed capture system not ready'));
          return;
        }

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Neural capture interrupted - retry recommended'));
          }
        }, 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle button click - capture camera and process with AI
  const handleButtonClick = async (buttonId) => {
    setIsLoadingAI(true);
    setAiResponse('');

    try {
      console.log(`📸 ${testingMode ? 'Using sample stream' : 'Capturing frame'} for button:`, buttonId);

      // Always use detailed MCQ prompt
      let effectiveButtonId = buttonId;
      if (buttonId === 'unified-mcq') {
        effectiveButtonId = 'unified-mcq-detailed';
      }

      // Find the button config (with detailed variant if checkbox is checked)
      const button = buttonConfig.find(btn => btn.id === effectiveButtonId);
      if (!button) {
        throw new Error(`Analysis mode configuration missing: ${effectiveButtonId}`);
      }

      // Get stream blob - either from sample or camera
      let frameBlob;
      if (testingMode) {
        frameBlob = await getSampleStream();
        console.log('✅ Sample stream loaded successfully');
      } else {
        frameBlob = await captureFrame();
        console.log('✅ Frame captured successfully');
      }

      // Convert blob to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(result); // Keep full data URL for preview
        };
        reader.onerror = reject;
        reader.readAsDataURL(frameBlob);
      });

      // Store preview image for testing
      setCapturedImagePreview(base64Data);
      console.log('📷 Captured image stored for preview');

      // Extract base64 string without data URL prefix for API
      const base64 = base64Data.split(',')[1];

      console.log('🤖 Sending to AI API with prompt:', button.description);

      // Modify prompt for code generation to include selected language
      let finalPrompt = button.prompt;
      if (buttonId === 'hackerrank-code') {
        const languageToUse = languageInput.trim() || 'Python'; // Use input value or default to Python
        finalPrompt = `${button.prompt}\n\nIMPORTANT: Generate the solution code in ${languageToUse} programming language.`;
      }

      // Call the vision API with the button's prompt
      const response = await fetch(`${API_BASE_URL}/api/ask-ai-vision-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageBase64: base64,
          contextText: `Exam question analysis - ${button.label}${buttonId === 'hackerrank-code' ? ` (${languageInput.trim() || 'Python'})` : ''}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setAiResponse(result.answer);
        console.log('✅ AI analysis completed successfully');
      } else {
        throw new Error(result.error || 'AI neural processing interrupted');
      }

    } catch (error) {
      console.error('Error processing button click:', error);
      setAiResponse(`Error: ${error.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Extract solution code from AI response (finds the actual solution, not input/output examples)
  const extractCodeFromResponse = (response) => {
    if (!response) return null;

    // Programming language specifiers that indicate actual solution code
    const langSpecifiers = ['python', 'java', 'javascript', 'js', 'cpp', 'c\\+\\+', 'c', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'php', 'typescript', 'ts'];

    // First, try to find a code block with a language specifier (most likely the solution)
    const langRegex = new RegExp('```(' + langSpecifiers.join('|') + ')\\n([\\s\\S]*?)```', 'gi');
    const langMatches = [...response.matchAll(langRegex)];

    if (langMatches.length > 0) {
      // Return the code from the first language-specified block
      return langMatches[0][2].trim();
    }

    // Fallback: Match all code blocks and find the longest one (likely the solution)
    const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];

    if (matches.length > 0) {
      // Find the longest code block (most likely the solution, not input/output)
      let longestCode = '';
      for (const match of matches) {
        const code = match[1].trim();
        // Solution code typically has keywords like 'def', 'function', 'class', 'import', 'int main', etc.
        const hasProgrammingKeywords = /\b(def |function |class |import |from |int |void |public |private |return |for |while |if |print|input|sys\.stdin)\b/.test(code);
        if (code.length > longestCode.length && hasProgrammingKeywords) {
          longestCode = code;
        }
      }
      // If we found code with programming keywords, return it
      if (longestCode) {
        return longestCode;
      }
      // Otherwise return the longest code block
      return matches.reduce((longest, match) =>
        match[1].trim().length > longest.length ? match[1].trim() : longest, '');
    }

    return null;
  };

  // Handle Type Code button click
  const handleTypeCode = async () => {
    const code = extractCodeFromResponse(aiResponse);

    if (!code) {
      alert('No code found in the response. Generate code first using "Write Code" button.');
      return;
    }

    if (!isElectron()) {
      alert('Type Code feature is only available in the desktop app.');
      return;
    }

    // Start countdown
    setIsTypingCode(true);
    setTypingCountdown(3);

    // Countdown from 3 to 0
    for (let i = 3; i > 0; i--) {
      setTypingCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTypingCountdown(0);

    try {
      // Call the Electron API to type the code
      await window.electronAPI.typeCode(code, 15); // 15ms delay between characters
      console.log('Code typed successfully');
    } catch (error) {
      console.error('Error typing code:', error);
      // Show window if there was an error
      await window.electronAPI.cancelTyping();
    } finally {
      setIsTypingCode(false);
    }
  };

  // Panel docking functions - docks panel to screen edges
  const movePanel = (direction) => {
    switch (direction) {
      case 'up':
        setDockedSide('top');
        break;
      case 'down':
        setDockedSide('bottom');
        break;
      case 'left':
        setDockedSide('left');
        break;
      case 'right':
        setDockedSide('right');
        break;
      default:
        break;
    }
  };

  // Drag handlers - for moving floating panel
  const handleDragStart = (e) => {
    // Only allow dragging when panel is floating (not docked)
    if (dockedSide) return;

    // Don't start drag if clicking on buttons, inputs, or resize handles
    const target = e.target;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('label') ||
      target.closest('select') ||
      target.closest('.resize-handle') ||
      target.closest('.exam-ai-response-wrapper') ||
      target.closest('.exam-settings-panel') ||
      target.closest('.exam-options-row') ||
      target.closest('.exam-action-buttons')
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panelX: panelPosition.x,
      panelY: panelPosition.y
    };
  };

  // Drag effect - handle mouse move and mouse up
  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      setPanelPosition({
        x: dragStartRef.current.panelX + deltaX,
        y: dragStartRef.current.panelY + deltaY
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // Resize handlers
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: panelSize.width,
      height: panelSize.height,
      direction
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const { x, y, width, height, direction } = resizeStartRef.current;
      const deltaX = e.clientX - x;
      const deltaY = e.clientY - y;

      let newWidth = width;
      let newHeight = height;

      // Handle different docked states and resize directions
      if (dockedSide === 'left') {
        // For left dock: resize from right edge
        if (direction === 'right' || direction === 'both') {
          newWidth = Math.max(300, Math.min(800, width + deltaX));
        }
      } else if (dockedSide === 'right') {
        // For right dock: resize from left edge
        if (direction === 'left' || direction === 'both') {
          newWidth = Math.max(300, Math.min(800, width - deltaX));
        }
      } else if (dockedSide === 'top') {
        // For top dock: resize from bottom edge
        if (direction === 'bottom' || direction === 'both') {
          newHeight = Math.max(200, Math.min(600, height + deltaY));
        }
      } else if (dockedSide === 'bottom') {
        // For bottom dock: resize from top edge
        if (direction === 'top' || direction === 'both') {
          newHeight = Math.max(200, Math.min(600, height - deltaY));
        }
      } else {
        // Floating panel: resize from any edge
        if (direction === 'right' || direction === 'both') {
          newWidth = Math.max(300, Math.min(800, width + deltaX));
        }
        if (direction === 'bottom' || direction === 'both') {
          newHeight = Math.max(200, Math.min(800, height + deltaY));
        }
      }

      setPanelSize({ width: newWidth, height: newHeight });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, dockedSide]);

  return (
    <div className={`exam-interface ${isElectron() ? 'electron-mode' : ''}`}>
      {/* Full viewport camera or testing stream */}
      {testingMode && testingStreamUrl ? (
        <img
          src={testingStreamUrl}
          alt="Sample Stream"
          className="exam-camera-feed"
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="exam-camera-feed"
        />
      )}

      {/* Capture Mode Indicator Badge - hidden in Electron mode */}
      {!testingMode && !isElectron() && (
        <div className="capture-mode-badge">
          {captureMode === 'camera' && '📷 Camera'}
          {captureMode === 'tab' && '🌐 Tab Capture'}
          {captureMode === 'window' && '🪟 Window Capture'}
          {captureMode === 'screen' && '🖥️ Entire Screen'}
        </div>
      )}

      {/* Camera error overlay */}
      {cameraError && (
        <div className="camera-error-overlay">
          <div className="error-message">
            <h2>Camera Error</h2>
            <p>{cameraError}</p>
            <button onClick={startCamera} className="retry-btn">
              Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* USB Stream Waiting Overlay */}
      {waitingForUsbCamera && !cameraError && (
        <div className="camera-waiting-overlay">
          <div className="waiting-message">
            <div className="waiting-spinner"></div>
            <h2>Initializing External Visual Stream</h2>
            <p>Connect your external stream source to activate neural processing</p>
            <p className="waiting-hint">AI detection engine scanning for stream input...</p>
          </div>
        </div>
      )}

      {/* Moveable Control Panel */}
      <div
        ref={panelRef}
        className={`control-panel ${dockedSide ? `docked-${dockedSide}` : ''} ${isResizing ? 'resizing' : ''} ${isDragging ? 'dragging' : ''} panel-theme-${panelTheme} font-size-${fontSize}`}
        onMouseDown={handleDragStart}
        style={isElectron() ? {} : {
          width: dockedSide === 'left' || dockedSide === 'right' ? `${panelSize.width}px` : (!dockedSide ? `${panelSize.width}px` : undefined),
          height: dockedSide === 'top' || dockedSide === 'bottom' ? `${panelSize.height}px` : (!dockedSide ? `${panelSize.height}px` : undefined),
          left: !dockedSide ? `${panelPosition.x}px` : undefined,
          top: !dockedSide ? `${panelPosition.y}px` : undefined,
          cursor: !dockedSide && !isResizing ? 'move' : undefined,
        }}
      >
        {/* Mokita Brand Header */}
        <div className={`mokita-brand-header ${isElectron() ? 'electron-header' : ''}`}>
          <span className="mokita-logo">Mokita ai</span>
          {/* Theme and Font controls in header for Electron mode */}
          {isElectron() && (
            <div className="electron-header-controls">
              {/* Theme buttons */}
              <div className="header-theme-group">
                <button
                  className={`header-theme-btn ${panelTheme === 'light' ? 'active' : ''}`}
                  onClick={() => setPanelTheme('light')}
                  title="Light theme"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                  </svg>
                </button>
                <button
                  className={`header-theme-btn ${panelTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => setPanelTheme('dark')}
                  title="Dark theme"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </button>
                <button
                  className={`header-theme-btn ${panelTheme === 'transparent' ? 'active' : ''}`}
                  onClick={() => setPanelTheme('transparent')}
                  title="Glass theme"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
                  </svg>
                </button>
              </div>
              {/* Font size buttons */}
              <div className="header-font-group">
                <button
                  className={`header-font-btn ${fontSize === 'xxs' ? 'active' : ''}`}
                  onClick={() => setFontSize('xxs')}
                  title="Extra extra small"
                >
                  <span style={{ fontSize: '8px' }}>A</span>
                </button>
                <button
                  className={`header-font-btn ${fontSize === 'xs' ? 'active' : ''}`}
                  onClick={() => setFontSize('xs')}
                  title="Extra small"
                >
                  <span style={{ fontSize: '9px' }}>A</span>
                </button>
                <button
                  className={`header-font-btn ${fontSize === 's' ? 'active' : ''}`}
                  onClick={() => setFontSize('s')}
                  title="Small"
                >
                  <span style={{ fontSize: '10px' }}>A</span>
                </button>
                <button
                  className={`header-font-btn ${fontSize === 'n' ? 'active' : ''}`}
                  onClick={() => setFontSize('n')}
                  title="Normal"
                >
                  <span style={{ fontSize: '12px' }}>A</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab-style Controls Bar - Hidden in Electron mode */}
        {!isElectron() && (
        <div className="panel-tabs-bar">
          {/* Theme Tabs */}
          <div className="panel-tab-group">
            <button
              className={`panel-tab ${panelTheme === 'light' ? 'active' : ''}`}
              onClick={() => setPanelTheme('light')}
              title="Light theme"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
              </svg>
              <span>Light</span>
            </button>
            <button
              className={`panel-tab ${panelTheme === 'dark' ? 'active' : ''}`}
              onClick={() => setPanelTheme('dark')}
              title="Dark theme"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span>Dark</span>
            </button>
            <button
              className={`panel-tab ${panelTheme === 'transparent' ? 'active' : ''}`}
              onClick={() => setPanelTheme('transparent')}
              title="Transparent theme"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
              </svg>
              <span>Glass</span>
            </button>
          </div>

          {/* Font Size Tabs */}
          <div className="panel-tab-group font-size-group">
            <button
              className={`panel-tab font-tab ${fontSize === 'xxs' ? 'active' : ''}`}
              onClick={() => setFontSize('xxs')}
              title="Extra extra small font"
            >
              <span style={{ fontSize: '9px' }}>A</span>
            </button>
            <button
              className={`panel-tab font-tab ${fontSize === 'xs' ? 'active' : ''}`}
              onClick={() => setFontSize('xs')}
              title="Extra small font"
            >
              <span style={{ fontSize: '10px' }}>A</span>
            </button>
            <button
              className={`panel-tab font-tab ${fontSize === 's' ? 'active' : ''}`}
              onClick={() => setFontSize('s')}
              title="Small font"
            >
              <span style={{ fontSize: '11px' }}>A</span>
            </button>
            <button
              className={`panel-tab font-tab ${fontSize === 'n' ? 'active' : ''}`}
              onClick={() => setFontSize('n')}
              title="Normal font"
            >
              <span style={{ fontSize: '13px' }}>A</span>
            </button>
          </div>

          {/* Dock Tabs - Hidden in Electron mode */}
          {!isElectron() && (
            <div className="panel-tab-group">
              {dockedSide && (
                <button
                  className="panel-tab"
                  onClick={() => setDockedSide(null)}
                  title="Float panel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                  </svg>
                  <span>Float</span>
                </button>
              )}
              <button
                className={`panel-tab ${dockedSide === 'left' ? 'active' : ''}`}
                onClick={() => movePanel('left')}
                title="Dock to left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
              <button
                className={`panel-tab ${dockedSide === 'bottom' ? 'active' : ''}`}
                onClick={() => movePanel('down')}
                title="Dock to bottom"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                </svg>
              </button>
              <button
                className={`panel-tab ${dockedSide === 'right' ? 'active' : ''}`}
                onClick={() => movePanel('right')}
                title="Dock to right"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </button>
              <button
                className={`panel-tab ${dockedSide === 'top' ? 'active' : ''}`}
                onClick={() => movePanel('up')}
                title="Dock to top"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                </svg>
              </button>
            </div>
          )}

          {/* Settings Tab - Hidden in Electron mode */}
          {!isElectron() && (
            <div className="panel-tab-group">
              <button
                className={`panel-tab ${showSettings ? 'active' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4m0 14v4m-7.07-15.07l2.83 2.83m8.48 8.48l2.83 2.83M1 12h4m14 0h4m-15.07 7.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
        )}

        {/* Electron Controls Row - Side by side layout */}
        {isElectron() && !testingMode && (
          <div className="electron-controls-row">
            {/* Capture Mode */}
            <div className="capture-mode-bar">
              <label className="capture-mode-option">
                <input
                  type="radio"
                  name="captureMode"
                  value="screen"
                  checked={captureMode === 'screen'}
                  onChange={() => {
                    setCaptureMode('screen');
                    stopCamera();
                    startScreenCapture('monitor');
                  }}
                />
                <span className="capture-mode-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  Screen
                </span>
              </label>
              <div className={`capture-mode-option camera-option ${captureMode === 'camera' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="captureMode"
                  value="camera"
                  checked={captureMode === 'camera'}
                  onChange={() => {
                    setCaptureMode('camera');
                    stopCamera();
                    startCamera();
                  }}
                />
                <span className="capture-mode-label" onClick={() => {
                  if (captureMode !== 'camera') {
                    setCaptureMode('camera');
                    stopCamera();
                    startCamera();
                  }
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Camera
                </span>
              </div>
            </div>
            {/* Language Selector */}
            <div className="exam-options-bar">
              <div className="language-selector-inline">
                <span className="language-label-inline">Lang:</span>
                <div className="language-autocomplete-inline">
                  <input
                    type="text"
                    className="language-input-inline"
                    placeholder="Python"
                    value={languageInput}
                    onChange={(e) => {
                      setLanguageInput(e.target.value);
                      setShowLanguageSuggestions(true);
                    }}
                    onFocus={() => setShowLanguageSuggestions(true)}
                  />
                  {showLanguageSuggestions && languageInput && filteredLanguages.length > 0 && (
                    <div className="suggestions-menu">
                      <div className="suggestions-list">
                        {filteredLanguages.slice(0, 8).map((lang) => (
                          <div
                            key={lang}
                            className="suggestion-item"
                            onClick={() => {
                              setLanguageInput(lang);
                              setShowLanguageSuggestions(false);
                            }}
                          >
                            <span>{lang}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Capture Mode Selector Bar - Non-Electron */}
        {!testingMode && !isElectron() && (
          <div className="capture-mode-bar">
            {/* Window option */}
            <label className="capture-mode-option">
                <input
                  type="radio"
                  name="captureMode"
                  value="window"
                  checked={captureMode === 'window'}
                  onChange={() => {
                    setCaptureMode('window');
                    stopCamera();
                    startScreenCapture('window');
                  }}
                />
                <span className="capture-mode-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  Window
                </span>
              </label>

            {/* Tab option */}
            <label className="capture-mode-option">
              <input
                type="radio"
                name="captureMode"
                value="tab"
                checked={captureMode === 'tab'}
                onChange={() => {
                  setCaptureMode('tab');
                  stopCamera();
                  startScreenCapture('browser');
                }}
              />
              <span className="capture-mode-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 8h20"/>
                  <circle cx="5" cy="6" r="1" fill="currentColor"/>
                  <circle cx="8" cy="6" r="1" fill="currentColor"/>
                </svg>
                Tab
              </span>
            </label>

            {/* Entire Screen option */}
            <label className="capture-mode-option">
              <input
                type="radio"
                name="captureMode"
                value="screen"
                checked={captureMode === 'screen'}
                onChange={() => {
                  setCaptureMode('screen');
                  stopCamera();
                  startScreenCapture('monitor');
                }}
              />
              <span className="capture-mode-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                Screen
              </span>
            </label>

            {/* Camera option with dropdown */}
            <div className={`capture-mode-option camera-option ${captureMode === 'camera' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="captureMode"
                value="camera"
                checked={captureMode === 'camera'}
                onChange={() => {
                  setCaptureMode('camera');
                  stopCamera();
                  startCamera();
                }}
              />
              <span className="capture-mode-label" onClick={() => {
                if (captureMode !== 'camera') {
                  setCaptureMode('camera');
                  stopCamera();
                  startCamera();
                }
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Camera
              </span>
              <button
                className="camera-dropdown-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCameraDropdown(!showCameraDropdown);
                }}
                title="Select camera"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {/* Camera dropdown menu */}
              {showCameraDropdown && (
                <div className="camera-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  {availableCameras.length > 0 ? (
                    availableCameras.map((camera, index) => (
                      <div
                        key={camera.deviceId}
                        className={`camera-option-item ${selectedCameraId === camera.deviceId ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('Camera item clicked:', camera.label, camera.deviceId);
                          selectCamera(camera.deviceId);
                        }}
                      >
                        {selectedCameraId === camera.deviceId && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                        <span>{camera.label || `Camera ${index + 1}`}</span>
                      </div>
                    ))
                  ) : (
                    <div className="camera-option-item disabled">No cameras found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panel Content */}
        <div className="panel-content">
          {/* Controls Container - Left side when docked top/bottom */}
          <div className={`exam-controls-container ${dockedSide === 'top' || dockedSide === 'bottom' ? 'horizontal-layout' : ''}`}>
            {/* Collapsible Settings Panel - Only Testing Mode */}
            {showSettings && (
              <div className="exam-settings-panel">
                {/* Testing Mode Toggle */}
                <div className="testing-mode-toggle">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={testingMode}
                      onChange={(e) => setTestingMode(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-label">
                    {testingMode ? '🧪 Testing Mode (Sample Streams)' : '📷 Live Mode'}
                  </span>
                </div>

                {/* Sample Stream Selection - Only show when testing mode is ON */}
                {testingMode && (
                  <div className="sample-image-selector">
                    <label className="sample-image-label">Select Sample Stream:</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="testStream"
                          value="mcq"
                          checked={selectedTestStream === 'mcq'}
                          onChange={(e) => setSelectedTestStream(e.target.value)}
                        />
                        <span className="radio-label">📋 MCQ (Time & Distance)</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="testStream"
                          value="code"
                          checked={selectedTestStream === 'code'}
                          onChange={(e) => setSelectedTestStream(e.target.value)}
                        />
                        <span className="radio-label">💻 Code (Python HackerRank)</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="testStream"
                          value="logical"
                          checked={selectedTestStream === 'logical'}
                          onChange={(e) => setSelectedTestStream(e.target.value)}
                        />
                        <span className="radio-label">🧩 Logical Reasoning (Venn Diagram)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Language Selector - Inline Bar - Hidden in Electron (shown in electron-controls-row instead) */}
            {!isElectron() && (
            <div className="exam-options-bar">
              {/* Programming Language Selector with Autocomplete */}
              <div className="language-selector-inline">
                <span className="language-label-inline">Lang:</span>
                <div className="language-autocomplete-inline">
                  <input
                    type="text"
                    className="language-input-inline"
                    placeholder="Python"
                    value={languageInput}
                    onChange={(e) => {
                      setLanguageInput(e.target.value);
                      setShowLanguageSuggestions(true);
                    }}
                    onFocus={() => setShowLanguageSuggestions(true)}
                  />

                  {showLanguageSuggestions && languageInput && filteredLanguages.length > 0 && (
                    <div className="suggestions-menu">
                      <div className="suggestions-list">
                        {filteredLanguages.slice(0, 8).map((lang) => (
                          <div
                            key={lang}
                            className="suggestion-item"
                            onClick={() => {
                              setLanguageInput(lang);
                              setShowLanguageSuggestions(false);
                            }}
                          >
                            <span>{lang}</span>
                          </div>
                        ))}
                        {filteredLanguages.length > 8 && (
                          <div className="suggestion-more">
                            +{filteredLanguages.length - 8} more languages...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Action Buttons - Always Visible */}
            <div className="exam-action-buttons">
              {examButtons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => handleButtonClick(button.id)}
                  className="exam-action-btn"
                  disabled={isLoadingAI || isTypingCode}
                  title={button.description}
                >
                  <span className="btn-label">{button.label}</span>
                </button>
              ))}
              {/* Type Code Button - Only visible when there's code in response */}
              {isElectron() && aiResponse && extractCodeFromResponse(aiResponse) && (
                <button
                  onClick={handleTypeCode}
                  className="exam-action-btn type-code-btn"
                  disabled={isLoadingAI || isTypingCode}
                  title="Type the code letter by letter at cursor position (3 sec delay)"
                >
                  <span className="btn-label">
                    {isTypingCode ? (typingCountdown > 0 ? `${typingCountdown}...` : '⌨️') : 'Type Code'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* AI Response Display - Right side when docked top/bottom */}
          {(isLoadingAI || aiResponse) && (
            <div className="exam-ai-response-wrapper">
              <FormattedResponse
                response={aiResponse}
                isLoading={isLoadingAI}
                isStreaming={false}
              />
            </div>
          )}

          {/* Captured Image Preview - For Testing */}
          {capturedImagePreview && (
            <div className="captured-image-preview">
              <div className="preview-header">
                <span>Captured Screenshot</span>
                <button
                  className="close-preview-btn"
                  onClick={() => setCapturedImagePreview(null)}
                  title="Close preview"
                >
                  ✕
                </button>
              </div>
              <img
                src={capturedImagePreview}
                alt="Captured screenshot"
                className="preview-image"
              />
            </div>
          )}
        </div>

        {/* Footer with Menu and MOKITA AI */}
        <div className="exam-panel-footer">
          <button
            className="exam-menu-btn"
            onClick={() => setShowExamMenu(!showExamMenu)}
            title="Exam details"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>

          <span className="mokita-ai-text">MOKITA AI</span>

          {/* Exam Details Dropdown Menu */}
          {showExamMenu && (
            <div className="exam-details-menu">
              <div className="exam-details-header">Exam Details</div>
              <div className="exam-details-content">
                {examData.examName && (
                  <div className="exam-detail-item">
                    <span className="detail-label">Exam:</span>
                    <span className="detail-value">{examData.examName}</span>
                  </div>
                )}
                {examData.duration && (
                  <div className="exam-detail-item">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{examData.duration} mins</span>
                  </div>
                )}
                {examData.instructions && (
                  <div className="exam-detail-item">
                    <span className="detail-label">Instructions:</span>
                    <span className="detail-value">{examData.instructions}</span>
                  </div>
                )}
              </div>
              <button onClick={handleEndExam} className="end-exam-menu-btn">
                End Exam
              </button>
            </div>
          )}
        </div>

        {/* Resize Handles */}
        {dockedSide === 'left' && (
          <div
            className="resize-handle resize-handle-right"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        )}
        {dockedSide === 'right' && (
          <div
            className="resize-handle resize-handle-left"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
        )}
        {dockedSide === 'top' && (
          <div
            className="resize-handle resize-handle-bottom"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
        )}
        {dockedSide === 'bottom' && (
          <div
            className="resize-handle resize-handle-top"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
        )}
        {!dockedSide && (
          <div
            className="resize-handle resize-handle-corner"
            onMouseDown={(e) => handleResizeStart(e, 'both')}
          />
        )}
      </div>
    </div>
  );
}

export default ExamInterface;
