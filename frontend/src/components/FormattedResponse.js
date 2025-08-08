import React from 'react';
import './FormattedResponse.css';

const FormattedResponse = ({ response }) => {
  console.log('FormattedResponse received response:', response);
  console.log('Response type:', typeof response);
  console.log('Response length:', response?.length);
  
  // Simple fallback if response is empty or just whitespace
  if (!response || !response.trim()) {
    console.log('Response is empty or just whitespace');
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
      
      // Detect sections based on headers (handle ### markdown, **bold** format and plain text)
      if (trimmedLine.match(/^###\s+definition:?$/i) || 
          trimmedLine.match(/^\*?\*?definition\*?\*?:?$/i) || 
          trimmedLine.match(/^definition:?$/i)) {
        currentSection = 'definition';
        console.log('Found Definition section:', trimmedLine);
        continue;
      }
      else if (trimmedLine.match(/^###\s+explanation\s+(of\s+)?concepts?:?$/i) ||
               trimmedLine.match(/^\*?\*?explanation\s+(of\s+)?concepts?\*?\*?:?$/i) || 
               trimmedLine.match(/^explanation\s+(of\s+)?concepts?:?$/i)) {
        currentSection = 'explanation';
        console.log('Found Explanation section:', trimmedLine);
        continue;
      }
      else if (trimmedLine.match(/^###\s+examples?:?$/i) ||
               trimmedLine.match(/^\*?\*?examples?\*?\*?:?$/i) || 
               trimmedLine.match(/^examples?:?$/i)) {
        currentSection = 'examples';
        console.log('Found Examples section:', trimmedLine);
        continue;
      }
      else if (trimmedLine.match(/^###\s+key\s+points?:?$/i) ||
               trimmedLine.match(/^\*?\*?key\s+points?\*?\*?:?$/i) || 
               trimmedLine.match(/^key\s+points?:?$/i)) {
        currentSection = 'keyPoints';
        console.log('Found Key Points section:', trimmedLine);
        continue;
      }
      
      // Handle content based on current section
      if (currentSection === 'definition') {
        sections.definition.push({ type: 'text', content: trimmedLine });
      }
      else if (currentSection === 'explanation') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          // Calculate indentation level based on original line (before trim)
          const leadingSpaces = line.length - line.trimLeft().length;
          const indentLevel = Math.floor(leadingSpaces / 2); // Every 2 spaces = 1 indent level
          sections.explanation.push({ 
            type: 'bullet', 
            content: trimmedLine.substring(1).trim(),
            indent: indentLevel
          });
        } else {
          sections.explanation.push({ type: 'text', content: trimmedLine });
        }
      }
      else if (currentSection === 'examples') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          const leadingSpaces = line.length - line.trimLeft().length;
          const indentLevel = Math.floor(leadingSpaces / 2);
          sections.examples.push({ 
            type: 'bullet', 
            content: trimmedLine.substring(1).trim(),
            indent: indentLevel
          });
        } else if (trimmedLine.match(/^[\w\s]+Example:?$/i)) {
          sections.examples.push({ type: 'example-header', content: trimmedLine });
        } else {
          sections.examples.push({ type: 'text', content: trimmedLine });
        }
      }
      else if (currentSection === 'keyPoints') {
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          const leadingSpaces = line.length - line.trimLeft().length;
          const indentLevel = Math.floor(leadingSpaces / 2);
          sections.keyPoints.push({ 
            type: 'bullet', 
            content: trimmedLine.substring(1).trim(),
            indent: indentLevel
          });
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
  
  // Force parsing by manually extracting sections if parsing failed
  if (sections.definition.length === 0 && sections.explanation.length === 0 && 
      sections.examples.length === 0 && sections.keyPoints.length === 0) {
    
    // Manual section extraction as fallback
    const lines = response.split('\n');
    let currentSection = '';
    let definitionContent = [];
    let explanationContent = [];
    let examplesContent = [];
    let keyPointsContent = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Handle ### markdown, **bold** format and plain text
      const cleanedLine = trimmed.replace(/^###\s+|^\*\*|\*\*$/g, '').toLowerCase();
      
      if (cleanedLine === 'definition' || cleanedLine === 'definition:') {
        currentSection = 'definition';
      } else if (cleanedLine === 'explanation of concepts' || cleanedLine === 'explanation of concepts:') {
        currentSection = 'explanation';
      } else if (cleanedLine === 'examples' || cleanedLine === 'examples:') {
        currentSection = 'examples';
      } else if (cleanedLine === 'key points' || cleanedLine === 'key points:') {
        currentSection = 'keypoints';
      } else {
        // Add content to current section
        if (currentSection === 'definition') {
          definitionContent.push(trimmed);
        } else if (currentSection === 'explanation') {
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            explanationContent.push({
              type: 'bullet',
              content: trimmed.substring(1).trim(),
              indent: indentLevel
            });
          } else {
            explanationContent.push(trimmed);
          }
        } else if (currentSection === 'examples') {
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            examplesContent.push({
              type: 'bullet',
              content: trimmed.substring(1).trim(),
              indent: indentLevel
            });
          } else {
            examplesContent.push(trimmed);
          }
        } else if (currentSection === 'keypoints') {
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            keyPointsContent.push({
              type: 'bullet',
              content: trimmed.substring(1).trim(),
              indent: indentLevel
            });
          } else {
            keyPointsContent.push(trimmed);
          }
        }
      }
    }
    
    // Override sections with manual parsing
    if (definitionContent.length > 0) {
      sections.definition = definitionContent.map(content => ({ type: 'text', content }));
    }
    if (explanationContent.length > 0) {
      sections.explanation = explanationContent.map(content => {
        if (typeof content === 'object' && content.type === 'bullet') {
          return content;
        }
        return { type: 'text', content };
      });
    }
    if (examplesContent.length > 0) {
      sections.examples = examplesContent.map(content => {
        if (typeof content === 'object' && content.type === 'bullet') {
          return content;
        }
        return { type: 'text', content };
      });
    }
    if (keyPointsContent.length > 0) {
      sections.keyPoints = keyPointsContent.map(content => {
        if (typeof content === 'object' && content.type === 'bullet') {
          return content;
        }
        return { type: 'text', content };
      });
    }
  }

  // Always render something, even if sections are empty
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
                const indentStyle = {
                  marginLeft: `${(item.indent || 0) * 1}rem`
                };
                return (
                  <div key={index} className="explanation-bullet" style={indentStyle}>
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
                const indentStyle = {
                  marginLeft: `${(example.indent || 0) * 1}rem`
                };
                return (
                  <div key={index} className="example-item" style={indentStyle}>
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
                const indentStyle = {
                  marginLeft: `${(point.indent || 0) * 1}rem`
                };
                return (
                  <div key={index} className="keypoint-item" style={indentStyle}>
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
      
      {/* If no sections found, show raw response */}
      {sections.definition.length === 0 && sections.explanation.length === 0 && 
       sections.examples.length === 0 && sections.keyPoints.length === 0 && (
        <div className="response-section" style={{background: '#f8f9fa', border: '1px solid #e9ecef'}}>
          <div className="section-header">
            <span className="section-icon">📄</span>
            <h3>Raw Response</h3>
          </div>
          <div style={{padding: '1rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>
            {response}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormattedResponse;