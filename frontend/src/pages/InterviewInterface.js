import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';
import AudioRecorder from '../components/AudioRecorder';
import TranscriptPanel from '../components/TranscriptPanel';
import ResponsePanel from '../components/ResponsePanel';
import ErrorBoundary from '../components/ErrorBoundary';
import useRealtimeTranscription from '../hooks/useRealtimeTranscription';
import useSessionManager from '../hooks/useSessionManager';
import { processTranscriptForQuestions, DebouncedQuestionProcessor } from '../utils/autoQuestionDetection';
import { processQAHistoryEntry, parseMultiQAResponse, hasMultipleQA } from '../utils/multiQAParser';
import { extractMetadataFromResponse, extractMetadataFromMultiQA, hasMetadata } from '../utils/metadataExtractor';
import buttonConfig from '../config/buttonConfig';
import rolesConfig from '../config/rolesAndTechnologies.json';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function InterviewInterface() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [textInput, setTextInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  const [autopilotMode, setAutopilotMode] = useState(false);
  const autopilotTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastQAPairsRef = useRef([]); // Store last 3 Q&A pairs for context
  
  // Q&A History state for preserving questions and answers
  const [qaHistory, setQaHistory] = useState([]);
  
  // Current metadata state for the latest response
  const [currentMetadata, setCurrentMetadata] = useState({ language: null, topic: null });
  
  // Session management
  const {
    currentSession,
    loadSession,
    addQuestionToSession,
    endSession,
    pauseSession,
    resumeSession,
    hasActiveSession,
    isSessionActive,
    saveTranscriptMessages,
    getTranscriptMessages,
    updateTranscriptMessages,
    deleteTranscriptMessage
  } = useSessionManager();
  
  // Session loading state
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  
  // Transcript save state
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedMessageCount, setLastSavedMessageCount] = useState(0);
  const inactivityTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  
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
    restoreMessages,
    connect: connectRealtime,
    disconnect: disconnectRealtime
  } = useRealtimeTranscription();


  const broadcastChannelRef = useRef(null); // BroadcastChannel for AI response sync
  
  // Microphone selection state (for compatibility - realtime uses default)
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);
  
  // Camera selection state
  const [selectedCamera, setSelectedCamera] = useState(null);
  
  // Role selection state
  const [selectedRole, setSelectedRole] = useState(() => {
    // Load from localStorage or default to frontend
    const saved = localStorage.getItem('selectedRole');
    return saved || 'frontend';
  });

  // Get current role data
  const currentRoleData = rolesConfig.roles.find(role => role.id === selectedRole) || rolesConfig.roles[0];
  
  // Format last saved time for display
  const getLastSavedText = () => {
    if (!lastSaveTime) return 'Never saved';
    
    const now = new Date();
    const diffMs = now - lastSaveTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} sec ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else {
      return `${diffHours}h ${diffMinutes % 60}m ago`;
    }
  };
  
  // Update last saved text every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Camera modal state for layout adjustment
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Handle role selection
  const handleRoleSelect = useCallback((roleId) => {
    setSelectedRole(roleId);
    localStorage.setItem('selectedRole', roleId);
  }, []);

  // Handle camera modal state changes
  const handleCameraModalToggle = useCallback((isOpen) => {
    setIsCameraModalOpen(isOpen);
  }, []);

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

  // Load session on component mount
  useEffect(() => {
    console.log('🚀 Session useEffect triggered with sessionId:', sessionId);
    const initializeSession = async () => {
      if (!sessionId) {
        setSessionError('No session ID provided');
        setIsLoadingSession(false);
        return;
      }

      try {
        setIsLoadingSession(true);
        setSessionError('');
        
        const session = await loadSession(sessionId);
        console.log('📋 Session loaded:', session);
        if (session) {
          // Load Q&A history from the session
          if (session.questions) {
            const qaEntries = session.questions.map((q, index) => ({
              id: `session_${q._id || index}`,
              question: q.question,
              answer: q.answer,
              language: q.language,
              topic: q.topic,
              timestamp: q.timestamp,
              isExpanded: false,
              sessionId: session._id
            }));
            setQaHistory(qaEntries);
          }

          // Load transcript messages from the session
          try {
            console.log('🔄 Attempting to load transcript messages for session:', sessionId);
            const transcriptData = await getTranscriptMessages(sessionId);
            console.log('📦 Raw transcript data received:', transcriptData);
            
            if (transcriptData && transcriptData.length > 0) {
              // Convert database format to frontend messageHistory format
              const restoredMessages = transcriptData.map(msg => ({
                id: msg.message_id,
                text: msg.text,
                timestamp: msg.timestamp,
                isPartial: msg.is_partial,
                silenceSegmented: msg.silence_segmented,
                hasSilenceGap: msg.has_silence_gap,
                lastActivityTime: msg.last_activity_time
              }));
              
              // Sort messages by timestamp (oldest first -> newest last for natural conversation flow)
              restoredMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              
              console.log('📂 Restored transcript messages:', restoredMessages.length, 'messages in chronological order');
              
              // Restore messages to the transcript display
              restoreMessages(restoredMessages);
              
              // Update save state
              setLastSavedMessageCount(restoredMessages.length);
              
              // Set last save time to the most recent message timestamp
              if (restoredMessages.length > 0) {
                const lastMessage = restoredMessages.sort((a, b) => 
                  new Date(b.timestamp) - new Date(a.timestamp)
                )[0];
                setLastSaveTime(new Date(lastMessage.timestamp));
              }
            }
          } catch (error) {
            console.error('Error loading transcript messages:', error);
            // Don't fail session loading if transcript loading fails
          }
        } else {
          setSessionError('Session not found');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        setSessionError('Failed to load session');
      } finally {
        setIsLoadingSession(false);
      }
    };

    initializeSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, loadSession]);

  // Session management handlers
  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleEndSession = async () => {
    if (window.confirm('Are you sure you want to end this session? This will mark it as completed.')) {
      // Save transcript before ending session
      await saveTranscriptToSession(true); // Immediate save
      await endSession();
      navigate('/');
    }
  };

  const handlePauseSession = async () => {
    // Save transcript before pausing session
    await saveTranscriptToSession(true); // Immediate save
    await pauseSession();
    navigate('/');
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
  const saveQAToHistory = async (prompt, answer) => {
    // Check if AI response is "IGNORE" - if so, don't save to history
    if (answer && answer.trim().toUpperCase() === 'IGNORE') {
      console.log('🚫 AI response is "IGNORE" - skipping save to history');
      return;
    }
    
    const originalQuestion = extractQuestionFromPrompt(prompt);
    
    console.log('💾 Saving Q&A to history:', { originalQuestion, answer });
    
    // Extract metadata from the AI response
    const { language, topic, cleanedContent } = extractMetadataFromResponse(answer);
    console.log('📊 Extracted metadata:', { language, topic });
    
    // Update current metadata for the ResponsePanel
    setCurrentMetadata({ language, topic });
    
    // Helper function to save to MongoDB session
    const saveToSession = async (question, answer, questionType = 'general', lang = null, topicName = null) => {
      if (hasActiveSession && isSessionActive) {
        try {
          await addQuestionToSession({
            question,
            answer,
            question_type: questionType,
            language: lang,
            topic: topicName
          });
        } catch (error) {
          console.error('Failed to save Q&A to session:', error);
        }
      }
    };
    
    // Check if the AI response contains multiple Q&A pairs
    if (hasMultipleQA(cleanedContent)) {
      console.log('💾 Detected multiple Q&A in response, splitting...');
      
      // Use metadata-aware parsing for multi Q&A
      const multiQAList = extractMetadataFromMultiQA(answer);
      
      if (multiQAList.length > 1) {
        console.log('💾 Successfully parsed', multiQAList.length, 'Q&A pairs with metadata');
        
        // Create separate Q&A entries for each parsed pair
        const qaEntries = multiQAList.map((qa, index) => ({
          id: `${generateQAId()}_multi_${index}`,
          question: qa.question, // Use the polished question from AI response
          answer: qa.answer,
          language: qa.language,
          topic: qa.topic,
          timestamp: new Date().toISOString(),
          isExpanded: index === 0, // Only first one expanded
          originalQuestion: originalQuestion, // Keep original transcript for reference
          isMultiQuestionSplit: true,
          splitIndex: index,
          totalSplits: multiQAList.length
        }));
        
        // Save each Q&A pair to MongoDB session with metadata
        for (const qa of multiQAList) {
          await saveToSession(qa.question, qa.answer, 'general', qa.language, qa.topic);
        }
        
        setQaHistory(prev => {
          // Collapse all previous Q&A items and add new entries at the beginning
          const collapsedPrevious = prev.map(qa => ({ ...qa, isExpanded: false }));
          return [...qaEntries, ...collapsedPrevious];
        });
        
        return; // Exit early since we handled the multi-Q&A case
      } else if (multiQAList.length === 1) {
        // Single Q&A from multi-QA extraction, use the parsed data
        const qa = multiQAList[0];
        const qaEntry = {
          id: generateQAId(),
          question: qa.question,
          answer: qa.answer,
          language: qa.language,
          topic: qa.topic,
          timestamp: new Date().toISOString(),
          isExpanded: true
        };
        
        // Save to MongoDB session with metadata
        await saveToSession(qa.question, qa.answer, 'general', qa.language, qa.topic);
        
        setQaHistory(prev => {
          const collapsedPrevious = prev.map(qa => ({ ...qa, isExpanded: false }));
          return [qaEntry, ...collapsedPrevious];
        });
        
        return; // Exit early
      }
    }
    
    // Single Q&A case - handle normally
    console.log('💾 Single Q&A, saving normally');
    const qaEntry = {
      id: generateQAId(),
      question: originalQuestion,
      answer: cleanedContent, // Use cleaned content without metadata lines
      language: language,
      topic: topic,
      timestamp: new Date().toISOString(),
      isExpanded: true
    };
    
    // Save to MongoDB session with metadata
    await saveToSession(originalQuestion, cleanedContent, 'general', language, topic);
    
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

  // Handle Ask AI (with streaming support and abort signal)
  const handleAskAI = async (customPrompt = null, abortSignal = null) => {
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
          const fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: fullPrompt })
          };
          
          // Only add signal if it's provided and not aborted
          if (abortSignal && !abortSignal.aborted) {
            fetchOptions.signal = abortSignal;
          }
          
          const response = await fetch(`${API_BASE_URL}/api/ask-ai-stream`, fetchOptions);

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
                    saveQAToHistory(originalPrompt, data.fullResponse).catch(error => {
                      console.error('Error saving Q&A to history:', error);
                    });
                    
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
          saveQAToHistory(originalPrompt, response.data.answer).catch(error => {
            console.error('Error saving Q&A to history:', error);
          });
          
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

  // Handle photo capture and AI analysis
  const handlePhotoCapture = async (photoData) => {
    try {
      setError('');
      setIsLoadingAI(true);

      console.log('📷 Processing captured photo:', photoData);

      // Convert blob to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          // Remove the data URL prefix to get just the base64 string
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(photoData.blob);
      });

      // Use the button-specific prompt if provided, otherwise use default
      let visionPrompt;
      
      if (photoData.prompt) {
        // Use the specific prompt from the button and enhance with role context
        visionPrompt = photoData.prompt.replace('{role}', selectedRole).replace('{technologies}', currentRoleData?.technologies || 'JavaScript, React');
        console.log('📝 Using button-specific prompt:', visionPrompt);
      } else {
        // Default comprehensive prompt
        visionPrompt = `Please analyze this image and provide a detailed, structured response. Consider these aspects:

1. **What's in the image**: Describe what you see in detail
2. **Context Analysis**: ${photoData.contextText ? `The user was discussing: "${photoData.contextText}". How does this image relate to their discussion?` : 'Analyze any relevant context or setting'}
3. **Key Insights**: What are the most important or interesting aspects?
4. **Technical Details**: If relevant, mention any technical specifications, measurements, or data visible
5. **Actionable Information**: Are there any next steps, recommendations, or actions suggested by what you see?

Please format your response in clear sections for easy reading.`;
        console.log('📝 Using default comprehensive prompt');
      }

      // Call the vision API
      const response = await fetch(`${API_BASE_URL}/api/ask-ai-vision-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: visionPrompt,
          imageBase64: base64,
          contextText: photoData.contextText || ''
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setAiResponse(result.answer);
        
        // Save photo analysis to Q&A history
        const photoQuestion = `📷 Photo Analysis${photoData.contextText ? ` (Context: ${photoData.contextText.substring(0, 50)}...)` : ''}`;
        saveQAToHistory(photoQuestion, result.answer).catch(error => {
          console.error('Error saving photo Q&A to history:', error);
        });

        console.log('✅ Photo analysis completed successfully');
      } else {
        throw new Error(result.error || 'Failed to analyze photo');
      }

    } catch (err) {
      console.error('Error analyzing photo:', err);
      setError(`Failed to analyze photo: ${err.message}`);
    } finally {
      setIsLoadingAI(false);
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

  // Track last processed message to avoid duplicate API calls
  const lastProcessedMessageRef = useRef(null);
  const lastPartialStateRef = useRef(false);
  const lastQuestionTextRef = useRef(''); // Store the question text for Q&A pairing

  // Autopilot mode logic - trigger API call after 1 second of silence
  useEffect(() => {
    if (!autopilotMode) {
      lastProcessedMessageRef.current = null;
      lastPartialStateRef.current = false;
      // Clean up any pending operations when autopilot is disabled
      if (autopilotTimerRef.current) {
        clearTimeout(autopilotTimerRef.current);
        autopilotTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const hadPartialBefore = lastPartialStateRef.current;
    const hasPartialNow = !!partialTranscript;
    lastPartialStateRef.current = hasPartialNow;

    // Detect transition from speech to silence (partial -> no partial)
    if (hadPartialBefore && !hasPartialNow && messageHistory.length > 0) {
      // Speech just ended
      const latestMessage = messageHistory[messageHistory.length - 1];
      
      // Only process if the latest message has content
      if (latestMessage && latestMessage.text) {
        // Cancel any previous API call if running
        if (abortControllerRef.current) {
          console.log('🛑 Cancelling previous API call for updated message');
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        // Clear any existing timer
        if (autopilotTimerRef.current) {
          clearTimeout(autopilotTimerRef.current);
          autopilotTimerRef.current = null;
        }

        // Set 1-second timer for API call
        console.log('🤖 Autopilot: Starting 1-second timer after speech ended');
        autopilotTimerRef.current = setTimeout(async () => {
          console.log('🤖 Autopilot: Triggering API call after 1 second of silence');
          
          // Get the most current message (in case it was updated during the delay)
          const currentLatestMessage = messageHistory[messageHistory.length - 1];
          if (!currentLatestMessage || !currentLatestMessage.text) {
            console.log('🤖 Autopilot: No valid message found, skipping API call');
            return;
          }
          
          // Get the 100 button config for the prompt
          const hundredButtonConfig = buttonConfig.find(btn => btn.id === "100");
          if (!hundredButtonConfig) {
            console.error('100 button config not found for autopilot');
            return;
          }
          
          // Build context history from last 3 Q&A pairs
          let contextHistory = '';
          if (lastQAPairsRef.current.length > 0) {
            contextHistory = '=== CONVERSATION HISTORY (Last 3 exchanges) ===\n';
            lastQAPairsRef.current.forEach((qa, index) => {
              contextHistory += `\n[Exchange ${index + 1}]\n`;
              contextHistory += `Interviewer: ${qa.question}\n`;
              contextHistory += `Your Answer: ${qa.answer.substring(0, 200)}${qa.answer.length > 200 ? '...' : ''}\n`;
            });
            contextHistory += '\n=== END OF HISTORY ===\n\nNEW TRANSCRIPT: ';
          } else {
            contextHistory = 'CONVERSATION HISTORY: This is the first question.\n\nNEW TRANSCRIPT: ';
          }
          
          // Create prompt with context and latest message text
          let autoPrompt = hundredButtonConfig.prompt
            .replace('{contextHistory}', contextHistory)
            .replace('{transcript}', currentLatestMessage.text);
          
          // Create a new abort controller for this specific API call
          const localAbortController = new AbortController();
          abortControllerRef.current = localAbortController;
          
          try {
            // Store the question text for Q&A pairing
            lastQuestionTextRef.current = currentLatestMessage.text;
            
            // Trigger API call with the most current message content
            await handleAskAI(autoPrompt, localAbortController.signal);
          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('🛑 API call was aborted');
            } else {
              console.error('Autopilot API call error:', error);
            }
          } finally {
            // Only clear if this is still the current abort controller
            if (abortControllerRef.current === localAbortController) {
              abortControllerRef.current = null;
            }
          }
        }, 1000); // 1 second delay
      }
    } else if (!hadPartialBefore && hasPartialNow) {
      // New speech just started - cancel any pending autopilot action
      if (autopilotTimerRef.current) {
        console.log('🤖 Autopilot: Cancelled timer due to new speech starting');
        clearTimeout(autopilotTimerRef.current);
        autopilotTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        console.log('🛑 Cancelling ongoing API call due to new speech');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }

    // No cleanup needed here - we handle cleanup when autopilot is disabled
  }, [autopilotMode, partialTranscript, messageHistory]);

  // Update Q&A pairs when we get a new AI response from autopilot
  useEffect(() => {
    if (autopilotMode && aiResponse && lastQuestionTextRef.current) {
      // Don't store if response is IGNORE
      if (aiResponse.trim().toUpperCase() !== 'IGNORE') {
        // Add to Q&A pairs (keep only last 3)
        lastQAPairsRef.current = [
          { 
            question: lastQuestionTextRef.current, 
            answer: aiResponse 
          },
          ...lastQAPairsRef.current.slice(0, 2)
        ];
        
        console.log('📚 Updated Q&A context history:', lastQAPairsRef.current.length, 'pairs stored');
      }
      
      // Clear the stored question
      lastQuestionTextRef.current = '';
    }
  }, [aiResponse, autopilotMode]);

  // Auto-save transcript messages when messageHistory changes
  // Manual save transcript function
  const saveTranscriptToSession = useCallback(async (immediate = false) => {
    if (!hasActiveSession || !messageHistory || messageHistory.length === 0) {
      return;
    }

    // Filter out partial messages - only save finalized ones
    const finalizedMessages = messageHistory.filter(msg => !msg.isPartial);
    
    if (finalizedMessages.length === 0 || finalizedMessages.length === lastSavedMessageCount) {
      return;
    }

    setIsSaving(true);
    try {
      await saveTranscriptMessages(finalizedMessages);
      const now = new Date();
      setLastSaveTime(now);
      setLastSavedMessageCount(finalizedMessages.length);
      console.log('💾 Saved transcript messages:', finalizedMessages.length);
    } catch (error) {
      console.error('Failed to save transcript messages:', error);
      setError('Failed to save transcript');
    } finally {
      setIsSaving(false);
    }
  }, [messageHistory, hasActiveSession, saveTranscriptMessages, lastSavedMessageCount]);

  // Auto-save on new messages (immediate)
  useEffect(() => {
    const finalizedMessages = messageHistory?.filter(msg => !msg.isPartial) || [];
    
    if (finalizedMessages.length > lastSavedMessageCount && hasActiveSession) {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      // Save immediately when new finalized messages appear
      saveTimerRef.current = setTimeout(() => {
        saveTranscriptToSession();
      }, 500); // Small delay to batch rapid messages
    }
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [messageHistory, hasActiveSession, lastSavedMessageCount, saveTranscriptToSession]);

  // 30-second inactivity timer
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      if (hasActiveSession && messageHistory && messageHistory.length > 0) {
        inactivityTimerRef.current = setTimeout(() => {
          saveTranscriptToSession();
          console.log('💾 Auto-saved due to 30s inactivity');
        }, 30000); // 30 seconds
      }
    };

    // Reset timer when new messages arrive or user interacts
    resetInactivityTimer();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [messageHistory, partialTranscript, hasActiveSession, saveTranscriptToSession]);

  // Handle delete group - remove messages by IDs
  const handleDeleteGroup = useCallback((messageIds) => {
    deleteMessages(messageIds);
  }, [deleteMessages]);

  // Handle merge groups - combine messages from two groups
  const handleMergeGroups = useCallback((sourceMessageIds, targetMessageIds, direction) => {
    mergeMessages(sourceMessageIds, targetMessageIds, direction);
  }, [mergeMessages]);

  // Connect to WebSocket on mount
  useEffect(() => {
    console.log('🚀 App starting - connecting to WebSocket proxy');
    connectRealtime();
  }, [connectRealtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectRealtime();
    };
  }, [disconnectRealtime]);

  // Show loading screen while session is loading
  if (isLoadingSession) {
    return (
      <div className="interview-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading interview session...</p>
        </div>
      </div>
    );
  }

  // Show error if session couldn't be loaded
  if (sessionError) {
    return (
      <div className="interview-error">
        <div className="error-container">
          <h2>Session Error</h2>
          <p>{sessionError}</p>
          <button onClick={handleBackToDashboard}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className={`main-content ${isCameraModalOpen ? 'camera-mode' : ''}`}>
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
          // Camera props
          selectedCamera={selectedCamera}
          onCameraSelect={setSelectedCamera}
          onPhotoCapture={handlePhotoCapture}
          // Role props
          selectedRole={selectedRole}
          currentRoleData={currentRoleData}
          rolesConfig={rolesConfig}
          onRoleSelect={handleRoleSelect}
          // Q&A history for tracking processed transcripts
          qaHistory={qaHistory}
          // Message management handlers
          onDeleteGroup={handleDeleteGroup}
          onMergeGroups={handleMergeGroups}
          // Camera modal state handler
          onCameraModalToggle={handleCameraModalToggle}
          // Interview session props
          currentSession={currentSession}
          onBackToDashboard={handleBackToDashboard}
          onPauseSession={handlePauseSession}
          onEndSession={handleEndSession}
          // Save functionality props
          onSaveTranscript={() => saveTranscriptToSession(true)}
          isSaving={isSaving}
          lastSaveTime={lastSaveTime}
          getLastSavedText={getLastSavedText}
          // Autopilot mode props
          autopilotMode={autopilotMode}
          onToggleAutopilot={() => setAutopilotMode(!autopilotMode)}
        />
        {!isCameraModalOpen && (
          <ResponsePanel 
            response={aiResponse}
            isLoading={isLoadingAI}
            isStreaming={isStreaming}
            qaHistory={qaHistory}
            onToggleQA={toggleQAExpansion}
            currentLanguage={currentMetadata.language}
            currentTopic={currentMetadata.topic}
          />
        )}
      </div>
    </div>
  );
}

export default InterviewInterface;