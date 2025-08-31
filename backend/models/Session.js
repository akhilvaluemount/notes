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

const transcriptMessageSchema = new mongoose.Schema({
  message_id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  is_partial: {
    type: Boolean,
    default: false
  },
  silence_segmented: {
    type: Boolean,
    default: false
  },
  has_silence_gap: {
    type: Boolean,
    default: false
  },
  last_activity_time: {
    type: Date,
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
  transcript_messages: [transcriptMessageSchema],
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