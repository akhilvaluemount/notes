import { useState, useRef, useCallback, useEffect } from 'react';
import AudioStreamProcessor from '../utils/audioStreamProcessor';

/**
 * Custom hook for AssemblyAI Real-time transcription
 * Provides continuous, real-time speech-to-text with partial and final results
 */
const useRealtimeTranscription = () => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // 'connected', 'disconnected', 'reconnecting', 'silence_detected'

  // Transcription state
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  
  // Message history state
  const [messageHistory, setMessageHistory] = useState([]);
  const [currentMessageId, setCurrentMessageId] = useState(null);

  // Refs for stable references
  const wsRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const lastActivityRef = useRef(Date.now());
  const silenceTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);  // For 3-minute connection timeout
  const currentMessageIdRef = useRef(null);  // Add ref for current message ID
  const messageHistoryRef = useRef([]);  // Add ref for message history
  const SILENCE_THRESHOLD = 20000; // 20 seconds - visual indication
  const CONNECTION_TIMEOUT = 180000; // 3 minutes - connection timeout
  
  // Keep messageHistoryRef in sync with messageHistory state
  useEffect(() => {
    messageHistoryRef.current = messageHistory;
  }, [messageHistory]);

  // WebSocket URL - connects to our proxy server
  const WEBSOCKET_URL = 'ws://localhost:5002';

  // Generate unique message ID
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Start a new message after silence
  const startNewMessage = useCallback(() => {
    const newMessageId = generateMessageId();
    setCurrentMessageId(newMessageId);
    currentMessageIdRef.current = newMessageId;  // Update ref too
    // Don't add to history yet - wait until we have actual content
    return newMessageId;
  }, []);

  // Update current message text
  const updateCurrentMessage = useCallback((text, isPartial = true) => {
    setMessageHistory(prev => {
      const messages = [...prev];
      const currentIndex = messages.findIndex(msg => msg.id === currentMessageId);
      
      if (currentIndex !== -1) {
        messages[currentIndex] = {
          ...messages[currentIndex],
          text: text,
          isPartial: isPartial
        };
      }
      
      return messages;
    });
  }, [currentMessageId]);

  // Handle speech activity tracking with continuous session
  const trackSpeechActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setConnectionState('connected');
    
    // Clear existing timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    // NOTE: No longer setting connectionTimeoutRef - keeping session alive during recording
    
    // Set timeout for visual silence indication (20 seconds)
    silenceTimeoutRef.current = setTimeout(() => {
      setConnectionState('silence_detected');
      
      if (currentMessageIdRef.current) {
        setMessageHistory(prev => {
          const messages = [...prev];
          const currentIndex = messages.findIndex(msg => msg.id === currentMessageIdRef.current);
          
          if (currentIndex !== -1) {
            messages[currentIndex] = {
              ...messages[currentIndex],
              hasSilenceGap: true,
              lastActivityTime: lastActivityRef.current
            };
          }
          
          return messages;
        });
      }
    }, SILENCE_THRESHOLD);
    
    // During recording: Keep session alive indefinitely for zero wake-up time
    // Only disconnect when user explicitly stops recording
  }, []);

  // Initialize WebSocket connection (temporary mock for testing)
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🚀 Mock Session: Creating mock connection for testing...');
      
      // Create a mock WebSocket for testing purposes
      const mockWs = {
        readyState: 1, // OPEN
        send: (data) => console.log('📤 Mock: Would send audio data:', data.byteLength, 'bytes'),
        close: () => console.log('🔌 Mock: Connection closed'),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null
      };
      
      wsRef.current = mockWs;

      // Mock immediate connection success
      setTimeout(() => {
        console.log('✅ Mock Session: Connected successfully');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        resolve();
      }, 100);

      // Mock handlers (not used but prevents errors)
      mockWs.onmessage = () => {};
      mockWs.onclose = () => setIsConnected(false);
      mockWs.onerror = () => setConnectionError('Mock connection error');
    });
  }, [WEBSOCKET_URL]);

  // Handle messages from AssemblyAI Real-time API
  const handleRealtimeMessage = useCallback((message) => {
    
    switch (message.type) {
      case 'conversation.item.input_audio_transcription.delta':
      case 'response.audio_transcript.delta':
        // Partial transcription - update live
        setPartialTranscript(prev => prev + message.delta);
        break;

      case 'conversation.item.input_audio_transcription.completed':
      case 'response.audio_transcript.done':
        // Final transcription - commit to history
        const transcript = message.transcript || message.content || '';
        console.log('✅ Backend API: AssemblyAI transcription completed - "' + transcript + '"');
        setFinalTranscript(transcript);
        setConversationHistory(prev => {
          const newHistory = prev ? prev + ' ' + transcript : transcript;
          return newHistory;
        });
        setPartialTranscript(''); // Clear partial
        break;

      case 'session.created':
        console.log('🚀 Backend API: AssemblyAI session established');
        break;

      case 'session.updated':
        break; // Skip session update logs

      case 'error':
        console.error('❌ Backend API: AssemblyAI error -', message.error);
        setConnectionError(message.error.message || 'AssemblyAI API error');
        break;

      // Handle custom transcription messages (backup solution)
      case 'custom_transcription_partial':
        setPartialTranscript(prev => prev + message.text);
        break;

      case 'custom_transcription_final':
        console.log('✅ Backend API: AssemblyAI transcription completed - "' + message.text + '"');
        setFinalTranscript(message.text);
        setConversationHistory(prev => {
          const newHistory = prev ? prev + ' ' + message.text : message.text;
          return newHistory;
        });
        setPartialTranscript(''); // Clear partial
        break;
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
    
    console.log(`🔄 Scheduling reconnection attempt ${attempt + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }, [connectWebSocket]);

  // Initialize audio processor
  const initializeAudio = useCallback(async (deviceId = null) => {
    if (audioProcessorRef.current) {
      return true;
    }

    if (!AudioStreamProcessor.isSupported()) {
      setConnectionError('Web Audio API not supported in this browser');
      return false;
    }

    try {
      const processor = new AudioStreamProcessor();
      audioProcessorRef.current = processor;

      // Set up callbacks
      processor.setAudioDataCallback((pcm16Data) => {
        // Send audio data to WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcm16Data);
        }
      });

      processor.setErrorCallback((error) => {
        console.error('🎤 Audio processor error:', error);
        setConnectionError('Microphone access error: ' + error.message);
        setIsRecording(false);
      });

      // Initialize audio with specific device ID if provided
      const success = await processor.initialize(deviceId);
      if (!success) {
        throw new Error('Failed to initialize audio processor');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error.message);
      setConnectionError('Failed to access microphone: ' + error.message);
      return false;
    }
  }, []);

  // Automatic reconnection when speech is detected after disconnection
  const autoReconnect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return true; // Already connected
    }
    
    console.log('🔄 Auto-reconnecting to AssemblyAI...');
    setConnectionState('reconnecting');
    
    try {
      // Create new WebSocket connection
      const ws = new WebSocket(WEBSOCKET_URL);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection timeout'));
        }, 10000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          wsRef.current = ws;
          setIsConnected(true);
          setConnectionState('connected');
          console.log('✅ Auto-reconnected to AssemblyAI successfully');
          
          // Set up message handlers
          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              handleTranscriptionMessage(message);
            } catch (e) {
              // Handle binary audio data
            }
          };
          
          ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setConnectionError('Connection error');
          };
          
          ws.onclose = () => {
            setIsConnected(false);
            if (connectionState !== 'disconnected') {
              setConnectionState('disconnected');
            }
          };
          
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to reconnect'));
        };
      });
    } catch (error) {
      console.error('❌ Auto-reconnection failed:', error);
      setConnectionError('Failed to reconnect: ' + error.message);
      setConnectionState('disconnected');
      return false;
    }
  }, [WEBSOCKET_URL]);

  // Handle transcription messages (extracted for reuse)
  const handleTranscriptionMessage = useCallback((message) => {
    if (message.type === 'custom_transcription_partial') {
      trackSpeechActivity();
      setPartialTranscript(message.text);
      
      let msgId = currentMessageIdRef.current;
      if (!msgId) {
        msgId = startNewMessage();
        
        setMessageHistory(prev => {
          const exists = prev.find(msg => msg.id === msgId);
          if (!exists) {
            return [...prev, {
              id: msgId,
              text: '',
              timestamp: new Date().toISOString(),
              isPartial: true,
              hasSilenceGap: false
            }];
          }
          return prev;
        });
      }
      
    } else if (message.type === 'custom_transcription_final') {
      trackSpeechActivity();
      
      let msgId = currentMessageIdRef.current;
      let shouldCreateNewMessage = false;
      
      if (!msgId) {
        msgId = startNewMessage();
        shouldCreateNewMessage = true;
      }
      
      setMessageHistory(prev => {
        const messages = [...prev];
        let currentIndex = messages.findIndex(msg => msg.id === msgId);
        
        if (shouldCreateNewMessage && currentIndex === -1) {
          messages.push({
            id: msgId,
            text: message.text,
            timestamp: new Date().toISOString(),
            isPartial: true,
            hasSilenceGap: false
          });
        } else if (currentIndex !== -1) {
          const existingText = messages[currentIndex].text || '';
          messages[currentIndex] = {
            ...messages[currentIndex],
            text: existingText + (existingText ? ' ' : '') + message.text,
            isPartial: true,
            hasSilenceGap: false
          };
        } else {
          messages.push({
            id: msgId,
            text: message.text,
            timestamp: new Date().toISOString(),
            isPartial: true,
            hasSilenceGap: false
          });
        }
        
        return messages;
      });
      
      setConversationHistory(prev => {
        if (message.text && message.text.trim()) {
          const newHistory = prev ? prev + ' ' + message.text : message.text;
          return newHistory;
        }
        return prev;
      });
      
      setFinalTranscript(message.text);
      setPartialTranscript('');
      setMessageCount(prev => prev + 1);
    }
  }, [trackSpeechActivity, startNewMessage]);

  // Start recording (REAL audio implementation)
  const startRecording = useCallback(async (deviceId = null) => {
    try {
      setConnectionError(null);

      // If switching devices, clean up existing audio processor
      if (audioProcessorRef.current && deviceId) {
        audioProcessorRef.current.stopStreaming();
        audioProcessorRef.current = null;
      }

      // Connect to WebSocket proxy (or reconnect if needed)
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const reconnected = await autoReconnect();
        if (!reconnected) {
          throw new Error('Failed to connect to transcription service');
        }
      }

      // Initialize real audio recording with device ID
      if (!audioProcessorRef.current) {
        const audioSuccess = await initializeAudio(deviceId);
        if (!audioSuccess) {
          throw new Error('Failed to initialize audio');
        }
      }

      // Start real audio streaming
      const streamStarted = await audioProcessorRef.current.startStreaming();
      if (!streamStarted) {
        throw new Error('Failed to start audio stream');
      }

      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('❌ Failed to start recording:', error.message);
      setConnectionError('Failed to start recording: ' + error.message);
      return false;
    }
  }, [WEBSOCKET_URL, initializeAudio, autoReconnect]);

  // Stop recording (REAL audio)
  const stopRecording = useCallback(() => {
    // Stop audio streaming
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopStreaming();
      audioProcessorRef.current = null; // Clear reference so it can be reinitialized
    }
    
    // Clear all activity timers when stopping recording
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    setIsRecording(false);
    setPartialTranscript('');
    setConnectionState('disconnected');
    
    // Close WebSocket connection when recording stops
    if (wsRef.current) {
      wsRef.current.close(1000, 'Recording stopped');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversationHistory('');
    setFinalTranscript('');
    setPartialTranscript('');
    setMessageCount(0);
    setMessageHistory([]);
    setCurrentMessageId(null);
    currentMessageIdRef.current = null;
    
    // Clear silence timer
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, []);
  
  // Manually create a new message block
  const createNewMessage = useCallback(() => {
    if (currentMessageIdRef.current) {
      // Finalize current message
      setMessageHistory(prev => {
        const messages = [...prev];
        const currentIndex = messages.findIndex(msg => msg.id === currentMessageIdRef.current);
        
        if (currentIndex !== -1) {
          messages[currentIndex] = {
            ...messages[currentIndex],
            isPartial: false
          };
        }
        
        return messages;
      });
    }
    
    // Create new message
    const newId = startNewMessage();
    return newId;
  }, [startNewMessage]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopStreaming();
      audioProcessorRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
    setPartialTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Get current status
  const getStatus = useCallback(() => {
    return {
      isConnected,
      isRecording,
      connectionError,
      hasPartialTranscript: !!partialTranscript,
      hasFinalTranscript: !!finalTranscript,
      conversationLength: conversationHistory.length,
      audioInfo: audioProcessorRef.current?.getStreamInfo()
    };
  }, [isConnected, isRecording, connectionError, partialTranscript, finalTranscript, conversationHistory]);

  return {
    // State
    isConnected,
    isRecording,
    connectionError,
    connectionState,
    partialTranscript,
    finalTranscript,
    conversationHistory,
    messageCount,
    messageHistory,
    currentMessageId,

    // Actions
    startRecording,
    stopRecording,
    clearConversation,
    createNewMessage,
    connect: connectWebSocket,
    disconnect,

    // Utilities
    getStatus
  };
};

export default useRealtimeTranscription;