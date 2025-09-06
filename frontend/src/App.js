import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InterviewDashboard from './pages/InterviewDashboard';
import InterviewInterface from './pages/InterviewInterface';
import NotesView from './components/NotesView';
import KeywordManager from './components/KeywordManager';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Dashboard route - shows all sessions */}
            <Route path="/" element={<InterviewDashboard />} />
            
            {/* Interview interface route - handles specific session */}
            <Route path="/interview/:sessionId" element={<InterviewInterface />} />
            
            {/* Notes view route - for formatted AI responses in new tab */}
            <Route path="/notes" element={<NotesView />} />
            
            {/* Keyword Manager route - for managing stored keyword answers */}
            <Route path="/keywords/:sessionId" element={<KeywordManager />} />
            
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;