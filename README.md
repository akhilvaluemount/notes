# Voice Transcription App

A full-stack MERN application that transcribes voice to text in real-time using OpenAI's Whisper API and provides AI-powered responses using ChatGPT.

## Features

- 🎤 Real-time voice recording and transcription
- 🔄 Automatic audio chunking (5-second intervals)
- 📝 Live transcript display with timestamps
- 🤖 AI-powered responses using OpenAI ChatGPT
- 🎛️ Recording controls (Start/Stop/Clear)
- 📜 Auto-scroll functionality
- 💬 Simple, direct AI answers (no formatting or summaries)

## Tech Stack

- **Frontend**: React 18, Axios
- **Backend**: Node.js, Express
- **APIs**: OpenAI Whisper (transcription), OpenAI Chat (GPT-3.5/GPT-4)
- **Audio**: Web Audio API, MediaRecorder

## Project Structure

```
voice-transcription-app/
├── backend/
│   ├── server.js           # Express server with API endpoints
│   ├── package.json        # Backend dependencies
│   ├── .env.example        # Environment variables template
│   └── .gitignore
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioRecorder.js    # Recording controls
│   │   │   ├── TranscriptPanel.js  # Left panel - transcripts
│   │   │   └── ResponsePanel.js    # Right panel - AI responses
│   │   ├── App.js          # Main application component
│   │   ├── App.css         # Main styles
│   │   └── index.js        # React entry point
│   ├── package.json        # Frontend dependencies
│   ├── .env.example        # Frontend environment template
│   └── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### 1. Clone or Create the Project

```bash
cd voice-transcription-app
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-api-key-here
# OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4o
# PORT=5000

# Start the backend server
npm start

# Or use nodemon for development
npm run dev
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Optional: Create .env file if using different backend URL
cp .env.example .env

# Start the React development server
npm start
```

The app will open at http://localhost:3000

## Usage

1. **Start Recording**: Click the "Start Recording" button to begin voice capture
2. **Automatic Transcription**: Audio is automatically sent for transcription every 5 seconds
3. **View Transcripts**: Transcripts appear in the left panel with timestamps
4. **Ask AI**: Click "Ask AI" on any transcript block to get an AI response
5. **View Response**: The AI's answer appears in the right panel
6. **Controls**:
   - **Stop**: Stop recording
   - **Clear All**: Clear all transcripts and responses
   - **Auto-Scroll**: Toggle automatic scrolling of new transcripts

## API Endpoints

### Backend (http://localhost:5000)

- `GET /health` - Health check
- `POST /api/ask-ai` - Get AI response (JSON body with `prompt`)

## Environment Variables

### Backend (.env)

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
PORT=5000
```

### Frontend (.env) - Optional

```env
REACT_APP_API_URL=http://localhost:5000
```

## How It Works

1. **Audio Recording**: Uses the browser's MediaRecorder API to capture audio from the microphone
2. **Chunking**: Audio is automatically chunked every 5 seconds for real-time transcription
3. **Transcription**: Audio chunks are sent to the backend, which uses OpenAI's Whisper API
4. **Display**: Transcripts are displayed in chronological order in the left panel
5. **AI Interaction**: Clicking "Ask AI" sends the transcript text to ChatGPT for a response
6. **Response**: The AI's plain-text answer is displayed in the right panel

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires HTTPS for microphone access
- Mobile browsers: May have limited MediaRecorder support

## Troubleshooting

### Microphone Access Denied
- Check browser permissions for microphone access
- Ensure the site is served over HTTPS in production

### API Key Issues
- Verify your OpenAI API key is valid
- Check that the .env file is properly configured
- Ensure you have sufficient API credits

### Audio Not Recording
- Check browser console for errors
- Verify MediaRecorder is supported in your browser
- Try a different audio format if issues persist

### CORS Errors
- Ensure backend is running on port 5000
- Check that the proxy setting in frontend/package.json is correct
- Or update REACT_APP_API_URL in frontend .env

## Production Deployment

This app is ready for deployment on Vercel with minimal configuration.

### Quick Deploy to Vercel

1. **Prerequisites**:
   - MongoDB Atlas account and connection string
   - OpenAI API key
   - Claude (Anthropic) API key
   - Git repository (GitHub/GitLab/Bitbucket)

2. **Deploy**:
   - Push code to your Git repository
   - Import project in Vercel dashboard
   - Add environment variables (MONGODB_URI, OPENAI_API_KEY, CLAUDE_API_KEY)
   - Click "Deploy"

3. **Detailed Guides**:
   - 📋 **Quick Start**: See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
   - 📚 **Full Guide**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/voice-notes-copy)

### Other Platforms

The app can also be deployed to:
- **Netlify**: Use the same vercel.json configuration
- **Railway**: Supports monorepo structure
- **Render**: Deploy frontend and backend separately
- **AWS/Google Cloud**: Use containerization with Docker

## Security Notes

- Never commit .env files to version control
- Use environment variables for all sensitive data
- Implement rate limiting in production
- Add authentication if needed
- Validate and sanitize all inputs

## License

MIT