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

  // Transcription state
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState('');
  const [messageCount, setMessageCount] = useState(0);

  // Refs for stable references
  const wsRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket URL - connects to our proxy server
  const WEBSOCKET_URL = 'ws://localhost:5002';

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

  // Start recording (REAL audio implementation)
  const startRecording = useCallback(async (deviceId = null) => {
    try {
      setConnectionError(null);

      // If switching devices, clean up existing audio processor
      if (audioProcessorRef.current && deviceId) {
        audioProcessorRef.current.stopStreaming();
        audioProcessorRef.current = null;
      }

      // Connect to WebSocket proxy
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Connect to our proxy server
        const ws = new WebSocket(WEBSOCKET_URL);
        
        ws.onopen = () => {
          setIsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle custom transcription messages from proxy
            if (message.type === 'custom_transcription_partial') {
              setPartialTranscript(message.text);
            } else if (message.type === 'custom_transcription_final') {
              // Append to conversation history instead of replacing
              setConversationHistory(prev => {
                // If this is a new final transcript, append it
                if (message.text && message.text.trim()) {
                  // Add to existing history with proper spacing
                  const newHistory = prev ? prev + ' ' + message.text : message.text;
                  return newHistory;
                } else {
                  return prev;
                }
              });
              setFinalTranscript(message.text);
              setPartialTranscript('');
              setMessageCount(prev => prev + 1);
            }
          } catch (e) {
            // Handle binary audio data - no logging needed
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionError('Connection error');
        };
        
        ws.onclose = () => {
          setIsConnected(false);
        };
        
        wsRef.current = ws;
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
  }, [WEBSOCKET_URL, initializeAudio]);

  // Stop recording (REAL audio)
  const stopRecording = useCallback(() => {
    // Stop audio streaming
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopStreaming();
      audioProcessorRef.current = null; // Clear reference so it can be reinitialized
    }
    
    setIsRecording(false);
    setPartialTranscript('');
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversationHistory('');
    setFinalTranscript('');
    setPartialTranscript('');
    setMessageCount(0);
  }, []);

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
    partialTranscript,
    finalTranscript,
    conversationHistory,
    messageCount,

    // Actions
    startRecording,
    stopRecording,
    clearConversation,
    connect: connectWebSocket,
    disconnect,

    // Utilities
    getStatus
  };
};

export default useRealtimeTranscription;