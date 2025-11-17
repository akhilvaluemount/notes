# Voice Notes Interview App

AI-powered voice transcription and interview assistant using AssemblyAI, OpenAI, and Claude.

## Features

- 🎤 Real-time voice recording and transcription (AssemblyAI)
- 🤖 AI-powered responses (OpenAI GPT-4, Claude)
- 📝 Session management with MongoDB
- 💬 Keyword-based answer tracking
- 🎨 Clean React UI with dual-panel layout
- ⚡ Serverless deployment on Vercel

## Tech Stack

- **Frontend**: React 18, Axios
- **Backend**: Vercel Serverless Functions (Express)
- **Database**: MongoDB Atlas
- **APIs**: AssemblyAI, OpenAI, Anthropic Claude

## Project Structure

```
voice-notes-copy/
├── frontend/          # React SPA (static files)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── api/              # Vercel serverless functions
│   ├── _app.js       # Shared Express app
│   ├── ask-ai.js     # AI endpoints
│   ├── sessions.js   # Session CRUD
│   └── package.json
│
└── backend/          # Local dev server (optional)
    ├── server.js
    ├── routes/
    ├── models/
    └── config/
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

## Vercel Deployment

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository

3. **Add Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables, add:
   ```
   MONGODB_URI
   OPENAI_API_KEY
   CLAUDE_API_KEY
   ASSEMBLYAI_API_KEY
   ```

4. **Deploy**
   - Vercel auto-detects configuration
   - Click "Deploy"

For detailed steps, see [DEPLOYMENT.md](./DEPLOYMENT.md)

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
