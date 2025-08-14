import React from 'react';
import './ResponsePanel.css';
import FormattedResponse from './FormattedResponse';
import { parseResponseWithFallback, parseFormattedText, generateFormattedHTML } from '../utils/responseParser';

// Import the same color palette and icons as FormattedResponse
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

const SECTION_ICONS = {
  'definition': '📖',
  'explanation': '💡',
  'examples': '📌', 
  'key points': '🔑',
  'keypoints': '🔑',
  'overview': '📚',
  'introduction': '📚',
  'solution': '✅',
  'answer': '✅',
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
  'default': '📄'
};

// Function to get FormattedResponse CSS content for new tab
const getFormattedResponseCSS = () => {
  // Since we can't dynamically import CSS at runtime, we'll include the essential styles inline
  // This ensures the new tab window has the same styling as the main FormattedResponse component
  return `
    /* FormattedResponse CSS for new tab compatibility */
    :root {
      --fg: #2c3e50;
      --fg-muted: #4b5563;
      --fg-soft: #6b7280;
      --bg: #ffffff;
      --bg-soft: #f8f9fa;
      --bg-elev: #ffffff;
      --border: rgba(0,0,0,0.1);
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --accent: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #0ea5e9;
      --purple: #8b5cf6;
      --pink: #d63384;
      --code-fg: #d4d4d4;
      --code-bg: #1e1e1e;
      --inline-code-bg: #f0f0f0;
      --inline-code-fg: var(--pink);
      --ff-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      --ff-mono: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
      --fs-0: 0.85rem;
      --fs-1: 0.95rem;
      --fs-2: 1.1rem;
      --fs-3: 1.25rem;
      --lh: 1.6;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --pad-sm: 0.5rem;
      --pad-md: 0.75rem;
      --pad-lg: 1rem;
      --easing: cubic-bezier(.2,.8,.2,1);
      --dur-fast: 150ms;
      --dur: 250ms;
    }

    .formatted-response {
      font-family: var(--ff-base);
      color: var(--fg);
      line-height: var(--lh);
      background: transparent;
      min-height: 50px;
    }

    .response-section {
      margin-bottom: 0.75rem;
      background: var(--bg-elev);
      border-radius: var(--radius-md);
      padding: var(--pad-md);
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.4rem;
    }

    .section-icon { font-size: 1.2rem; }

    .response-section h3 {
      font-size: var(--fs-2);
      font-weight: 600;
      color: var(--fg);
      margin: 0;
    }

    .inline-code {
      background: var(--inline-code-bg);
      color: var(--inline-code-fg);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: var(--ff-mono);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .code-block {
      background: var(--code-bg);
      color: var(--code-fg);
      padding: var(--pad-lg);
      border-radius: var(--radius-sm);
      overflow-x: auto;
      margin: 0.75rem 0;
      font-family: var(--ff-mono);
      font-size: 0.9rem;
      line-height: 1.5;
      position: relative;
    }

    .code-block code { 
      color: inherit; 
      background: transparent; 
      padding: 0; 
      border: none; 
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Section-specific styles */
    .definition-section { background: #f0f9f0; }
    .explanation-section { background: #fff8f0; }
    .examples-section { background: #f0f8ff; }
    .keypoints-section { background: #fdf0f5; }
    .fallback-section { background: #fafafa; }

    .definition-content, .explanation-content, .examples-list, .keypoints-list, .fallback-content {
      padding-left: 0.5rem;
    }

    .definition-text, .explanation-text, .example-text, .keypoint-text, .fallback-paragraph {
      font-size: 1rem;
      color: var(--fg);
      margin: 0.1rem 0;
      line-height: 1.4;
      padding: 0.1rem;
    }

    .explanation-bullet, .example-item, .keypoint-item, .fallback-bullet {
      padding: 0.1rem 0 0.1rem 1rem;
      margin-bottom: 0.1rem;
      color: var(--fg);
      position: relative;
    }

    .explanation-bullet::before { content: "•"; position: absolute; left: 0.5rem; color: #ff9800; font-weight: bold; }
    .example-item::before { content: "•"; position: absolute; left: 0.5rem; color: #2196f3; font-weight: bold; }
    .keypoint-item::before { content: "•"; position: absolute; left: 0.5rem; color: #e91e63; font-weight: bold; }
    .fallback-bullet::before { content: "•"; position: absolute; left: 0.5rem; color: var(--accent); font-weight: bold; }

    .example-header, .keypoint-subheader, .fallback-header {
      color: #1976d2;
      font-size: 1rem;
      font-weight: 600;
      margin: 0.3rem 0 0.2rem 0;
    }

    .keypoint-subheader { color: #c2185b; }
    .fallback-header { 
      font-size: 1.2rem; 
      color: var(--fg); 
      padding-bottom: 0.25rem; 
      border-bottom: 1px solid var(--border); 
    }

    .fallback-numbered {
      padding-left: 1.5rem;
      margin: 0.5rem 0;
      line-height: 1.6;
      color: var(--fg);
      counter-increment: list-counter;
      position: relative;
    }

    .fallback-numbered::before {
      content: counter(list-counter) ".";
      position: absolute;
      left: 0;
      color: var(--accent);
      font-weight: bold;
    }

    .fallback-content { counter-reset: list-counter; }

    .fallback-raw {
      padding: var(--pad-md);
      white-space: pre-wrap;
      font-family: inherit;
      line-height: 1.6;
      color: var(--fg);
    }
  `;
};

const ResponsePanel = ({ response, isLoading, isStreaming = false }) => {
  
  const openInNewTab = () => {
    if (!response) return;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      // Generate enhanced HTML with full CSS styling and real-time sync
      const enhancedHTML = generateEnhancedSyncedHTML(response);
      newWindow.document.write(enhancedHTML);
      newWindow.document.close();
    }
  };

  const generateEnhancedSyncedHTML = (initialResponse) => {
    // Parse the response using the same logic as FormattedResponse
    const sections = parseResponseWithFallback(initialResponse);
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mokita Notes - Voice Transcription App</title>
        <style>
          /* Import FormattedResponse styles for consistent rendering */
          ${getFormattedResponseCSS()}
          
          /* Additional page-specific styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.4;
            color: #2c3e50;
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

          /* Complete FormattedResponse.css styles */
          .formatted-response {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #2c3e50;
            line-height: 1.4;
          }

          .response-section {
            margin-bottom: 0.75rem;
            background: #ffffff;
            border-radius: 8px;
            padding: 0.75rem;
            position: relative;
            overflow: hidden;
          }

          .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 0.3rem;
            gap: 0.3rem;
            padding-bottom: 0.2rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          }

          .section-icon {
            font-size: 1.2rem;
          }

          .response-section h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }

          /* Definition Section */
          .definition-section {
            background: #f0f9f0;
          }

          .definition-content {
            padding-left: 0.5rem;
          }

          .definition-text {
            font-size: 1rem;
            color: #2c3e50;
            margin: 0.1rem 0;
            line-height: 1.4;
            padding: 0.1rem;
          }

          /* Explanation Section */
          .explanation-section {
            background: #fff8f0;
          }

          .explanation-content {
            padding-left: 0.5rem;
          }

          .explanation-bullet {
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
            position: relative;
          }

          .explanation-bullet::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #ff9800;
            font-weight: bold;
          }

          /* Nested bullet adjustments */
          .explanation-bullet,
          .example-item,
          .keypoint-item {
            position: relative;
          }

          /* Adjust bullet positioning for nested items */
          .explanation-bullet::before,
          .example-item::before,
          .keypoint-item::before {
            left: 0.3rem;
          }

          .explanation-text {
            margin: 0.1rem 0;
            color: #2c3e50;
            line-height: 1.4;
          }

          .answer-content {
            padding-left: 1rem;
          }

          .answer-bullet {
            position: relative;
            padding-left: 1.5rem;
            margin-bottom: 0.75rem;
            color: #2c3e50;
          }

          .answer-bullet::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #3498db;
            font-weight: bold;
          }

          .answer-text {
            margin: 0.5rem 0;
            padding-left: 1rem;
          }

          .answer-numbered {
            margin-bottom: 0.5rem;
            color: #2c3e50;
            padding-left: 1rem;
          }

          /* Examples Section */
          .examples-section {
            background: #f0f8ff;
          }

          .examples-list {
            margin: 0.2rem 0 0 0;
          }

          .example-item {
            position: relative;
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
          }

          .example-item::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #2196f3;
            font-weight: bold;
          }

          .example-text {
            margin: 0.1rem 0;
            color: #4a5568;
            line-height: 1.4;
          }

          .example-header {
            color: #1976d2;
            font-size: 1rem;
            font-weight: 600;
            margin: 0.3rem 0 0.2rem 0;
          }

          /* Key Points Section */
          .keypoints-section {
            background: #fdf0f5;
          }

          .keypoints-list {
            margin: 0.2rem 0 0 0;
          }

          .keypoint-item {
            position: relative;
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
          }

          .keypoint-item::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #e91e63;
            font-weight: bold;
          }

          .keypoint-subheader {
            color: #c2185b;
            font-size: 1rem;
            font-weight: 600;
            margin: 0.3rem 0 0.2rem 0;
          }

          .keypoint-text {
            font-size: 1rem;
            color: #2c3e50;
            margin: 0.1rem 0;
            line-height: 1.4;
            padding: 0.1rem;
          }

          /* Explanation Section */
          .explanation-section {
            background: #fff8f0;
          }

          .explanation-content {
            padding-left: 0.5rem;
          }

          .explanation-bullet {
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
            position: relative;
          }

          .explanation-bullet::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #ff9800;
            font-weight: bold;
          }

          .explanation-text {
            margin: 0.1rem 0;
            color: #2c3e50;
            line-height: 1.4;
          }

          /* Examples Section */
          .examples-section {
            background: #f0f8ff;
          }

          .examples-list {
            margin: 0.2rem 0 0 0;
          }

          .example-item {
            position: relative;
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
          }

          .example-item::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #2196f3;
            font-weight: bold;
          }

          .example-text {
            margin: 0.1rem 0;
            color: #4a5568;
            line-height: 1.4;
          }

          .example-header {
            color: #1976d2;
            font-size: 1rem;
            font-weight: 600;
            margin: 0.3rem 0 0.2rem 0;
          }

          /* Key Points Section */
          .keypoints-section {
            background: #fdf0f5;
          }

          .keypoints-list {
            margin: 0.2rem 0 0 0;
          }

          .keypoint-item {
            position: relative;
            padding: 0.1rem 0 0.1rem 1rem;
            margin-bottom: 0.1rem;
            color: #2c3e50;
          }

          .keypoint-item::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #e91e63;
            font-weight: bold;
          }

          .keypoint-subheader {
            color: #c2185b;
            font-size: 1rem;
            font-weight: 600;
            margin: 0.3rem 0 0.2rem 0;
          }

          .keypoint-text {
            margin: 0.1rem 0;
            color: #2c3e50;
            line-height: 1.4;
          }

          /* Code Styling */
          .inline-code {
            background: #f0f0f0;
            color: #d63384;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .code-block {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            margin: 0.75rem 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
          }

          .code-block code {
            color: #d4d4d4;
            background: transparent;
            padding: 0;
            border: none;
          }

          .empty-state {
            text-align: center;
            color: #95a5a6;
            padding: 2rem;
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

          /* Streaming indicator for new tab */
          .streaming-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #27ae60;
            font-size: 0.85rem;
            margin-top: 0.5rem;
            padding: 0.25rem 0.5rem;
            background: rgba(39, 174, 96, 0.1);
            border-radius: 4px;
            animation: pulse 2s infinite;
          }

          .streaming-indicator::before {
            content: '🔴';
            animation: blink 1s infinite;
          }

          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }

          /* Fallback Section for Unstructured Content */
          .fallback-section {
            background: #fafafa; /* Very light gray */
          }

          .fallback-content {
            padding: 0.75rem;
            counter-reset: list-counter;
          }

          .fallback-paragraph {
            margin: 0.75rem 0;
            line-height: 1.6;
            color: #2c3e50;
            font-size: 1rem;
          }

          .fallback-bullet {
            position: relative;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
            line-height: 1.6;
            color: #2c3e50;
          }

          .fallback-bullet::before {
            content: "•";
            position: absolute;
            left: 0.5rem;
            color: #3b82f6; /* Blue */
            font-weight: bold;
          }

          .fallback-numbered {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
            line-height: 1.6;
            color: #2c3e50;
            counter-increment: list-counter;
            position: relative;
          }

          .fallback-numbered::before {
            content: counter(list-counter) ".";
            position: absolute;
            left: 0;
            color: #3b82f6;
            font-weight: bold;
          }

          .fallback-raw {
            padding: 0.75rem;
            white-space: pre-wrap;
            font-family: inherit;
            line-height: 1.6;
            color: #2c3e50;
          }

          .fallback-header {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1f2937;
            margin: 1rem 0 0.5rem 0;
            padding-bottom: 0.25rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
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
            ${generateInitialHTML(initialResponse)}
          </div>
          
          <div id="streaming-indicator" class="streaming-indicator" style="display: none;">
            Streaming AI response...
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
          const streamingIndicator = document.getElementById('streaming-indicator');
          
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
            } else if (event.data.type === 'ai-streaming-start') {
              // Show streaming indicator when AI starts responding
              streamingIndicator.style.display = 'block';
              console.log('AI streaming started');
            } else if (event.data.type === 'ai-streaming-end') {
              // Hide streaming indicator when AI stops responding
              streamingIndicator.style.display = 'none';
              console.log('AI streaming ended');
            }
          });

          let lastResponse = '';
          
          function updateResponseContent(response) {
            if (!response || !response.trim()) {
              if (responseContent.innerHTML.indexOf('empty-state') === -1) {
                responseContent.innerHTML = '<div class="empty-state">No response received</div>';
              }
              return;
            }

            // Only update if content actually changed
            if (response === lastResponse) return;
            
            // Simple, efficient update - mimic React behavior
            const sections = parseResponseWithFallback(response);
            const newHTML = generateFormattedResponseHTML(sections, response);
            
            // Direct update without transitions - let the browser handle it efficiently
            responseContent.innerHTML = newHTML;
            lastResponse = response;
          }

          ${generateJavaScriptParsingFunctions()}

          // Handle window close
          window.addEventListener('beforeunload', () => {
            channel.close();
          });
        </script>
      </body>
      </html>
    `;
  };

  const generateInitialHTML = (response) => {
    if (!response || !response.trim()) {
      return '<div class="empty-state">Waiting for AI response...</div>';
    }
    
    const sections = parseResponseWithFallback(response);
    return generateFormattedResponseHTML(sections, response);
  };

  const generateFormattedResponseHTML = (sections, response) => {
    let html = '<div class="formatted-response">';

    // Definition section
    if (sections.definition.length > 0) {
      html += `
        <div class="response-section definition-section">
          <div class="section-header">
            <span class="section-icon">📖</span>
            <h3>Definition</h3>
          </div>
          <div class="definition-content">
            ${sections.definition.map(item => 
              `<p class="definition-text">${generateFormattedHTML(parseFormattedText(item.content))}</p>`
            ).join('')}
          </div>
        </div>
      `;
    }

    // Explanation section
    if (sections.explanation.length > 0) {
      html += `
        <div class="response-section explanation-section">
          <div class="section-header">
            <span class="section-icon">💡</span>
            <h3>Explanation of Concepts</h3>
          </div>
          <div class="explanation-content">
            ${sections.explanation.map(item => {
              if (item.type === 'bullet') {
                const indentStyle = `margin-left: ${(item.indent || 0) * 1}rem;`;
                return `<div class="explanation-bullet" style="${indentStyle}">${generateFormattedHTML(parseFormattedText(item.content))}</div>`;
              } else {
                return `<p class="explanation-text">${generateFormattedHTML(parseFormattedText(item.content))}</p>`;
              }
            }).join('')}
          </div>
        </div>
      `;
    }

    // Examples section
    if (sections.examples.length > 0) {
      html += `
        <div class="response-section examples-section">
          <div class="section-header">
            <span class="section-icon">📌</span>
            <h3>Examples</h3>
          </div>
          <div class="examples-list">
            ${sections.examples.map(example => {
              if (example.type === 'code') {
                return `<pre class="code-block"><code class="language-${example.language}">${example.content}</code></pre>`;
              } else if (example.type === 'bullet') {
                const indentStyle = `margin-left: ${(example.indent || 0) * 1}rem;`;
                return `<div class="example-item" style="${indentStyle}">${generateFormattedHTML(parseFormattedText(example.content))}</div>`;
              } else if (example.type === 'example-header') {
                return `<h4 class="example-header">${generateFormattedHTML(parseFormattedText(example.content))}</h4>`;
              } else {
                return `<div class="example-text">${generateFormattedHTML(parseFormattedText(example.content))}</div>`;
              }
            }).join('')}
          </div>
        </div>
      `;
    }

    // Key Points section
    if (sections.keyPoints.length > 0) {
      html += `
        <div class="response-section keypoints-section">
          <div class="section-header">
            <span class="section-icon">🔑</span>
            <h3>Key Points</h3>
          </div>
          <div class="keypoints-list">
            ${sections.keyPoints.map(point => {
              if (point.type === 'bullet') {
                const indentStyle = `margin-left: ${(point.indent || 0) * 1}rem;`;
                return `<div class="keypoint-item" style="${indentStyle}">${generateFormattedHTML(parseFormattedText(point.content))}</div>`;
              } else if (point.type === 'subheader') {
                return `<h4 class="keypoint-subheader">${generateFormattedHTML(parseFormattedText(point.content))}</h4>`;
              } else {
                return `<p class="keypoint-text">${generateFormattedHTML(parseFormattedText(point.content))}</p>`;
              }
            }).join('')}
          </div>
        </div>
      `;
    }

    // If no sections found, use fallback content rendering
    if (sections.definition.length === 0 && sections.explanation.length === 0 && 
       sections.examples.length === 0 && sections.keyPoints.length === 0) {
      html += `
        <div class="response-section fallback-section">
          <div class="section-header">
            <span class="section-icon">💬</span>
            <h3>Response</h3>
          </div>
          <div class="fallback-content">
            ${renderFallbackContentHTML(response)}
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  };

  const renderFallbackContentHTML = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let html = '';
    let currentParagraph = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        // Empty line - end current paragraph
        if (currentParagraph.length > 0) {
          html += `<p class="fallback-paragraph">${generateFormattedHTML(parseFormattedText(currentParagraph.join(' ')))}</p>`;
          currentParagraph = [];
        }
      } else if (trimmed.match(/^[-•*]\\s+/) || trimmed.startsWith('• •')) {
        // Bullet point - handle nested bullets and clean up
        if (currentParagraph.length > 0) {
          html += `<p class="fallback-paragraph">${generateFormattedHTML(parseFormattedText(currentParagraph.join(' ')))}</p>`;
          currentParagraph = [];
        }
        
        // Clean up the bullet content - remove multiple bullet symbols
        let content = trimmed.replace(/^[-•*]\\s+/, '').replace(/^•\\s+/, '');
        const indentLevel = (line.length - line.trimLeft().length) / 2;
        
        html += `<div class="fallback-bullet" style="margin-left: ${indentLevel * 1}rem;">${generateFormattedHTML(parseFormattedText(content))}</div>`;
      } else if (trimmed.match(/^\\d+\\.\\s+/)) {
        // Numbered list
        if (currentParagraph.length > 0) {
          html += `<p class="fallback-paragraph">${generateFormattedHTML(parseFormattedText(currentParagraph.join(' ')))}</p>`;
          currentParagraph = [];
        }
        const content = trimmed.replace(/^\\d+\\.\\s+/, '');
        html += `<div class="fallback-numbered">${generateFormattedHTML(parseFormattedText(content))}</div>`;
      } else if (trimmed.startsWith('```')) {
        // Code block start/end - handle code blocks
        const codeLines = [];
        i++; // Move to next line
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (codeLines.length > 0) {
          html += `<pre class="code-block"><code>${codeLines.join('\\n')}</code></pre>`;
        }
      } else if (trimmed.match(/^#+\\s+/) || trimmed.match(/^\\*\\*.*\\*\\*:?\\s*$/) || trimmed.endsWith(':')) {
        // Headers - markdown headers, bold headers, or lines ending with colon
        if (currentParagraph.length > 0) {
          html += `<p class="fallback-paragraph">${generateFormattedHTML(parseFormattedText(currentParagraph.join(' ')))}</p>`;
          currentParagraph = [];
        }
        
        const headerText = trimmed
          .replace(/^#+\\s+/, '')  // Remove markdown #
          .replace(/^\\*\\*|\\*\\*$/g, '')  // Remove bold markers
          .replace(/:$/, '');  // Remove trailing colon
          
        html += `<h4 class="fallback-header">${generateFormattedHTML(parseFormattedText(headerText))}</h4>`;
      } else {
        // Regular text - add to current paragraph
        currentParagraph.push(trimmed);
      }
    }
    
    // Add any remaining paragraph
    if (currentParagraph.length > 0) {
      html += `<p class="fallback-paragraph">${generateFormattedHTML(parseFormattedText(currentParagraph.join(' ')))}</p>`;
    }
    
    return html || `<div class="fallback-raw">${generateFormattedHTML(parseFormattedText(text))}</div>`;
  };

  const generateJavaScriptParsingFunctions = () => {
    return `
      function parseFormattedText(text) {
        if (!text) return text;
        
        let parts = text.split(/(\\*\\*[^*]+\\*\\*)/g);
        
        return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.slice(2, -2);
            return { type: 'bold', content, key: index };
          }
          
          const codeParts = part.split(/(\`[^\`]+\`|\\*\\w+[\\w-]*|\\[\\w+\\])/g);
          
          return codeParts.map((subPart, subIndex) => {
            const key = index + '-' + subIndex;
            
            if (subPart.startsWith('\`') && subPart.endsWith('\`')) {
              return { type: 'code', content: subPart.slice(1, -1), key };
            }
            
            if (subPart.match(/^\\*ng\\w+/)) {
              return { type: 'code', content: subPart, key };
            }
            
            if (subPart.match(/^\\[\\w+\\]/)) {
              return { type: 'code', content: subPart, key };
            }
            
            return { type: 'text', content: subPart, key };
          });
        }).flat();
      }

      function generateFormattedHTML(textParts) {
        if (typeof textParts === 'string') {
          return textParts;
        }
        
        return textParts.map(part => {
          if (part.type === 'bold') {
            return '<strong>' + part.content + '</strong>';
          } else if (part.type === 'code') {
            return '<code class="inline-code">' + part.content + '</code>';
          } else {
            return part.content;
          }
        }).join('');
      }

      function parseResponseWithFallback(response) {
        // Simplified version of the parsing logic for the new tab
        const sections = { definition: [], explanation: [], examples: [], keyPoints: [] };
        
        const lines = response.split('\\n');
        let currentSection = '';
        
        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const cleanedLine = trimmed.replace(/^###\\s+|^\\*\\*|\\*\\*$/g, '').toLowerCase();
          
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
              sections.definition.push({ type: 'text', content: trimmed });
            } else if (currentSection === 'explanation') {
              if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\\s*[•\\-\\*]/)) {
                const cleanContent = trimmed.replace(/^[•\\-\\*]\\s*/, '').trim();
                sections.explanation.push({ type: 'bullet', content: cleanContent, indent: 0 });
              } else {
                sections.explanation.push({ type: 'text', content: trimmed });
              }
            } else if (currentSection === 'examples') {
              if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\\s*[•\\-\\*]/)) {
                const cleanContent = trimmed.replace(/^[•\\-\\*]\\s*/, '').trim();
                sections.examples.push({ type: 'bullet', content: cleanContent, indent: 0 });
              } else {
                sections.examples.push({ type: 'text', content: trimmed });
              }
            } else if (currentSection === 'keypoints') {
              if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.match(/^\\s*[•\\-\\*]/)) {
                const cleanContent = trimmed.replace(/^[•\\-\\*]\\s*/, '').trim();
                sections.keyPoints.push({ type: 'bullet', content: cleanContent, indent: 0 });
              } else {
                sections.keyPoints.push({ type: 'text', content: trimmed });
              }
            }
          }
        }
        
        return sections;
      }

      function generateFormattedResponseHTML(sections, response) {
        let html = '<div class="formatted-response">';

        if (sections.definition.length > 0) {
          html += '<div class="response-section definition-section"><div class="section-header"><span class="section-icon">📖</span><h3>Definition</h3></div><div class="definition-content">';
          html += sections.definition.map(item => '<p class="definition-text">' + generateFormattedHTML(parseFormattedText(item.content)) + '</p>').join('');
          html += '</div></div>';
        }

        if (sections.explanation.length > 0) {
          html += '<div class="response-section explanation-section"><div class="section-header"><span class="section-icon">💡</span><h3>Explanation of Concepts</h3></div><div class="explanation-content">';
          html += sections.explanation.map(item => {
            if (item.type === 'bullet') {
              return '<div class="explanation-bullet">' + generateFormattedHTML(parseFormattedText(item.content)) + '</div>';
            } else {
              return '<p class="explanation-text">' + generateFormattedHTML(parseFormattedText(item.content)) + '</p>';
            }
          }).join('');
          html += '</div></div>';
        }

        if (sections.examples.length > 0) {
          html += '<div class="response-section examples-section"><div class="section-header"><span class="section-icon">📌</span><h3>Examples</h3></div><div class="examples-list">';
          html += sections.examples.map(example => {
            if (example.type === 'bullet') {
              return '<div class="example-item">' + generateFormattedHTML(parseFormattedText(example.content)) + '</div>';
            } else {
              return '<div class="example-text">' + generateFormattedHTML(parseFormattedText(example.content)) + '</div>';
            }
          }).join('');
          html += '</div></div>';
        }

        if (sections.keyPoints.length > 0) {
          html += '<div class="response-section keypoints-section"><div class="section-header"><span class="section-icon">🔑</span><h3>Key Points</h3></div><div class="keypoints-list">';
          html += sections.keyPoints.map(point => {
            if (point.type === 'bullet') {
              return '<div class="keypoint-item">' + generateFormattedHTML(parseFormattedText(point.content)) + '</div>';
            } else {
              return '<p class="keypoint-text">' + generateFormattedHTML(parseFormattedText(point.content)) + '</p>';
            }
          }).join('');
          html += '</div></div>';
        }

        if (sections.definition.length === 0 && sections.explanation.length === 0 && 
           sections.examples.length === 0 && sections.keyPoints.length === 0) {
          html += '<div class="response-section" style="background: #f8f9fa; border: 1px solid #e9ecef;"><div class="section-header"><span class="section-icon">📄</span><h3>Raw Response</h3></div><div style="padding: 1rem; white-space: pre-wrap; font-family: inherit;">' + response + '</div></div>';
        }

        html += '</div>';
        return html;
      }
    `;
  };
  
  return (
    <div className="response-panel">
      <div className="response-header">
        <h2>Notes {isStreaming && <span className="streaming-indicator">🔴 Streaming...</span>}</h2>
        {response && !isLoading && (
          <button 
            className="btn-open-tab" 
            onClick={openInNewTab}
            title="Open response in new tab"
          >
            🗂️ Open in New Tab
          </button>
        )}
      </div>
      
      <div className="response-container">
        {isLoading && !response ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Processing your question...</p>
          </div>
        ) : response ? (
          <div className="response-content">
            <FormattedResponse response={response} />
            {isStreaming && (
              <div className="streaming-cursor">
                <span className="typing-cursor">|</span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>Type a question or record speech, then click "Ask AI" to get a response</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsePanel;