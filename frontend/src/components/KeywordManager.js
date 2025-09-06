import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './KeywordManager.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const KeywordManager = () => {
  const { sessionId } = useParams(); // Will be undefined for /keywords route
  const [keywordAnswers, setKeywordAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    keywords: '',
    question: '',
    answer: '',
    language: '',
    topic: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [expandedLanguages, setExpandedLanguages] = useState(new Set());
  const [expandedTopics, setExpandedTopics] = useState(new Set());

  useEffect(() => {
    loadKeywordAnswers();
  }, [sessionId]);

  // Auto-expand all languages and topics when data loads
  useEffect(() => {
    if (keywordAnswers.length > 0) {
      const hierarchy = {};
      
      keywordAnswers.forEach(answer => {
        const language = answer.metadata?.language || 'Uncategorized';
        const topic = answer.metadata?.topic || 'General';
        
        if (!hierarchy[language]) {
          hierarchy[language] = {};
        }
        if (!hierarchy[language][topic]) {
          hierarchy[language][topic] = {};
        }
      });
      
      const allLanguages = new Set(Object.keys(hierarchy));
      const allTopics = new Set();
      
      Object.entries(hierarchy).forEach(([language, topics]) => {
        Object.keys(topics).forEach(topic => {
          allTopics.add(`${language}-${topic}`);
        });
      });
      
      
      setExpandedLanguages(allLanguages);
      setExpandedTopics(allTopics);
    }
  }, [keywordAnswers]);

  const loadKeywordAnswers = async () => {
    try {
      setLoading(true);
      const endpoint = sessionId 
        ? `${API_BASE_URL}/api/keyword-answers/session/${sessionId}`
        : `${API_BASE_URL}/api/keyword-answers/all`;
      const response = await axios.get(endpoint);
      setKeywordAnswers(response.data);
    } catch (error) {
      console.error('Error loading keyword answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (keywordAnswer) => {
    setEditingId(keywordAnswer._id);
    setSelectedAnswer(keywordAnswer);
    setEditForm({
      keywords: keywordAnswer.keywords.join(', '),
      question: keywordAnswer.question || '',
      answer: keywordAnswer.answer,
      language: keywordAnswer.metadata?.language || '',
      topic: keywordAnswer.metadata?.topic || ''
    });
  };

  const handleSelectAnswer = (keywordAnswer) => {
    setSelectedAnswer(keywordAnswer);
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/keyword-answers/${editingId}`, editForm);
      setEditingId(null);
      setEditForm({ keywords: '', question: '', answer: '' });
      loadKeywordAnswers(); // Reload the data
    } catch (error) {
      console.error('Error updating keyword answer:', error);
      alert('Failed to update keyword answer');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ keywords: '', question: '', answer: '', language: '', topic: '' });
  };

  // Build hierarchical structure: Language -> Topic -> Keywords -> Answers
  const buildHierarchy = () => {
    const hierarchy = {};
    
    keywordAnswers.forEach(answer => {
      const language = answer.metadata?.language || 'Uncategorized';
      const topic = answer.metadata?.topic || 'General';
      
      if (!hierarchy[language]) {
        hierarchy[language] = {};
      }
      if (!hierarchy[language][topic]) {
        hierarchy[language][topic] = {};
      }
      
      answer.keywords.forEach(keyword => {
        if (!hierarchy[language][topic][keyword]) {
          hierarchy[language][topic][keyword] = [];
        }
        hierarchy[language][topic][keyword].push(answer);
      });
    });
    
    return hierarchy;
  };

  const toggleLanguage = (language) => {
    const newExpanded = new Set(expandedLanguages);
    if (newExpanded.has(language)) {
      newExpanded.delete(language);
    } else {
      newExpanded.add(language);
    }
    setExpandedLanguages(newExpanded);
  };

  const toggleTopic = (language, topic) => {
    const topicKey = `${language}-${topic}`;
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    setExpandedTopics(newExpanded);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this keyword answer?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/keyword-answers/${id}`);
        loadKeywordAnswers(); // Reload the data
      } catch (error) {
        console.error('Error deleting keyword answer:', error);
        alert('Failed to delete keyword answer');
      }
    }
  };

  if (loading) {
    return (
      <div className="keyword-manager loading">
        <div className="loading-spinner">Loading keyword answers...</div>
      </div>
    );
  }

  const hierarchy = buildHierarchy();

  return (
    <div className="keyword-manager">
      <div className="manager-header">
        <h2>{sessionId ? 'Keyword Answer Manager' : 'All Keywords Manager'}</h2>
        <div className="header-info">
          <span className="session-info">
            {sessionId ? `Session: ${sessionId.substring(0, 8)}...` : 'All Sessions'}
          </span>
          <span className="count-info">{keywordAnswers.length} stored answers</span>
        </div>
      </div>

      <div className="manager-layout">
        {/* Sidebar Menu */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>📚 {sessionId ? 'Knowledge Base' : 'Global Knowledge Base'}</h3>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search"
            />
          </div>

          <div className="hierarchy-tree">
            {Object.keys(hierarchy).length === 0 ? (
              <div className="empty-sidebar">No keyword answers stored yet.</div>
            ) : (
              Object.entries(hierarchy).map(([language, topics]) => (
                <div key={language} className="language-node">
                  <div 
                    className="language-header"
                    onClick={() => toggleLanguage(language)}
                  >
                    <span className="expand-icon">
                      {expandedLanguages.has(language) ? '📂' : '📁'}
                    </span>
                    <span className="language-name">{language}</span>
                    <span className="count-badge">
                      {Object.values(topics).reduce((acc, keywords) => 
                        acc + Object.values(keywords).reduce((acc2, answers) => acc2 + answers.length, 0), 0
                      )}
                    </span>
                  </div>

                  {expandedLanguages.has(language) && (
                    <div className="topics-container">
                      {Object.entries(topics).map(([topic, keywords]) => {
                        const topicKey = `${language}-${topic}`;
                        return (
                          <div key={topicKey} className="topic-node">
                            <div 
                              className="topic-header"
                              onClick={() => toggleTopic(language, topic)}
                            >
                              <span className="expand-icon">
                                {expandedTopics.has(topicKey) ? '📖' : '📘'}
                              </span>
                              <span className="topic-name">{topic}</span>
                              <span className="count-badge">
                                {Object.values(keywords).reduce((acc, answers) => acc + answers.length, 0)}
                              </span>
                            </div>

                            {expandedTopics.has(topicKey) && (
                              <div className="keywords-container">
                                {Object.entries(keywords).map(([keyword, answers]) => (
                                  <div key={keyword} className="keyword-node">
                                    <div 
                                      className={`keyword-item ${selectedAnswer && answers.includes(selectedAnswer) ? 'active' : ''}`}
                                      onClick={() => handleSelectAnswer(answers[0])}
                                    >
                                      <span className="keyword-icon">🔖</span>
                                      <span className="keyword-text">{keyword}</span>
                                      {answers.length > 1 && (
                                        <span className="count-badge">{answers.length}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="detail-view">
          {!selectedAnswer ? (
            <div className="no-selection">
              <h3>👈 Select a keyword from the sidebar</h3>
              <p>Choose a keyword from the hierarchical menu to view and edit its answer.</p>
            </div>
          ) : (
            <div className="answer-detail">
              {editingId === selectedAnswer._id ? (
                // Edit Mode
                <div className="edit-form-detail">
                  <h3>✏️ Edit Keyword Answer</h3>
                  
                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Language:</label>
                      <input
                        type="text"
                        value={editForm.language}
                        onChange={(e) => setEditForm({...editForm, language: e.target.value})}
                        className="form-input"
                        placeholder="e.g., Angular, React, JavaScript"
                      />
                    </div>
                    
                    <div className="form-group half-width">
                      <label>Topic:</label>
                      <input
                        type="text"
                        value={editForm.topic}
                        onChange={(e) => setEditForm({...editForm, topic: e.target.value})}
                        className="form-input"
                        placeholder="e.g., Components, Hooks, Directives"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Keywords (comma-separated):</label>
                    <input
                      type="text"
                      value={editForm.keywords}
                      onChange={(e) => setEditForm({...editForm, keywords: e.target.value})}
                      className="form-input"
                      placeholder="e.g., react hooks, useState, component lifecycle"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Question (optional):</label>
                    <input
                      type="text"
                      value={editForm.question}
                      onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                      className="form-input"
                      placeholder="Original question..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Answer:</label>
                    <textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm({...editForm, answer: e.target.value})}
                      className="form-textarea"
                      rows="12"
                      placeholder="Answer content..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button onClick={handleSaveEdit} className="btn-save">💾 Save Changes</button>
                    <button onClick={handleCancelEdit} className="btn-cancel">❌ Cancel</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="answer-display">
                  <div className="answer-header">
                    <div className="metadata-info">
                      <span className="language-badge">{selectedAnswer.metadata?.language || 'Uncategorized'}</span>
                      <span className="topic-badge">{selectedAnswer.metadata?.topic || 'General'}</span>
                      {!sessionId && (
                        <span className="session-badge">Session: {selectedAnswer.sessionId?.substring(0, 8)}...</span>
                      )}
                    </div>
                    
                    <div className="answer-actions">
                      <button 
                        onClick={() => handleEdit(selectedAnswer)}
                        className="btn-edit"
                        title="Edit this answer"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(selectedAnswer._id)}
                        className="btn-delete"
                        title="Delete this answer"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="keywords-display">
                    <h4>🔖 Keywords:</h4>
                    <div className="keywords-list">
                      {selectedAnswer.keywords.map((keyword, index) => (
                        <span key={index} className="keyword-chip">{keyword}</span>
                      ))}
                    </div>
                  </div>
                  
                  {selectedAnswer.question && (
                    <div className="question-display">
                      <h4>❓ Question:</h4>
                      <p className="question-text">{selectedAnswer.question}</p>
                    </div>
                  )}
                  
                  <div className="answer-display-section">
                    <h4>💡 Answer:</h4>
                    <div className="answer-text">{selectedAnswer.answer}</div>
                  </div>
                  
                  <div className="answer-footer">
                    <span className="date-info">
                      Created: {new Date(selectedAnswer.createdAt).toLocaleString()}
                    </span>
                    {selectedAnswer.updatedAt && selectedAnswer.updatedAt !== selectedAnswer.createdAt && (
                      <span className="date-info">
                        Updated: {new Date(selectedAnswer.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordManager;
