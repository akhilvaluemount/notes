import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import TranscriptPanel from './components/TranscriptPanel';
import ResponsePanel from './components/ResponsePanel';
import useRealtimeTranscription from './hooks/useRealtimeTranscription';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function App() {
  const [textInput, setTextInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  
  // Realtime transcription hook
  const {
    isConnected,
    isRecording,
    connectionError,
    partialTranscript,
    finalTranscript,
    conversationHistory,
    messageCount,
    startRecording,
    stopRecording,
    clearConversation: clearRealtimeConversation,
    connect: connectRealtime,
    disconnect: disconnectRealtime
  } = useRealtimeTranscription();

  // DEBUG: Log hook values in App.js to see if they're updating
  console.log('🏠 APP.JS HOOK VALUES:', {
    conversationHistory,
    conversationLength: conversationHistory?.length,
    partialTranscript,
    partialLength: partialTranscript?.length,
    isConnected,
    isRecording,
    timestamp: new Date().toISOString()
  });

  const broadcastChannelRef = useRef(null); // BroadcastChannel for AI response sync
  
  // Microphone selection state (for compatibility - realtime uses default)
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);

  // Simple recording functions for realtime system
  const handleStartRecording = async () => {
    try {
      setError('');
      const success = await startRecording();
      if (!success) {
        setError('Failed to start recording. Please check your microphone permissions.');
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    try {
      stopRecording();
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Error stopping recording: ' + err.message);
    }
  };

  // Clear conversation wrapper
  const handleClearConversation = () => {
    clearRealtimeConversation();
    setError('');
  };




  // State for streaming mode
  const [useStreaming] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  // Handle Ask AI (with streaming support)
  const handleAskAI = async (customPrompt = null) => {
    try {
      setError('');
      
      const userQuestion = customPrompt || conversationHistory;
      console.log('handleAskAI called with:', { customPrompt, conversationHistory, userQuestion });
      
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
                    
                    // Update AI response immediately for real-time display
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

  // Handle connection error display
  const getDisplayError = () => {
    if (connectionError) return connectionError;
    if (error) return error;
    return '';
  };

  // Get recording status for display
  const getRecordingStatus = () => {
    if (!isConnected) return 'disconnected';
    if (isRecording) return 'recording';
    return 'ready';
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

  // Handle realtime connection errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectRealtime();
    };
  }, [disconnectRealtime]);

  return (
    <div className="app">
      <div className="main-content">
        <TranscriptPanel 
          conversation={conversationHistory}
          partialTranscript={partialTranscript}
          messageCount={messageCount}
          autoScroll={autoScroll}
          isProcessing={isProcessing}
          onAskAI={handleAskAI}
          // Header content props
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onClearConversation={handleClearConversation}
          onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
          recordingStatus={getRecordingStatus()}
          isConnected={isConnected}
          // Text input props
          textInput={textInput}
          onTextInputChange={(e) => setTextInput(e.target.value)}
          onTextSubmit={handleTextSubmit}
          isLoadingAI={isLoadingAI}
          error={getDisplayError()}
          // Microphone props (for compatibility)
          selectedMicrophone={selectedMicrophone}
          onMicrophoneSelect={setSelectedMicrophone}
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