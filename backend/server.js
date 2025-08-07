const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    // Accept multiple audio formats that work with Whisper API
    const supportedFormats = [
      'audio/mpeg',     // MP3
      'audio/mp3',      // MP3 alternative
      'audio/wav',      // WAV
      'audio/ogg',      // OGG
      'audio/webm'      // WebM
    ];
    
    const supportedExtensions = ['.mp3', '.wav', '.ogg', '.webm'];
    
    if (supportedFormats.includes(file.mimetype) || 
        supportedExtensions.some(ext => file.originalname.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format. Please use MP3, WAV, OGG, or WebM format.'));
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
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Received audio file:', req.file.originalname, 'Size:', req.file.size, 'MIME:', req.file.mimetype);
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

    // Transcribe audio using Whisper API
    console.log('Sending audio file to Whisper API...');
    
    let finalPath = audioPath;
    
    // If it's a WebM file, ensure proper extension for Whisper API
    if (req.file.mimetype === 'audio/webm' || req.file.originalname.endsWith('.webm')) {
      // Rename WebM files to have proper extension
      const renamedPath = audioPath + '.webm';
      fs.renameSync(audioPath, renamedPath);
      finalPath = renamedPath;
      console.log('Renamed file for Whisper compatibility:', renamedPath);
    }
    
    // Verify file exists before creating stream
    if (!fs.existsSync(finalPath)) {
      throw new Error(`File not found: ${finalPath}`);
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(finalPath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    });
    
    console.log('Transcription received:', transcription);

    // Clean up the final file
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
      console.log('Cleaned up file:', finalPath);
    }

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
      const webmPath = originalPath + '.webm';
      
      // Clean up original file if it still exists
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
        console.log('Cleaned up original file:', originalPath);
      }
      
      // Clean up renamed WebM file if it exists
      if (fs.existsSync(webmPath)) {
        fs.unlinkSync(webmPath);
        console.log('Cleaned up WebM file:', webmPath);
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
      errorMessage = 'Audio format not supported. Please try recording in MP3, WAV, or OGG format.';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ask AI endpoint
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    // Get response from ChatGPT with prompt from frontend
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const answer = completion.choices[0].message.content.trim();

    res.json({ 
      success: true,
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI response error:', error);
    
    // Handle specific OpenAI errors
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