# Complete Deployment Guide

Step-by-step guide to deploy the Voice Notes Interview App using **Vercel** (frontend + API) and **Railway** (WebSocket server).

## Prerequisites

Before deploying, ensure you have:

- ✅ MongoDB Atlas account with a database created
- ✅ OpenAI API key
- ✅ Anthropic (Claude) API key
- ✅ AssemblyAI API key
- ✅ GitHub/GitLab/Bitbucket account
- ✅ Vercel account (free tier works)
- ✅ Railway account (free tier works - $5 credit/month)

## Step 1: Prepare Your Repository

### 1.1 Commit Your Code

```bash
# Check current status
git status

# Add all files
git add .

# Commit
git commit -m "Clean project ready for deployment"

# Push to GitHub
git push origin main
```

### 1.2 Verify Structure

Your repository should look like this:

```
voice-notes-copy/
├── frontend/           # React app (Vercel)
├── api/               # API functions (Vercel)
├── backend/           # Shared backend code (Vercel)
├── websocket-server/  # WebSocket server (Railway)
├── vercel.json
├── package.json
└── README.md
```

## Step 2: MongoDB Atlas Setup

### 2.1 Create Database

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster (free tier M0 works)
3. Click "Connect" → "Connect your application"
4. Copy the connection string

### 2.2 Whitelist IPs

In MongoDB Atlas:
1. Network Access → Add IP Address
2. Use `0.0.0.0/0` (allows all IPs including Vercel)
3. Click "Confirm"

### 2.3 Create Database User

1. Database Access → Add New Database User
2. Set username and password
3. Set permissions to "Read and write to any database"

### 2.4 Format Connection String

Replace placeholders in connection string:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

Example:
```
mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/voice-notes?retryWrites=true&w=majority
```

## Step 3: Deploy WebSocket Server to Railway

**Why Railway?** Vercel doesn't support WebSocket servers. We need Railway for real-time transcription.

### 3.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect the `websocket-server/` folder

### 3.2 Configure Railway

1. **Root Directory**: Set to `websocket-server`
   - Settings → Service → Root Directory → `websocket-server`

2. **Start Command**: Should auto-detect `node server.js`
   - If not: Settings → Deploy → Start Command → `node server.js`

3. **Add Environment Variables**:
   - Settings → Variables → Add Variable
   - Add: `ASSEMBLYAI_API_KEY` = `your_assemblyai_key`
   - Railway automatically provides `PORT` variable

### 3.3 Deploy

1. Click "Deploy" or push to GitHub (auto-deploys)
2. Wait 1-2 minutes for deployment
3. Copy your Railway URL: `your-app.up.railway.app`
4. **Important**: Note this URL - you'll need it for Vercel

### 3.4 Get WebSocket URL

Your WebSocket URL will be:
```
wss://your-app.up.railway.app
```

**Save this URL** - you'll add it to Vercel environment variables next.

---

## Step 4: Deploy to Vercel

### 4.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration

### 4.2 Configure Build Settings

Vercel should automatically detect from `vercel.json`:

- **Build Command**: `cd frontend && npm install && CI=false npm run build`
- **Output Directory**: `frontend/build`
- **Install Command**: `cd api && npm install`

If not, manually enter these settings.

### 4.3 Add Environment Variables

Click "Environment Variables" and add:

| Name | Value | Example |
|------|-------|---------|
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@...` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-proj-...` |
| `CLAUDE_API_KEY` | Your Anthropic API key | `sk-ant-...` |
| `ASSEMBLYAI_API_KEY` | Your AssemblyAI API key | `...` |
| `REACT_APP_WS_URL` | Your Railway WebSocket URL | `wss://your-app.up.railway.app` |

**Important**:
- Set environment variables for all environments (Production, Preview, Development)
- Use the Railway URL from Step 3.4 for `REACT_APP_WS_URL`

### 4.4 Deploy

1. Click "Deploy"
2. Wait 2-5 minutes for build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 5: Verify Deployment

### 5.1 Test Vercel API Health

Visit: `https://your-project.vercel.app/api/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T..."
}
```

### 5.2 Test Railway WebSocket

Test your WebSocket connection:
```bash
# Using wscat (install: npm install -g wscat)
wscat -c wss://your-app.up.railway.app

# Should connect successfully
```

### 5.3 Test Frontend

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Check that the app loads
3. Test recording functionality (should connect to Railway WebSocket)
4. Test AI responses
5. Verify real-time transcription works

### 5.4 Check Logs

**Vercel Logs:**
1. Vercel Dashboard → Your Project → Deployments
2. Click on the deployment
3. View "Function Logs" for errors

**Railway Logs:**
1. Railway Dashboard → Your Project
2. Click "Deployments" tab
3. View logs for WebSocket server errors

## Step 6: Configure Custom Domain (Optional)

### 6.1 Vercel Domain

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 6.2 Railway Domain (Optional)

1. Railway Dashboard → Your Project → Settings
2. Generate Domain or add custom domain
3. Update frontend `REACT_APP_WS_URL` if you change the domain

### 6.3 SSL Certificates

Both Vercel and Railway automatically provision SSL certificates.

## Troubleshooting

### Build Fails

**Error**: "Module not found"
- **Fix**: Check `api/package.json` has all dependencies
- Run `cd api && npm install` locally to verify

**Error**: "CI warnings treated as errors"
- **Fix**: Ensure build command includes `CI=false`

### API Routes Return 404

**Error**: `/api/sessions` returns 404
- **Fix**: Verify files exist in `api/` directory
- Check `vercel.json` rewrites configuration

### Database Connection Fails

**Error**: "MongoServerError: Authentication failed"
- **Fix**: Verify `MONGODB_URI` is correct
- Check username/password in connection string

**Error**: "MongooseServerSelectionError"
- **Fix**: Whitelist all IPs (`0.0.0.0/0`) in MongoDB Atlas

### Environment Variables Not Working

**Error**: "process.env.OPENAI_API_KEY is undefined"
- **Fix**: Ensure variables are set in Vercel Dashboard
- Redeploy after adding variables

### CORS Errors

**Error**: "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Fix**: Check `api/_app.js` has CORS middleware configured
- Verify API routes are accessed via `/api/*`

### WebSocket Connection Fails

**Error**: "WebSocket connection to 'ws://localhost:5002' failed"
- **Fix**: Ensure `REACT_APP_WS_URL` is set in Vercel to Railway URL
- Should be `wss://your-app.up.railway.app` (not `ws://`)
- Redeploy Vercel after adding variable

**Error**: "WebSocket closed unexpectedly"
- **Fix**: Check Railway logs for errors
- Verify `ASSEMBLYAI_API_KEY` is set in Railway
- Ensure Railway service is running (not crashed)

## Updating Your Deployment

### Push Changes

```bash
# Make your changes
git add .
git commit -m "Update feature X"
git push origin main
```

**Auto-Deploy:**
- Vercel: Automatically redeploys on every push to `main`
- Railway: Automatically redeploys on every push to `main`

### Rollback

1. Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

## Environment-Specific Deployments

### Preview Deployments

- Every pull request gets a preview URL
- Use for testing before merging

### Production vs Development

- `main` branch → Production
- Other branches → Preview deployments

## Performance Optimization

### Enable Caching

Vercel automatically caches static assets from `frontend/build/`.

### Function Regions

By default, functions deploy globally. To specify regions, add to `vercel.json`:

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

## Security Best Practices

1. **Never commit `.env` files**
2. **Rotate API keys** regularly
3. **Use environment variables** for all secrets
4. **Enable rate limiting** in production
5. **Monitor logs** for suspicious activity

## Cost Considerations

### Vercel Free Tier Limits

- 100GB bandwidth/month
- 100 serverless function invocations/day
- 6000 build minutes/month

For higher usage, consider Vercel Pro ($20/month).

### API Usage Costs

Monitor your API usage:
- **OpenAI**: Usage-based pricing
- **Claude**: Usage-based pricing
- **AssemblyAI**: Pay-per-use
- **MongoDB Atlas**: Free tier M0 (512MB)

## Support

If you encounter issues:

1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review deployment logs
3. Test locally first with `npm run dev`
4. Check MongoDB Atlas network access

## Quick Reference

### Useful Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

### Important URLs

- Vercel Dashboard: https://vercel.com/dashboard
- MongoDB Atlas: https://cloud.mongodb.com
- OpenAI Platform: https://platform.openai.com
- Anthropic Console: https://console.anthropic.com

---

**Deployment completed successfully?** Your app is now live and ready to use!
