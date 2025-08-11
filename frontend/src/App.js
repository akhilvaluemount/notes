import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import TranscriptPanel from './components/TranscriptPanel';
import ResponsePanel from './components/ResponsePanel';
import VoiceActivityDetector from './utils/VoiceActivityDetector';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function App() {
  const [conversation, setConversation] = useState('');
  const [textInput, setTextInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, listening, processing, transcribing
  const [currentChunk, setCurrentChunk] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const recordingMimeTypeRef = useRef(null); // Store the MIME type for reuse
  const isRecordingRef = useRef(false); // Ref to avoid closure issues
  const chunkCounterRef = useRef(0); // Track chunks processed
  const vadRef = useRef(null); // Voice Activity Detector instance
  const broadcastChannelRef = useRef(null); // BroadcastChannel for AI response sync
  
  // Voice activity detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [vadStats, setVadStats] = useState({
    noiseFloor: 0.015,
    voiceThreshold: 0.03,
    chunksProcessed: 0,
    chunksSkipped: 0,
    sensitivity: 'high' // 'low', 'medium', 'high', 'very-high'
  });
  
  // Microphone selection state
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);

  // Handle chunk processing interval
  const handleChunkInterval = () => {
    console.log(`⏰ Chunk interval fired - isRecording: ${isRecordingRef.current}`);
    
    if (!isRecordingRef.current) {
      console.log('❌ Not recording, skipping interval');
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      console.log('❌ No recorder available');
      return;
    }

    if (recorder.state === 'recording') {
      console.log('⏹️ Stopping recorder to process chunk');
      recorder.stop(); // This will trigger the onstop event and processAudioChunk
      
      // Start a new recorder after a brief delay
      setTimeout(startNewChunk, 150);
    } else {
      console.log(`❌ Recorder not in recording state: ${recorder.state}`);
    }
  };

  // Start a new recording chunk
  const startNewChunk = () => {
    if (!isRecordingRef.current || !streamRef.current) {
      console.log('❌ Cannot start new chunk - not recording or no stream');
      return;
    }

    try {
      const newRecorder = new MediaRecorder(streamRef.current, {
        mimeType: recordingMimeTypeRef.current
      });

      newRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      newRecorder.onstop = async () => {
        console.log(`🛑 Chunk stopped with ${audioChunksRef.current.length} parts`);
        if (audioChunksRef.current.length > 0 && isRecordingRef.current) {
          await processAudioChunk();
        }
      };

      mediaRecorderRef.current = newRecorder;
      audioChunksRef.current = [];
      newRecorder.start();
      
      console.log('✅ Started new recording chunk');
    } catch (error) {
      console.error('❌ Failed to start new chunk:', error);
      setError('Recording failed. Please try again.');
      stopRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError('');
      
      // Configure audio constraints with selected microphone
      const audioConstraints = {
        audio: selectedMicrophone ? {
          deviceId: { exact: selectedMicrophone },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      console.log('Starting recording with constraints:', audioConstraints);
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      streamRef.current = stream;
      
      // Test for supported formats in order of preference for Whisper API
      let mimeType;
      
      console.log('Testing audio format support:');
      console.log('MP3:', MediaRecorder.isTypeSupported('audio/mpeg'));
      console.log('WAV:', MediaRecorder.isTypeSupported('audio/wav'));
      console.log('OGG+Opus:', MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'));
      console.log('WebM+Opus:', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
      console.log('WebM:', MediaRecorder.isTypeSupported('audio/webm'));
      
      // Priority order: Simple WebM > OGG > Complex WebM (avoid codec issues)
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else {
        throw new Error('Your browser does not support any compatible audio recording formats. Please try Chrome, Firefox, or Safari.');
      }
      
      console.log('Selected audio format:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      console.log('Using audio format:', mimeType);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await processAudioChunk();
        }
      };

      // Store the MIME type and recording state
      recordingMimeTypeRef.current = mimeType;
      isRecordingRef.current = true;
      chunkCounterRef.current = 0; // Reset chunk counter
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('listening');
      setCurrentChunk(0);
      
      console.log('🎙️ Recording started with format:', mimeType);

      // Initialize Voice Activity Detector with stricter settings
      vadRef.current = new VoiceActivityDetector({
        voiceThreshold: vadStats.voiceThreshold,
        noiseFloor: vadStats.noiseFloor,
        absoluteMinThreshold: 0.025,
        minSpeechDuration: 1000, // 1 second minimum speech
        maxSilenceDuration: 2000, // 2 seconds max silence
        minSpeechPercentage: 0.4, // 40% speech required
        minSignalToNoise: 6, // 6dB minimum SNR
        maxSilencePercentage: 0.7, // 70% max silence
        sensitivity: vadStats.sensitivity,
        onVoiceStart: () => {
          console.log('🗣️ Voice activity started');
          setIsVoiceActive(true);
        },
        onVoiceEnd: () => {
          console.log('🤐 Voice activity ended');
          setIsVoiceActive(false);
        },
        onAudioLevel: (level, isVoice) => {
          setAudioLevel(level);
          // Update stats with current noise floor
          setVadStats(prev => ({
            ...prev,
            noiseFloor: vadRef.current?.options.noiseFloor || prev.noiseFloor
          }));
        }
      });

      // Initialize VAD with the stream
      const vadInitialized = await vadRef.current.initialize(stream);
      if (vadInitialized) {
        vadRef.current.startAnalysis();
        console.log('✅ Voice Activity Detector initialized');
      } else {
        console.warn('⚠️ Voice Activity Detector failed to initialize');
      }

      // Set up interval to process chunks every 5 seconds
      intervalRef.current = setInterval(handleChunkInterval, 5000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  // Process audio chunk
  const processAudioChunk = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      return;
    }

    chunkCounterRef.current += 1;
    const chunkNum = chunkCounterRef.current;
    console.log(`🔄 Processing audio chunk #${chunkNum} with`, audioChunksRef.current.length, 'parts');
    setCurrentChunk(chunkNum);
    
    // Check if chunk should be processed using VAD
    if (vadRef.current && !vadRef.current.shouldProcessChunk()) {
      const speechPercentage = vadRef.current.getSpeechPercentage();
      const averageLevel = vadRef.current.getAverageAudioLevel();
      
      console.log(`⏭️ Skipping chunk #${chunkNum} - Speech: ${Math.round(speechPercentage * 100)}%, Level: ${averageLevel.toFixed(3)}`);
      
      // Update stats
      setVadStats(prev => ({
        ...prev,
        chunksSkipped: prev.chunksSkipped + 1
      }));
      
      // Reset VAD for next chunk
      vadRef.current.reset();
      
      // Clear audio chunks without processing
      audioChunksRef.current = [];
      return;
    }
    
    setIsProcessing(true);
    setRecordingStatus('processing');
    
    // Show processing indicator (handled by recordingStatus state)
    
    try {
      // Get the MIME type used during recording
      const recordingMimeType = recordingMimeTypeRef.current || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
      console.log('Created blob of size:', audioBlob.size, 'type:', recordingMimeType);
      audioChunksRef.current = [];

      // Determine file extension based on MIME type
      let filename = 'audio.webm';
      if (recordingMimeType.includes('mpeg') || recordingMimeType.includes('mp3')) {
        filename = 'audio.mp3';
      } else if (recordingMimeType.includes('wav')) {
        filename = 'audio.wav';
      } else if (recordingMimeType.includes('ogg')) {
        filename = 'audio.ogg';
      } else if (recordingMimeType.includes('webm')) {
        filename = 'audio.webm';
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, filename);
      console.log('Sending file as:', filename);

      console.log('Sending audio to backend...');
      const response = await axios.post(`${API_BASE_URL}/api/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Transcription response:', response.data);

      if (response.data.success && response.data.transcript.trim()) {
        console.log(`✅ Chunk transcription successful:`, response.data.transcript);
        setRecordingStatus('listening');
        
        // Update stats
        setVadStats(prev => ({
          ...prev,
          chunksProcessed: prev.chunksProcessed + 1
        }));
        
        // Append transcript to conversation
        setConversation(prev => {
          const prevText = typeof prev === 'string' ? prev : '';
          const newText = response.data.transcript ? response.data.transcript.trim() : '';
          if (prevText && newText) {
            return prevText + ' ' + newText;
          }
          return prevText || newText || '';
        });
        
        console.log(`✅ Chunk transcription completed`);
      } else {
        console.log(`❌ No transcript received (empty or failed)`);
        setRecordingStatus('listening');
      }
      
      // Reset VAD for next chunk
      if (vadRef.current) {
        vadRef.current.reset();
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      
      // Error already handled
      setRecordingStatus(isRecording ? 'listening' : 'idle');
      
      // Display specific error message from server
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(`Transcription failed: ${err.message}`);
      } else {
        setError('Failed to transcribe audio. Please check your connection and API key.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    setRecordingStatus('idle');
    isRecordingRef.current = false; // Reset ref
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Cleanup Voice Activity Detector
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
      console.log('🧹 Voice Activity Detector cleaned up');
    }
    
    // Reset VAD state
    setAudioLevel(0);
    setIsVoiceActive(false);
  };

  // State for streaming mode
  const [useStreaming] = useState(true);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Handle Ask AI (with streaming support)
  const handleAskAI = async (customPrompt = null) => {
    try {
      setError('');
      
      const userQuestion = customPrompt || conversation;
      console.log('handleAskAI called with:', { customPrompt, conversation, userQuestion });
      
      // Ensure userQuestion is a string and not empty
      if (!userQuestion || typeof userQuestion !== 'string' || !userQuestion.trim()) {
        console.log('No valid question found:', { userQuestion, type: typeof userQuestion });
        setError('No content to analyze. Please record speech or type a question.');
        return;
      }
      
      // Construct the full prompt with system instructions
      const fullPrompt = `Provide a concise, structured answer to the following question. Break the answer down into clear sections like:

Definition

Explanation of Concepts

Examples

Key Points

This is for a frontend developer with knowledge of HTML, CSS, JavaScript, TypeScript, and Angular. Focus on these technologies specifically. Ensure the answer is brief, to the point, and focuses on the technical details, while avoiding lengthy explanations or over-explanation. Use bullet points and easy-to-read language to make the answer clear and accessible.

Question: ${userQuestion}`;
      
      // Clear previous response and set loading state
      setAiResponse('');
      setStreamingResponse('');
      setIsLoadingAI(true);
      
      // Performance monitoring
      console.time('Frontend: Total Response Time');
      
      if (useStreaming) {
        // Use streaming endpoint
        console.log('Using streaming mode...');
        console.time('Frontend: First Chunk');
        setIsStreaming(true);
        let firstChunk = true;
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/ask-ai-stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: fullPrompt }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'chunk') {
                    if (firstChunk) {
                      console.timeEnd('Frontend: First Chunk');
                      firstChunk = false;
                    }
                    fullResponse += data.content;
                    
                    // Update both streaming state and AI response immediately for real-time display
                    setStreamingResponse(fullResponse);
                    setAiResponse(fullResponse);
                    console.log('Streaming chunk received, response length:', fullResponse.length);
                    
                    // Broadcast updates during streaming
                    if (broadcastChannelRef.current) {
                      broadcastChannelRef.current.postMessage({
                        type: 'ai-response-update',
                        response: fullResponse,
                        timestamp: new Date().toISOString(),
                        streaming: true
                      });
                    }
                  } else if (data.type === 'complete') {
                    console.timeEnd('Frontend: Total Response Time');
                    console.log('Stream stats:', data.stats);
                    setAiResponse(data.fullResponse);
                    setIsStreaming(false);
                    
                    // Final broadcast
                    if (broadcastChannelRef.current) {
                      broadcastChannelRef.current.postMessage({
                        type: 'ai-response-update',
                        response: data.fullResponse,
                        timestamp: data.timestamp,
                        streaming: false
                      });
                    }
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        } catch (err) {
          console.error('Streaming error:', err);
          setError(`Streaming failed: ${err.message}`);
          setIsStreaming(false);
        }
      } else {
        // Use traditional non-streaming endpoint
        console.log('Using non-streaming mode...');
        const response = await axios.post(`${API_BASE_URL}/api/ask-ai`, { prompt: fullPrompt });
        
        console.timeEnd('Frontend: Total Response Time');
        console.log('Full API response:', response);
        console.log('Response data:', response.data);
        console.log('Answer content:', response.data.answer);
        
        if (response.data.success) {
          console.log('Setting AI response:', response.data.answer);
          setAiResponse(response.data.answer);
          
          // Broadcast AI response update to other tabs
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'ai-response-update',
              response: response.data.answer,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log('API response not successful:', response.data);
          setError('AI request was not successful');
        }
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      
      // Display specific error message from server
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(`AI request failed: ${err.message}`);
      } else {
        setError('Failed to get AI response. Please check your connection and API key.');
      }
    } finally {
      setIsLoadingAI(false);
      setStreamingResponse('');
      setIsStreaming(false);
    }
  };

  // Handle text input submission
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      await handleAskAI(textInput);
      setTextInput('');
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setConversation('');
    // Note: Not clearing aiResponse - only clearing transcript
    setError('');
    setCurrentChunk(0);
    chunkCounterRef.current = 0;
    
    // Reset VAD stats
    setVadStats(prev => ({
      ...prev,
      chunksProcessed: 0,
      chunksSkipped: 0
    }));
  };
  
  // Handle VAD sensitivity change
  const handleSensitivityChange = (newSensitivity) => {
    setVadStats(prev => ({
      ...prev,
      sensitivity: newSensitivity
    }));
    
    // Update thresholds based on sensitivity
    const thresholds = {
      'low': { voiceThreshold: 0.015, noiseFloor: 0.008 },
      'medium': { voiceThreshold: 0.025, noiseFloor: 0.012 },
      'high': { voiceThreshold: 0.03, noiseFloor: 0.015 },
      'very-high': { voiceThreshold: 0.04, noiseFloor: 0.02 }
    };
    
    const newThresholds = thresholds[newSensitivity];
    if (newThresholds) {
      setVadStats(prev => ({
        ...prev,
        ...newThresholds
      }));
    }
    
    console.log(`VAD sensitivity changed to: ${newSensitivity}`);
  };

  // Initialize BroadcastChannel on mount
  useEffect(() => {
    // Initialize BroadcastChannel for AI response synchronization
    broadcastChannelRef.current = new BroadcastChannel('ai-response-sync');
    
    // Listen for messages from other tabs
    const handleBroadcastMessage = (event) => {
      if (event.data.type === 'ai-response-update') {
        console.log('Received AI response update from another tab:', event.data.response);
        setAiResponse(event.data.response);
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="app">
      <div className="main-content">
        <TranscriptPanel 
          conversation={conversation}
          autoScroll={autoScroll}
          isProcessing={isProcessing}
          onAskAI={handleAskAI}
          // Header content props
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onClearConversation={clearConversation}
          onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
          recordingStatus={recordingStatus}
          chunkCounterRef={chunkCounterRef}
          // Text input props
          textInput={textInput}
          onTextInputChange={(e) => setTextInput(e.target.value)}
          onTextSubmit={handleTextSubmit}
          isLoadingAI={isLoadingAI}
          error={error}
          // VAD props
          audioLevel={audioLevel}
          isVoiceActive={isVoiceActive}
          vadStats={vadStats}
          // Microphone props
          selectedMicrophone={selectedMicrophone}
          onMicrophoneSelect={setSelectedMicrophone}
          // VAD sensitivity
          onSensitivityChange={handleSensitivityChange}
        />
        <ResponsePanel 
          response={aiResponse}
          isLoading={isLoadingAI}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}

export default App;