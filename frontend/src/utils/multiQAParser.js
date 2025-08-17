/**
 * Multi-Question Answer Parser
 * Parses AI responses that contain multiple questions and answers
 */

/**
 * Parse AI response containing multiple Q&A pairs
 * @param {string} response - The AI response text
 * @returns {Array} Array of {question, answer} objects
 */
export function parseMultiQAResponse(response) {
  if (!response || typeof response !== 'string') return [];
  
  console.log('🔍 Parsing response for multiple Q&A:', response);
  
  const qaList = [];
  const lines = response.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentQuestion = '';
  let currentAnswer = [];
  let inAnswer = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a question (including markdown headers and various formats)
    const questionMatch = line.match(/^(###\s*Question\s*\d*:?\s*|##\s*Question\s*\d*:?\s*|Question\s*\d*:?\s*|Q\d*:?\s*|\d+\.\s*Question:?\s*|\d+\.\s*|^\*\*Question\s*\d*:?\*\*\s*)(.*)/i);
    
    if (questionMatch) {
      // Save previous Q&A pair if exists
      if (currentQuestion && currentAnswer.length > 0) {
        qaList.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.join('\n').trim()
        });
      }
      
      // Start new question - clean up markdown and formatting
      let questionText = questionMatch[2] || line.replace(/^(###\s*Question\s*\d*:?\s*|##\s*Question\s*\d*:?\s*|Question\s*\d*:?\s*|Q\d*:?\s*|\d+\.\s*Question:?\s*|\d+\.\s*|^\*\*Question\s*\d*:?\*\*\s*)/i, '').trim();
      
      // Clean up any remaining markdown or special characters
      questionText = questionText.replace(/^\*\*|\*\*$/g, '').trim(); // Remove bold markers
      
      console.log('🔍 Found question:', questionText);
      
      currentQuestion = questionText;
      currentAnswer = [];
      inAnswer = false;
      continue;
    }
    
    // Check if this line is an answer header (including markdown headers)
    const answerMatch = line.match(/^(###\s*Answer\s*\d*:?\s*|Answer\s*\d*:?\s*|A\d*:?\s*|\d+\.\s*Answer:?\s*|My\s*Answer:?\s*)/i);
    
    if (answerMatch) {
      inAnswer = true;
      // Get content after answer header
      const answerContent = line.replace(/^(###\s*Answer\s*\d*:?\s*|Answer\s*\d*:?\s*|A\d*:?\s*|\d+\.\s*Answer:?\s*|My\s*Answer:?\s*)/i, '').trim();
      if (answerContent) {
        currentAnswer.push(answerContent);
      }
      continue;
    }
    
    // Check for question patterns in the middle of text
    if (line.match(/^(What|How|Why|When|Where|Who|Which|Can|Could|Would|Will|Should|Is|Are|Do|Does|Did)/i) && 
        line.endsWith('?') && 
        !inAnswer) {
      // Save previous Q&A pair if exists
      if (currentQuestion && currentAnswer.length > 0) {
        qaList.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.join('\n').trim()
        });
      }
      
      // This is likely a new question
      currentQuestion = line;
      currentAnswer = [];
      inAnswer = false;
      continue;
    }
    
    // If we have a current question and this line looks like content
    if (currentQuestion) {
      // If we haven't started the answer yet, check if this could be answer content
      if (!inAnswer) {
        // Look for bullet points, "I", or other answer indicators
        if (line.match(/^[-•*]\s+/) || line.startsWith('I ') || line.match(/^(My|The|This)/)) {
          inAnswer = true;
        }
      }
      
      if (inAnswer) {
        currentAnswer.push(line);
      }
    }
  }
  
  // Add the last Q&A pair
  if (currentQuestion && currentAnswer.length > 0) {
    qaList.push({
      question: currentQuestion.trim(),
      answer: currentAnswer.join('\n').trim()
    });
  }
  
  // If no structured Q&A found, try alternative parsing
  if (qaList.length === 0) {
    return parseUnstructuredMultiQA(response);
  }
  
  return qaList.filter(qa => qa.question && qa.answer);
}

/**
 * Parse unstructured response that might contain multiple questions/answers
 * @param {string} response - The AI response text
 * @returns {Array} Array of {question, answer} objects
 */
function parseUnstructuredMultiQA(response) {
  const qaList = [];
  
  // Try to parse markdown-style Q&A format first
  const markdownQA = parseMarkdownQA(response);
  if (markdownQA.length > 0) {
    return markdownQA;
  }
  
  // Split by double line breaks which often separate Q&A blocks
  const blocks = response.split(/\n\s*\n/).filter(block => block.trim());
  
  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    
    // Look for question-like patterns at the start of blocks
    if (lines.length > 0) {
      const firstLine = lines[0];
      
      // Check if first line is a question
      if (firstLine.endsWith('?') || 
          firstLine.match(/^(What|How|Why|When|Where|Who|Which|Can|Could|Would|Will|Should|Is|Are|Do|Does|Did)/i)) {
        
        const question = firstLine;
        const answer = lines.slice(1).join('\n').trim();
        
        if (answer) {
          qaList.push({ question, answer });
        }
      }
    }
  }
  
  return qaList;
}

/**
 * Parse markdown-style Q&A responses
 * @param {string} response - The AI response text
 * @returns {Array} Array of {question, answer} objects
 */
function parseMarkdownQA(response) {
  const qaList = [];
  const lines = response.split('\n');
  
  let currentQuestion = '';
  let currentAnswer = [];
  let collectingAnswer = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for markdown question headers (various formats)
    if (line.match(/^(###|##)\s*Question\s*\d*:?/i) || line.match(/^\*\*Question\s*\d*:?\*\*/i)) {
      // Save previous Q&A if exists
      if (currentQuestion && currentAnswer.length > 0) {
        qaList.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n').trim()
        });
      }
      
      // Extract question text - handle different formats
      let questionText = line;
      questionText = questionText.replace(/^(###|##)\s*Question\s*\d*:?\s*/i, ''); // Remove markdown headers
      questionText = questionText.replace(/^\*\*Question\s*\d*:?\*\*\s*/i, ''); // Remove bold question headers
      questionText = questionText.replace(/^\*\*|\*\*$/g, ''); // Remove remaining bold markers
      
      currentQuestion = questionText.trim();
      currentAnswer = [];
      collectingAnswer = false;
      
      console.log('🔍 Markdown parser found question:', currentQuestion);
      continue;
    }
    
    // Check for markdown answer headers
    if (line.match(/^###\s*Answer\s*\d*:?/i)) {
      collectingAnswer = true;
      const answerContent = line.replace(/^###\s*Answer\s*\d*:?\s*/i, '').trim();
      if (answerContent) {
        currentAnswer.push(answerContent);
      }
      continue;
    }
    
    // Collect answer content
    if (collectingAnswer && line) {
      currentAnswer.push(line);
    }
    
    // If we don't have a question yet but line looks like a question
    if (!currentQuestion && line.endsWith('?') && 
        line.match(/^(What|How|Why|When|Where|Who|Which|Can|Could|Would|Will|Should|Is|Are|Do|Does|Did)/i)) {
      currentQuestion = line;
      collectingAnswer = true;
    }
  }
  
  // Add the last Q&A pair
  if (currentQuestion && currentAnswer.length > 0) {
    qaList.push({
      question: currentQuestion,
      answer: currentAnswer.join('\n').trim()
    });
  }
  
  return qaList;
}

/**
 * Check if a response contains multiple Q&A pairs
 * @param {string} response - The AI response text
 * @returns {boolean} True if multiple Q&A pairs detected
 */
export function hasMultipleQA(response) {
  if (!response) return false;
  
  // Quick check for obvious multi-Q&A patterns
  const hasQuestionHeaders = (response.match(/Question\s*\d+/gi) || []).length > 1;
  const hasAnswerHeaders = (response.match(/Answer\s*\d+/gi) || []).length > 1;
  const hasMarkdownHeaders = (response.match(/###\s*Question/gi) || []).length > 1;
  
  console.log('🔍 Quick pattern check:', {
    hasQuestionHeaders,
    hasAnswerHeaders, 
    hasMarkdownHeaders,
    questionMatches: (response.match(/Question\s*\d+/gi) || []),
    answerMatches: (response.match(/Answer\s*\d+/gi) || [])
  });
  
  // If obvious patterns suggest multiple Q&A, return true even if parsing fails
  if (hasQuestionHeaders || hasAnswerHeaders || hasMarkdownHeaders) {
    console.log('🔍 Forcing multiQA display due to patterns');
    return true;
  }
  
  const qaList = parseMultiQAResponse(response);
  console.log('🔍 hasMultipleQA result:', qaList.length > 1, 'Found', qaList.length, 'Q&A pairs');
  console.log('🔍 Parsed Q&A list:', qaList);
  return qaList.length > 1;
}

/**
 * Format a single Q&A pair for display
 * @param {Object} qa - {question, answer} object
 * @param {number} index - Index of the Q&A pair
 * @returns {Object} Formatted Q&A object
 */
export function formatQAPair(qa, index) {
  return {
    id: `qa_${Date.now()}_${index}`,
    question: qa.question,
    answer: qa.answer,
    index: index + 1,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate display content for multiple Q&A pairs
 * @param {Array} qaList - Array of Q&A objects
 * @returns {string} Formatted display content
 */
export function generateMultiQADisplay(qaList) {
  if (!qaList || qaList.length === 0) return '';
  
  let display = '';
  
  qaList.forEach((qa, index) => {
    display += `**Question ${index + 1}:** ${qa.question}\n\n`;
    display += `**Answer ${index + 1}:**\n${qa.answer}\n\n`;
    
    if (index < qaList.length - 1) {
      display += '---\n\n'; // Separator between Q&A pairs
    }
  });
  
  return display;
}

/**
 * Extract polished questions from AI response that contains multiple Q&A
 * @param {string} response - The AI response containing questions and answers
 * @returns {Array} Array of polished question strings
 */
export function extractPolishedQuestions(response) {
  if (!response) return [];
  
  const qaList = parseMultiQAResponse(response);
  return qaList.map(qa => qa.question).filter(q => q && q.trim());
}

/**
 * Process Q&A history entry to split multiple questions into separate entries
 * @param {Object} qaEntry - Original Q&A history entry
 * @returns {Array} Array of processed Q&A entries (one for each question)
 */
export function processQAHistoryEntry(qaEntry) {
  if (!qaEntry || !qaEntry.answer) return [qaEntry];
  
  // Check if the answer contains multiple Q&A pairs
  const qaList = parseMultiQAResponse(qaEntry.answer);
  
  if (qaList.length <= 1) {
    // Single Q&A - return as is but with polished question if available
    const polishedQuestions = extractPolishedQuestions(qaEntry.answer);
    if (polishedQuestions.length > 0) {
      return [{
        ...qaEntry,
        question: polishedQuestions[0], // Use the polished question from AI response
        originalQuestion: qaEntry.question // Keep original for reference
      }];
    }
    return [qaEntry];
  }
  
  // Multiple Q&A - split into separate entries
  return qaList.map((qa, index) => ({
    id: `${qaEntry.id}_split_${index}`,
    question: qa.question, // Use the polished question from AI response
    answer: qa.answer,
    timestamp: qaEntry.timestamp,
    isExpanded: index === 0 ? qaEntry.isExpanded : false, // Only first one expanded
    originalQuestion: qaEntry.question, // Keep original transcript for reference
    splitIndex: index,
    totalSplits: qaList.length,
    parentId: qaEntry.id
  }));
}

export default {
  parseMultiQAResponse,
  hasMultipleQA,
  formatQAPair,
  generateMultiQADisplay,
  extractPolishedQuestions,
  processQAHistoryEntry
};