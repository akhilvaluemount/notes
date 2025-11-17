# Vercel Manual Configuration Fix

## Problem
API endpoints returning 404 - Vercel not detecting `/api` folder functions.

## Root Cause
Vercel is likely detecting this as a React-only project and ignoring serverless functions.

## Solution: Update Vercel Project Settings

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your project (`notes-lake-delta` or similar)
3. Click **Settings** tab

### Step 2: Update Framework Preset
1. Scroll to **"Framework Preset"**
2. Change from "Create React App" or whatever it shows to → **"Other"**
3. Click **Save**

### Step 3: Update Build Settings
1. Scroll to **"Build & Development Settings"**
2. **Override** these settings:

```
Framework Preset: Other

Build Command:
npm run vercel-build

Output Directory:
frontend/build

Install Command:
npm install

Root Directory:
./
```

3. Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Select **"Use existing Build Cache"** → **No** (force fresh build)
5. Click **Redeploy**

## Step 5: Verify
After deployment completes, test:

```bash
curl https://your-app.vercel.app/api/simple-test
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/sessions
```

All should return JSON (not HTML errors).

## Alternative: If Above Doesn't Work

### Delete and Recreate Project
1. In Vercel Dashboard → Settings → scroll to bottom
2. Click **"Delete Project"**
3. Confirm deletion
4. Go back to dashboard
5. Click **"New Project"**
6. Import your GitHub repo again
7. When configuring:
   - Framework: **Other**
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/build`
   - Root Directory: `./`
8. Click Deploy

This forces Vercel to re-detect everything from scratch.

## Why This Happens

Vercel caches project configuration. Once it detects your project as "Create React App", it:
- Ignores `/api` folder
- Uses CRA's build process
- Doesn't look for serverless functions

Changing to "Other" framework tells Vercel:
- Don't assume anything
- Look for `/api` folder
- Detect serverless functions
- Use custom build command

## Verification Checklist

After redeployment:
- [ ] `/api/simple-test` returns JSON
- [ ] `/api/health` returns `{"status":"OK"}`
- [ ] `/api/sessions` returns array of sessions
- [ ] Frontend loads at `/`
- [ ] No CORS errors in browser console
- [ ] Interview list appears on dashboard

## If STILL Not Working

There may be an issue with Vercel's file detection. Try:

1. **Check Deployment Source Files:**
   - Vercel Dashboard → Deployments → Latest
   - Click **"Source"** tab
   - Verify `/api` folder is present with all `.js` files

2. **Check Function Logs:**
   - Click **"Functions"** tab
   - See if any functions are listed
   - If empty → Vercel didn't detect them

3. **Manual Fix - Use .vercel/output:**
   - This requires creating a custom build output
   - See: https://vercel.com/docs/build-output-api/v3

## Last Resort: Different Deployment Strategy

If none of the above works, consider:

1. **Deploy API separately:**
   - Deploy API to Render.com / Railway.app / Heroku
   - Update frontend `REACT_APP_API_URL` to point to that
   - Deploy frontend to Vercel (static only)

2. **Use Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```
   This sometimes forces proper detection.

3. **Contact Vercel Support:**
   - https://vercel.com/support
   - Mention "API functions not being detected"
   - Provide deployment URL

## Current File Structure (For Reference)

```
/
├── api/               # Vercel Serverless Functions
│   ├── _app.js        # Express app
│   ├── sessions.js    # /api/sessions handler
│   ├── health.js      # /api/health handler
│   └── package.json   # Dependencies
├── backend/           # Backend logic (imported by /api)
│   ├── routes/
│   ├── models/
│   └── config/
├── frontend/
│   └── build/        # React build output
├── package.json      # Root package (has vercel-build script)
└── vercel.json       # Vercel configuration
```

Everything is configured correctly in code. The issue is Vercel's project settings.
