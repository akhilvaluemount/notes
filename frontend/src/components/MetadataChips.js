import React from 'react';
import './MetadataChips.css';

/**
 * MetadataChips component to display language and topic as chips
 */
const MetadataChips = ({ language, topic, className = '' }) => {
  // Don't render anything if no metadata
  if (!language && !topic) {
    return null;
  }

  return (
    <div className={`metadata-chips ${className}`}>
      {language && (
        <span className={`metadata-chip language-chip ${getLanguageChipClass(language)}`}>
          <span className="chip-icon">💻</span>
          <span className="chip-text">{language}</span>
        </span>
      )}
      {topic && (
        <span className="metadata-chip topic-chip">
          <span className="chip-icon">🏷️</span>
          <span className="chip-text">{topic}</span>
        </span>
      )}
    </div>
  );
};

/**
 * Get appropriate CSS class for language chip based on language
 */
const getLanguageChipClass = (language) => {
  if (!language) return '';
  
  const languageColors = {
    'JavaScript': 'js-chip',
    'TypeScript': 'ts-chip',
    'Python': 'python-chip',
    'Java': 'java-chip',
    'React': 'react-chip',
    'Angular': 'angular-chip',
    'Vue': 'vue-chip',
    'HTML': 'html-chip',
    'CSS': 'css-chip',
    'Node.js': 'nodejs-chip',
    'C++': 'cpp-chip',
    'C#': 'csharp-chip',
    'PHP': 'php-chip',
    'Ruby': 'ruby-chip',
    'Go': 'go-chip',
    'Rust': 'rust-chip',
    'Swift': 'swift-chip',
    'Kotlin': 'kotlin-chip',
    'SQL': 'sql-chip',
    'General': 'general-chip'
  };
  
  return languageColors[language] || 'default-chip';
};

export default MetadataChips;