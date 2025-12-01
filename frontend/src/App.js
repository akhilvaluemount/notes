import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import InterviewDashboard from './pages/InterviewDashboard';
import InterviewInterface from './pages/InterviewInterface';
import ExamInterface from './pages/ExamInterface';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ExamDashboard from './pages/ExamDashboard';
import NotesView from './components/NotesView';
import KeywordManager from './components/KeywordManager';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Auth routes - public */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Dashboard route - protected */}
              <Route path="/" element={
                <ProtectedRoute>
                  <InterviewDashboard />
                </ProtectedRoute>
              } />

              {/* Interview interface route - protected */}
              <Route path="/interview/:sessionId" element={
                <ProtectedRoute>
                  <InterviewInterface />
                </ProtectedRoute>
              } />

              {/* Exam interface route - protected, requires exam access */}
              <Route path="/exam/:examId" element={
                <ProtectedRoute requireExamAccess allowExamOnly>
                  <ExamInterface />
                </ProtectedRoute>
              } />

              {/* Exam Dashboard for exam-only users */}
              <Route path="/exam-dashboard" element={
                <ProtectedRoute allowExamOnly>
                  <ExamDashboard />
                </ProtectedRoute>
              } />

              {/* Admin Dashboard - admin only */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Notes view route - for formatted AI responses in new tab */}
              <Route path="/notes" element={<NotesView />} />

              {/* Keyword Manager routes - protected */}
              <Route path="/keywords" element={
                <ProtectedRoute>
                  <KeywordManager />
                </ProtectedRoute>
              } />
              <Route path="/keywords/:sessionId" element={
                <ProtectedRoute>
                  <KeywordManager />
                </ProtectedRoute>
              } />

              {/* Redirect any unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
