import React from 'react';
import './FormattedResponse.css';

const FormattedResponse = ({ response }) => {
  // Simple fallback if response is empty or just whitespace
  if (!response || !response.trim()) {
    return (
      <div className="formatted-response">
        <div className="empty-state">No response received</div>
      </div>
    );
  }

  // Parse text with markdown-like formatting
  const parseFormattedText = (text) => {
    if (!text) return text;
    
    // Handle **bold** text
    let parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      // Check for bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index}>{content}</strong>;
      }
      
      // Check for inline code with backticks
      const codeParts = part.split(/(`[^`]+`|\*\w+[\w-]*|\[\w+\])/g);
      
      return codeParts.map((subPart, subIndex) => {
        const key = `${index}-${subIndex}`;
        
        // Handle backtick code
        if (subPart.startsWith('`') && subPart.endsWith('`')) {
          return <code key={key} className="inline-code">{subPart.slice(1, -1)}</code>;
        }
        
        // Handle Angular directives like *ngIf, *ngFor
        if (subPart.match(/^\*ng\w+/)) {
          return <code key={key} className="inline-code">{subPart}</code>;
        }
        
        // Handle attribute directives like [ngClass]
        if (subPart.match(/^\[\w+\]/)) {
          return <code key={key} className="inline-code">{subPart}</code>;
        }
        
        return subPart;
      });
    }).flat();
  };

  // Parse the response to extract different sections
  const parseResponse = (text) => {
    const sections = {
      definition: [],
      explanation: [],
      examples: [],
      keyPoints: []
    };

    // Split by lines and process
    const lines = text.split('\n');
    let currentSection = '';
    let codeBlock = false;
    let codeContent = [];
    let codeLanguage = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (codeBlock) {
          // End of code block
          if (currentSection === 'examples') {
            sections.examples.push({
              type: 'code',
              content: codeContent.join('\n'),
              language: codeLanguage || 'javascript'
            });
          }
          codeContent = [];
          codeLanguage = '';
          codeBlock = false;
        } else {
          // Start of code block
          codeBlock = true;
          codeLanguage = trimmedLine.replace('```', '') || 'javascript';
        }
        continue;
      }
      
      if (codeBlock) {
        codeContent.push(line);
        continue;
      }
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Detect sections based on headers (case insensitive)
      if (trimmedLine.match(/^definition:?$/i)) {
        currentSection = 'definition';
        continue;
      }
      else if (trimmedLine.match(/^explanation\s+(of\s+)?concepts?:?$/i)) {
        currentSection = 'explanation';
        continue;
      }
      else if (trimmedLine.match(/^examples?:?$/i)) {
        currentSection = 'examples';
        continue;
      }
      else if (trimmedLine.match(/^key\s+points?:?$/i)) {
        currentSection = 'keyPoints';
        continue;
      }
      
      // Handle content based on current section
      if (currentSection === 'definition') {
        sections.definition.push({ type: 'text', content: trimmedLine });
      }
      else if (currentSection === 'explanation') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          sections.explanation.push({ type: 'bullet', content: trimmedLine.substring(1).trim() });
        } else {
          sections.explanation.push({ type: 'text', content: trimmedLine });
        }
      }
      else if (currentSection === 'examples') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          sections.examples.push({ type: 'bullet', content: trimmedLine.substring(1).trim() });
        } else if (trimmedLine.match(/^[\w\s]+Example:?$/i)) {
          sections.examples.push({ type: 'example-header', content: trimmedLine });
        } else {
          sections.examples.push({ type: 'text', content: trimmedLine });
        }
      }
      else if (currentSection === 'keyPoints') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          sections.keyPoints.push({ type: 'bullet', content: trimmedLine.substring(1).trim() });
        } else if (trimmedLine.match(/^[\w\s]+:$/)) {
          sections.keyPoints.push({ type: 'subheader', content: trimmedLine });
        } else {
          sections.keyPoints.push({ type: 'text', content: trimmedLine });
        }
      }
    }

    return sections;
  };

  // Try to parse the response
  const sections = parseResponse(response);
  
  // If parsing doesn't produce meaningful sections, display as plain text
  const hasContent = sections.definition.length > 0 || sections.explanation.length > 0 || 
                    sections.examples.length > 0 || sections.keyPoints.length > 0;
  
  if (!hasContent) {
    // Fallback: Display the raw response with better formatting
    const paragraphs = response.split('\n\n').filter(p => p.trim());
    
    return (
      <div className="formatted-response">
        <div className="response-section fallback-section">
          <div className="section-header">
            <span className="section-icon">📄</span>
            <h3>Response</h3>
          </div>
          <div className="response-raw">
            {paragraphs.length > 1 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index} className="response-paragraph">
                  {parseFormattedText(paragraph.trim())}
                </p>
              ))
            ) : (
              response.split(/\.\s+/).filter(sentence => sentence.trim()).map((sentence, index) => (
                <div key={index} className="response-sentence">
                  • {parseFormattedText(sentence.trim())}
                  {!sentence.endsWith('.') && '.'}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="formatted-response">
      {sections.definition.length > 0 && (
        <div className="response-section definition-section">
          <div className="section-header">
            <span className="section-icon">📖</span>
            <h3>Definition</h3>
          </div>
          <div className="definition-content">
            {sections.definition.map((item, index) => (
              <p key={index} className="definition-text">
                {parseFormattedText(item.content)}
              </p>
            ))}
          </div>
        </div>
      )}

      {sections.explanation.length > 0 && (
        <div className="response-section explanation-section">
          <div className="section-header">
            <span className="section-icon">💡</span>
            <h3>Explanation of Concepts</h3>
          </div>
          <div className="explanation-content">
            {sections.explanation.map((item, index) => {
              if (item.type === 'bullet') {
                return (
                  <div key={index} className="explanation-bullet">
                    • {parseFormattedText(item.content)}
                  </div>
                );
              } else {
                return (
                  <p key={index} className="explanation-text">
                    {parseFormattedText(item.content)}
                  </p>
                );
              }
            })}
          </div>
        </div>
      )}

      {sections.examples.length > 0 && (
        <div className="response-section examples-section">
          <div className="section-header">
            <span className="section-icon">📌</span>
            <h3>Examples</h3>
          </div>
          <div className="examples-list">
            {sections.examples.map((example, index) => {
              if (example.type === 'code') {
                return (
                  <pre key={index} className="code-block">
                    <code className={`language-${example.language}`}>{example.content}</code>
                  </pre>
                );
              } else if (example.type === 'bullet') {
                return (
                  <div key={index} className="example-item">
                    • {parseFormattedText(example.content)}
                  </div>
                );
              } else if (example.type === 'example-header') {
                return (
                  <h4 key={index} className="example-header">
                    {parseFormattedText(example.content)}
                  </h4>
                );
              } else {
                return (
                  <div key={index} className="example-text">
                    {parseFormattedText(example.content)}
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {sections.keyPoints.length > 0 && (
        <div className="response-section keypoints-section">
          <div className="section-header">
            <span className="section-icon">🔑</span>
            <h3>Key Points</h3>
          </div>
          <div className="keypoints-list">
            {sections.keyPoints.map((point, index) => {
              if (point.type === 'bullet') {
                return (
                  <div key={index} className="keypoint-item">
                    • {parseFormattedText(point.content)}
                  </div>
                );
              } else if (point.type === 'subheader') {
                return (
                  <h4 key={index} className="keypoint-subheader">
                    {parseFormattedText(point.content)}
                  </h4>
                );
              } else {
                return (
                  <p key={index} className="keypoint-text">
                    {parseFormattedText(point.content)}
                  </p>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormattedResponse;