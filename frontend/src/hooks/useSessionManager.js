import { useState, useEffect, useCallback } from 'react';
import sessionApi from '../services/sessionApi';

const useSessionManager = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [existingSessions, setExistingSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Load all existing sessions
  const loadExistingSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      setSessionError('');
      const sessions = await sessionApi.getAllSessions();
      setExistingSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessionError('Failed to load existing sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load a specific session
  const loadSession = useCallback(async (sessionId) => {
    try {
      const session = await sessionApi.getSession(sessionId);
      if (session) {
        setCurrentSession(session);
        localStorage.setItem('currentSessionId', sessionId);
        return session;
      } else {
        console.warn('Session not found:', sessionId);
        localStorage.removeItem('currentSessionId');
        setCurrentSession(null);
        return null;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setSessionError('Failed to load session');
      localStorage.removeItem('currentSessionId');
      setCurrentSession(null);
      return null;
    }
  }, []);

  // Create a new session
  const createSession = useCallback(async (sessionData) => {
    try {
      setSessionError('');
      const newSession = await sessionApi.createSession(sessionData);
      setCurrentSession(newSession);
      localStorage.setItem('currentSessionId', newSession._id);
      await loadExistingSessions(); // Refresh the sessions list
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      setSessionError('Failed to create session');
      throw error;
    }
  }, [loadExistingSessions]);

  // Add Q&A to current session
  const addQuestionToSession = useCallback(async (questionData) => {
    if (!currentSession) {
      console.warn('No active session to add question to');
      return null;
    }

    try {
      const questionEntry = await sessionApi.addQuestionToSession(currentSession._id, questionData);
      
      // Update the current session with the new question
      setCurrentSession(prevSession => ({
        ...prevSession,
        questions: [...(prevSession.questions || []), questionEntry],
        updated_at: new Date().toISOString()
      }));
      
      return questionEntry;
    } catch (error) {
      console.error('Error adding question to session:', error);
      setSessionError('Failed to save question to session');
      return null;
    }
  }, [currentSession]);

  // Update session status
  const updateSessionStatus = useCallback(async (status) => {
    if (!currentSession) return null;

    try {
      const updatedSession = await sessionApi.updateSessionStatus(currentSession._id, status);
      setCurrentSession(updatedSession);
      await loadExistingSessions(); // Refresh the sessions list
      return updatedSession;
    } catch (error) {
      console.error('Error updating session status:', error);
      setSessionError('Failed to update session status');
      return null;
    }
  }, [currentSession, loadExistingSessions]);

  // End current session
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await updateSessionStatus('completed');
      setCurrentSession(null);
      localStorage.removeItem('currentSessionId');
    } catch (error) {
      console.error('Error ending session:', error);
      setSessionError('Failed to end session');
    }
  }, [currentSession, updateSessionStatus]);

  // Pause session
  const pauseSession = useCallback(async () => {
    return updateSessionStatus('paused');
  }, [updateSessionStatus]);

  // Resume session
  const resumeSession = useCallback(async () => {
    return updateSessionStatus('active');
  }, [updateSessionStatus]);

  // Delete session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await sessionApi.deleteSession(sessionId);
      await loadExistingSessions(); // Refresh the sessions list
      
      // If we deleted the current session, clear it
      if (currentSession && currentSession._id === sessionId) {
        setCurrentSession(null);
        localStorage.removeItem('currentSessionId');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setSessionError('Failed to delete session');
    }
  }, [currentSession, loadExistingSessions]);

  // Clear current session without changing status
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    localStorage.removeItem('currentSessionId');
  }, []);

  // Get session statistics
  const getSessionStats = useCallback(() => {
    if (!currentSession) return null;

    const questions = currentSession.questions || [];
    return {
      totalQuestions: questions.length,
      questionTypes: questions.reduce((acc, q) => {
        acc[q.question_type || 'general'] = (acc[q.question_type || 'general'] || 0) + 1;
        return acc;
      }, {}),
      sessionDuration: new Date() - new Date(currentSession.created_at),
      lastActivity: questions.length > 0 ? new Date(questions[questions.length - 1].timestamp) : null
    };
  }, [currentSession]);

  // Load existing sessions on mount
  useEffect(() => {
    const initializeSessions = async () => {
      try {
        await loadExistingSessions();
        
        // Try to restore session from localStorage
        const savedSessionId = localStorage.getItem('currentSessionId');
        if (savedSessionId) {
          await loadSession(savedSessionId);
        }
      } catch (error) {
        console.error('Error initializing sessions:', error);
        setSessionError('Failed to initialize sessions');
      }
    };

    initializeSessions();
  }, [loadExistingSessions, loadSession]);

  return {
    // State
    currentSession,
    existingSessions,
    isLoadingSessions,
    sessionError,
    
    // Actions
    createSession,
    loadSession,
    addQuestionToSession,
    updateSessionStatus,
    endSession,
    pauseSession,
    resumeSession,
    deleteSession,
    clearCurrentSession,
    loadExistingSessions,
    
    // Computed
    getSessionStats,
    
    // Helper
    hasActiveSession: !!currentSession,
    isSessionActive: currentSession?.status === 'active',
    isSessionPaused: currentSession?.status === 'paused'
  };
};

export default useSessionManager;