import axios from 'axios';

// Use relative URL for production (Vercel), localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001'
);

const sessionApi = {
  // Get all sessions
  getAllSessions: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sessions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Return empty array instead of throwing to prevent runtime errors
      return [];
    }
  },

  // Create a new session
  createSession: async (sessionData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sessions`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  // Get specific session by ID
  getSession: async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching session:', error);
      // Return null instead of throwing to prevent runtime errors
      return null;
    }
  },

  // Update session details
  updateSession: async (sessionId, updateData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/sessions/${sessionId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  // Add question and answer to session
  addQuestionToSession: async (sessionId, questionData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sessions/${sessionId}/questions`, questionData);
      return response.data;
    } catch (error) {
      console.error('Error adding question to session:', error);
      throw error;
    }
  },

  // Update session status
  updateSessionStatus: async (sessionId, status) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/sessions/${sessionId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  // Save transcript messages to session
  saveTranscriptMessages: async (sessionId, messages) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sessions/${sessionId}/transcript`, {
        messages
      });
      return response.data;
    } catch (error) {
      console.error('Error saving transcript messages:', error);
      throw error;
    }
  },

  // Get transcript messages for session
  getTranscriptMessages: async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sessions/${sessionId}/transcript`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transcript messages:', error);
      // Return empty result instead of throwing to prevent runtime errors
      return { messages: [], total_count: 0 };
    }
  },

  // Update transcript messages in session
  updateTranscriptMessages: async (sessionId, messages) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/sessions/${sessionId}/transcript`, {
        messages
      });
      return response.data;
    } catch (error) {
      console.error('Error updating transcript messages:', error);
      throw error;
    }
  },

  // Delete specific transcript message from session
  deleteTranscriptMessage: async (sessionId, messageId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/sessions/${sessionId}/transcript/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting transcript message:', error);
      throw error;
    }
  }
};

export default sessionApi;