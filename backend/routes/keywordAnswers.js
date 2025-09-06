const express = require('express');
const router = express.Router();
const KeywordAnswer = require('../models/KeywordAnswer');

// Simple Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  
  // Create matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calculate similarity percentage between two strings
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  if (maxLength === 0) return 100;
  
  return ((maxLength - distance) / maxLength) * 100;
}

// Check if any word in keyword matches any word in text with >= threshold similarity
function hasWordMatch(keyword, textWords, threshold = 80) {
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  
  for (const keywordWord of keywordWords) {
    for (const textWord of textWords) {
      // 1. Check exact substring match first (e.g., "box" matches "box model", "flex" matches "flexbox")
      if (keywordWord.includes(textWord) || textWord.includes(keywordWord)) {
        const longer = keywordWord.length > textWord.length ? keywordWord : textWord;
        const shorter = keywordWord.length > textWord.length ? textWord : keywordWord;
        
        // Allow substring matches if the shorter word is at least 3 characters
        // and covers at least 50% of the longer word, or if it's an exact substring
        const coverage = (shorter.length / longer.length) * 100;
        if (shorter.length >= 3 && (coverage >= 50 || keywordWord === textWord)) {
          return { 
            match: true, 
            similarity: Math.round(coverage), 
            keywordWord, 
            textWord,
            matchType: 'substring'
          };
        }
      }
      
      // 2. Check fuzzy similarity for non-substring matches
      const similarity = calculateSimilarity(keywordWord, textWord);
      if (similarity >= threshold) {
        return { 
          match: true, 
          similarity: Math.round(similarity), 
          keywordWord, 
          textWord,
          matchType: 'fuzzy'
        };
      }
    }
  }
  
  return { match: false };
}

// Save answer with keywords
router.post('/save', async (req, res) => {
  try {
    const { sessionId, keywords, answer, question, metadata } = req.body;
    
    if (!sessionId || !keywords || !answer) {
      return res.status(400).json({ error: 'Session ID, keywords, and answer are required' });
    }

    // Parse keywords string into array
    const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    
    if (keywordArray.length === 0) {
      return res.status(400).json({ error: 'At least one keyword is required' });
    }

    const keywordAnswer = new KeywordAnswer({
      sessionId,
      keywords: keywordArray,
      answer,
      question,
      metadata
    });

    await keywordAnswer.save();
    res.json({ success: true, keywordAnswer });
  } catch (error) {
    console.error('Error saving keyword answer:', error);
    res.status(500).json({ error: 'Failed to save keyword answer' });
  }
});

// Search for keyword matches (exact + fuzzy matching)
router.post('/search', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({ error: 'Session ID and text are required' });
    }

    // Split text into words for fuzzy matching
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Create n-grams for exact matching (1-3 words)
    const searchTerms = [];
    for (let i = 0; i < words.length; i++) {
      // 1-word
      searchTerms.push(words[i]);
      // 2-word
      if (i < words.length - 1) {
        searchTerms.push(`${words[i]} ${words[i + 1]}`);
      }
      // 3-word
      if (i < words.length - 2) {
        searchTerms.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    // 1. Find exact matches first (for performance)
    const exactMatches = await KeywordAnswer.find({
      sessionId,
      keywords: { $in: searchTerms }
    }).limit(10);

    // 2. Get all keyword answers for fuzzy matching
    const allAnswers = await KeywordAnswer.find({ sessionId });

    // Group results by matched keywords
    const suggestions = {};
    const processedAnswers = new Set();

    // Process exact matches first
    exactMatches.forEach(match => {
      processedAnswers.add(match._id.toString());
      match.keywords.forEach(keyword => {
        if (searchTerms.includes(keyword)) {
          if (!suggestions[keyword]) {
            suggestions[keyword] = [];
          }
          suggestions[keyword].push({
            id: match._id,
            answer: match.answer,
            question: match.question,
            metadata: match.metadata,
            matchType: 'exact'
          });
        }
      });
    });

    // Process fuzzy matches for remaining answers
    allAnswers.forEach(answer => {
      if (processedAnswers.has(answer._id.toString())) return;

      answer.keywords.forEach(keyword => {
        const matchResult = hasWordMatch(keyword, words, 80);
        if (matchResult.match) {
          if (!suggestions[keyword]) {
            suggestions[keyword] = [];
          }
          suggestions[keyword].push({
            id: answer._id,
            answer: answer.answer,
            question: answer.question,
            metadata: answer.metadata,
            matchType: 'fuzzy',
            similarity: Math.round(matchResult.similarity),
            matchedWord: matchResult.keywordWord,
            sourceWord: matchResult.textWord
          });
          processedAnswers.add(answer._id.toString());
        }
      });
    });

    // Limit total suggestions
    const limitedSuggestions = {};
    const suggestionEntries = Object.entries(suggestions);
    
    // Sort by match type (exact first) then by similarity for fuzzy matches
    suggestionEntries.sort(([keyA, answersA], [keyB, answersB]) => {
      const aHasExact = answersA.some(a => a.matchType === 'exact');
      const bHasExact = answersB.some(b => b.matchType === 'exact');
      
      if (aHasExact && !bHasExact) return -1;
      if (!aHasExact && bHasExact) return 1;
      
      // If both fuzzy, sort by highest similarity
      if (!aHasExact && !bHasExact) {
        const aMaxSim = Math.max(...answersA.map(a => a.similarity || 0));
        const bMaxSim = Math.max(...answersB.map(b => b.similarity || 0));
        return bMaxSim - aMaxSim;
      }
      
      return 0;
    });
    
    // Take top 8 suggestions
    suggestionEntries.slice(0, 8).forEach(([keyword, answers]) => {
      limitedSuggestions[keyword] = answers;
    });

    res.json({ suggestions: limitedSuggestions });
  } catch (error) {
    console.error('Error searching keywords:', error);
    res.status(500).json({ error: 'Failed to search keywords' });
  }
});

// Get all keyword answers for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const keywordAnswers = await KeywordAnswer.find({ sessionId }).sort({ createdAt: -1 });
    res.json(keywordAnswers);
  } catch (error) {
    console.error('Error fetching keyword answers:', error);
    res.status(500).json({ error: 'Failed to fetch keyword answers' });
  }
});

// Update a keyword answer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords, answer, question, language, topic, metadata } = req.body;
    
    const updateData = {};
    if (keywords) updateData.keywords = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    if (answer) updateData.answer = answer;
    if (question) updateData.question = question;
    
    // Handle metadata - either from direct language/topic fields or metadata object
    if (language || topic || metadata) {
      updateData.metadata = {
        language: language || metadata?.language || '',
        topic: topic || metadata?.topic || ''
      };
    }
    updateData.updatedAt = Date.now();
    
    const updated = await KeywordAnswer.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Keyword answer not found' });
    }
    
    res.json({ success: true, keywordAnswer: updated });
  } catch (error) {
    console.error('Error updating keyword answer:', error);
    res.status(500).json({ error: 'Failed to update keyword answer' });
  }
});

// Delete a keyword answer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await KeywordAnswer.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting keyword answer:', error);
    res.status(500).json({ error: 'Failed to delete keyword answer' });
  }
});

module.exports = router;