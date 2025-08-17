import React, { useState } from 'react';
import './MultiQADisplay.css';
import FormattedResponse from './FormattedResponse';
import { parseMultiQAResponse, hasMultipleQA, formatQAPair } from '../utils/multiQAParser';

/**
 * Component to display multiple Q&A pairs from a single AI response
 */
const MultiQADisplay = ({ response, isStreaming = false }) => {
  const [expandedQA, setExpandedQA] = useState(new Set([0])); // First Q&A expanded by default
  
  // Parse the response for multiple Q&A pairs
  const qaList = parseMultiQAResponse(response);
  const hasMultiple = qaList.length > 1;
  
  console.log('🎨 MultiQADisplay - qaList:', qaList);
  console.log('🎨 MultiQADisplay - hasMultiple:', hasMultiple);
  
  // If parsing found some Q&A but not multiple, check if we should force multi-display
  if (qaList.length <= 1 && hasMultipleQA(response)) {
    console.log('🎨 Forcing fallback multi-QA display');
    // Create a fallback single item to show in multi-QA format
    const fallbackQA = [{
      question: "Multiple Questions Detected",
      answer: response
    }];
    
    return (
      <div className="multi-qa-display">
        <div className="multi-qa-header">
          <div className="multi-qa-title">
            <span className="multi-qa-icon">🔍</span>
            <h3>Multiple Questions Detected (Raw Response)</h3>
          </div>
        </div>
        <div className="multi-qa-list">
          <div className="multi-qa-item">
            <div className="multi-qa-content">
              <div className="multi-qa-answer-section">
                <div className="multi-qa-answer-content">
                  <FormattedResponse response={response} />
                  {isStreaming && (
                    <div className="multi-qa-streaming-cursor">
                      <span className="typing-cursor">|</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Toggle expansion of a Q&A pair
  const toggleExpansion = (index) => {
    setExpandedQA(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  // Expand all Q&A pairs
  const expandAll = () => {
    setExpandedQA(new Set(qaList.map((_, index) => index)));
  };
  
  // Collapse all Q&A pairs
  const collapseAll = () => {
    setExpandedQA(new Set());
  };
  
  if (!hasMultiple) {
    // Single response - use regular FormattedResponse
    return <FormattedResponse response={response} />;
  }
  
  return (
    <div className="multi-qa-display">
      <div className="multi-qa-header">
        <div className="multi-qa-title">
          <span className="multi-qa-icon">🔍</span>
          <h3>Multiple Questions Detected ({qaList.length})</h3>
        </div>
        <div className="multi-qa-controls">
          <button 
            className="multi-qa-control-btn expand-all"
            onClick={expandAll}
            title="Expand all questions"
          >
            ⬇️ Expand All
          </button>
          <button 
            className="multi-qa-control-btn collapse-all"
            onClick={collapseAll}
            title="Collapse all questions"
          >
            ⬆️ Collapse All
          </button>
        </div>
      </div>
      
      <div className="multi-qa-list">
        {qaList.map((qa, index) => {
          const isExpanded = expandedQA.has(index);
          const formattedQA = formatQAPair(qa, index);
          
          return (
            <div key={formattedQA.id} className="multi-qa-item">
              <div 
                className="multi-qa-question-header"
                onClick={() => toggleExpansion(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpansion(index);
                  }
                }}
              >
                <div className="multi-qa-question-title">
                  <span className="multi-qa-expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="multi-qa-question-number">
                    Q{formattedQA.index}:
                  </span>
                  <span className="multi-qa-question-text">
                    {formattedQA.question}
                  </span>
                </div>
                <div className="multi-qa-status">
                  {index === 0 && isStreaming && (
                    <span className="multi-qa-streaming">
                      🔴 Live
                    </span>
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="multi-qa-content">
                  <div className="multi-qa-question-section">
                    <div className="multi-qa-section-header">
                      <span className="multi-qa-section-icon">❓</span>
                      <span className="multi-qa-section-title">Question {formattedQA.index}</span>
                    </div>
                    <div className="multi-qa-question-content">
                      {formattedQA.question}
                    </div>
                  </div>
                  
                  <div className="multi-qa-answer-section">
                    <div className="multi-qa-section-header">
                      <span className="multi-qa-section-icon">💡</span>
                      <span className="multi-qa-section-title">Answer {formattedQA.index}</span>
                    </div>
                    <div className="multi-qa-answer-content">
                      <FormattedResponse response={formattedQA.answer} />
                      {index === qaList.length - 1 && isStreaming && (
                        <div className="multi-qa-streaming-cursor">
                          <span className="typing-cursor">|</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {isStreaming && (
        <div className="multi-qa-streaming-indicator">
          <span className="streaming-icon">⚡</span>
          Processing multiple questions...
        </div>
      )}
    </div>
  );
};

export default MultiQADisplay;