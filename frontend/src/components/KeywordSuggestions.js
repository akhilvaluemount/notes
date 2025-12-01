import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KeywordSuggestions.css';

// Use relative URL for production (Vercel), localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? 'https://notes-topaz-six.vercel.app' : 'http://localhost:5001'
);

const KeywordSuggestions = ({ sessionId, messageText, onSuggestionClick }) => {
  const [suggestions, setSuggestions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !messageText || messageText.length < 5) {
      setSuggestions({});
      return;
    }

    const searchKeywords = async () => {
      setLoading(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/api/keyword-answers/search`, {
          sessionId,
          text: messageText
        });
        
        if (response.data.suggestions && Object.keys(response.data.suggestions).length > 0) {
          setSuggestions(response.data.suggestions);
        } else {
          setSuggestions({});
        }
      } catch (error) {
        console.error('Error searching keywords:', error);
        setSuggestions({});
      } finally {
        setLoading(false);
      }
    };

    // Increase debounce for streaming text to reduce API calls
    const debounceDelay = messageText.length < 20 ? 800 : 500;
    const timeoutId = setTimeout(searchKeywords, debounceDelay);
    return () => clearTimeout(timeoutId);
  }, [sessionId, messageText]);

  const handleSuggestionClick = (keyword, answerData) => {
    if (onSuggestionClick) {
      onSuggestionClick(answerData.answer, answerData.question, answerData.metadata);
    }
  };

  if (loading) {
    return (
      <div className="keyword-suggestions loading">
        <span className="loading-text">🔍 Searching for keywords...</span>
      </div>
    );
  }

  const keywords = Object.keys(suggestions);
  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="keyword-suggestions">
      <div className="suggestions-container">
        <span className="suggestions-label">📌 Matched Keywords:</span>
        <div className="keyword-chips">
          {keywords.map((keyword) => {
            // Get the first answer for this keyword (usually they're all similar)
            const firstAnswer = suggestions[keyword][0];
            const isExactMatch = firstAnswer.matchType === 'exact';
            const isSubstringMatch = firstAnswer.matchType === 'substring';
            const isFuzzyMatch = firstAnswer.matchType === 'fuzzy';
            const similarity = firstAnswer.similarity;
            
            let chipClass = 'exact-match';
            let tooltip = `Exact match: "${keyword}"`;
            
            if (isSubstringMatch) {
              chipClass = 'substring-match';
              tooltip = `Contains: "${firstAnswer.sourceWord}" in "${firstAnswer.matchedWord}"`;
            } else if (isFuzzyMatch) {
              chipClass = 'fuzzy-match';
              tooltip = `${similarity}% match: "${firstAnswer.matchedWord}" ≈ "${firstAnswer.sourceWord}"`;
            }
            
            return (
              <button
                key={keyword}
                className={`keyword-chip ${chipClass}`}
                onClick={() => handleSuggestionClick(keyword, firstAnswer)}
                title={tooltip}
              >
                <span className="chip-text">{keyword}</span>
                {!isExactMatch && (
                  <span className="similarity-badge">{similarity}%</span>
                )}
                {suggestions[keyword].length > 1 && (
                  <span className="chip-count">+{suggestions[keyword].length - 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KeywordSuggestions;