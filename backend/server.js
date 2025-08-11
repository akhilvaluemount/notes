const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Log API key status (first few chars only for security)
console.log('API Key configured:', process.env.OPENAI_API_KEY ? 
  `Yes (starts with ${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 
  'No - Please check your .env file');

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads - accept only known working formats
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    // Accept all audio formats supported by OpenAI Whisper API
    const supportedFormats = [
      'audio/mpeg',     // MP3, MPEG
      'audio/mp3',      // MP3 alternative
      'audio/wav',      // WAV
      'audio/ogg',      // OGG, OGA
      'audio/webm',     // WebM
      'audio/mp4',      // MP4, M4A
      'audio/m4a',      // M4A
      'audio/flac',     // FLAC
      'audio/x-flac',   // FLAC alternative
      'audio/mpga'      // MPGA
    ];
    
    const supportedExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.mp4', '.m4a', '.flac', '.mpeg', '.mpga', '.oga'];
    
    // Check if the MIME type or file extension is supported
    // Handle codec specifications in MIME types (e.g., "audio/webm;codecs=opus")
    const baseMimeType = file.mimetype.split(';')[0]; // Remove codec info
    
    if (supportedFormats.includes(file.mimetype) || 
        supportedFormats.includes(baseMimeType) ||
        supportedExtensions.some(ext => file.originalname.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}. Supported formats: MP3, WAV, OGG, WebM, M4A, MP4, FLAC, MPEG, MPGA, OGA.`));
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Transcribe audio endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Performance monitoring
    console.time('Total Transcription Time');
    console.time('File Processing');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    // Extract conversation history from request for context
    const conversationHistory = req.body.conversationHistory || '';

    console.log('Received audio file:', req.file.originalname, 'Size:', req.file.size, 'MIME:', req.file.mimetype);
    console.log('Base MIME type (without codec):', req.file.mimetype.split(';')[0]);
    const audioPath = req.file.path;
    
    // Validate file size (Whisper has 25MB limit)
    if (req.file.size > 25 * 1024 * 1024) {
      fs.unlinkSync(audioPath);
      return res.status(400).json({ 
        error: 'Audio file too large. Maximum size is 25MB.',
        message: `File size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB` 
      });
    }

    // Check if file is too small (likely empty or corrupt)
    if (req.file.size < 1000) { // Less than 1KB
      fs.unlinkSync(audioPath);
      return res.status(400).json({ 
        error: 'Audio file too small. Please record some audio.',
        message: `File size: ${req.file.size} bytes` 
      });
    }

    console.timeEnd('File Processing');
    
    // Transcribe audio using Whisper API with memory-based processing
    console.time('Whisper API Call');
    console.log('Sending audio file to Whisper API...');
    
    // Ensure proper file extension for OpenAI Whisper API
    let finalPath = audioPath;
    let needsRename = false;
    
    // Determine correct extension based on MIME type
    const baseMimeType = req.file.mimetype.split(';')[0];
    let correctExtension = '';
    
    switch (baseMimeType) {
      case 'audio/webm':
        correctExtension = '.webm';
        break;
      case 'audio/ogg':
        correctExtension = '.ogg';
        break;
      case 'audio/wav':
        correctExtension = '.wav';
        break;
      case 'audio/mpeg':
      case 'audio/mp3':
        correctExtension = '.mp3';
        break;
      case 'audio/mp4':
      case 'audio/m4a':
        correctExtension = '.m4a';
        break;
      case 'audio/flac':
        correctExtension = '.flac';
        break;
      default:
        correctExtension = '.webm'; // Default fallback
    }
    
    // Check if file needs proper extension for OpenAI
    if (!audioPath.endsWith(correctExtension)) {
      finalPath = audioPath + correctExtension;
      fs.renameSync(audioPath, finalPath);
      needsRename = true;
      console.log(`Renamed file for OpenAI compatibility: ${audioPath} -> ${finalPath}`);
    }

    // Build intelligent context prompt for better technical term recognition
    const buildContextPrompt = (conversationHistory) => {
      // Base technical context for frontend development
      let prompt = "Frontend developer technical interview about HTML, CSS, JavaScript, TypeScript, React, Angular, web development, coding, programming, software engineering. Expected technical terms: useState, useEffect, components, props, state, hooks, DOM, API, REST, async, await, promises, functions, classes, objects, arrays, variables, const, let, var, import, export, modules.";
      
      // Add recent conversation history for continuity and context
      if (conversationHistory && conversationHistory.trim()) {
        const words = conversationHistory.trim().split(' ');
        const recentWords = Math.min(words.length, 80); // Last 80 words for context
        const recentContext = words.slice(-recentWords).join(' ');
        
        // Extract potential proper nouns and technical terms from history for consistency
        const technicalTerms = recentContext.match(/\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b/g) || [];
        const uniqueTerms = [...new Set(technicalTerms)].slice(0, 10); // Top 10 unique terms
        
        if (uniqueTerms.length > 0) {
          prompt += ` Key terms mentioned: ${uniqueTerms.join(', ')}.`;
        }
        
        prompt += ` Previous context: "${recentContext}"`;
        console.log(`Context: ${recentWords} words, ${uniqueTerms.length} key terms`);
      }
      
      return prompt;
    };
    
    const contextPrompt = buildContextPrompt(conversationHistory);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(finalPath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
      prompt: contextPrompt,
      temperature: 0.2, // More consistent output for technical terms
    });
    
    console.timeEnd('Whisper API Call');
    
    console.log('Transcription received:', transcription);

    // Clean up the uploaded file(s)
    console.time('File Cleanup');
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
      console.log('Cleaned up file:', finalPath);
    }
    // Also clean up original file if it was renamed
    if (needsRename && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log('Cleaned up original file:', audioPath);
    }
    console.timeEnd('File Cleanup');
    
    console.timeEnd('Total Transcription Time');
    console.log(`Transcription stats: ${transcription.length} chars, ${transcription.split(' ').length} words`);

    res.json({ 
      success: true,
      transcript: transcription,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up files if they exist (both original and potentially renamed)
    if (req.file) {
      const originalPath = req.file.path;
      
      // Clean up original file if it still exists
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
        console.log('Cleaned up original file:', originalPath);
      }
      
      // Clean up potential renamed files with different extensions
      const possibleExtensions = ['.webm', '.ogg', '.wav', '.mp3', '.m4a', '.flac'];
      for (const ext of possibleExtensions) {
        const renamedPath = originalPath + ext;
        if (fs.existsSync(renamedPath)) {
          fs.unlinkSync(renamedPath);
          console.log('Cleaned up renamed file:', renamedPath);
        }
      }
    }

    // Handle specific OpenAI errors
    let errorMessage = 'Failed to transcribe audio';
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
    } else if (error.message?.includes('format')) {
      errorMessage = 'Audio format not supported. Please try recording in MP3, WAV, OGG, or WebM format.';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ask AI endpoint (non-streaming for backward compatibility)
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    // Performance monitoring
    console.time('Total AI Response Time');
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
    const answer = completion.choices[0].message.content.trim();
    
    console.timeEnd('Total AI Response Time');
    console.log(`Response length: ${answer.length} chars, ${answer.split(' ').length} words`);

    res.json({ 
      success: true,
      answer: answer,
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
app.post('/api/ask-ai-stream', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Performance monitoring
    console.time('Stream: Total Response Time');
    console.time('Stream: First Token');
    let firstToken = true;
    let fullResponse = '';
    let tokenCount = 0;

    try {
      // Create streaming completion
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

      // Process stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        
        if (content) {
          if (firstToken) {
            console.timeEnd('Stream: First Token');
            firstToken = false;
          }
          
          tokenCount++;
          fullResponse += content;
          
          // Send chunk to client
          res.write(`data: ${JSON.stringify({ 
            type: 'chunk', 
            content: content,
            tokenCount: tokenCount
          })}\n\n`);
        }
        
        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason) {
          console.timeEnd('Stream: Total Response Time');
          console.log(`Stream complete: ${fullResponse.length} chars, ${fullResponse.split(' ').length} words, ${tokenCount} chunks`);
          
          // Send completion event
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            fullResponse: fullResponse,
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
    
    // If headers aren't sent yet, send error as JSON
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set OPENAI_API_KEY in your .env file');
});