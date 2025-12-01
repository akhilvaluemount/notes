import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ResponsePanel.css';
import FormattedResponse from './FormattedResponse';
import MetadataChips from './MetadataChips';
import { parseResponseWithFallback, parseFormattedText, generateFormattedHTML } from '../utils/responseParser';

// Use relative URL for production (Vercel), localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? 'https://notes-topaz-six.vercel.app' : 'http://localhost:5001'
);

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
  'solution': '<span class="answer-icon-svg"></span>',
  'answer': '<span class="answer-icon-svg"></span>',
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
  'default': '<span class="question-icon-svg"></span>'
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

const ResponsePanel = ({ response, isLoading, isStreaming = false, qaHistory = [], onToggleQA, currentLanguage = null, currentTopic = null }) => {
  const { sessionId } = useParams();
  const responseContainerRef = useRef(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [currentSaveData, setCurrentSaveData] = useState(null);

  // Handle scroll to show/hide sticky header and scroll indicator
  useEffect(() => {
    const container = responseContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Show sticky header when scrolled down more than 100px (for unified scroll)
      setShowStickyHeader(scrollTop > 100);
      
      // Show scroll indicator when there's more content to scroll
      setShowScrollIndicator(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 50);
    };

    container.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [qaHistory, response]);
  
  const handleSaveAnswer = (answer, question = '') => {
    setCurrentSaveData({ answer, question });
    setShowSaveModal(true);
    setKeywordInput(currentTopic || '');
  };

  const submitSaveAnswer = async () => {
    if (!keywordInput.trim() || !currentSaveData) return;
    
    setSavingAnswer(true);
    try {
      await axios.post(`${API_BASE_URL}/api/keyword-answers/save`, {
        sessionId,
        keywords: keywordInput,
        answer: currentSaveData.answer,
        question: currentSaveData.question,
        metadata: { language: currentLanguage, topic: currentTopic }
      });
      
      setShowSaveModal(false);
      setKeywordInput('');
      setCurrentSaveData(null);
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Failed to save answer. Please try again.');
    } finally {
      setSavingAnswer(false);
    }
  };

  const openInNewTab = () => {
    if (!response) return;
    
    // Store the current response in sessionStorage for the new tab to pick up
    sessionStorage.setItem('initialAiResponse', response);
    
    // Open the /notes route in a new tab
    window.open('/notes', '_blank');
  };

  // Removed unused HTML generation functions since we're using /notes route now
  
  // Keeping for potential future use if needed
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
          /* Design System - matching main app */
          :root {
            /* Main color system */
            --primary: #6366f1;
            --primary-light: rgba(99, 102, 241, 0.1);
            --accent: #8b5cf6;
            --success: #10b981;
            --success-light: rgba(16, 185, 129, 0.1);
            --danger: #ef4444;
            --danger-light: rgba(239, 68, 68, 0.1);
            --warning: #f59e0b;
            --info: #0ea5e9;
            
            /* Q&A specific colors */
            --q-bg: #f0f7f0;
            --q-accent: #4caf50;
            --a-bg: #ffffff;
            --a-accent: #22c55e;
            
            /* Text colors */
            --text: #374151;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-tertiary: #9ca3af;
            --muted: #6b7280;
            
            /* Backgrounds */
            --bg-tertiary: rgba(249, 250, 251, 0.8);
            --bg-secondary: rgba(243, 244, 246, 0.9);
            
            /* Borders and shadows */
            --border: #e5e7eb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-400: #9ca3af;
            --gray-500: #6b7280;
            
            /* Shadows */
            --shadow: 0 4px 12px rgba(0,0,0,0.08);
            --shadow-hover: 0 8px 25px rgba(0,0,0,0.12);
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 25px rgba(31, 38, 135, 0.1);
            
            /* Radius */
            --radius: 12px;
            --radius-sm: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --radius-xl: 16px;
            --radius-2xl: 24px;
            --radius-full: 999px;
            
            /* Transitions */
            --transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            --transition-fast: all 0.15s ease-out;
            
            /* Typography */
            --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Arial, sans-serif;
          }
          
          /* Additional page-specific styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: var(--font);
            background-color: #f5f5f5;
            line-height: 1.6;
            color: var(--text);
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.25rem;
            background: linear-gradient(180deg, 
              rgba(249, 250, 251, 0.3) 0%, 
              rgba(243, 244, 246, 0.5) 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: visible;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
            border-bottom: none;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
            margin: -1.25rem -1.25rem 1.5rem -1.25rem;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s infinite;
          }

          @keyframes shimmer {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, white 0%, rgba(255,255,255,0.9) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .sync-status {
            font-size: 0.875rem;
            color: rgba(255,255,255,0.9);
            font-weight: 600;
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .sync-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
          }

          /* Q&A Card Styles - Production Grade */
          .qa-card {
            font-family: var(--font);
            margin: 24px 0;
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            transition: box-shadow 0.3s ease, transform 0.2s ease;
          }

          .qa-card:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
          }

          .qa-card .question {
            background: var(--q-bg);
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            position: relative;
          }

          .qa-card .question::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--q-accent);
          }

          .qa-card .question .q-title {
            margin: 0 0 12px 0;
            font-weight: 600;
            color: var(--text);
            font-size: 16px;
            display: flex;
            gap: 10px;
            align-items: center;
          }

          .qa-card .question .q-text {
            margin: 0;
            color: var(--text);
            font-size: 15px;
            line-height: 1.6;
            font-weight: 400;
          }

          .qa-card .answer {
            background: var(--a-bg);
            padding: 24px;
            position: relative;
          }

          .qa-card .answer::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--a-accent);
          }

          .qa-card .answer .a-title {
            margin: 0 0 16px 0;
            font-weight: 600;
            color: var(--text);
            font-size: 15px;
            display: flex;
            gap: 10px;
            align-items: center;
          }

          .qa-card .answer ul {
            margin: 0;
            padding: 0;
            list-style: none;
          }

          .qa-card .answer li {
            margin: 12px 0;
            color: var(--text);
            line-height: 1.6;
            font-size: 15px;
            position: relative;
            padding-left: 24px;
          }

          .qa-card .answer li::before {
            content: '•';
            position: absolute;
            left: 8px;
            color: #f97316;
            font-weight: 700;
            font-size: 16px;
          }

          .qa-card .answer p {
            margin: 12px 0;
            color: var(--text);
            line-height: 1.6;
            font-size: 15px;
          }

          .qa-key {
            color: #1e40af;
            font-weight: 600;
            background: rgba(30, 64, 175, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
          }

          .qa-code {
            background: #fce7f3;
            color: #be185d;
            padding: 3px 8px;
            border-radius: 6px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid rgba(190, 24, 93, 0.2);
          }

          .qa-card a {
            color: #0b63c5;
            text-decoration: none;
          }

          .qa-card a:hover {
            text-decoration: underline;
          }

          .qa-card {
            animation: qaSlideIn 0.4s ease-out;
          }

          @keyframes qaSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          /* Multiple Q&A Cards Container */
          .qa-cards-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .qa-multiple-header {
            background: linear-gradient(135deg, var(--primary-light) 0%, rgba(255, 255, 255, 0.8) 100%);
            padding: 1rem 1.25rem;
            border-radius: var(--radius-lg);
            border: 1px solid rgba(99, 102, 241, 0.2);
            box-shadow: var(--shadow);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            margin-bottom: 0.5rem;
            animation: fadeInUp 0.4s ease-out;
          }

          .qa-multiple-header h3 {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            letter-spacing: -0.025em;
          }

          /* Staggered animation for multiple cards */
          .qa-cards-container .qa-card:nth-child(1) { animation-delay: 0.1s; }
          .qa-cards-container .qa-card:nth-child(2) { animation-delay: 0.2s; }
          .qa-cards-container .qa-card:nth-child(3) { animation-delay: 0.3s; }
          .qa-cards-container .qa-card:nth-child(4) { animation-delay: 0.4s; }
          .qa-cards-container .qa-card:nth-child(5) { animation-delay: 0.5s; }
          .qa-cards-container .qa-card:nth-child(n+6) { animation-delay: 0.6s; }

          /* SVG Icons */
          .question-icon-svg {
            display: inline-block;
            width: 20px;
            height: 20px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23059669'%3E%3Cpath fill-rule='evenodd' d='M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.008-3.018a1.502 1.502 0 0 1 2.522 1.159v.024a1.44 1.44 0 0 1-1.493 1.418 1 1 0 0 0-1.037.999V14a1 1 0 1 0 2 0v-.539a3.44 3.44 0 0 0 2.529-3.256 3.502 3.502 0 0 0-7-.255 1 1 0 0 0 2 .076c.014-.398.187-.774.48-1.044Zm.982 7.026a1 1 0 1 0 0 2H12a1 1 0 1 0 0-2h-.01Z' clip-rule='evenodd'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            vertical-align: middle;
            margin-right: 8px;
          }

          .answer-icon-svg {
            display: inline-block;
            width: 20px;
            height: 20px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23059669'%3E%3Cpath fill-rule='evenodd' d='M12 2c-.791 0-1.55.314-2.11.874l-.893.893a.985.985 0 0 1-.696.288H7.04A2.984 2.984 0 0 0 4.055 7.04v1.262a.986.986 0 0 1-.288.696l-.893.893a2.984 2.984 0 0 0 0 4.22l.893.893a.985.985 0 0 1 .288.696v1.262a2.984 2.984 0 0 0 2.984 2.984h1.262c.261 0 .512.104.696.288l.893.893a2.984 2.984 0 0 0 4.22 0l.893-.893a.985.985 0 0 1 .696-.288h1.262a2.984 2.984 0 0 0 2.984-2.984V15.7c0-.261.104-.512.288-.696l.893-.893a2.984 2.984 0 0 0 0-4.22l-.893-.893a.985.985 0 0 1-.288-.696V7.04a2.984 2.984 0 0 0-2.984-2.984h-1.262a.985.985 0 0 1-.696-.288l-.893-.893A2.984 2.984 0 0 0 12 2Zm3.683 7.73a1 1 0 1 0-1.414-1.413l-4.253 4.253-1.277-1.277a1 1 0 0 0-1.415 1.414l1.985 1.984a1 1 0 0 0 1.414 0l4.96-4.96Z' clip-rule='evenodd'/%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            vertical-align: middle;
            margin-right: 8px;
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
            color: #6b7280;
            font-size: 0.875rem;
            text-align: center;
            margin-top: 1.5rem;
            padding: 1rem;
            border-top: 1px solid rgba(229, 231, 235, 0.6);
            background: rgba(255, 255, 255, 0.4);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .last-updated {
            color: #6366f1;
            font-weight: 600;
            letter-spacing: -0.025em;
          }

          /* Streaming indicator for new tab - matching main app */
          .streaming-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #6366f1;
            font-weight: 600;
            padding: 0.375rem 0.75rem;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 999px;
            animation: pulse 1.5s ease-in-out infinite;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-top: 0.5rem;
          }

          .streaming-indicator::before {
            content: '🔴';
            animation: blink 1s infinite;
          }

          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(0.98);
            }
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
          
          /* Main Content Area - matching main-response-area */
          .main-content-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: visible;
          }

          .content-area {
            animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.95);
            border-radius: 24px;
            padding: 1.5rem;
            box-shadow: 
              0 8px 32px rgba(31, 38, 135, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
          }

          .content-area:hover {
            box-shadow: 
              0 12px 40px rgba(31, 38, 135, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
            transform: translateY(-3px) scale(1.01);
            border-color: rgba(99, 102, 241, 0.3);
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          /* View Controls */
          .view-controls {
            margin-bottom: 1rem;
            padding: 0.5rem;
            background: rgba(248, 249, 250, 0.8);
            border-radius: 8px;
            display: flex;
            gap: 0.5rem;
            align-items: center;
            border: 1px solid rgba(229, 231, 235, 0.6);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          
          .view-btn {
            padding: 0.25rem 0.75rem;
            border: 1px solid #6b7280;
            background: transparent;
            color: #6b7280;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            font-family: inherit;
          }
          
          .view-btn:hover {
            background: #f3f4f6;
          }
          
          .view-btn.active {
            background: #3b82f6 !important;
            color: white !important;
            border-color: #3b82f6;
          }
          
          /* Raw Text Display */
          .raw-response {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            white-space: pre-wrap;
            color: #2c3e50;
            border: 1px solid #e5e7eb;
            max-height: 70vh;
            overflow-y: auto;
            word-wrap: break-word;
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
          
          <div class="main-content-wrapper">
            <!-- Toggle buttons for view mode -->
            <div class="view-controls">
              <span style="font-weight: 600; color: #2c3e50;">View Mode:</span>
              <button id="formatted-view-btn" class="view-btn active" onclick="showFormattedView()">Formatted</button>
              <button id="raw-view-btn" class="view-btn" onclick="showRawView()">Raw Text</button>
            </div>
            
            <div class="content-area">
              <div id="formatted-content">
                <div class="qa-source">${initialResponse}</div>
              </div>
              
              <div id="raw-content" class="raw-response" style="display: none;">
                ${initialResponse.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </div>
              
              <div id="streaming-indicator" class="streaming-indicator" style="display: none;">
                Streaming AI response...
              </div>
            </div>
            
            <div class="timestamp">
              <span class="last-updated">Last updated: <span id="last-update">${new Date().toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        <script>
          // View mode state
          let currentViewMode = 'formatted';
          
          // View toggle functions
          function showFormattedView() {
            currentViewMode = 'formatted';
            document.getElementById('formatted-content').style.display = 'block';
            document.getElementById('raw-content').style.display = 'none';
            
            // Update button styles
            document.getElementById('formatted-view-btn').style.background = '#3b82f6';
            document.getElementById('formatted-view-btn').style.color = 'white';
            document.getElementById('raw-view-btn').style.background = 'transparent';
            document.getElementById('raw-view-btn').style.color = '#6b7280';
          }
          
          function showRawView() {
            currentViewMode = 'raw';
            document.getElementById('formatted-content').style.display = 'none';
            document.getElementById('raw-content').style.display = 'block';
            
            // Update button styles
            document.getElementById('raw-view-btn').style.background = '#3b82f6';
            document.getElementById('raw-view-btn').style.color = 'white';
            document.getElementById('formatted-view-btn').style.background = 'transparent';
            document.getElementById('formatted-view-btn').style.color = '#6b7280';
          }
          
          // BroadcastChannel for real-time synchronization
          const channel = new BroadcastChannel('ai-response-sync');
          const syncStatus = document.getElementById('sync-status');
          const lastUpdate = document.getElementById('last-update');
          const formattedContent = document.getElementById('formatted-content');
          const rawContent = document.getElementById('raw-content');
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
              if (formattedContent.innerHTML.indexOf('empty-state') === -1) {
                formattedContent.innerHTML = '<div class="empty-state">No response received</div>';
                rawContent.innerHTML = '<div class="empty-state">No response received</div>';
              }
              return;
            }

            // Only update if content actually changed
            if (response === lastResponse) return;
            
            // Update formatted content with Q&A source
            formattedContent.innerHTML = '<div class="qa-source">' + response + '</div>';
            
            // Process Q&A cards with slight delay for animation
            setTimeout(() => {
              processQACards();
            }, 50);
            
            // Update raw content (escape HTML entities)
            rawContent.innerHTML = response.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            lastResponse = response;
            
            // Flash content area to indicate update
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
              contentArea.style.transform = 'scale(1.02)';
              setTimeout(() => {
                contentArea.style.transform = 'scale(1)';
              }, 200);
            }
          }

          // Enhanced Q&A Card Processing Function - Handles Multiple Q&A Pairs
          function processQACards() {
            const SOURCES = document.querySelectorAll('.qa-source');

            const mdInline = (s) => {
              // escape HTML first
              s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
              // **bold**
              s = s.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
              // \`code\`
              s = s.replace(/\`([^\`]+?)\`/g,'<span class="qa-code">$1</span>');
              // common keywords -> orange emphasis
              const kw = ['Angular','JavaScript','TypeScript','NgRx','REST APIs','RxJS','HTML','CSS','React','Node.js','Python','Java','SQL','Vue.js','Express','MongoDB','PostgreSQL','Docker','Kubernetes','AWS','Azure','Git','npm','yarn','Webpack','Vite'];
              kw.forEach(k=>{
                const re = new RegExp(\`(?<![\\\\w-])(\${k})(?![\\\\w-])\`,'g');
                s = s.replace(re,'<span class="qa-key">$1</span>');
              });
              return s;
            };

            const makeEl = (tag, cls, html) => {
              const el = document.createElement(tag);
              if (cls) el.className = cls;
              if (html != null) el.innerHTML = html;
              return el;
            };

            const createQACard = (qNum, qText, answerContent, cardIndex) => {
              // Build card with index-based styling
              const card = makeEl('div','qa-card');
              card.style.animationDelay = \`\${cardIndex * 0.1}s\`;

              // Question
              const q = makeEl('div','question');
              const qTitle = makeEl('div','q-title');
              qTitle.innerHTML = \`<span class="question-icon-svg"></span>\${mdInline(qNum)}\`;
              q.appendChild(qTitle);
              q.appendChild(makeEl('p','q-text', mdInline(qText)));
              card.appendChild(q);

              // Answer
              const a = makeEl('div','answer');
              const aTitle = makeEl('div','a-title');
              aTitle.innerHTML = '<span class="answer-icon-svg"></span>Answer';
              a.appendChild(aTitle);

              // Process answer content (bullets, paragraphs, etc.)
              processAnswerContent(answerContent, a, mdInline);
              
              card.appendChild(a);
              return card;
            };

            const processAnswerContent = (content, answerElement, mdInline) => {
              const lines = content.split('\\n').map(l => l.trim()).filter(l => l);
              
              if (lines.length === 0) return;

              // Check if content is mostly bullet points
              const bulletLines = lines.filter(l => /^[-*•]/.test(l));
              
              if (bulletLines.length > 0) {
                // Create bullet list
                const ul = document.createElement('ul');
                lines.forEach(line => {
                  if (/^[-*•]/.test(line)) {
                    const bulletContent = line.replace(/^[-*•]\\s?/, '');
                    const li = document.createElement('li');
                    li.innerHTML = mdInline(bulletContent);
                    ul.appendChild(li);
                  } else if (line.trim() && !ul.lastElementChild) {
                    // Non-bullet line before any bullets - add as paragraph
                    const p = document.createElement('p');
                    p.innerHTML = mdInline(line);
                    answerElement.appendChild(p);
                  } else if (line.trim() && ul.lastElementChild) {
                    // Non-bullet line after bullets - continue last bullet
                    ul.lastElementChild.innerHTML += ' ' + mdInline(line);
                  }
                });
                if (ul.children.length > 0) {
                  answerElement.appendChild(ul);
                }
              } else {
                // Create paragraphs for non-bullet content
                const paragraphs = content.split(/\\n\\n+/);
                paragraphs.forEach(para => {
                  if (para.trim()) {
                    const p = document.createElement('p');
                    p.innerHTML = mdInline(para.trim());
                    answerElement.appendChild(p);
                  }
                });
              }
            };

            const parseMultipleQA = (text) => {
              const qaBlocks = [];
              
              // Pattern 1: ### Question 1: format
              const questionPattern1 = /###\\s*(Question\\s*\\d+)\\s*:\\s*(.+?)(?=###\\s*Question\\s*\\d+|$)/gis;
              let match;
              
              while ((match = questionPattern1.exec(text)) !== null) {
                const [fullMatch, qNum, qContent] = match;
                
                // Split question content to separate question text from answer
                const contentLines = qContent.trim().split('\\n');
                const qText = contentLines[0].trim();
                
                // Everything after the first line is the answer
                const answerContent = contentLines.slice(1).join('\\n').trim();
                
                qaBlocks.push({
                  questionNumber: qNum.trim(),
                  questionText: qText,
                  answerContent: answerContent
                });
              }
              
              // Pattern 2: Q1: or Question 1: format
              if (qaBlocks.length === 0) {
                const questionPattern2 = /(?:^|\\n)\\s*(?:Q(\\d+)[.:]?|Question\\s*(\\d+)[.:]?)\\s*(.+?)(?=(?:^|\\n)\\s*(?:Q\\d+[.:]?|Question\\s*\\d+[.:]?)|$)/gis;
                let match2;
                
                while ((match2 = questionPattern2.exec(text)) !== null) {
                  const [fullMatch, qNum1, qNum2, content] = match2;
                  const qNumber = qNum1 || qNum2;
                  const lines = content.trim().split('\\n');
                  const qText = lines[0].trim();
                  const answerContent = lines.slice(1).join('\\n').trim();
                  
                  qaBlocks.push({
                    questionNumber: \`Question \${qNumber}\`,
                    questionText: qText,
                    answerContent: answerContent
                  });
                }
              }
              
              // Pattern 3: Simple numbered format (1. 2. 3.)
              if (qaBlocks.length === 0) {
                const questionPattern3 = /(?:^|\\n)\\s*(\\d+)\\.\\s*(.+?)(?=(?:^|\\n)\\s*\\d+\\.|$)/gis;
                let match3;
                
                while ((match3 = questionPattern3.exec(text)) !== null) {
                  const [fullMatch, qNum, content] = match3;
                  const lines = content.trim().split('\\n');
                  const qText = lines[0].trim();
                  const answerContent = lines.slice(1).join('\\n').trim();
                  
                  // Only treat as Q&A if there's substantial answer content
                  if (answerContent.length > 20) {
                    qaBlocks.push({
                      questionNumber: \`Question \${qNum}\`,
                      questionText: qText,
                      answerContent: answerContent
                    });
                  }
                }
              }
              
              // Pattern 4: Double line break separated blocks (when multiple questions are in one response)
              if (qaBlocks.length === 0) {
                const blocks = text.split(/\\n\\n+/);
                if (blocks.length >= 4) { // At least 2 Q&A pairs
                  let qIndex = 1;
                  for (let i = 0; i < blocks.length - 1; i += 2) {
                    const questionBlock = blocks[i].trim();
                    const answerBlock = blocks[i + 1] ? blocks[i + 1].trim() : '';
                    
                    if (questionBlock && answerBlock) {
                      qaBlocks.push({
                        questionNumber: \`Question \${qIndex}\`,
                        questionText: questionBlock,
                        answerContent: answerBlock
                      });
                      qIndex++;
                    }
                  }
                }
              }
              
              return qaBlocks;
            };

            SOURCES.forEach(src => {
              const text = src.textContent.replace(/\\u00A0/g,' ').trim();
              
              // Parse multiple Q&A blocks
              const qaBlocks = parseMultipleQA(text);
              
              if (qaBlocks.length > 0) {
                // Create container for multiple cards
                const container = makeEl('div', 'qa-cards-container');
                
                // Add header if multiple questions
                if (qaBlocks.length > 1) {
                  const header = makeEl('div', 'qa-multiple-header');
                  header.innerHTML = \`
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                      📚 <span>\${qaBlocks.length} Questions & Answers</span>
                    </h3>
                  \`;
                  container.appendChild(header);
                }
                
                // Create cards for each Q&A
                qaBlocks.forEach((qa, index) => {
                  const card = createQACard(qa.questionNumber, qa.questionText, qa.answerContent, index);
                  container.appendChild(card);
                });
                
                // Replace source with container
                src.replaceWith(container);
              } else {
                // Fallback to original single Q&A processing
                const parts = text.split(/\\n{2,}/);
                const qHeader = parts[0] || '';
                const m = qHeader.match(/^###\\s*(Question\\s*\\d+)\\s*:\\s*(.+)$/i);
                
                if (m) {
                  const qNum = m[1].trim();
                  const qText = m[2].trim();
                  const answerContent = parts.slice(1).join('\\n\\n').trim();
                  
                  const card = createQACard(qNum, qText, answerContent, 0);
                  src.replaceWith(card);
                }
              }
            });
          }

          // Process Q&A cards on initial load
          setTimeout(processQACards, 100);

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
          html += '<div class="response-section" style="background: #f8f9fa; border: 1px solid #e9ecef;"><div class="section-header"><span class="section-icon"><span class="question-icon-svg"></span></span><h3>Raw Response</h3></div><div style="padding: 1rem; white-space: pre-wrap; font-family: inherit;">' + response + '</div></div>';
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
        <div className="response-actions">
          <button 
            className="btn-keyword-manager" 
            onClick={() => window.open(`/keywords/${sessionId}`, '_blank')}
            title="Manage saved keyword answers"
          >
            🗂️ Manage Keywords
          </button>
          {response && !isLoading && (
            <>
              <button 
                className="btn-save-answer" 
                onClick={() => handleSaveAnswer(response)}
                title="Save answer with keywords"
              >
                💾 Save
              </button>
              <button 
                className="btn-view-all-keywords" 
                onClick={() => window.open('/keywords', '_blank')}
                title="View all keywords from all sessions"
              >
                📚 All Keywords
              </button>
              <button 
                className="btn-open-tab" 
                onClick={openInNewTab}
                title="Open response in new tab"
              >
                📝 Open in New Tab
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="response-container" ref={responseContainerRef}>
        {/* 90% area for main AI response */}
        <div className="main-response-area">
          {isLoading && !response ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Processing your question...</p>
            </div>
          ) : response ? (
            <div className="response-content">
              <FormattedResponse response={response} language={currentLanguage} topic={currentTopic} />
              {isStreaming && (
                <div className="streaming-cursor">
                  <span className="typing-cursor">|</span>
                </div>
              )}
            </div>
          ) : qaHistory.length === 0 ? (
            <div className="empty-state">
              <p>Type a question or record speech, then click "Ask AI" to get a response</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>Current response will appear here</p>
            </div>
          )}
        </div>
        
        {/* Save Modal */}
        {showSaveModal && (
          <div className="save-modal-overlay" onClick={() => setShowSaveModal(false)}>
            <div className="save-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Save Answer with Keywords</h3>
              <p>Enter keywords (comma-separated, max 3 words each):</p>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g., react hooks, useState, component lifecycle"
                className="keyword-input"
                autoFocus
              />
              <div className="modal-buttons">
                <button 
                  onClick={submitSaveAnswer} 
                  disabled={!keywordInput.trim() || savingAnswer}
                  className="btn-save"
                >
                  {savingAnswer ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setShowSaveModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 10% area for previous Q&A history */}
        {qaHistory.length > 1 && (
          <div className="qa-compact-area">
            <div className="qa-integrated-section">
              {/* Scroll indicator */}
              <div className={`qa-compact-scroll-indicator ${showScrollIndicator ? 'visible' : ''}`}>
                {qaHistory.length - 1} questions ↓
              </div>
              
              <div className="qa-items-container">
                {qaHistory.slice(1).map((qa) => (
                  <div key={qa.id} className={`qa-integrated-item ${qa.isMultiQuestionSplit ? 'qa-split-item' : ''}`}>
                    <div 
                      className="qa-integrated-question"
                      onClick={() => onToggleQA && onToggleQA(qa.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleQA && onToggleQA(qa.id);
                        }
                      }}
                    >
                      <span className="qa-expand-icon">
                        {qa.isExpanded ? '▼' : '▶'}
                      </span>
                      {qa.isMultiQuestionSplit && (
                        <span className="qa-split-indicator">
                          {qa.splitIndex + 1}/{qa.totalSplits}
                        </span>
                      )}
                      <span className="qa-question-text">{qa.question.replace(/^This is the raw text spoken by an interviewer:\s*/i, '').replace(/^This is the.*?text.*?spoken.*?by.*?interviewer[:\s]*/i, '')}</span>
                      <MetadataChips language={qa.language} topic={qa.topic} className="qa-question" />
                      <span className="qa-timestamp">
                        {new Date(qa.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {qa.isExpanded && (
                      <div className="qa-expanded-content">
                        <div className="qa-interview-question">
                          <div className="qa-section-header">
                            <span className="qa-section-icon">📝</span>
                            <span className="qa-section-title">Question:</span>
                          </div>
                          <div className="qa-question-content">
                            {qa.question.replace(/^This is the raw text spoken by an interviewer:\s*/i, '').replace(/^This is the.*?text.*?spoken.*?by.*?interviewer[:\s]*/i, '')}
                          </div>
                          <MetadataChips language={qa.language} topic={qa.topic} className="qa-question" />
                        </div>
                        <div className="qa-answer-section">
                          <div className="qa-section-header">
                            <span className="qa-section-icon">💡</span>
                            <span className="qa-section-title">Answer:</span>
                            <button 
                              className="btn-save-qa" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveAnswer(qa.answer, qa.question);
                              }}
                              title="Save this answer"
                            >
                              💾
                            </button>
                          </div>
                          <div className="qa-answer-content">
                            <FormattedResponse response={qa.answer} language={qa.language} topic={qa.topic} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Bottom sticky header that appears on scroll */}
              <div className={`qa-sticky-header ${showStickyHeader ? 'visible' : ''}`}>
                <h3>Previous Questions & Answers</h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsePanel;