import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ExamSetup from '../components/ExamSetup';
import './ExamDashboard.css';

const ExamDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExamSetupOpen, setIsExamSetupOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); // Track which card menu is open
  const [deletedMcqCount, setDeletedMcqCount] = useState(0); // MCQs from deleted exams
  const [deletedExamCount, setDeletedExamCount] = useState(0); // Count of deleted exams

  useEffect(() => {
    loadExams();
    // Load deleted counts from localStorage
    const storedDeletedMcq = localStorage.getItem(`deletedMcqCount_${user?.id}`);
    const storedDeletedExams = localStorage.getItem(`deletedExamCount_${user?.id}`);
    if (storedDeletedMcq) {
      setDeletedMcqCount(parseInt(storedDeletedMcq, 10));
    }
    if (storedDeletedExams) {
      setDeletedExamCount(parseInt(storedDeletedExams, 10));
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(`examSessions_${user?.id}`);
      if (stored) {
        setExams(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (examData) => {
    const examId = `exam_${Date.now()}`;

    const newExam = {
      id: examId,
      ...examData,
      createdAt: new Date().toISOString(),
      status: 'in_progress'
    };

    const updatedExams = [...exams, newExam];
    setExams(updatedExams);
    localStorage.setItem(`examSessions_${user?.id}`, JSON.stringify(updatedExams));

    setIsExamSetupOpen(false);
    navigate(`/exam/${examId}`, { state: newExam });
  };

  const handleResumeExam = (exam) => {
    navigate(`/exam/${exam.id}`, { state: exam });
  };

  const handleDeleteExam = (examId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    // Find the exam being deleted
    const examToDelete = exams.find(exam => exam.id === examId);

    // Add MCQ count to deletedMcqCount
    if (examToDelete && examToDelete.mcqCount > 0) {
      const newDeletedMcq = deletedMcqCount + examToDelete.mcqCount;
      setDeletedMcqCount(newDeletedMcq);
      localStorage.setItem(`deletedMcqCount_${user?.id}`, newDeletedMcq.toString());
    }

    // Increment deleted exam count
    const newDeletedExams = deletedExamCount + 1;
    setDeletedExamCount(newDeletedExams);
    localStorage.setItem(`deletedExamCount_${user?.id}`, newDeletedExams.toString());

    const updatedExams = exams.filter(e => e.id !== examId);
    setExams(updatedExams);
    localStorage.setItem(`examSessions_${user?.id}`, JSON.stringify(updatedExams));
    setOpenMenuId(null);
  };

  const toggleMenu = (examId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === examId ? null : examId);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Current stats (active exams only)
  const currentExamCount = exams.length;
  const currentMcqCount = exams.reduce((sum, exam) => sum + (exam.mcqCount || 0), 0);

  // Lifetime stats (including deleted)
  const lifetimeExamCount = currentExamCount + deletedExamCount;
  const lifetimeMcqCount = currentMcqCount + deletedMcqCount;

  const handleCloseExam = (examId, e) => {
    if (e) e.stopPropagation();
    const updatedExams = exams.map(exam =>
      exam.id === examId ? { ...exam, status: 'completed' } : exam
    );
    setExams(updatedExams);
    localStorage.setItem(`examSessions_${user?.id}`, JSON.stringify(updatedExams));
    setOpenMenuId(null);
  };

  return (
    <div className="exam-dashboard">
      {/* Compact Header with all actions */}
      <header className="exam-dashboard-header">
        <h1 className="brand-title">MOKITA AI</h1>
        <div className="header-actions">
          <button className="btn-header btn-new" onClick={() => setIsExamSetupOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Stats Panels */}
        <div className="stats-panels">
          {/* Lifetime Stats Panel */}
          <div className="stats-panel lifetime-panel">
            <div className="panel-header">
              <span className="panel-icon">🏆</span>
              <span className="panel-title">All Time</span>
            </div>
            <div className="panel-stats">
              <div className="panel-stat">
                <span className="panel-stat-number">{lifetimeExamCount}</span>
                <span className="panel-stat-label">Exams Taken</span>
              </div>
              <div className="panel-stat">
                <span className="panel-stat-number">{lifetimeMcqCount}</span>
                <span className="panel-stat-label">MCQs Solved</span>
              </div>
            </div>
          </div>

          {/* Current Session Panel */}
          <div className="stats-panel current-panel">
            <div className="panel-header">
              <span className="panel-icon">📊</span>
              <span className="panel-title">Available</span>
            </div>
            <div className="panel-stats">
              <div className="panel-stat">
                <span className="panel-stat-number">{currentExamCount}</span>
                <span className="panel-stat-label">Exams</span>
              </div>
              <div className="panel-stat">
                <span className="panel-stat-number">{currentMcqCount}</span>
                <span className="panel-stat-label">MCQs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="loading-compact">
            <div className="loading-spinner-small"></div>
            <span>Loading...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state-compact">
            <p>No exams yet. Click "New" to start.</p>
          </div>
        ) : (
          <div className="exams-list">
            {exams.map(exam => (
              <div
                key={exam.id}
                className={`exam-row ${exam.status}`}
                onClick={() => exam.status === 'in_progress' && handleResumeExam(exam)}
                style={{ cursor: exam.status === 'completed' ? 'default' : 'pointer' }}
              >
                <div className="exam-row-left">
                  <div className="exam-avatar-small">
                    {(exam.examName || 'E')[0].toUpperCase()}
                  </div>
                  <div className="exam-details">
                    <span className="exam-name">{exam.examName || 'Exam'}</span>
                    <span className="exam-meta">{formatDate(exam.createdAt)}</span>
                  </div>
                </div>
                <div className="exam-row-right">
                  <span className="mcq-badge">{exam.mcqCount || 0} MCQ</span>
                  {exam.status === 'in_progress' && (
                    <span className="status-dot active"></span>
                  )}
                  <button
                    className="row-menu-btn"
                    onClick={(e) => toggleMenu(exam.id, e)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                      <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  {openMenuId === exam.id && (
                    <div className="row-dropdown-menu">
                      {exam.status === 'in_progress' && (
                        <>
                          <button
                            className="dropdown-item continue-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResumeExam(exam);
                            }}
                          >
                            Continue
                          </button>
                          <button
                            className="dropdown-item close-item"
                            onClick={(e) => handleCloseExam(exam.id, e)}
                          >
                            Close Exam
                          </button>
                        </>
                      )}
                      <button
                        className="dropdown-item delete-item"
                        onClick={(e) => handleDeleteExam(exam.id, e)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span className="footer-brand">MOKITA AI</span>
        <button className="footer-menu-btn" onClick={handleLogout} title="Logout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </footer>

      {isExamSetupOpen && (
        <ExamSetup
          isOpen={isExamSetupOpen}
          onClose={() => setIsExamSetupOpen(false)}
          onSubmit={handleStartExam}
        />
      )}
    </div>
  );
};

export default ExamDashboard;
