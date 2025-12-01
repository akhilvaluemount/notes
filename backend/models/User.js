const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'premium', 'free', 'exam'],
    default: 'free'
  },
  aiCallsToday: {
    type: Number,
    default: 0
  },
  aiCallsResetDate: {
    type: Date,
    default: Date.now
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();

  // Only hash the password if it's new or modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if AI call limit is reached (for free users)
userSchema.methods.checkAILimit = function() {
  const FREE_DAILY_LIMIT = 20;

  // Admin, premium, and exam users have unlimited access
  if (this.role === 'admin' || this.role === 'premium' || this.role === 'exam') {
    return { allowed: true, remaining: -1 }; // -1 means unlimited
  }

  // Check if we need to reset the counter (new day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resetDate = new Date(this.aiCallsResetDate);
  resetDate.setHours(0, 0, 0, 0);

  if (today > resetDate) {
    // New day, reset counter
    this.aiCallsToday = 0;
    this.aiCallsResetDate = today;
  }

  const remaining = FREE_DAILY_LIMIT - this.aiCallsToday;
  return {
    allowed: remaining > 0,
    remaining: remaining,
    limit: FREE_DAILY_LIMIT
  };
};

// Increment AI call count
userSchema.methods.incrementAICall = async function() {
  const limitCheck = this.checkAILimit();

  if (this.role === 'free') {
    this.aiCallsToday += 1;
    await this.save();
  }

  return limitCheck;
};

// Check if user has access to premium features
userSchema.methods.hasPremiumAccess = function() {
  return this.role === 'admin' || this.role === 'premium';
};

// Check if user has access to exam features
userSchema.methods.hasExamAccess = function() {
  return this.role === 'admin' || this.role === 'premium' || this.role === 'exam';
};

// Check if user is exam-only (can only access exams, not interviews)
userSchema.methods.isExamOnlyUser = function() {
  return this.role === 'exam';
};

// Return user data without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
