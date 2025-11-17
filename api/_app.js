// Express app module (reusable)
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');
const multer = require('multer');
const connectDB = require('../backend/config/database');
const sessionsRouter = require('../backend/routes/sessions');
const keywordAnswersRouter = require('../backend/routes/keywordAnswers');

const app = express();

// MongoDB connection (cached for serverless)
let isConnected = false;
async function ensureDbConnection() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

// Create custom HTTPS agent with keep-alive
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 10,
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent,
});

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure DB connection
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    next();
  }
});

// Routes - mounted at root since /api prefix is handled by Vercel
app.use('/sessions', sessionsRouter);
app.use('/keyword-answers', keywordAnswersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
