# Voice Notes Interview App

AI-powered voice transcription and interview assistant using AssemblyAI, OpenAI, and Claude.

## Features

- 🎤 Real-time voice recording and transcription (AssemblyAI)
- 🤖 AI-powered responses (OpenAI GPT-4, Claude)
- 📝 Session management with MongoDB
- 💬 Keyword-based answer tracking
- 🎨 Clean React UI with dual-panel layout
- ⚡ Hybrid deployment: Vercel + Railway

## Tech Stack

- **Frontend**: React 18, Axios
- **Backend**: Vercel Serverless Functions (Express)
- **Database**: MongoDB Atlas
- **APIs**: AssemblyAI, OpenAI, Anthropic Claude

## Project Structure

```
voice-notes-copy/
├── frontend/          # React SPA → Vercel
│   ├── public/
│   ├── src/
│   └── package.json
│
├── api/              # Serverless functions → Vercel
│   ├── _app.js
│   ├── ask-ai.js
│   └── sessions.js
│
├── backend/          # Shared backend code → Vercel
│   ├── routes/
│   ├── models/
│   └── config/
│
└── websocket-server/ # WebSocket server → Railway
    ├── server.js
    ├── package.json
    └── railway.json
```

## Local Development

### 1. Environment Setup

Create `backend/.env`:

```env
MONGODB_URI=mongodb+srv://your-connection-string
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
PORT=5000
```

### 2. Install & Run

```bash
# Install all dependencies
npm run install-all

# Run both frontend + backend
npm run dev

# Or separately:
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:5000
```

## Deployment

This app uses **hybrid deployment**:
- **Vercel**: Frontend + API functions
- **Railway**: WebSocket server (real-time transcription)

### Quick Start

1. **Deploy WebSocket Server to Railway** (required first!)
   - See [websocket-server/README.md](./websocket-server/README.md)
   - Get your Railway URL: `wss://your-app.up.railway.app`

2. **Deploy to Vercel**
   ```bash
   git push origin main
   ```
   - Import project in Vercel
   - Add environment variables (including Railway WebSocket URL)
   - Deploy

### Environment Variables

**Vercel** needs:
```
MONGODB_URI
OPENAI_API_KEY
CLAUDE_API_KEY
ASSEMBLYAI_API_KEY
REACT_APP_WS_URL=wss://your-app.up.railway.app
```

**Railway** needs:
```
ASSEMBLYAI_API_KEY
```

### Full Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

## API Endpoints

All routes available at `/api/*`:

- `GET /api/health` - Health check
- `POST /api/ask-ai` - OpenAI chat
- `POST /api/ask-ai-stream` - Streaming responses
- `POST /api/ask-ai-vision` - Vision analysis
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/keyword-answers` - List answers
- `POST /api/keyword-answers` - Create answer

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `CLAUDE_API_KEY` | Anthropic API key | ✅ |
| `ASSEMBLYAI_API_KEY` | AssemblyAI key | ✅ |

## Troubleshooting

### Build Fails
- Ensure environment variables are set in Vercel
- Check `api/package.json` dependencies

### API Routes 404
- Verify `vercel.json` configuration
- Ensure function files are in `api/` directory

### Database Connection Issues
- Whitelist Vercel IPs in MongoDB Atlas (or use `0.0.0.0/0`)
- Verify `MONGODB_URI` format

### CORS Errors
- Check backend is running on port 5000 (local dev)
- Verify API routes use `/api/*` prefix

## License

MIT



| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@example.com   | admin123   |
| Premium | premium@example.com | premium123 |
| Free    | free@example.com    | free123    |

Email: exam@example.com  Password: exam123  Role: exam

