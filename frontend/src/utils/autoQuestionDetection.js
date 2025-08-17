/**
 * Automatic Question Detection Utility
 * Detects questions from transcribed speech text and triggers automatic answer generation
 */

// Enhanced question patterns for speech transcription
const QUESTION_PATTERNS = [
  // Direct question words
  { pattern: /\b(what|how|why|when|where|which|who)\b.*[\?\.]?\s*$/i, category: 'Direct', confidence: 0.9 },
  
  // Interview-style requests
  { pattern: /\b(tell me about|describe|explain|walk me through)\b.*$/i, category: 'Experience', confidence: 0.8 },
  
  // Scenario questions
  { pattern: /\b(suppose|imagine|let's say|what would you do if|how would you handle)\b.*$/i, category: 'Scenario', confidence: 0.8 },
  
  // Can/Could questions
  { pattern: /\b(can you|could you|would you)\b.*$/i, category: 'Request', confidence: 0.7 },
  
  // Problem-solving questions
  { pattern: /\b(how do you|how would you|what's the best way to)\b.*$/i, category: 'Problem-solving', confidence: 0.8 },
  
  // Experience questions
  { pattern: /\b(have you ever|have you worked with|do you have experience)\b.*$/i, category: 'Experience', confidence: 0.7 },
  
  // Opinion/preference questions
  { pattern: /\b(what do you think|what's your opinion|what would you prefer)\b.*$/i, category: 'Opinion', confidence: 0.6 },
  
  // Comparison questions
  { pattern: /\b(what's the difference between|how do.*compare|which is better)\b.*$/i, category: 'Comparison', confidence: 0.8 },
  
  // Definition questions
  { pattern: /\b(what is|what are|define|what does.*mean)\b.*$/i, category: 'Definition', confidence: 0.8 },
  
  // Process questions
  { pattern: /\b(how does.*work|what happens when|walk me through the process)\b.*$/i, category: 'Process', confidence: 0.8 }
];

// Minimum confidence threshold for question detection
const MIN_CONFIDENCE_THRESHOLD = 0.6;

// Minimum word count for valid questions
const MIN_QUESTION_LENGTH = 3;

/**
 * Detects if the given text contains a question
 * @param {string} text - The transcribed text to analyze
 * @returns {Object|null} - Question detection result or null if no question found
 */
export const detectQuestion = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleanText = text.trim();
  
  // Skip very short texts
  if (cleanText.split(' ').length < MIN_QUESTION_LENGTH) {
    return null;
  }

  // Check each pattern
  for (const { pattern, category, confidence } of QUESTION_PATTERNS) {
    if (pattern.test(cleanText) && confidence >= MIN_CONFIDENCE_THRESHOLD) {
      return {
        isQuestion: true,
        text: cleanText,
        category,
        confidence,
        detectedPattern: pattern.source
      };
    }
  }

  // Check for question mark (lower confidence for speech transcription)
  if (cleanText.includes('?')) {
    return {
      isQuestion: true,
      text: cleanText,
      category: 'Punctuation',
      confidence: 0.5,
      detectedPattern: 'question_mark'
    };
  }

  return null;
};

/**
 * Processes transcript text for automatic question detection
 * @param {string} transcriptText - The final transcript text
 * @param {Array} processedQuestions - Array of already processed question texts
 * @returns {Object|null} - New question to process or null
 */
export const processTranscriptForQuestions = (transcriptText, processedQuestions = []) => {
  const detection = detectQuestion(transcriptText);
  
  if (!detection) {
    return null;
  }

  // Check if this question was already processed (avoid duplicates)
  const isAlreadyProcessed = processedQuestions.some(processedQ => 
    processedQ.toLowerCase().trim() === detection.text.toLowerCase().trim()
  );

  if (isAlreadyProcessed) {
    console.log('Question already processed, skipping:', detection.text);
    return null;
  }

  console.log('🔍 Auto-detected question:', {
    text: detection.text,
    category: detection.category,
    confidence: detection.confidence
  });

  return detection;
};

/**
 * Debounced question processor to prevent rapid duplicate processing
 */
export class DebouncedQuestionProcessor {
  constructor(delay = 2000) {
    this.delay = delay;
    this.timeouts = new Map();
    this.processedQuestions = new Set();
  }

  /**
   * Process question with debouncing
   * @param {string} questionText - The question text
   * @param {Function} callback - Function to call when processing
   */
  processQuestion(questionText, callback) {
    const key = questionText.toLowerCase().trim();
    
    // Clear existing timeout for this question
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Check if already processed recently
    if (this.processedQuestions.has(key)) {
      console.log('Question recently processed, skipping:', questionText);
      return;
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      this.processedQuestions.add(key);
      callback(questionText);
      
      // Clean up after processing
      this.timeouts.delete(key);
      
      // Remove from processed set after some time to allow reprocessing later
      setTimeout(() => {
        this.processedQuestions.delete(key);
      }, 60000); // 1 minute
      
    }, this.delay);

    this.timeouts.set(key, timeoutId);
  }

  /**
   * Clear all pending timeouts
   */
  clear() {
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts.clear();
    this.processedQuestions.clear();
  }
}

export default {
  detectQuestion,
  processTranscriptForQuestions,
  DebouncedQuestionProcessor
};