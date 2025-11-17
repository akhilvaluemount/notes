// Vercel serverless function wrapper for Express app
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');
const multer = require('multer');
const connectDB = require('../backend/config/database');
const sessionsRouter = require('../backend/routes/sessions');
const keywordAnswersRouter = require('../backend/routes/keywordAnswers');

// Create Express app
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

// Initialize OpenAI with keep-alive agent
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent,
});

// Initialize Claude (Anthropic) client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Rate limiting for AI API calls (simplified for serverless)
const rateLimit = {
  calls: new Map(),
  maxCallsPerMinute: 10,
  maxCallsPerHour: 50,
  resetInterval: 60 * 1000,
  hourlyResetInterval: 60 * 60 * 1000,

  isAllowed(ip, endpoint = 'default') {
    const now = Date.now();
    const key = `${ip}-${endpoint}`;

    if (!this.calls.has(key)) {
      this.calls.set(key, {
        minute: { count: 0, resetTime: now + this.resetInterval },
        hour: { count: 0, resetTime: now + this.hourlyResetInterval }
      });
    }

    const limits = this.calls.get(key);

    if (now >= limits.minute.resetTime) {
      limits.minute.count = 0;
      limits.minute.resetTime = now + this.resetInterval;
    }

    if (now >= limits.hour.resetTime) {
      limits.hour.count = 0;
      limits.hour.resetTime = now + this.hourlyResetInterval;
    }

    if (limits.minute.count >= this.maxCallsPerMinute) {
      console.log(`⚠️ Rate limit exceeded for ${ip} (minute): ${limits.minute.count}/${this.maxCallsPerMinute}`);
      return { allowed: false, reason: 'Too many requests per minute' };
    }

    if (limits.hour.count >= this.maxCallsPerHour) {
      console.log(`⚠️ Rate limit exceeded for ${ip} (hour): ${limits.hour.count}/${this.maxCallsPerHour}`);
      return { allowed: false, reason: 'Too many requests per hour' };
    }

    limits.minute.count++;
    limits.hour.count++;

    console.log(`📊 Rate limit for ${ip}: ${limits.minute.count}/${this.maxCallsPerMinute} per minute, ${limits.hour.count}/${this.maxCallsPerHour} per hour`);
    return { allowed: true };
  }
};

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure DB connection on every request
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    next();
  }
});

// Routes - Note: Vercel strips /api prefix, so routes are relative
app.use('/sessions', sessionsRouter);
app.use('/keyword-answers', keywordAnswersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Ask AI endpoint (non-streaming)
app.post('/ask-ai', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitCheck = rateLimit.isAllowed(clientIP, 'ask-ai');

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
        retryAfter: '60'
      });
    }

    const { prompt, model = 'chatgpt' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    console.time('Total AI Response Time');
    console.log(`Using AI Model: ${model}`);

    let answer;

    if (model === 'claude') {
      console.time('Claude API Call');

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      console.timeEnd('Claude API Call');
      answer = message.content[0].text.trim();
    } else {
      console.time('OpenAI API Call');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400,
        stream: false,
      });

      console.timeEnd('OpenAI API Call');
      answer = completion.choices[0].message.content.trim();
    }

    console.timeEnd('Total AI Response Time');
    console.log(`Response length: ${answer.length} chars, ${answer.split(' ').length} words`);

    let isAcknowledgment = false;
    const ackMatch = answer.match(/isAcknowledgment:\s*(true|false)/i);
    if (ackMatch) {
      isAcknowledgment = ackMatch[1].toLowerCase() === 'true';
      console.log(`🔍 Acknowledgment detected: ${isAcknowledgment}`);
    }

    res.json({
      success: true,
      answer: answer,
      isAcknowledgment: isAcknowledgment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI response error:', error);

    let errorMessage = 'Failed to get AI response';
    let statusCode = 500;

    if (error.message?.includes('quota')) {
      errorMessage = 'OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing';
      statusCode = 429;
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid OpenAI API key. Please check your .env configuration';
      statusCode = 401;
    } else if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to OpenAI API. Please check your internet connection';
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Streaming AI endpoint using Server-Sent Events (SSE)
app.post('/ask-ai-stream', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitCheck = rateLimit.isAllowed(clientIP, 'ask-ai-stream');

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
        retryAfter: '60'
      });
    }

    const { prompt, model = 'chatgpt' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    console.time('Stream: Total Response Time');
    console.time('Stream: First Token');
    console.log(`Using AI Model (Stream): ${model}`);
    let firstToken = true;
    let fullResponse = '';
    let tokenCount = 0;

    try {
      if (model === 'claude') {
        const stream = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 400,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            const content = chunk.delta?.text || '';

            if (content) {
              if (firstToken) {
                console.timeEnd('Stream: First Token');
                firstToken = false;
              }

              tokenCount++;
              fullResponse += content;

              res.write(`data: ${JSON.stringify({
                type: 'chunk',
                content: content,
                tokenCount: tokenCount
              })}\n\n`);
            }
          } else if (chunk.type === 'message_stop') {
            console.timeEnd('Stream: Total Response Time');
            console.log(`Stream complete: ${fullResponse.length} chars, ${fullResponse.split(' ').length} words, ${tokenCount} chunks`);

            let isAcknowledgment = false;
            const ackMatch = fullResponse.match(/isAcknowledgment:\s*(true|false)/i);
            if (ackMatch) {
              isAcknowledgment = ackMatch[1].toLowerCase() === 'true';
              console.log(`🔍 Acknowledgment detected: ${isAcknowledgment}`);
            }

            res.write(`data: ${JSON.stringify({
              type: 'complete',
              fullResponse: fullResponse,
              isAcknowledgment: isAcknowledgment,
              timestamp: new Date().toISOString(),
              stats: {
                chars: fullResponse.length,
                words: fullResponse.split(' ').length,
                chunks: tokenCount
              }
            })}\n\n`);

            res.end();
          }
        }
      } else {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 400,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';

          if (content) {
            if (firstToken) {
              console.timeEnd('Stream: First Token');
              firstToken = false;
            }

            tokenCount++;
            fullResponse += content;

            res.write(`data: ${JSON.stringify({
              type: 'chunk',
              content: content,
              tokenCount: tokenCount
            })}\n\n`);
          }

          if (chunk.choices[0]?.finish_reason) {
            console.timeEnd('Stream: Total Response Time');
            console.log(`Stream complete: ${fullResponse.length} chars, ${fullResponse.split(' ').length} words, ${tokenCount} chunks`);

            let isAcknowledgment = false;
            const ackMatch = fullResponse.match(/isAcknowledgment:\s*(true|false)/i);
            if (ackMatch) {
              isAcknowledgment = ackMatch[1].toLowerCase() === 'true';
              console.log(`🔍 Acknowledgment detected: ${isAcknowledgment}`);
            }

            res.write(`data: ${JSON.stringify({
              type: 'complete',
              fullResponse: fullResponse,
              isAcknowledgment: isAcknowledgment,
              timestamp: new Date().toISOString(),
              stats: {
                chars: fullResponse.length,
                words: fullResponse.split(' ').length,
                chunks: tokenCount
              }
            })}\n\n`);

            res.end();
          }
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: streamError.message
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Stream setup error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to initialize stream',
        message: error.message
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message
      })}\n\n`);
      res.end();
    }
  }
});

// Vision AI endpoint for image + text analysis
app.post('/ask-ai-vision', upload.single('image'), async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitCheck = rateLimit.isAllowed(clientIP, 'ask-ai-vision');

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
        retryAfter: '60'
      });
    }

    const { prompt, contextText } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let imageBase64;

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      console.log(`📷 Processing uploaded image: ${req.file.mimetype}, ${req.file.size} bytes`);
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      console.log(`📷 Processing base64 image: ${imageBase64.length} characters`);
    } else {
      return res.status(400).json({ error: 'Image is required (either as file upload or base64)' });
    }

    console.log('🧠 Vision AI Request:', {
      promptLength: prompt.length,
      contextTextLength: contextText ? contextText.length : 0,
      clientIP,
      hasImage: !!imageBase64
    });

    let fullPrompt = prompt;
    if (contextText) {
      fullPrompt = `Context: "${contextText}"\n\n${prompt}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: fullPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = response.choices[0].message.content;

    console.log('✅ Vision AI Response generated:', {
      length: answer.length,
      tokensUsed: response.usage?.total_tokens || 'unknown'
    });

    res.json({
      success: true,
      answer: answer,
      usage: response.usage
    });

  } catch (error) {
    console.error('Vision AI Error:', error);

    let errorMessage = 'Failed to analyze image';
    if (error.response) {
      errorMessage = `OpenAI API Error: ${error.response.data?.error?.message || error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      error: errorMessage,
      success: false
    });
  }
});

// Alternative vision endpoint that accepts JSON with base64 image
app.post('/ask-ai-vision-json', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitCheck = rateLimit.isAllowed(clientIP, 'ask-ai-vision');

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
        retryAfter: '60'
      });
    }

    const { prompt, imageBase64, contextText } = req.body;

    if (!prompt || !imageBase64) {
      return res.status(400).json({ error: 'Both prompt and imageBase64 are required' });
    }

    console.log('🧠 Vision AI JSON Request:', {
      promptLength: prompt.length,
      contextTextLength: contextText ? contextText.length : 0,
      imageBase64Length: imageBase64.length,
      clientIP
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    let fullPrompt = prompt;
    if (contextText) {
      fullPrompt = `Context from voice transcript: "${contextText}"\n\n${prompt}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: fullPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = response.choices[0].message.content;

    console.log('✅ Vision AI JSON Response generated:', {
      length: answer.length,
      tokensUsed: response.usage?.total_tokens || 'unknown'
    });

    res.json({
      success: true,
      answer: answer,
      usage: response.usage
    });

  } catch (error) {
    console.error('Vision AI JSON Error:', error);

    let errorMessage = 'Failed to analyze image';
    if (error.response) {
      errorMessage = `OpenAI API Error: ${error.response.data?.error?.message || error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      error: errorMessage,
      success: false
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export handler for Vercel serverless functions
module.exports = app;
module.exports.default = app;
