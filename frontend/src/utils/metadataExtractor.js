/**
 * Utility functions to extract language and topic metadata from AI responses
 */

/**
 * Extract language and topic from AI response text
 * Looks for patterns like "Language: JavaScript" and "Topic: Event Loop"
 * @param {string} responseText - The AI response text
 * @returns {object} - Object with language, topic, and cleaned content
 */
export const extractMetadataFromResponse = (responseText) => {
  if (!responseText || typeof responseText !== 'string') {
    return {
      language: null,
      topic: null,
      cleanedContent: responseText || ''
    };
  }

  let language = null;
  let topic = null;
  let cleanedContent = responseText;

  // Extract Language (case insensitive)
  const languageMatch = responseText.match(/Language:\s*([^\n]+)/i);
  if (languageMatch) {
    language = languageMatch[1].trim();
    // Remove the Language line from content
    cleanedContent = cleanedContent.replace(/Language:\s*[^\n]+\n?/i, '');
  }

  // Extract Topic (case insensitive)
  const topicMatch = responseText.match(/Topic:\s*([^\n]+)/i);
  if (topicMatch) {
    topic = topicMatch[1].trim();
    // Remove the Topic line from content
    cleanedContent = cleanedContent.replace(/Topic:\s*[^\n]+\n?/i, '');
  }

  // Clean up any remaining extra whitespace
  cleanedContent = cleanedContent.trim();

  // Normalize language names
  if (language) {
    language = normalizeLanguage(language);
  }

  // Normalize topic names
  if (topic) {
    topic = normalizeTopic(topic);
  }

  // No local logic - let AI handle language identification

  return {
    language,
    topic,
    cleanedContent
  };
};

/**
 * Normalize language names to consistent format
 * @param {string} language - Raw language string from AI
 * @returns {string} - Normalized language name
 */
const normalizeLanguage = (language) => {
  if (!language) return null;
  
  const normalized = language.toLowerCase().trim();
  
  // Handle common variations
  const languageMap = {
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'py': 'Python',
    'java': 'Java',
    'c++': 'C++',
    'cpp': 'C++',
    'c#': 'C#',
    'csharp': 'C#',
    'html': 'HTML',
    'css': 'CSS',
    'react': 'React',
    'reactjs': 'React',
    'angular': 'Angular',
    'angularjs': 'Angular',
    'vue': 'Vue',
    'vuejs': 'Vue',
    'nodejs': 'Node.js',
    'node': 'Node.js',
    'php': 'PHP',
    'ruby': 'Ruby',
    'go': 'Go',
    'golang': 'Go',
    'rust': 'Rust',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'sql': 'SQL',
    'general': 'General',
    'not specific': 'General'
  };

  return languageMap[normalized] || language;
};

/**
 * Normalize topic names to consistent format
 * @param {string} topic - Raw topic string from AI
 * @returns {string} - Normalized topic name
 */
const normalizeTopic = (topic) => {
  if (!topic) return null;
  
  // Just trim and capitalize first letter, keep the rest as is for flexibility
  const trimmed = topic.trim();
  if (trimmed.length === 0) return null;
  
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Extract metadata from multiple Q&A pairs in a single response
 * Used when AI returns multiple questions and answers
 * @param {string} responseText - The AI response text
 * @returns {Array} - Array of objects with question, answer, language, topic
 */
export const extractMetadataFromMultiQA = (responseText) => {
  if (!responseText) return [];

  const { language, topic, cleanedContent } = extractMetadataFromResponse(responseText);
  
  // Split by Question/Answer patterns
  const qaRegex = /(Question\s+\d+:|Answer\s+\d+:)/gi;
  const parts = cleanedContent.split(qaRegex).filter(part => part.trim());
  
  const qaList = [];
  let currentQuestion = null;
  let currentAnswer = null;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    if (part.match(/Question\s+\d+:/i)) {
      // Save previous Q&A pair if exists
      if (currentQuestion && currentAnswer) {
        qaList.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.trim(),
          language,
          topic
        });
      }
      
      // Start new question (get the content after the colon)
      const content = parts[i + 1] ? parts[i + 1].trim() : '';
      currentQuestion = content;
      currentAnswer = null;
      i++; // Skip the content part since we processed it
    } else if (part.match(/Answer\s+\d+:/i)) {
      // Get answer content
      const content = parts[i + 1] ? parts[i + 1].trim() : '';
      currentAnswer = content;
      i++; // Skip the content part since we processed it
    }
  }
  
  // Save the last Q&A pair
  if (currentQuestion && currentAnswer) {
    qaList.push({
      question: currentQuestion.trim(),
      answer: currentAnswer.trim(),
      language,
      topic
    });
  }
  
  return qaList;
};

/**
 * Check if a topic is clearly technical and should override "General"
 * @param {string} topic - The topic string
 * @returns {boolean} - True if it's an obvious technical topic
 */
const isObviousTechnicalTopic = (topic) => {
  if (!topic) return false;
  
  const topicLower = topic.toLowerCase();
  
  // Technical keywords that clearly indicate it's not a behavioral question
  const technicalKeywords = [
    'selector', 'selectors', 'css', 'html', 'javascript', 'js', 'angular', 'react', 'vue',
    'directive', 'pipe', 'component', 'function', 'method', 'class', 'object', 'array',
    'loop', 'event', 'dom', 'api', 'http', 'ajax', 'json', 'xml', 'database', 'sql',
    'algorithm', 'data structure', 'variable', 'constant', 'scope', 'closure', 'promise',
    'async', 'await', 'callback', 'prototype', 'inheritance', 'polymorphism', 'encapsulation',
    'flexbox', 'grid', 'responsive', 'media query', 'animation', 'transition', 'transform'
  ];
  
  return technicalKeywords.some(keyword => topicLower.includes(keyword));
};

/**
 * Smart language detection based on topic keywords
 * @param {string} topic - The topic string
 * @returns {string|null} - Detected language or null
 */
const detectLanguageFromTopic = (topic) => {
  if (!topic) return null;
  
  const topicLower = topic.toLowerCase();
  
  // Behavioral/non-programming topics (should remain "General")
  const behavioralTopics = [
    'self introduction', 'introduce yourself', 'career goals', 'leadership',
    'teamwork', 'communication', 'problem solving', 'strengths', 'weaknesses',
    'challenges', 'motivation', 'experience', 'background', 'achievements',
    'conflict resolution', 'time management', 'career change', 'why this company'
  ];
  
  // If it's a behavioral topic, don't suggest any programming language
  if (behavioralTopics.some(keyword => topicLower.includes(keyword))) {
    return null;
  }
  
  // Angular-specific topics
  const angularTopics = [
    'directive', 'directives', 'pipe', 'pipes', 'service', 'services',
    'component', 'components', 'module', 'modules', 'router', 'routing',
    'dependency injection', 'lifecycle hooks', 'ngif', 'ngfor', 'ngclass',
    'angular cli', 'rxjs', 'observable', 'observables', 'interceptor',
    'interceptors', 'guard', 'guards', 'resolver', 'resolvers'
  ];
  
  // React-specific topics
  const reactTopics = [
    'jsx', 'tsx', 'hook', 'hooks', 'usestate', 'useeffect', 'usecontext',
    'usereducer', 'usememo', 'usecallback', 'react router', 'redux',
    'context api', 'virtual dom', 'react lifecycle'
  ];
  
  // Vue-specific topics
  const vueTopics = [
    'v-if', 'v-for', 'v-model', 'v-show', 'vue router', 'vuex', 'composition api',
    'options api', 'vue directive', 'vue component', 'emit', 'props'
  ];
  
  // CSS-specific topics
  const cssTopics = [
    'css selector', 'selectors', 'class selector', 'id selector', 'element selector',
    'pseudo-class', 'pseudo-element', 'flexbox', 'grid', 'css grid', 'css flexbox',
    'media query', 'media queries', 'css animation', 'css transition', 'css transform',
    'box model', 'positioning', 'css positioning', 'float', 'css float', 'z-index',
    'css property', 'css properties', 'stylesheet', 'css rule', 'css rules',
    'responsive design', 'css units', 'rem', 'em', 'px', 'vh', 'vw', 'css variable',
    'css variables', 'custom properties', 'sass', 'scss', 'less', 'css preprocessor'
  ];
  
  // HTML-specific topics
  const htmlTopics = [
    'html element', 'html elements', 'html tag', 'html tags', 'semantic html',
    'semantic elements', 'meta tag', 'meta tags', 'html attribute', 'html attributes',
    'dom', 'document object model', 'html form', 'html forms', 'html5', 'doctype'
  ];
  
  // JavaScript-specific topics (general JS, not framework-specific)
  const jsTopics = [
    'event loop', 'closure', 'closures', 'prototype', 'prototypal inheritance',
    'hoisting', 'scope', 'this keyword', 'arrow function', 'arrow functions',
    'promise', 'promises', 'async await', 'callback', 'callbacks', 'es6', 'es2015',
    'destructuring', 'spread operator', 'rest operator', 'template literal',
    'template literals', 'map', 'filter', 'reduce', 'foreach'
  ];
  
  // Check for CSS topics
  if (cssTopics.some(keyword => topicLower.includes(keyword))) {
    return 'CSS';
  }
  
  // Check for HTML topics
  if (htmlTopics.some(keyword => topicLower.includes(keyword))) {
    return 'HTML';
  }
  
  // Check for JavaScript topics
  if (jsTopics.some(keyword => topicLower.includes(keyword))) {
    return 'JavaScript';
  }
  
  // Check for Angular topics
  if (angularTopics.some(keyword => topicLower.includes(keyword))) {
    return 'Angular';
  }
  
  // Check for React topics
  if (reactTopics.some(keyword => topicLower.includes(keyword))) {
    return 'React';
  }
  
  // Check for Vue topics
  if (vueTopics.some(keyword => topicLower.includes(keyword))) {
    return 'Vue';
  }
  
  return null;
};

/**
 * Check if response contains metadata (Language/Topic lines)
 * @param {string} responseText - The AI response text
 * @returns {boolean} - True if metadata is present
 */
export const hasMetadata = (responseText) => {
  if (!responseText) return false;
  
  const hasLanguage = /Language:\s*[^\n]+/i.test(responseText);
  const hasTopic = /Topic:\s*[^\n]+/i.test(responseText);
  
  return hasLanguage || hasTopic;
};