import React, { useState } from 'react';
import './ExamSetup.css';

const ExamSetup = ({ isOpen, onClose, onSubmit }) => {
  const [examName, setExamName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      examName: examName || 'Exam',
      mcqCount: 0 // Initialize MCQ button usage counter
    });
  };

  if (!isOpen) return null;

  return (
    <div className="exam-setup-overlay">
      <div className="exam-setup-modal">
        <div className="exam-setup-header">
          <h2>Start New Exam</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="examName">Exam Name</label>
            <input
              type="text"
              id="examName"
              name="examName"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Enter exam name"
              autoFocus
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-start">
              Start Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamSetup;
