import React from 'react';
import './FormattedResponse.css';
import MetadataChips from './MetadataChips';

// Dynamic color palette for sections
const SECTION_COLORS = [
  { background: '#f0f9f0', bullet: '#27ae60', accent: '#2ecc71', name: 'green' },     // Light green
  { background: '#fff8f0', bullet: '#ff9800', accent: '#f39c12', name: 'orange' },    // Light orange  
  { background: '#f0f8ff', bullet: '#2196f3', accent: '#3498db', name: 'blue' },      // Light blue
  { background: '#fdf0f5', bullet: '#e91e63', accent: '#e74c3c', name: 'pink' },      // Light pink
  { background: '#f5f3ff', bullet: '#7c3aed', accent: '#9b59b6', name: 'purple' },    // Light purple
  { background: '#f0fdf4', bullet: '#16a34a', accent: '#27ae60', name: 'emerald' },   // Light emerald
  { background: '#ecfeff', bullet: '#06b6d4', accent: '#17a2b8', name: 'cyan' },      // Light cyan
  { background: '#fffbeb', bullet: '#f59e0b', accent: '#f39c12', name: 'amber' },     // Light amber
  { background: '#fef2f2', bullet: '#ef4444', accent: '#e74c3c', name: 'red' },       // Light red
  { background: '#eef2ff', bullet: '#6366f1', accent: '#6c5ce7', name: 'indigo' },    // Light indigo
  { background: '#faf5ff', bullet: '#8b5cf6', accent: '#9b59b6', name: 'violet' },    // Light violet
  { background: '#f9fafb', bullet: '#4b5563', accent: '#6b7280', name: 'gray' }       // Light gray
];

// SVG Icons as React components
const QuestionIcon = ({ size = 24 }) => (
  <svg width={size} height={size} fill="#3b82f6" viewBox="0 0 24 24" style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }}>
    <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.008-3.018a1.502 1.502 0 0 1 2.522 1.159v.024a1.44 1.44 0 0 1-1.493 1.418 1 1 0 0 0-1.037.999V14a1 1 0 1 0 2 0v-.539a3.44 3.44 0 0 0 2.529-3.256 3.502 3.502 0 0 0-7-.255 1 1 0 0 0 2 .076c.014-.398.187-.774.48-1.044Zm.982 7.026a1 1 0 1 0 0 2H12a1 1 0 1 0 0-2h-.01Z" clipRule="evenodd"/>
  </svg>
);

const AnswerIcon = ({ size = 24 }) => (
  <svg width={size} height={size} fill="#16a34a" viewBox="0 0 24 24" style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }}>
    <path fillRule="evenodd" d="M12 2c-.791 0-1.55.314-2.11.874l-.893.893a.985.985 0 0 1-.696.288H7.04A2.984 2.984 0 0 0 4.055 7.04v1.262a.986.986 0 0 1-.288.696l-.893.893a2.984 2.984 0 0 0 0 4.22l.893.893a.985.985 0 0 1 .288.696v1.262a2.984 2.984 0 0 0 2.984 2.984h1.262c.261 0 .512.104.696.288l.893.893a2.984 2.984 0 0 0 4.22 0l.893-.893a.985.985 0 0 1 .696-.288h1.262a2.984 2.984 0 0 0 2.984-2.984V15.7c0-.261.104-.512.288-.696l.893-.893a2.984 2.984 0 0 0 0-4.22l-.893-.893a.985.985 0 0 1-.288-.696V7.04a2.984 2.984 0 0 0-2.984-2.984h-1.262a.985.985 0 0 1-.696-.288l-.893-.893A2.984 2.984 0 0 0 12 2Zm3.683 7.73a1 1 0 1 0-1.414-1.413l-4.253 4.253-1.277-1.277a1 1 0 0 0-1.415 1.414l1.985 1.984a1 1 0 0 0 1.414 0l4.96-4.96Z" clipRule="evenodd"/>
  </svg>
);

// Default icons for common section types
const SECTION_ICONS = {
  'question': <QuestionIcon />,
  'question 1': <QuestionIcon />,
  'question 2': <QuestionIcon />,
  'question 3': <QuestionIcon />,
  'question 4': <QuestionIcon />,
  'question 5': <QuestionIcon />,
  'answer': <AnswerIcon />,
  'answer 1': <AnswerIcon />,
  'answer 2': <AnswerIcon />,
  'answer 3': <AnswerIcon />,
  'answer 4': <AnswerIcon />,
  'answer 5': <AnswerIcon />,
  'definition': '📖',
  'explanation': '💡',
  'examples': '📌', 
  'key points': '🔑',
  'keypoints': '🔑',
  'overview': '📚',
  'introduction': '📚',
  'solution': <AnswerIcon />,
  'implementation': '💻',
  'code': '💻',
  'coding': '💻',
  'best practices': '🎯',
  'comparison': '📊',
  'analysis': '📊',
  'warning': '⚠️',
  'caution': '⚠️',
  'important': '⚠️',
  'note': '⚠️',
  'tips': '💡',
  'hints': '💡',
  'advice': '💡',
  'details': '🔍',
  'deep dive': '🔍',
  'conclusion': '📝',
  'summary': '📝',
  'correct answer': '✅',
  'options': '📋',
  'default': '💬'
};

const FormattedResponse = ({ response, language = null, topic = null, isLoading = false }) => {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  console.log('FormattedResponse received response:', response);
  console.log('Response type:', typeof response);
  console.log('Response length:', response?.length);
  console.log('Metadata props:', { language, topic });
  console.log('Loading state:', isLoading);

  // Timer for loading state
  React.useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0);
      const timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1300);

      return () => clearInterval(timer);
    }
  }, [isLoading]);

  // Show loading state if isLoading is true
  if (isLoading) {
    return (
      <div className="formatted-response ai-response-content">
        <div className="loading-container-simple">
          <div className="loading-text-simple">
            Analyzing your question... <span className="loading-timer">{elapsedSeconds}s</span>
          </div>
          <div className="loading-bar-simple">
            <div className="loading-bar-fill-simple"></div>
          </div>
        </div>
      </div>
    );
  }

  // Simple fallback if response is empty or just whitespace
  if (!response || !response.trim()) {
    console.log('Response is empty or just whitespace');
    return (
      <div className="formatted-response ai-response-content">
        <div className="empty-state">No response received</div>
      </div>
    );
  }

  // Clean the response by removing metadata lines
  const cleanResponse = (text) => {
    if (!text) return text;
    
    let cleanedText = text;
    
    // Remove bullet-point metadata: - Language: line
    cleanedText = cleanedText.replace(/^-\s*Language:\s*[^\n]+\n?/im, '');
    
    // Remove bullet-point metadata: - Topic: line
    cleanedText = cleanedText.replace(/^-\s*Topic:\s*[^\n]+\n?/im, '');
    
    // Remove regular metadata lines (fallback)
    cleanedText = cleanedText.replace(/Language:\s*[^\n]+\n?/i, '');
    cleanedText = cleanedText.replace(/Topic:\s*[^\n]+\n?/i, '');
    
    // Clean up any extra whitespace
    cleanedText = cleanedText.trim();
    
    return cleanedText;
  };

  const cleanedResponse = cleanResponse(response);
  console.log('Original response:', response);
  console.log('Cleaned response:', cleanedResponse);
  console.log('Cleaned response length:', cleanedResponse?.length);

  // Function to detect if lines form a markdown table
  const detectMarkdownTable = (lines, startIndex) => {
    if (startIndex >= lines.length - 1) return null;
    
    const line = lines[startIndex].trim();
    const nextLine = lines[startIndex + 1]?.trim();
    
    // Check if current line has table format (has pipes and content)
    const hasTableFormat = line.includes('|') && line.split('|').length >= 3;
    
    // Check if next line is a separator line (contains dashes and pipes)
    const isSeparatorLine = nextLine && 
      nextLine.includes('|') && 
      nextLine.includes('-') &&
      nextLine.split('|').every(cell => cell.trim().match(/^-*$/));
    
    if (hasTableFormat && isSeparatorLine) {
      // Find the end of the table
      let endIndex = startIndex + 2; // Start after separator line
      while (endIndex < lines.length) {
        const tableLine = lines[endIndex].trim();
        if (!tableLine || !tableLine.includes('|')) break;
        endIndex++;
      }
      
      return {
        startIndex,
        endIndex: endIndex - 1,
        headerLine: startIndex,
        separatorLine: startIndex + 1,
        dataStartIndex: startIndex + 2
      };
    }
    
    return null;
  };

  // Function to parse markdown table into structured data
  const parseMarkdownTable = (lines, tableInfo) => {
    const headerLine = lines[tableInfo.headerLine];
    const dataLines = lines.slice(tableInfo.dataStartIndex, tableInfo.endIndex + 1);
    
    // Parse header
    const headers = headerLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    // Parse data rows
    const rows = dataLines
      .filter(line => line.trim().length > 0)
      .map(line => {
        return line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
      })
      .filter(row => row.length > 0);
    
    return {
      type: 'table',
      headers,
      rows
    };
  };

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

  // Parse the response to extract sections dynamically
  const parseResponse = (text) => {
    const dynamicSections = []; // Array of {title, content, colorIndex, icon}

    // Split by lines and process
    const lines = text.split('\n');
    let currentSectionIndex = -1;
    let codeBlock = false;
    let codeContent = [];
    let codeLanguage = '';
    
    // Helper function to get icon for section title
    const getSectionIcon = (title) => {
      const lowerTitle = title.toLowerCase().trim();
      return SECTION_ICONS[lowerTitle] || SECTION_ICONS['default'];
    };
    
    // Check if response starts with Answer without Question
    const firstNonEmptyLine = lines.find(line => line.trim());
    if (firstNonEmptyLine && firstNonEmptyLine.trim().match(/^Answer\s+\d+\s*:/i)) {
      // Add a default Question section if response starts with Answer
      const questionNum = firstNonEmptyLine.match(/\d+/)[0];
      dynamicSections.push({
        title: `Question ${questionNum}`,
        content: [{ type: 'text', content: '[Question text not provided]' }],
        colorIndex: 2, // Blue for questions
        icon: getSectionIcon(`Question ${questionNum}`)
      });
      currentSectionIndex = 0;
    }
    
    // Helper function to detect if line is a section header
    const detectSectionHeader = (line) => {
      const trimmed = line.trim();
      console.log('Checking line for section header:', trimmed);
      
      // Handle bullet-point format: - Question 1: or - Answer 1:
      const bulletQAMatch = trimmed.match(/^-\s*(Question|Answer)\s+\d+\s*:\s*(.*)$/i);
      if (bulletQAMatch) {
        const sectionTitle = bulletQAMatch[1] + ' ' + bulletQAMatch[0].match(/\d+/)[0];
        const remainingContent = bulletQAMatch[2].trim();
        console.log('Found bullet Q&A section:', sectionTitle, 'with content:', remainingContent);
        return { title: sectionTitle, remainingContent };
      }
      
      // Question 1: or Answer 1: patterns (may have content after colon)
      const qaMatch = trimmed.match(/^(Question|Answer)\s+\d+\s*:(.*)$/i);
      if (qaMatch) {
        const sectionTitle = qaMatch[1] + ' ' + qaMatch[0].match(/\d+/)[0];
        const remainingContent = qaMatch[2].trim();
        console.log('Found Q&A section:', sectionTitle, 'with content:', remainingContent);
        return { title: sectionTitle, remainingContent };
      }
      
      // ### Markdown headers
      const markdownMatch = trimmed.match(/^###\s+(.+?)(:)?$/i);
      if (markdownMatch) {
        return { title: markdownMatch[1].trim(), remainingContent: null };
      }
      
      // **Bold** headers (with optional content after colon)
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*(:)?\s*(.*)$/i);
      if (boldMatch) {
        const title = boldMatch[1].trim();
        const remainingContent = boldMatch[3] ? boldMatch[3].trim() : null;
        return { title, remainingContent };
      }
      
      // Plain text headers ending with colon (must be substantial text)
      const colonMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\s]{3,}):$/);
      if (colonMatch) {
        return { title: colonMatch[1].trim(), remainingContent: null };
      }
      
      return null;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (codeBlock) {
          // End of code block
          if (currentSectionIndex >= 0 && codeContent.length > 0) {
            dynamicSections[currentSectionIndex].content.push({
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

      // Check for markdown tables
      const tableInfo = detectMarkdownTable(lines, i);
      if (tableInfo) {
        const tableData = parseMarkdownTable(lines, tableInfo);
        
        if (currentSectionIndex >= 0) {
          // Add table to current section
          dynamicSections[currentSectionIndex].content.push(tableData);
        } else {
          // Create new section for standalone table
          const colorIndex = dynamicSections.length % SECTION_COLORS.length;
          dynamicSections.push({
            title: 'Comparison Table',
            content: [tableData],
            colorIndex: colorIndex,
            icon: '📊'
          });
          currentSectionIndex = dynamicSections.length - 1;
        }
        
        // Skip to end of table
        i = tableInfo.endIndex;
        continue;
      }
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this line is a section header
      const sectionHeader = detectSectionHeader(trimmedLine);
      if (sectionHeader) {
        const sectionTitle = sectionHeader.title;
        
        // Create new section
        let colorIndex = dynamicSections.length % SECTION_COLORS.length;
        
        // Use specific colors for Question/Answer patterns
        if (sectionTitle.toLowerCase().startsWith('question')) {
          colorIndex = 2; // Blue for questions
        } else if (sectionTitle.toLowerCase().startsWith('answer')) {
          colorIndex = 0; // Green for answers
        }
        
        const icon = getSectionIcon(sectionTitle);
        
        dynamicSections.push({
          title: sectionTitle,
          content: [],
          colorIndex: colorIndex,
          icon: icon
        });
        
        currentSectionIndex = dynamicSections.length - 1;
        console.log(`Found section: "${sectionTitle}" with color index ${colorIndex}`);
        
        // If there's content after the colon on the same line, add it to the section
        if (sectionHeader.remainingContent) {
          dynamicSections[currentSectionIndex].content.push({
            type: 'text',
            content: sectionHeader.remainingContent
          });
        }
        
        continue;
      }
      
      // Add content to current section if we have one
      if (currentSectionIndex >= 0) {
        let contentItem;
        
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          // Bullet points
          const leadingSpaces = line.length - line.trimLeft().length;
          const indentLevel = Math.floor(leadingSpaces / 2);
          contentItem = { 
            type: 'bullet', 
            content: trimmedLine.substring(1).trim(),
            indent: indentLevel
          };
        } else if (trimmedLine.match(/^\d+\.\s+/)) {
          // Numbered lists
          const content = trimmedLine.replace(/^\d+\.\s+/, '');
          contentItem = { type: 'numbered', content: content };
        } else if (trimmedLine.match(/^[\w\s]+Example:?$/i)) {
          // Example headers
          contentItem = { type: 'example-header', content: trimmedLine };
        } else if (trimmedLine.match(/^[\w\s]+:$/)) {
          // Subheaders (ending with colon but not section headers)
          contentItem = { type: 'subheader', content: trimmedLine };
        } else {
          // Regular text
          contentItem = { type: 'text', content: trimmedLine };
        }
        
        dynamicSections[currentSectionIndex].content.push(contentItem);
      }
    }

    return dynamicSections;
  };

  // Helper function to render section items dynamically
  const renderSectionItem = (item, index, colorData) => {
    const bulletStyle = {
      marginLeft: `${(item.indent || 0) * 1}rem`,
      position: 'relative',
      paddingLeft: '1rem',
      marginBottom: '0.7rem',
      lineHeight: '1.7',
      color: '#2c3e50'
    };
    
    const bulletBeforeStyle = {
      content: '"•"',
      position: 'absolute',
      left: '0.5rem',
      color: colorData.bullet,
      fontWeight: 'bold'
    };

    if (item.type === 'bullet') {
      return (
        <div key={index} className="dynamic-bullet" style={bulletStyle}>
          <span style={bulletBeforeStyle}>•</span>
          {parseFormattedText(item.content)}
        </div>
      );
    } else if (item.type === 'numbered') {
      return (
        <div key={index} className="dynamic-numbered" style={{
          paddingLeft: '1.5rem',
          margin: '0.7rem 0',
          lineHeight: '1.7',
          counterIncrement: 'list-counter',
          position: 'relative'
        }}>
          {parseFormattedText(item.content)}
        </div>
      );
    } else if (item.type === 'code') {
      // Parse code content to highlight comments
      const highlightComments = (code) => {
        const lines = code.split('\n');
        return lines.map((line, lineIndex) => {
          // Detect different comment styles
          const singleLineCommentMatch = line.match(/^(\s*)(\/\/|#)(.*)$/);
          const multiLineCommentMatch = line.match(/^(\s*)(\/\*|\*|""")(.*?)(\*\/)?$/);

          if (singleLineCommentMatch) {
            // Single-line comments (//, #)
            return (
              <div key={lineIndex}>
                <span>{singleLineCommentMatch[1]}</span>
                <span className="code-comment">{singleLineCommentMatch[2]}{singleLineCommentMatch[3]}</span>
                {'\n'}
              </div>
            );
          } else if (multiLineCommentMatch) {
            // Multi-line comments (/* */, """)
            return (
              <div key={lineIndex}>
                <span>{multiLineCommentMatch[1]}</span>
                <span className="code-comment">{multiLineCommentMatch[2]}{multiLineCommentMatch[3]}{multiLineCommentMatch[4] || ''}</span>
                {'\n'}
              </div>
            );
          } else {
            // Check for inline comments
            const inlineCommentMatch = line.match(/^(.*?)(\/\/|#)(.*)$/);
            if (inlineCommentMatch) {
              return (
                <div key={lineIndex}>
                  <span>{inlineCommentMatch[1]}</span>
                  <span className="code-comment">{inlineCommentMatch[2]}{inlineCommentMatch[3]}</span>
                  {'\n'}
                </div>
              );
            }
            return <div key={lineIndex}>{line}{'\n'}</div>;
          }
        });
      };

      return (
        <pre key={index} className="code-block">
          <code className={`language-${item.language}`}>
            {highlightComments(item.content)}
          </code>
        </pre>
      );
    } else if (item.type === 'table') {
      return (
        <div key={index} className="fr-table-scroll">
          <table>
            <thead>
              <tr>
                {item.headers.map((header, headerIndex) => (
                  <th key={headerIndex}>
                    {parseFormattedText(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {parseFormattedText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (item.type === 'subheader') {
      return (
        <h4 key={index} className="dynamic-subheader" style={{
          color: colorData.accent,
          fontSize: '1rem',
          fontWeight: 600,
          margin: '0.3rem 0 0.2rem 0'
        }}>
          {parseFormattedText(item.content)}
        </h4>
      );
    } else if (item.type === 'example-header') {
      return (
        <h4 key={index} className="dynamic-example-header" style={{
          color: colorData.accent,
          fontSize: '1rem',
          fontWeight: 600,
          margin: '0.3rem 0 0.2rem 0'
        }}>
          {parseFormattedText(item.content)}
        </h4>
      );
    } else {
      return (
        <p key={index} className="dynamic-text" style={{
          fontSize: '1rem',
          color: '#2c3e50',
          margin: '0.8rem 0',
          lineHeight: '1.7',
          padding: '0.1rem'
        }}>
          {parseFormattedText(item.content)}
        </p>
      );
    }
  };

  // Helper function to render fallback content
  const renderFallbackContent = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentParagraph = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for markdown tables in fallback content
      const tableInfo = detectMarkdownTable(lines, i);
      if (tableInfo) {
        // End current paragraph if exists
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="fallback-paragraph">
              {parseFormattedText(currentParagraph.join(' '))}
            </p>
          );
          currentParagraph = [];
        }

        // Parse and render table
        const tableData = parseMarkdownTable(lines, tableInfo);
        elements.push(
          <div key={`table-${elements.length}`} className="fr-table-scroll">
            <table>
              <thead>
                <tr>
                  {tableData.headers.map((header, headerIndex) => (
                    <th key={headerIndex}>
                      {parseFormattedText(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>
                        {parseFormattedText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        // Skip to end of table
        i = tableInfo.endIndex;
        continue;
      }
      
      if (!trimmed) {
        // Empty line - end current paragraph
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="fallback-paragraph">
              {parseFormattedText(currentParagraph.join(' '))}
            </p>
          );
          currentParagraph = [];
        }
      } else if (trimmed.match(/^[-•*]\s+/) || trimmed.startsWith('• •')) {
        // Bullet point - handle nested bullets and clean up
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="fallback-paragraph">
              {parseFormattedText(currentParagraph.join(' '))}
            </p>
          );
          currentParagraph = [];
        }
        
        // Clean up the bullet content - remove multiple bullet symbols
        let content = trimmed.replace(/^[-•*]\s+/, '').replace(/^•\s+/, '');
        const indentLevel = (line.length - line.trimLeft().length) / 2;
        
        elements.push(
          <div key={`bullet-${elements.length}`} 
               className="fallback-bullet" 
               style={{marginLeft: `${indentLevel * 1}rem`}}>
            {parseFormattedText(content)}
          </div>
        );
      } else if (trimmed.match(/^\d+\.\s+/)) {
        // Numbered list
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="fallback-paragraph">
              {parseFormattedText(currentParagraph.join(' '))}
            </p>
          );
          currentParagraph = [];
        }
        const content = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <div key={`num-${elements.length}`} className="fallback-numbered">
            {parseFormattedText(content)}
          </div>
        );
      } else if (trimmed.startsWith('```')) {
        // Code block start/end - handle code blocks
        const codeLines = [];
        i++; // Move to next line
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (codeLines.length > 0) {
          const codeContent = codeLines.join('\n');

          // Parse code content to highlight comments
          const highlightComments = (code) => {
            const codeLinesList = code.split('\n');
            return codeLinesList.map((line, lineIndex) => {
              // Detect different comment styles
              const singleLineCommentMatch = line.match(/^(\s*)(\/\/|#)(.*)$/);
              const multiLineCommentMatch = line.match(/^(\s*)(\/\*|\*|""")(.*?)(\*\/)?$/);

              if (singleLineCommentMatch) {
                // Single-line comments (//, #)
                return (
                  <div key={lineIndex}>
                    <span>{singleLineCommentMatch[1]}</span>
                    <span className="code-comment">{singleLineCommentMatch[2]}{singleLineCommentMatch[3]}</span>
                    {'\n'}
                  </div>
                );
              } else if (multiLineCommentMatch) {
                // Multi-line comments (/* */, """)
                return (
                  <div key={lineIndex}>
                    <span>{multiLineCommentMatch[1]}</span>
                    <span className="code-comment">{multiLineCommentMatch[2]}{multiLineCommentMatch[3]}{multiLineCommentMatch[4] || ''}</span>
                    {'\n'}
                  </div>
                );
              } else {
                // Check for inline comments
                const inlineCommentMatch = line.match(/^(.*?)(\/\/|#)(.*)$/);
                if (inlineCommentMatch) {
                  return (
                    <div key={lineIndex}>
                      <span>{inlineCommentMatch[1]}</span>
                      <span className="code-comment">{inlineCommentMatch[2]}{inlineCommentMatch[3]}</span>
                      {'\n'}
                    </div>
                  );
                }
                return <div key={lineIndex}>{line}{'\n'}</div>;
              }
            });
          };

          elements.push(
            <pre key={`code-${elements.length}`} className="code-block">
              <code>{highlightComments(codeContent)}</code>
            </pre>
          );
        }
      } else if (trimmed.match(/^#+\s+/) || trimmed.match(/^\*\*.*\*\*:?\s*$/) || trimmed.endsWith(':')) {
        // Headers - markdown headers, bold headers, or lines ending with colon
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="fallback-paragraph">
              {parseFormattedText(currentParagraph.join(' '))}
            </p>
          );
          currentParagraph = [];
        }
        
        const headerText = trimmed
          .replace(/^#+\s+/, '')  // Remove markdown #
          .replace(/^\*\*|\*\*$/g, '')  // Remove bold markers
          .replace(/:$/, '');  // Remove trailing colon
          
        elements.push(
          <h4 key={`header-${elements.length}`} className="fallback-header">
            {parseFormattedText(headerText)}
          </h4>
        );
      } else {
        // Regular text - add to current paragraph
        currentParagraph.push(trimmed);
      }
    }
    
    // Add any remaining paragraph
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={`para-${elements.length}`} className="fallback-paragraph">
          {parseFormattedText(currentParagraph.join(' '))}
        </p>
      );
    }
    
    return elements.length > 0 ? elements : (
      <div className="fallback-raw">
        {parseFormattedText(text)}
      </div>
    );
  };

  // Parse the response using dynamic section detection  
  const dynamicSections = parseResponse(cleanedResponse);
  
  console.log('Dynamic sections found:', dynamicSections.length);
  console.log('Dynamic sections:', dynamicSections);

  // Sort sections to show answers before questions
  const sortedSections = dynamicSections.sort((a, b) => {
    const aIsAnswer = a.title.toLowerCase().startsWith('answer');
    const bIsAnswer = b.title.toLowerCase().startsWith('answer');
    const aIsQuestion = a.title.toLowerCase().startsWith('question');
    const bIsQuestion = b.title.toLowerCase().startsWith('question');
    
    // If both are answers or both are questions, maintain original order
    if ((aIsAnswer && bIsAnswer) || (aIsQuestion && bIsQuestion)) {
      return 0;
    }
    
    // Answers come first (return negative if a is answer and b is question)
    if (aIsAnswer && bIsQuestion) return -1;
    if (aIsQuestion && bIsAnswer) return 1;
    
    // For other section types, maintain original order
    return 0;
  });

  // Render dynamic sections or fallback content
  return (
    <div className="formatted-response ai-response-content">
      {sortedSections.length > 0 ? (
        // Render all detected sections dynamically (answers first, then questions)
        sortedSections.map((section, sectionIndex) => {
          const colorData = SECTION_COLORS[section.colorIndex];
          
          return (
            <div 
              key={`section-${sectionIndex}`} 
              className="response-section dynamic-section"
              style={{
                marginBottom: '0.75rem',
                background: colorData.background,
                borderRadius: '8px',
                padding: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
                counterReset: 'list-counter'
              }}
            >
              <div className="section-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.3rem',
                gap: '0.3rem',
                paddingBottom: '0.2rem',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="section-icon" style={{ fontSize: '1.2rem' }}>
                    {section.icon}
                  </span>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#2c3e50',
                    margin: 0
                  }}>
                    {section.title}
                  </h3>
                </div>
                {section.title.toLowerCase().includes('question') && (language || topic) && (
                  <MetadataChips language={language} topic={topic} className="qa-question" />
                )}
              </div>
              
              <div className="section-content" style={{ paddingLeft: '0.5rem' }}>
                {/* Check if this is an Answer section and extract the letter for circle badge */}
                {section.title.toLowerCase().startsWith('answer') && section.content.length > 0 && (() => {
                  const firstContent = section.content[0]?.content || '';
                  const letterMatch = firstContent.match(/^([A-Za-z])\s*[-–—:]/);
                  if (letterMatch) {
                    const letter = letterMatch[1].toUpperCase();
                    const remainingText = firstContent.replace(/^[A-Za-z]\s*[-–—:]\s*/, '').trim();
                    return (
                      <div className="answer-with-badge" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                        <span className="answer-letter-badge" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          minWidth: '24px',
                          background: '#10b981',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          borderRadius: '50%',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
                        }}>
                          {letter}
                        </span>
                        <span style={{ fontWeight: 600, color: '#2d3748', fontSize: '0.9rem' }}>
                          {parseFormattedText(remainingText)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {section.content.map((item, itemIndex) => {
                  // Skip the first item if it was rendered as badge above
                  if (itemIndex === 0 && section.title.toLowerCase().startsWith('answer')) {
                    const firstContent = item?.content || '';
                    if (firstContent.match(/^[A-Za-z]\s*[-–—:]/)) {
                      return null;
                    }
                  }
                  return renderSectionItem(item, itemIndex, colorData);
                })}
              </div>
            </div>
          );
        })
      ) : (
        // Enhanced fallback for unstructured responses
        <div className="response-section fallback-section" style={{
          marginBottom: '0.75rem',
          background: '#fafafa',
          borderRadius: '8px',
          padding: '0.75rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="section-header" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.3rem',
            gap: '0.3rem',
            paddingBottom: '0.2rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <span className="section-icon" style={{ fontSize: '1.2rem' }}>💬</span>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#2c3e50',
              margin: 0
            }}>
              Response
            </h3>
          </div>
          <div className="fallback-content" style={{ padding: '0.75rem', counterReset: 'list-counter' }}>
            {renderFallbackContent(cleanedResponse)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormattedResponse;