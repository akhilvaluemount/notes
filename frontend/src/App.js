import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import TranscriptPanel from './components/TranscriptPanel';
import ResponsePanel from './components/ResponsePanel';
import useRealtimeTranscription from './hooks/useRealtimeTranscription';
import { processTranscriptForQuestions, DebouncedQuestionProcessor } from './utils/autoQuestionDetection';
import { processQAHistoryEntry, parseMultiQAResponse, hasMultipleQA } from './utils/multiQAParser';
import buttonConfig from './config/buttonConfig';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function App() {
  const [textInput, setTextInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  
  // Q&A History state for preserving questions and answers
  const [qaHistory, setQaHistory] = useState([]);
  
  // Auto question detection state
  const [autoQuestionProcessing, setAutoQuestionProcessing] = useState(false);
  const questionProcessorRef = useRef(null);
  
  // Realtime transcription hook
  const {
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
    startRecording,
    stopRecording,
    clearConversation: clearRealtimeConversation,
    createNewMessage,
    deleteMessages,
    mergeMessages,
    connect: connectRealtime,
    disconnect: disconnectRealtime
  } = useRealtimeTranscription();


  const broadcastChannelRef = useRef(null); // BroadcastChannel for AI response sync
  
  // Microphone selection state (for compatibility - realtime uses default)
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);

  // Simple recording functions for realtime system
  const handleStartRecording = async () => {
    try {
      setError('');
      // Pass the selected microphone ID to startRecording
      const success = await startRecording(selectedMicrophone);
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
    // Also clear Q&A history when clearing conversation
    setQaHistory([]);
  };

  // Generate unique ID for Q&A entries
  const generateQAId = () => {
    return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Extract question from prompt (remove the AI instruction part)
  const extractQuestionFromPrompt = (prompt) => {
    // Look for "Question: " pattern and extract everything after it
    const questionMatch = prompt.match(/Question:\s*(.+)$/s);
    if (questionMatch) {
      return questionMatch[1].trim();
    }
    
    // If no "Question:" pattern, try to extract the last meaningful part
    const lines = prompt.split('\n').filter(line => line.trim());
    const lastLine = lines[lines.length - 1];
    
    // Return the last line if it looks like a question, otherwise return the whole prompt
    return lastLine || prompt;
  };

  // Save Q&A pair to history - automatically split multi-question responses
  const saveQAToHistory = (prompt, answer) => {
    const originalQuestion = extractQuestionFromPrompt(prompt);
    
    console.log('💾 Saving Q&A to history:', { originalQuestion, answer });
    
    // Check if the AI response contains multiple Q&A pairs
    if (hasMultipleQA(answer)) {
      console.log('💾 Detected multiple Q&A in response, splitting...');
      
      // Parse the response into separate Q&A pairs
      const multiQAList = parseMultiQAResponse(answer);
      
      if (multiQAList.length > 1) {
        console.log('💾 Successfully parsed', multiQAList.length, 'Q&A pairs');
        
        // Create separate Q&A entries for each parsed pair
        const qaEntries = multiQAList.map((qa, index) => ({
          id: `${generateQAId()}_multi_${index}`,
          question: qa.question, // Use the polished question from AI response
          answer: qa.answer,
          timestamp: new Date().toISOString(),
          isExpanded: index === 0, // Only first one expanded
          originalQuestion: originalQuestion, // Keep original transcript for reference
          isMultiQuestionSplit: true,
          splitIndex: index,
          totalSplits: multiQAList.length
        }));
        
        setQaHistory(prev => {
          // Collapse all previous Q&A items and add new entries at the beginning
          const collapsedPrevious = prev.map(qa => ({ ...qa, isExpanded: false }));
          return [...qaEntries, ...collapsedPrevious];
        });
        
        return; // Exit early since we handled the multi-Q&A case
      }
    }
    
    // Single Q&A case - handle normally
    console.log('💾 Single Q&A, saving normally');
    const qaEntry = {
      id: generateQAId(),
      question: originalQuestion,
      answer: answer,
      timestamp: new Date().toISOString(),
      isExpanded: true
    };
    
    setQaHistory(prev => {
      const collapsedPrevious = prev.map(qa => ({ ...qa, isExpanded: false }));
      return [qaEntry, ...collapsedPrevious];
    });
  };

  // Toggle Q&A expansion
  const toggleQAExpansion = (qaId) => {
    setQaHistory(prev => prev.map(qa => 
      qa.id === qaId 
        ? { ...qa, isExpanded: !qa.isExpanded }
        : qa
    ));
  };

  // Automatic question processing function
  const processAutoQuestion = async (questionText) => {
    try {
      setAutoQuestionProcessing(true);
      console.log('🤖 Auto-processing question:', questionText);
      
      // Get the "100" button prompt from config
      const hundredButtonConfig = buttonConfig.find(btn => btn.id === "100");
      if (!hundredButtonConfig) {
        console.error('100 button config not found');
        return;
      }
      
      // Create the prompt using the 100 button template
      const autoPrompt = hundredButtonConfig.prompt.replace('{transcript}', questionText);
      
      // Automatically trigger AI response using the 100 button prompt
      await handleAskAI(autoPrompt);
      
    } catch (error) {
      console.error('Error in auto question processing:', error);
      setError('Failed to auto-process question: ' + error.message);
    } finally {
      setAutoQuestionProcessing(false);
    }
  };




  // State for streaming mode
  const [useStreaming] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  // Handle Ask AI (with streaming support)
  const handleAskAI = async (customPrompt = null) => {
    try {
      setError('');
      
      // If customPrompt is provided, use it directly (it already contains the full prompt)
      // Otherwise, use conversationHistory with default prompt
      let fullPrompt;
      
      if (customPrompt) {
        // Custom prompt is already formatted and ready to use
        fullPrompt = customPrompt;
      } else {
        const userQuestion = conversationHistory;
        
        // Ensure userQuestion is a string and not empty
        if (!userQuestion || typeof userQuestion !== 'string' || !userQuestion.trim()) {
          setError('No content to analyze. Please record speech or type a question.');
          return;
        }
        
        // Default prompt for manual text input or legacy Ask AI button
        fullPrompt = `Provide a concise, structured answer to the following question. Break the answer down into clear sections like:

Definition

Explanation of Concepts

Examples

Key Points

This is for a frontend developer with knowledge of HTML, CSS, JavaScript, TypeScript, and Angular. Focus on these technologies specifically. Ensure the answer is brief, to the point, and focuses on the technical details, while avoiding lengthy explanations or over-explanation. Use bullet points and easy-to-read language to make the answer clear and accessible.

Question: ${userQuestion}`;
      }

      // Store the prompt for saving to Q&A history later
      const originalPrompt = fullPrompt;


      // Clear previous response and set loading state
      setAiResponse('');
      setIsLoadingAI(true);
      
      if (useStreaming) {
        // Use streaming endpoint - OpenAI API call
        setIsStreaming(true);
        
        // Broadcast streaming start event
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'ai-streaming-start',
            timestamp: new Date().toISOString()
          });
        }
        
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
                    fullResponse += data.content;
                    
                    // Update AI response immediately for real-time display
                    setAiResponse(fullResponse);
                    
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
                    setAiResponse(data.fullResponse);
                    setIsStreaming(false);
                    
                    // Save Q&A pair to history when response is complete
                    saveQAToHistory(originalPrompt, data.fullResponse);
                    
                    // Final broadcast
                    if (broadcastChannelRef.current) {
                      broadcastChannelRef.current.postMessage({
                        type: 'ai-response-update',
                        response: data.fullResponse,
                        timestamp: data.timestamp,
                        streaming: false
                      });
                      
                      // Broadcast streaming end event
                      broadcastChannelRef.current.postMessage({
                        type: 'ai-streaming-end',
                        timestamp: new Date().toISOString()
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
          
          // Broadcast streaming end event on error
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'ai-streaming-end',
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        // Use traditional non-streaming endpoint - OpenAI API call
        const response = await axios.post(`${API_BASE_URL}/api/ask-ai`, { prompt: fullPrompt });
        
        if (response.data.success) {
          setAiResponse(response.data.answer);
          
          // Save Q&A pair to history for non-streaming responses
          saveQAToHistory(originalPrompt, response.data.answer);
          
          // Broadcast AI response update to other tabs
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'ai-response-update',
              response: response.data.answer,
              timestamp: new Date().toISOString()
            });
          }
        } else {
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
      
      // Ensure streaming end event is sent if not already sent
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'ai-streaming-end',
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  // Handle text input submission
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      // Create a prompt for text input using the default format
      const textPrompt = `Provide a concise, structured answer to the following question. Break the answer down into clear sections like:

Definition

Explanation of Concepts

Examples

Key Points

This is for a frontend developer with knowledge of HTML, CSS, JavaScript, TypeScript, and Angular. Focus on these technologies specifically. Ensure the answer is brief, to the point, and focuses on the technical details, while avoiding lengthy explanations or over-explanation. Use bullet points and easy-to-read language to make the answer clear and accessible.

Question: ${textInput}`;
      
      await handleAskAI(textPrompt);
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

  // Initialize BroadcastChannel and auto question processor on mount
  useEffect(() => {
    // Initialize BroadcastChannel for AI response synchronization
    broadcastChannelRef.current = new BroadcastChannel('ai-response-sync');
    
    // Initialize debounced question processor
    questionProcessorRef.current = new DebouncedQuestionProcessor(3000); // 3 second delay
    
    // Listen for messages from other tabs
    const handleBroadcastMessage = (event) => {
      if (event.data.type === 'ai-response-update') {
        setAiResponse(event.data.response);
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
        broadcastChannelRef.current.close();
      }
      
      // Clean up question processor
      if (questionProcessorRef.current) {
        questionProcessorRef.current.clear();
      }
    };
  }, []);


  // Auto question detection from final transcripts - DISABLED FOR NOW
  useEffect(() => {
    // Commented out automatic question processing to prevent automatic API calls
    /*
    if (finalTranscript && finalTranscript.trim() && questionProcessorRef.current) {
      // Get already processed question texts to avoid duplicates
      const processedQuestionTexts = qaHistory.map(qa => qa.question);
      
      // Process transcript for questions
      const detectedQuestion = processTranscriptForQuestions(finalTranscript, processedQuestionTexts);
      
      if (detectedQuestion) {
        console.log('🔍 Auto-detected question from transcript:', detectedQuestion);
        
        // Use debounced processor to handle the question
        questionProcessorRef.current.processQuestion(
          detectedQuestion.text,
          processAutoQuestion
        );
      }
    }
    */
  }, [finalTranscript, qaHistory]);

  // Handle realtime connection errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  // Handle delete group - remove messages by IDs
  const handleDeleteGroup = useCallback((messageIds) => {
    deleteMessages(messageIds);
  }, [deleteMessages]);

  // Handle merge groups - combine messages from two groups
  const handleMergeGroups = useCallback((sourceMessageIds, targetMessageIds, direction) => {
    mergeMessages(sourceMessageIds, targetMessageIds, direction);
  }, [mergeMessages]);

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
          newWords={newWords}
          messageCount={messageCount}
          messageHistory={messageHistory}
          currentMessageId={currentMessageId}
          autoScroll={autoScroll}
          isProcessing={isProcessing}
          onAskAI={handleAskAI}
          // Header content props
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onClearConversation={handleClearConversation}
          onCreateNewMessage={createNewMessage}
          onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
          recordingStatus={getRecordingStatus()}
          isConnected={isConnected}
          connectionState={connectionState}
          // Text input props
          textInput={textInput}
          onTextInputChange={(e) => setTextInput(e.target.value)}
          onTextSubmit={handleTextSubmit}
          isLoadingAI={isLoadingAI}
          error={getDisplayError()}
          // Microphone props (for compatibility)
          selectedMicrophone={selectedMicrophone}
          onMicrophoneSelect={setSelectedMicrophone}
          // Q&A history for tracking processed transcripts
          qaHistory={qaHistory}
          // Message management handlers
          onDeleteGroup={handleDeleteGroup}
          onMergeGroups={handleMergeGroups}
        />
        <ResponsePanel 
          response={aiResponse}
          isLoading={isLoadingAI}
          isStreaming={isStreaming}
          qaHistory={qaHistory}
          onToggleQA={toggleQAExpansion}
        />
      </div>
    </div>
  );
}

export default App;