import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import TranscriptPanel from './components/TranscriptPanel';
import ResponsePanel from './components/ResponsePanel';

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
  };

  // Handle Ask AI
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
      setIsLoadingAI(true);
      
      const response = await axios.post(`${API_BASE_URL}/api/ask-ai`, { prompt: fullPrompt });
      
      if (response.data.success) {
        setAiResponse(response.data.answer);
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
    setAiResponse('');
    setError('');
    setCurrentChunk(0);
    chunkCounterRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Voice Transcription App</h1>
        <div className="controls">
          <AudioRecorder
            isRecording={isRecording}
            onStart={startRecording}
            onStop={stopRecording}
            isProcessing={isProcessing}
          />
          <button 
            onClick={clearConversation} 
            className="btn btn-secondary"
            disabled={isRecording}
          >
            Clear All
          </button>
          <button 
            onClick={() => setAutoScroll(!autoScroll)} 
            className={`btn ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {/* Live Status Indicator */}
        <div className="status-bar">
          <div className="status-indicator">
            {recordingStatus === 'idle' && <span>🎙️ Ready to record</span>}
            {recordingStatus === 'listening' && (
              <span className="listening">🔴 Listening... (Chunk #{chunkCounterRef.current})</span>
            )}
            {recordingStatus === 'processing' && (
              <span className="processing">⚡ Transcribing speech...</span>
            )}
          </div>
          {isProcessing && (
            <div className="processing-dots">
              <span>●</span><span>●</span><span>●</span>
            </div>
          )}
        </div>
        
        {/* Text Input Section */}
        <div className="text-input-section">
          <form onSubmit={handleTextSubmit} className="text-input-form">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your question here (e.g., 'What are Angular pipes?')"
              className="text-input-field"
              disabled={isLoadingAI}
            />
            <button 
              type="submit" 
              className="btn btn-primary text-submit-btn"
              disabled={!textInput.trim() || isLoadingAI}
            >
              {isLoadingAI ? 'Processing...' : 'Ask AI'}
            </button>
          </form>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </header>
      
      <div className="main-content">
        <TranscriptPanel 
          conversation={conversation}
          autoScroll={autoScroll}
          isProcessing={isProcessing}
          onAskAI={handleAskAI}
        />
        <ResponsePanel 
          response={aiResponse}
          isLoading={isLoadingAI}
        />
      </div>
    </div>
  );
}

export default App;