const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the KeywordAnswer model
const KeywordAnswer = require('./models/KeywordAnswer');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Load keyword answers and update interviewQuestions.js
const loadKeywordAnswers = async () => {
  try {
    await connectDB();
    
    // Fetch all keyword answers from the collection
    console.log('Fetching keyword answers from database...');
    const keywordAnswers = await KeywordAnswer.find({}).sort({ createdAt: -1 });
    
    console.log(`Found ${keywordAnswers.length} keyword answers`);
    
    if (keywordAnswers.length === 0) {
      console.log('No keyword answers found in the database');
      return;
    }
    
    // Filter for General language records only
    const generalLanguageAnswers = keywordAnswers.filter(answer => 
      answer.metadata && 
      answer.metadata.language && 
      answer.metadata.language.toLowerCase() === 'general'
    );
    
    console.log(`Found ${generalLanguageAnswers.length} General language keyword answers`);
    
    if (generalLanguageAnswers.length === 0) {
      console.log('No General language keyword answers found');
      return;
    }
    
    // Convert to the required format
    const formattedQuestions = generalLanguageAnswers.map((answer, index) => {
      // Extract actual question from answer text if available
      let extractedQuestion = answer.question || `Question ${index + 1}`;
      
      // Try to extract question from the answer text pattern like "Question 1: What are your..."
      const questionMatch = answer.answer.match(/Question \d+:\s*([^?]+\?)/);
      if (questionMatch) {
        extractedQuestion = questionMatch[1].trim();
      }
      
      return {
        question: extractedQuestion,
        answer: answer.answer,
        timestamp: answer.createdAt.toISOString(),
        question_type: "general",
        language: "General",
        topic: answer.metadata.topic || "General",
        _id: answer._id.toString()
      };
    });
    
    // Generate the new interviewQuestions.js content
    const fileContent = `export const interviewQuestions = [\n${formattedQuestions.map((q, index) => {
      return `  // ${index + 1}. ${q.topic}\n  {\n    "question": "${q.question.replace(/"/g, '\\"')}",\n    "answer": "${q.answer.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",\n    "timestamp": "${q.timestamp}",\n    "question_type": "${q.question_type}",\n    "language": "${q.language}",\n    "topic": "${q.topic}",\n    "_id": "${q._id}"\n  }`;
    }).join(',\n\n')}\n];\n`;
    
    // Write to interviewQuestions.js file
    const filePath = path.join(__dirname, 'interviewQuestions.js');
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    console.log(`Successfully updated ${filePath} with ${formattedQuestions.length} questions`);
    console.log('\nSample of loaded questions:');
    formattedQuestions.slice(0, 3).forEach((q, index) => {
      console.log(`${index + 1}. ${q.question} (Topic: ${q.topic})`);
    });
    
  } catch (error) {
    console.error('Error loading keyword answers:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  loadKeywordAnswers();
}

module.exports = { loadKeywordAnswers };