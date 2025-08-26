/**
 * Text Formatter Utility
 * Handles real-time punctuation and formatting of transcribed text
 */

class TextFormatter {
  constructor() {
    // Common abbreviations that should stay uppercase
    this.abbreviations = new Set(['USA', 'UK', 'API', 'URL', 'HTTP', 'HTTPS', 'AI', 'ML', 'CEO', 'CTO', 'UI', 'UX']);
    
    // Words that typically start sentences
    this.sentenceStarters = new Set(['the', 'a', 'an', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'this', 'that']);
    
    // Patterns for common formatting
    this.patterns = {
      question: /^(what|where|when|who|why|how|is|are|can|could|would|should|do|does|did)\b/i,
      exclamation: /\b(wow|amazing|great|awesome|oh|hey|hello|hi|goodbye|bye)\b/i,
      number: /\b\d+\b/g,
      time: /\b(\d{1,2}):(\d{2})(\s?[ap]m)?\b/gi,
      date: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    };
  }

  /**
   * Format text with intelligent punctuation and capitalization
   * @param {string} text - The text to format
   * @param {boolean} isPartial - Whether this is a partial transcript
   * @param {string} previousText - The previous text for context
   * @returns {string} Formatted text
   */
  formatText(text, isPartial = false, previousText = '') {
    if (!text) return '';
    
    let formatted = text.trim();
    
    // Apply smart capitalization
    formatted = this.applyCapitalization(formatted, previousText);
    
    // Add punctuation if it's a final transcript
    if (!isPartial) {
      formatted = this.addPunctuation(formatted);
    }
    
    // Format special patterns
    formatted = this.formatSpecialPatterns(formatted);
    
    // Clean up spacing
    formatted = this.cleanupSpacing(formatted);
    
    return formatted;
  }

  /**
   * Apply intelligent capitalization
   */
  applyCapitalization(text, previousText = '') {
    let result = text;
    
    // Capitalize first letter if it's the start of a sentence
    if (!previousText || previousText.match(/[.!?]\s*$/)) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    // Capitalize 'I' when standalone
    result = result.replace(/\bi\b/g, 'I');
    
    // Preserve abbreviations
    const words = result.split(' ');
    result = words.map(word => {
      const upperWord = word.toUpperCase();
      if (this.abbreviations.has(upperWord)) {
        return upperWord;
      }
      return word;
    }).join(' ');
    
    // Capitalize proper nouns (simple heuristic)
    result = result.replace(/\b([A-Z][a-z]+)\b/g, (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1);
    });
    
    return result;
  }

  /**
   * Add punctuation based on context
   */
  addPunctuation(text) {
    // Skip if already has ending punctuation
    if (text.match(/[.!?;]$/)) {
      return text;
    }
    
    // Check if it's a question
    if (this.patterns.question.test(text)) {
      return text + '?';
    }
    
    // Check if it's an exclamation
    if (this.patterns.exclamation.test(text)) {
      return text + '!';
    }
    
    // Default to period
    return text + '.';
  }

  /**
   * Format special patterns (URLs, emails, numbers, etc.)
   */
  formatSpecialPatterns(text) {
    let result = text;
    
    // Format times (e.g., "3:30 PM")
    result = result.replace(this.patterns.time, (match) => {
      return match.toUpperCase();
    });
    
    // Format numbers with commas for thousands
    result = result.replace(/\b(\d{4,})\b/g, (match) => {
      return parseInt(match).toLocaleString();
    });
    
    return result;
  }

  /**
   * Clean up spacing issues
   */
  cleanupSpacing(text) {
    let result = text;
    
    // Remove multiple spaces
    result = result.replace(/\s+/g, ' ');
    
    // Fix spacing around punctuation
    result = result.replace(/\s+([.!?,;])/g, '$1');
    result = result.replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => {
      return p1 + ' ' + p2.toUpperCase();
    });
    
    // Ensure space after punctuation
    result = result.replace(/([.!?,;])([A-Za-z])/g, '$1 $2');
    
    return result.trim();
  }

  /**
   * Format for display with word-by-word animation support
   */
  formatForDisplay(text, options = {}) {
    const {
      highlightNew = false,
      animateWords = false,
      maxLength = null
    } = options;
    
    let formatted = this.formatText(text, options.isPartial, options.previousText);
    
    // Truncate if needed
    if (maxLength && formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '...';
    }
    
    // Split into words for animation
    if (animateWords) {
      const words = formatted.split(' ');
      return {
        text: formatted,
        words: words,
        wordCount: words.length
      };
    }
    
    return formatted;
  }

  /**
   * Extract sentence boundaries for better segmentation
   */
  getSentenceBoundaries(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map(s => s.trim());
  }

  /**
   * Check if text appears to be a complete sentence
   */
  isCompleteSentence(text) {
    // Has ending punctuation
    if (text.match(/[.!?]$/)) {
      return true;
    }
    
    // Has typical sentence structure (subject + verb)
    const words = text.split(' ');
    if (words.length >= 3) {
      // Simple heuristic: if it has enough words and starts with a capital
      return text.match(/^[A-Z]/);
    }
    
    return false;
  }
}

// Export singleton instance
export default new TextFormatter();