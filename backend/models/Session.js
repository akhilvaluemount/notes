const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  question_type: {
    type: String,
    enum: ['behavioral', 'technical', 'system_design', 'coding', 'general'],
    default: 'general'
  },
  language: {
    type: String,
    default: null
  },
  topic: {
    type: String,
    default: null
  }
});

const sessionSchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: true
  },
  company_name: {
    type: String,
    required: true
  },
  interviewer_name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  technologies: [{
    type: String
  }],
  questions: [questionSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  }
});

sessionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Session', sessionSchema);