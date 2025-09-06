const mongoose = require('mongoose');

const keywordAnswerSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  keywords: [{
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }],
  answer: {
    type: String,
    required: true
  },
  question: {
    type: String
  },
  metadata: {
    language: String,
    topic: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

keywordAnswerSchema.index({ keywords: 1 });
keywordAnswerSchema.index({ sessionId: 1, keywords: 1 });

keywordAnswerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('KeywordAnswer', keywordAnswerSchema);