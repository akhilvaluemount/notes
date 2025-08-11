import { useState, useRef, useCallback, useEffect } from 'react';
import AudioStreamProcessor from '../utils/audioStreamProcessor';

/**
 * Custom hook for OpenAI Realtime API transcription
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
  const WEBSOCKET_URL = process.env.REACT_APP_REALTIME_WS_URL || 'ws://localhost:5002';

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Realtime API proxy...');
      
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('✅ Connected to Realtime API proxy');
        // Send a ping to get our client ID
        ws.send(JSON.stringify({ type: 'ping', message: 'identify_client' }));
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        resolve();
      };

      ws.onmessage = (event) => {
        console.log('🔔 RAW WEBSOCKET MESSAGE RECEIVED:', event.data);
        setMessageCount(prev => prev + 1); // Count every message received
        try {
          // Handle different message types from OpenAI Realtime API
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            console.log('🎯 FRONTEND RECEIVED MESSAGE:', message.type);
            
            // Handle client identification
            if (message.type === 'client_identified') {
              console.log('🆔 Client connected with ID:', message.clientId);
            }
            
            // Log transcription messages for debugging
            if (message.type && message.type.includes('transcript')) {
              console.log('🎯 Transcription message:', message.type);
            }
            handleRealtimeMessage(message);
          } else {
            // Handle binary audio data (ArrayBuffer or Blob)
            console.log('📥 Received binary audio data:', event.data);
            // For transcription, we typically don't need to handle incoming audio
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ WebSocket error:', error);
        setConnectionError('Failed to connect to transcription service');
        reject(error);
      };
    });
  }, [WEBSOCKET_URL]);

  // Handle messages from OpenAI Realtime API
  const handleRealtimeMessage = useCallback((message) => {
    
    switch (message.type) {
      case 'conversation.item.input_audio_transcription.delta':
      case 'response.audio_transcript.delta':
        // Partial transcription - update live
        console.log('📝 Partial transcript:', message.delta);
        setPartialTranscript(prev => prev + message.delta);
        break;

      case 'conversation.item.input_audio_transcription.completed':
      case 'response.audio_transcript.done':
        // Final transcription - commit to history
        const transcript = message.transcript || message.content || '';
        console.log('✅ Final transcript:', transcript);
        setFinalTranscript(transcript);
        setConversationHistory(prev => {
          const newHistory = prev ? prev + ' ' + transcript : transcript;
          return newHistory;
        });
        setPartialTranscript(''); // Clear partial
        break;

      case 'session.created':
        console.log('🎯 Session created');
        break;

      case 'session.updated':
        console.log('⚙️ Session updated');
        break;


      case 'error':
        console.error('❌ OpenAI error:', message.error);
        setConnectionError(message.error.message || 'OpenAI API error');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🗣️ Speech started');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('🤐 Speech stopped');
        break;

      // Handle custom transcription messages (backup solution)
      case 'custom_transcription_partial':
        console.log('📝 Custom partial transcription:', message.text);
        setPartialTranscript(prev => prev + message.text);
        break;

      case 'custom_transcription_final':
        console.log('✅ Custom final transcription:', message.text);
        setFinalTranscript(message.text);
        setConversationHistory(prev => {
          const newHistory = prev ? prev + ' ' + message.text : message.text;
          return newHistory;
        });
        setPartialTranscript(''); // Clear partial
        break;

      default:
        console.log('📥 Unhandled message type:', message.type);
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
  const initializeAudio = useCallback(async () => {
    if (audioProcessorRef.current) {
      console.log('🎤 Audio processor already initialized');
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

      // Initialize audio
      const success = await processor.initialize();
      if (!success) {
        throw new Error('Failed to initialize audio processor');
      }

      console.log('🎤 Audio processor initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      setConnectionError('Failed to access microphone: ' + error.message);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setConnectionError(null);

      // Ensure WebSocket is connected
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        await connectWebSocket();
      }

      // Initialize audio if needed
      if (!audioProcessorRef.current) {
        const audioReady = await initializeAudio();
        if (!audioReady) return false;
      }

      // Start audio streaming
      const success = await audioProcessorRef.current.startStreaming();
      if (success) {
        setIsRecording(true);
        console.log('🔴 Started realtime transcription');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setConnectionError('Failed to start recording: ' + error.message);
      return false;
    }
  }, [connectWebSocket, initializeAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopStreaming();
    }
    setIsRecording(false);
    setPartialTranscript('');
    console.log('⏹️ Stopped realtime transcription');
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversationHistory('');
    setFinalTranscript('');
    setPartialTranscript('');
    console.log('🧹 Cleared conversation history');
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
    console.log('🔌 Disconnected from Realtime API');
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