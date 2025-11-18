import { useState, useRef, useCallback, useEffect } from 'react';
import AudioStreamProcessor from '../utils/audioStreamProcessor';
// import textFormatter from '../utils/textFormatter';

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
  const [previousPartialTranscript, setPreviousPartialTranscript] = useState('');
  const [newWords, setNewWords] = useState([]);
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
  const SILENCE_THRESHOLD = 10000; // 10 seconds - auto-segment messages
  const CONNECTION_TIMEOUT = 180000; // 3 minutes - connection timeout
  
  // Keep messageHistoryRef in sync with messageHistory state
  useEffect(() => {
    messageHistoryRef.current = messageHistory;
  }, [messageHistory]);

  // WebSocket URL - connects to our proxy server
  // Use environment variable in production, fallback to localhost for development
  const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5002';

  // Generate unique message ID
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Detect newly added words by comparing current vs previous partial transcript
  const detectNewWords = useCallback((currentText, previousText) => {
    if (!currentText) return [];
    if (!previousText) return currentText.split(' ').filter(word => word.trim());
    
    const currentWords = currentText.split(' ').filter(word => word.trim());
    const previousWords = previousText.split(' ').filter(word => word.trim());
    
    // If current text is shorter, it means we got a completely new transcript (not incremental)
    if (currentWords.length < previousWords.length) {
      return currentWords;
    }
    
    // Check if current text starts with previous text (incremental case)
    const previousJoined = previousWords.join(' ');
    if (currentText.startsWith(previousJoined)) {
      // Return only the new words that were added
      return currentWords.slice(previousWords.length);
    }
    
    // If not incremental, return all current words as new
    return currentWords;
  }, []);

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
    
    // Set timeout for auto-segmentation after 10 seconds of silence
    silenceTimeoutRef.current = setTimeout(() => {
      setConnectionState('silence_detected');
      console.log('🔇 10-second silence detected - preparing to start new message on next speech');
      
      if (currentMessageIdRef.current) {
        // Finalize current message
        setMessageHistory(prev => {
          const messages = [...prev];
          const currentIndex = messages.findIndex(msg => msg.id === currentMessageIdRef.current);
          
          if (currentIndex !== -1) {
            messages[currentIndex] = {
              ...messages[currentIndex],
              isPartial: false, // Finalize the message
              silenceSegmented: true, // Mark as auto-segmented
              lastActivityTime: lastActivityRef.current
            };
          }
          
          return messages;
        });
        
        // Clear current message ID so next speech starts a new message
        setCurrentMessageId(null);
        currentMessageIdRef.current = null;
        console.log('📝 Current message finalized - next speech will start new message');
      }
    }, SILENCE_THRESHOLD);
    
    // During recording: Keep session alive indefinitely for zero wake-up time
    // Only disconnect when user explicitly stops recording
  }, []);

  // Initialize WebSocket connection to proxy server
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🚀 Connecting to AssemblyAI proxy server...');
      
      try {
        const ws = new WebSocket(WEBSOCKET_URL);
        
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Connected to AssemblyAI proxy server at', WEBSOCKET_URL);
          wsRef.current = ws;
          setIsConnected(true);
          setConnectionError(null);
          setConnectionState('connected');
          reconnectAttemptsRef.current = 0;
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleTranscriptionMessage(message);
          } catch (e) {
            console.error('❌ Error parsing WebSocket message:', e, 'Raw data:', event.data);
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason, 'Was clean?', event.wasClean);
          setIsConnected(false);
          if (connectionState !== 'disconnected') {
            setConnectionState('disconnected');
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error);
          setConnectionError('Failed to connect to transcription service');
          reject(error);
        };
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        setConnectionError('Failed to create WebSocket connection');
        reject(error);
      }
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
              // Handle binary audio data - this is normal
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
    console.log('🔍 Received WebSocket message:', message);
    
    if (message.type === 'custom_transcription_partial') {
      console.log('📝 Processing partial transcript:', message.text);
      trackSpeechActivity();
      
      // For partial transcripts, detect newly added words and update states
      const currentText = message.text;
      const newWordsDetected = detectNewWords(currentText, previousPartialTranscript);
      
      // Update states
      setPreviousPartialTranscript(currentText);
      setPartialTranscript(currentText);
      setNewWords(newWordsDetected);
      
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
      console.log('✅ Processing final transcript:', message.text);
      trackSpeechActivity();
      
      let msgId = currentMessageIdRef.current;
      let shouldCreateNewMessage = false;
      
      if (!msgId) {
        msgId = startNewMessage();
        shouldCreateNewMessage = true;
      }
      
      // For final transcripts, we need to ACCUMULATE text, not replace
      const finalText = message.text;
      
      setMessageHistory(prev => {
        const messages = [...prev];
        let currentIndex = messages.findIndex(msg => msg.id === msgId);
        
        if (shouldCreateNewMessage && currentIndex === -1) {
          messages.push({
            id: msgId,
            text: finalText,
            timestamp: new Date().toISOString(),
            isPartial: false, // Mark as final
            hasSilenceGap: false
          });
        } else if (currentIndex !== -1) {
          // ACCUMULATE the text with the existing message
          // Add a space between previous text and new text if both exist
          const existingText = messages[currentIndex].text || '';
          const separator = existingText && finalText ? ' ' : '';
          
          messages[currentIndex] = {
            ...messages[currentIndex],
            text: existingText + separator + finalText,
            isPartial: false, // Mark as final
            hasSilenceGap: false
          };
        } else {
          messages.push({
            id: msgId,
            text: finalText,
            timestamp: new Date().toISOString(),
            isPartial: false, // Mark as final
            hasSilenceGap: false
          });
        }
        
        return messages;
      });
      
      // Clear partial transcript and related states after final
      setPartialTranscript('');
      setPreviousPartialTranscript('');
      setNewWords([]);
      setFinalTranscript(finalText);
      setMessageCount(prev => prev + 1);
      
      // DON'T reset currentMessageId here - keep using the same message
      // Only the silence detection (after 10 seconds) should create a new message
    } else {
      console.log('❓ Unknown message type received:', message.type, message);
    }
  }, [trackSpeechActivity, startNewMessage, detectNewWords, previousPartialTranscript]);

  // Start recording (REAL audio implementation)
  const startRecording = useCallback(async (deviceId = null) => {
    try {
      console.log('🎤 Starting recording with deviceId:', deviceId);
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
    setPreviousPartialTranscript('');
    setNewWords([]);
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

  // Delete messages by IDs
  const deleteMessages = useCallback((messageIds) => {
    setMessageHistory(prev => {
      return prev.filter(msg => !messageIds.includes(msg.id));
    });
  }, []);

  // Merge messages from source group into target group
  const mergeMessages = useCallback((sourceMessageIds, targetMessageIds, direction) => {
    setMessageHistory(prev => {
      const messages = [...prev];
      const sourceMessages = messages.filter(msg => sourceMessageIds.includes(msg.id));
      const targetIndex = messages.findIndex(msg => targetMessageIds.includes(msg.id));
      
      if (targetIndex === -1 || sourceMessages.length === 0) return messages;
      
      // Get source text (current message content)
      const sourceText = sourceMessages.map(msg => msg.text).filter(text => text?.trim()).join(' ');
      if (!sourceText) return messages;
      
      // Remove source messages
      const filteredMessages = messages.filter(msg => !sourceMessageIds.includes(msg.id));
      
      // Find target message in filtered array
      const newTargetIndex = filteredMessages.findIndex(msg => targetMessageIds.includes(msg.id));
      if (newTargetIndex === -1) return messages;
      
      // Get target message
      const targetMessage = filteredMessages[newTargetIndex];
      const targetText = targetMessage.text || '';
      
      let combinedText;
      if (direction === 'up') {
        // UP ARROW: Add current message to the END of the previous message
        combinedText = targetText + (targetText && sourceText ? ' ' : '') + sourceText;
      } else {
        // DOWN ARROW: Add current message to the BEGINNING of the next message
        combinedText = sourceText + (sourceText && targetText ? ' ' : '') + targetText;
      }
      
      // Update target message with combined text
      filteredMessages[newTargetIndex] = {
        ...targetMessage,
        text: combinedText,
        isPartial: false
      };
      
      return filteredMessages;
    });
  }, []);

  // Restore messages from database
  const restoreMessages = useCallback((restoredMessages) => {
    if (!restoredMessages || restoredMessages.length === 0) {
      console.log('⚠️ No messages to restore or empty array provided');
      return;
    }
    
    console.log('📂 Restoring', restoredMessages.length, 'messages to transcript display');
    setMessageHistory(restoredMessages);
    setMessageCount(restoredMessages.length);
    
    // Update conversation history for compatibility
    const conversationText = restoredMessages
      .filter(msg => !msg.isPartial)
      .map(msg => msg.text)
      .join(' ');
    setConversationHistory(conversationText);
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
    setPreviousPartialTranscript('');
    setNewWords([]);
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
    newWords,
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
    deleteMessages,
    mergeMessages,
    restoreMessages,
    connect: connectWebSocket,
    disconnect,

    // Utilities
    getStatus
  };
};

export default useRealtimeTranscription;