const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authenticate middleware - verifies JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Authorize middleware - checks if user has required role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check AI usage limit middleware
const checkAILimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const limitCheck = req.user.checkAILimit();

    if (!limitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: 'AI usage limit reached for today',
        limit: limitCheck.limit,
        remaining: 0
      });
    }

    // Attach limit info to request for response headers
    req.aiLimit = limitCheck;
    next();
  } catch (error) {
    console.error('AI limit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking AI usage limit'
    });
  }
};

// Increment AI call count after successful request
const incrementAICall = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'free') {
      await req.user.incrementAICall();
    }
    next();
  } catch (error) {
    console.error('Error incrementing AI call:', error);
    // Don't fail the request, just log the error
    next();
  }
};

// Check premium access middleware
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (!req.user.hasPremiumAccess()) {
    return res.status(403).json({
      success: false,
      message: 'This feature requires Premium or Admin access'
    });
  }

  next();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Optional auth - attaches user if token present, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Token invalid, but that's okay for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  checkAILimit,
  incrementAICall,
  requirePremium,
  generateToken,
  optionalAuth,
  JWT_SECRET
};
