// Utility functions for parsing and formatting AI responses
// This allows the same parsing logic to be used in both the main app and the synchronized new tab

export const parseFormattedText = (text) => {
  if (!text) return text;
  
  // Handle **bold** text - return object for processing
  let parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    // Check for bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return { type: 'bold', content, key: index };
    }
    
    // Check for inline code with backticks
    const codeParts = part.split(/(`[^`]+`|\*\w+[\w-]*|\[\w+\])/g);
    
    return codeParts.map((subPart, subIndex) => {
      const key = `${index}-${subIndex}`;
      
      // Handle backtick code
      if (subPart.startsWith('`') && subPart.endsWith('`')) {
        return { type: 'code', content: subPart.slice(1, -1), key };
      }
      
      // Handle Angular directives like *ngIf, *ngFor
      if (subPart.match(/^\*ng\w+/)) {
        return { type: 'code', content: subPart, key };
      }
      
      // Handle attribute directives like [ngClass]
      if (subPart.match(/^\[\w+\]/)) {
        return { type: 'code', content: subPart, key };
      }
      
      return { type: 'text', content: subPart, key };
    });
  }).flat();
};

export const parseResponse = (text) => {
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
      continue;
    }
    else if (trimmedLine.match(/^###\s+explanation\s+(of\s+)?concepts?:?$/i) ||
             trimmedLine.match(/^\*?\*?explanation\s+(of\s+)?concepts?\*?\*?:?$/i) || 
             trimmedLine.match(/^explanation\s+(of\s+)?concepts?:?$/i)) {
      currentSection = 'explanation';
      continue;
    }
    else if (trimmedLine.match(/^###\s+examples?:?$/i) ||
             trimmedLine.match(/^\*?\*?examples?\*?\*?:?$/i) || 
             trimmedLine.match(/^examples?:?$/i)) {
      currentSection = 'examples';
      continue;
    }
    else if (trimmedLine.match(/^###\s+key\s+points?:?$/i) ||
             trimmedLine.match(/^\*?\*?key\s+points?\*?\*?:?$/i) || 
             trimmedLine.match(/^key\s+points?:?$/i)) {
      currentSection = 'keyPoints';
      continue;
    }
    
    // Handle content based on current section
    if (currentSection === 'definition') {
      sections.definition.push({ type: 'text', content: trimmedLine });
    }
    else if (currentSection === 'explanation') {
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\s*[•\-\*]/)) {
        // Calculate indentation level based on original line (before trim)
        const leadingSpaces = line.length - line.trimLeft().length;
        const indentLevel = Math.floor(leadingSpaces / 2); // Every 2 spaces = 1 indent level
        const cleanContent = trimmedLine.replace(/^[•\-\*]\s*/, '').trim();
        sections.explanation.push({ 
          type: 'bullet', 
          content: cleanContent,
          indent: indentLevel
        });
      } else {
        sections.explanation.push({ type: 'text', content: trimmedLine });
      }
    }
    else if (currentSection === 'examples') {
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\s*[•\-\*]/)) {
        const leadingSpaces = line.length - line.trimLeft().length;
        const indentLevel = Math.floor(leadingSpaces / 2);
        const cleanContent = trimmedLine.replace(/^[•\-\*]\s*/, '').trim();
        sections.examples.push({ 
          type: 'bullet', 
          content: cleanContent,
          indent: indentLevel
        });
      } else if (trimmedLine.match(/^[\w\s]+Example:?$/i)) {
        sections.examples.push({ type: 'example-header', content: trimmedLine });
      } else {
        sections.examples.push({ type: 'text', content: trimmedLine });
      }
    }
    else if (currentSection === 'keyPoints') {
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\s*[•\-\*]/)) {
        const leadingSpaces = line.length - line.trimLeft().length;
        const indentLevel = Math.floor(leadingSpaces / 2);
        const cleanContent = trimmedLine.replace(/^[•\-\*]\s*/, '').trim();
        sections.keyPoints.push({ 
          type: 'bullet', 
          content: cleanContent,
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

export const parseResponseWithFallback = (response) => {
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
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\s*[•\-\*]/)) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            const cleanContent = trimmed.replace(/^[•\-\*]\s*/, '').trim();
            explanationContent.push({
              type: 'bullet',
              content: cleanContent,
              indent: indentLevel
            });
          } else {
            explanationContent.push(trimmed);
          }
        } else if (currentSection === 'examples') {
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\s*[•\-\*]/)) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            const cleanContent = trimmed.replace(/^[•\-\*]\s*/, '').trim();
            examplesContent.push({
              type: 'bullet',
              content: cleanContent,
              indent: indentLevel
            });
          } else {
            examplesContent.push(trimmed);
          }
        } else if (currentSection === 'keypoints') {
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\s*[•\-\*]/)) {
            const leadingSpaces = line.length - line.trimLeft().length;
            const indentLevel = Math.floor(leadingSpaces / 2);
            const cleanContent = trimmed.replace(/^[•\-\*]\s*/, '').trim();
            keyPointsContent.push({
              type: 'bullet',
              content: cleanContent,
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

  return sections;
};

// Generate HTML for formatted text (for use in new tab)
export const generateFormattedHTML = (textParts) => {
  if (typeof textParts === 'string') {
    return textParts;
  }
  
  return textParts.map(part => {
    if (part.type === 'bold') {
      return `<strong>${part.content}</strong>`;
    } else if (part.type === 'code') {
      return `<code class="inline-code">${part.content}</code>`;
    } else {
      return part.content;
    }
  }).join('');
};

// Generate full HTML for the new tab with real-time sync
export const generateSyncedTabHTML = (initialResponse = '') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mokita Notes - Voice Transcription App</title>
      <style>
        /* Import all the existing styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f5f5f5;
          line-height: 1.6;
          color: #333;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          min-height: 100vh;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header {
          background-color: #2c3e50;
          color: white;
          padding: 1rem 2rem;
          margin: -2rem -2rem 2rem -2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header h1 {
          font-size: 1.5rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sync-status {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.8);
          margin-top: 0.5rem;
        }

        .sync-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #27ae60;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* FormattedResponse styles */
        .formatted-response {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .response-section {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #3498db;
          transition: all 0.3s ease;
        }

        .response-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 0.5rem;
        }

        .section-icon {
          font-size: 1.5rem;
          margin-right: 0.5rem;
        }

        .section-header h3 {
          color: #2c3e50;
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }

        .inline-code {
          background-color: #f4f4f4;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          border: 1px solid #e0e0e0;
        }

        .code-block {
          background-color: #2c3e50;
          color: #ecf0f1;
          padding: 1rem;
          border-radius: 5px;
          overflow-x: auto;
          margin: 1rem 0;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .definition-content, .explanation-content, .examples-list, .keypoints-list {
          line-height: 1.8;
          font-size: 1rem;
        }

        .definition-text {
          margin-bottom: 0.8rem;
          color: #2c3e50;
          font-weight: 500;
        }

        .explanation-bullet, .example-item, .keypoint-item {
          margin: 0.5rem 0;
          padding: 0.3rem 0;
          color: #34495e;
        }

        .example-header, .keypoint-subheader {
          color: #3498db;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          font-size: 1.1rem;
        }

        .example-text, .explanation-text, .keypoint-text {
          margin: 0.5rem 0;
          color: #2c3e50;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #7f8c8d;
          font-style: italic;
        }

        .timestamp {
          color: #7f8c8d;
          font-size: 0.9rem;
          text-align: right;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #ecf0f1;
        }

        .last-updated {
          color: #3498db;
          font-weight: 500;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #7f8c8d;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Mokita Notes</h1>
          <div class="sync-status">
            <span class="sync-indicator"></span>
            <span id="sync-status">Connected - Real-time sync active</span>
          </div>
        </div>
        
        <div id="response-content" class="formatted-response ai-response-content">
          ${initialResponse ? generateResponseHTML(initialResponse) : '<div class="empty-state">Waiting for AI response...</div>'}
        </div>
        
        <div class="timestamp">
          <span class="last-updated">Last updated: <span id="last-update">${new Date().toLocaleString()}</span></span>
        </div>
      </div>

      <script>
        // BroadcastChannel for real-time synchronization
        const channel = new BroadcastChannel('ai-response-sync');
        const syncStatus = document.getElementById('sync-status');
        const lastUpdate = document.getElementById('last-update');
        const responseContent = document.getElementById('response-content');
        
        // Listen for AI response updates
        channel.addEventListener('message', (event) => {
          if (event.data.type === 'ai-response-update') {
            console.log('Received AI response update:', event.data.response);
            updateResponseContent(event.data.response);
            lastUpdate.textContent = new Date().toLocaleString();
            
            // Flash sync indicator
            const indicator = document.querySelector('.sync-indicator');
            indicator.style.backgroundColor = '#27ae60';
            setTimeout(() => {
              indicator.style.backgroundColor = '#3498db';
            }, 300);
          }
        });

        function updateResponseContent(response) {
          if (!response || !response.trim()) {
            responseContent.innerHTML = '<div class="empty-state">No response received</div>';
            return;
          }

          // Use the same parsing logic as the main app
          const html = generateResponseHTML(response);
          responseContent.innerHTML = html;
        }

        function generateResponseHTML(response) {
          // This function will be dynamically updated with the actual parsing logic
          return '<div class="formatted-response"><div class="response-section"><div class="section-header"><span class="section-icon">📄</span><h3>Response</h3></div><div style="padding: 1rem; white-space: pre-wrap; font-family: inherit;">' + response + '</div></div></div>';
        }

        // Handle window close
        window.addEventListener('beforeunload', () => {
          channel.close();
        });
      </script>
    </body>
    </html>
  `;
};

function generateResponseHTML(response) {
  // This is a simplified version - will be enhanced with full parsing
  return `<div class="formatted-response">
    <div class="response-section">
      <div class="section-header">
        <span class="section-icon">📄</span>
        <h3>Response</h3>
      </div>
      <div style="padding: 1rem; white-space: pre-wrap; font-family: inherit;">
        ${response}
      </div>
    </div>
  </div>`;
}