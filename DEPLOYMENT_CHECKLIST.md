# Vercel Deployment Checklist

Use this quick checklist to deploy your Voice Notes Interview App to Vercel.

## Pre-Deployment Checklist

- [ ] **MongoDB Atlas Setup**
  - [ ] Create MongoDB Atlas account
  - [ ] Create a cluster (free tier M0 is fine)
  - [ ] Create database user with password
  - [ ] Whitelist all IPs (0.0.0.0/0) in Network Access
  - [ ] Get connection string (mongodb+srv://...)

- [ ] **API Keys Ready**
  - [ ] OpenAI API key (from https://platform.openai.com/api-keys)
  - [ ] Claude API key (from https://console.anthropic.com/)
  - [ ] Check that you have credits/billing set up for both

- [ ] **Git Repository**
  - [ ] Code pushed to GitHub/GitLab/Bitbucket
  - [ ] All .env files are in .gitignore (NOT committed)
  - [ ] README.md and documentation updated

## Deployment Steps

### 1. Connect to Vercel

- [ ] Go to https://vercel.com
- [ ] Sign up or log in
- [ ] Click "New Project"
- [ ] Import your Git repository

### 2. Configure Project Settings

- [ ] **Root Directory**: Leave as `./` (root)
- [ ] **Framework Preset**: Other (or leave auto-detected)
- [ ] **Build Command**: Auto-detected from package.json
- [ ] **Output Directory**: Auto-detected

### 3. Set Environment Variables

Add these three environment variables in Vercel:

- [ ] **MONGODB_URI**
  ```
  mongodb+srv://username:password@cluster.mongodb.net/database_name
  ```
  - Select: Production, Preview, Development

- [ ] **OPENAI_API_KEY**
  ```
  sk-your-openai-api-key-here
  ```
  - Select: Production, Preview, Development

- [ ] **CLAUDE_API_KEY**
  ```
  sk-ant-your-claude-api-key-here
  ```
  - Select: Production, Preview, Development

### 4. Deploy

- [ ] Click "Deploy" button
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check build logs for any errors

### 5. Post-Deployment Testing

- [ ] Visit your deployed URL
- [ ] Test microphone permissions
- [ ] Test voice recording
- [ ] Test transcription feature
- [ ] Test AI response (both ChatGPT and Claude)
- [ ] Test image upload/analysis
- [ ] Test session creation and management
- [ ] Check browser console for errors
- [ ] Test on mobile device

### 6. Verify API Endpoints

Test these endpoints are working:

- [ ] `https://your-app.vercel.app/health` - Should return {"status": "OK"}
- [ ] `https://your-app.vercel.app/api/sessions` - Should return sessions array
- [ ] API calls from frontend work correctly

## Common Issues & Solutions

### Build Fails
- Check Vercel build logs
- Verify all dependencies are in package.json
- Check that node version is compatible

### "Cannot connect to database"
- Verify MONGODB_URI is correct
- Check MongoDB Atlas Network Access allows 0.0.0.0/0
- Verify database user credentials

### "API Key Invalid"
- Double-check API keys in Vercel environment variables
- Make sure there are no extra spaces
- Verify keys are valid on respective platforms

### Frontend Shows Blank Page
- Check browser console for errors
- Verify build completed successfully
- Check that static files are being served

### API Calls Return 404
- Verify vercel.json routes configuration
- Check that backend/server.js exports app correctly
- Review function logs in Vercel dashboard

## Optional Enhancements

- [ ] Add custom domain in Vercel settings
- [ ] Enable Vercel Analytics
- [ ] Set up monitoring/alerts
- [ ] Configure CORS for specific domains (currently allows all)
- [ ] Add rate limiting per user/session
- [ ] Set up backup strategy for MongoDB

## Environment URLs

After deployment, you'll have:
- **Production**: `https://your-project.vercel.app`
- **Preview**: Auto-generated URLs for each branch
- **Development**: Run locally with `npm run dev`

## Useful Vercel Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Open project in browser
vercel open
```

## Support Resources

- 📚 Full Guide: See `VERCEL_DEPLOYMENT.md`
- 🌐 Vercel Docs: https://vercel.com/docs
- 💬 Vercel Support: https://vercel.com/support
- 🔧 MongoDB Docs: https://docs.mongodb.com/
- 🤖 OpenAI Docs: https://platform.openai.com/docs
- 🧠 Claude Docs: https://docs.anthropic.com/

## Success Criteria

Your deployment is successful when:
- ✅ Application loads without errors
- ✅ Voice recording works
- ✅ Transcription works
- ✅ AI responses work (both models)
- ✅ Sessions can be created and saved
- ✅ Database operations work
- ✅ No console errors
- ✅ Mobile responsive

---

**Last Updated**: November 2025
**Deployment Platform**: Vercel
**Node Version**: 18.x or higher
