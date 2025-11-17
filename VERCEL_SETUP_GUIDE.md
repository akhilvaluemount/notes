# Vercel Configuration Guide for Monorepo Project

## Project Structure Overview

This project has a **monorepo structure**:
```
voice-notes-copy/
├── frontend/          # React application (Create React App)
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js/Express backend code (routes, models, config)
│   ├── routes/
│   ├── models/
│   ├── config/
│   └── package.json
├── api/               # Vercel Serverless Functions (wrappers that import from backend)
│   ├── _app.js        # Main Express app
│   ├── sessions.js
│   ├── health.js
│   └── package.json
├── package.json       # Root package.json with vercel-build script
└── vercel.json        # Vercel configuration
```

## How It Works

1. **Frontend**: React app builds to `frontend/build`
2. **Backend Logic**: Lives in `backend/` folder (shared code)
3. **API Endpoints**: Serverless functions in `api/` that import and use backend code
4. **Deployment**: Vercel serves static frontend + runs serverless API functions

---

## Vercel Dashboard Configuration

### Method 1: Configure Existing Project

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project (notes-lake-delta or similar)
   - Click **Settings** tab

2. **General Settings**
   - **Framework Preset**: Change to **"Other"** (NOT "Create React App")
   - Click **Save**

3. **Build & Development Settings**
   Override these settings:
   ```
   Framework Preset: Other

   Build Command:
   npm run vercel-build

   Output Directory:
   frontend/build

   Install Command:
   npm install && cd api && npm install

   Root Directory:
   ./
   ```
   Click **Save**

4. **Environment Variables**
   - Add the following in Settings → Environment Variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_key
   CLAUDE_API_KEY=your_claude_key
   NODE_ENV=production
   ```

5. **Redeploy**
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Click **"Redeploy"**
   - Select **"Use existing Build Cache"** → **No**
   - Click **Redeploy**

### Method 2: Delete and Recreate (If Method 1 Doesn't Work)

If the above doesn't work, Vercel may have cached incorrect settings. Try:

1. **Delete Project**
   - Settings → scroll to bottom
   - Click **"Delete Project"**
   - Confirm deletion

2. **Create New Project**
   - Dashboard → **"New Project"**
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Other
     - **Root Directory**: ./
     - **Build Command**: npm run vercel-build
     - **Output Directory**: frontend/build
     - **Install Command**: npm install && cd api && npm install

3. **Add Environment Variables**
   - Before deploying, add all environment variables

4. **Deploy**

---

## Verification Steps

After deployment completes:

### 1. Check Functions Tab
- In Vercel Dashboard → Deployments → Latest → **Functions** tab
- You should see:
  - `api/sessions.js`
  - `api/health.js`
  - `api/keyword-answers.js`
  - `api/simple-test.js`

### 2. Test API Endpoints
```bash
# Test simple endpoint
curl https://your-app.vercel.app/api/simple-test
# Should return JSON like: {"message": "Simple test works!", ...}

# Test health endpoint
curl https://your-app.vercel.app/api/health
# Should return: {"status": "OK", ...}

# Test sessions endpoint
curl https://your-app.vercel.app/api/sessions
# Should return: [] or array of sessions
```

### 3. Test Frontend
- Visit: https://your-app.vercel.app
- Should load the React application
- Check browser console for errors
- Try creating a new interview session

---

## Common Issues & Solutions

### Issue: API Still Returns 404

**Possible Causes:**
1. Vercel still treating project as static site
2. Functions not being detected

**Solutions:**
- Delete and recreate project (Method 2 above)
- Check that `api/package.json` exists with all dependencies
- Verify `vercel.json` has `functions` configuration
- Check deployment logs for function detection

### Issue: "Cannot GET /api/*" HTML Error

**Cause:** Express routes not matching URLs

**Solution:**
- Verify `api/_app.js` mounts routes correctly
- Check that individual handlers (like `api/sessions.js`) rewrite URLs properly

### Issue: MongoDB Connection Errors

**Cause:** Missing or incorrect MONGODB_URI

**Solution:**
- Add MONGODB_URI to Vercel environment variables
- Ensure MongoDB cluster allows connections from 0.0.0.0/0
- Check MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere

### Issue: Frontend Loads But API Calls Fail

**Cause:** CORS or incorrect API URLs

**Solution:**
- Verify `frontend/src/services/sessionApi.js` uses relative URLs in production
- Check browser console for CORS errors
- Verify `api/_app.js` has CORS middleware enabled

---

## File Checklist

Before deploying, ensure these files exist and are correct:

### Root Files
- [x] `package.json` - has `vercel-build` script
- [x] `vercel.json` - has functions config and rewrites
- [x] `.vercelignore` - excludes node_modules, .env files

### API Directory
- [x] `api/_app.js` - Express app with routes
- [x] `api/package.json` - All backend dependencies
- [x] `api/sessions.js` - Serverless handler
- [x] `api/health.js` - Health check handler
- [x] `api/keyword-answers.js` - Keyword handler
- [x] `api/simple-test.js` - Simple test endpoint

### Frontend Files
- [x] `frontend/package.json` - React dependencies
- [x] `frontend/src/services/sessionApi.js` - Uses relative URLs in production
- [x] All other frontend API service files use relative URLs

### Backend Files
- [x] `backend/routes/sessions.js` - Session routes
- [x] `backend/routes/keywordAnswers.js` - Keyword routes
- [x] `backend/models/` - MongoDB models
- [x] `backend/config/database.js` - MongoDB connection

---

## What's Different in This Setup

**Traditional Express Server:**
```
backend/server.js runs continuously
All routes handled by one process
Single long-running Node.js server
```

**Vercel Serverless:**
```
Each API endpoint is a separate function
Functions start on-demand (cold starts)
No long-running processes
Stateless execution
```

**Key Adaptations:**
1. `api/_app.js` creates Express app but exports it (doesn't listen on port)
2. Each endpoint file imports the app and invokes it as a handler
3. MongoDB connection is cached to survive cold starts
4. Routes are mounted at root in `_app.js` (Vercel handles `/api` prefix)

---

## Alternative Deployment Strategy

If Vercel continues to have issues detecting functions, consider:

### Option A: Deploy API Separately
1. Deploy API to **Render.com** or **Railway.app** (supports traditional Express servers)
2. Deploy frontend to Vercel (static only)
3. Update `frontend/.env.production`:
   ```
   REACT_APP_API_URL=https://your-api.render.com
   ```

### Option B: Use Vercel CLI
```bash
npm install -g vercel
cd /path/to/voice-notes-copy
vercel --prod
```
Sometimes CLI deployment forces proper detection.

### Option C: Move to Single Framework
- Use Next.js (Vercel's native framework)
- Migrate React app to Next.js
- Use Next.js API routes instead of separate Express

---

## Current Deployment Status

**URL**: https://notes-lake-delta.vercel.app

**Current Issue**:
- API endpoints returning "Cannot GET /api/*" HTML error
- Vercel not detecting `/api` folder as serverless functions
- Likely cause: Framework Preset set to "Create React App" instead of "Other"

**Expected After Fix**:
- `/api/simple-test` → Returns JSON
- `/api/health` → Returns `{"status": "OK"}`
- `/api/sessions` → Returns array of sessions
- Frontend loads and can create/view interviews

---

## Support Resources

- **Vercel Serverless Functions**: https://vercel.com/docs/functions/serverless-functions
- **Vercel Monorepos**: https://vercel.com/docs/monorepos
- **This Project's Documentation**:
  - `VERCEL_DEPLOYMENT.md` - Original deployment guide
  - `VERCEL_MANUAL_FIX.md` - Manual configuration steps
  - `DEBUG_STATUS.md` - Debugging status

---

## Quick Action Items

**YOU NEED TO DO THIS:**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Framework Preset → Change to **"Other"**
4. Settings → Build & Development Settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/build`
   - Install Command: `npm install && cd api && npm install`
5. Settings → Environment Variables → Add MongoDB URI and API keys
6. Deployments → Redeploy (without cache)
7. Check Functions tab to verify functions are detected
8. Test endpoints with curl

That's it! The code is already correct. Vercel just needs the right configuration.
