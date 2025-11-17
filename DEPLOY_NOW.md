# 🚀 Quick Deployment Guide

## Step 1: Set Environment Variables in Vercel

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these 3 variables:

| Variable | Value | Where to get it |
|----------|-------|----------------|
| `MONGODB_URI` | `mongodb+srv://username:password@...` | MongoDB Atlas connection string |
| `OPENAI_API_KEY` | `sk-proj-...` | https://platform.openai.com/api-keys |
| `CLAUDE_API_KEY` | `sk-ant-...` | https://console.anthropic.com/ |

⚠️ **Important:** Select **all environments** (Production, Preview, Development) for each variable!

## Step 2: Deploy

### Option A: Auto-deploy (Recommended)
```bash
git add .
git commit -m "Fix Vercel deployment"
git push origin master
```
Vercel will automatically deploy.

### Option B: Manual deploy
```bash
vercel --prod
```

## Step 3: Verify

After deployment completes, test these URLs:

```bash
# Replace YOUR_APP with your Vercel app name

# Test API health
https://YOUR_APP.vercel.app/api/health

# Test frontend
https://YOUR_APP.vercel.app

# Test API endpoint
https://YOUR_APP.vercel.app/api/sessions
```

## ✅ Success Checklist

- [ ] Environment variables are set in Vercel
- [ ] MongoDB Atlas allows connections from 0.0.0.0/0
- [ ] Code is pushed to GitHub/GitLab
- [ ] Vercel deployment completed without errors
- [ ] `/api/health` returns `{"status":"OK"}`
- [ ] Frontend loads correctly
- [ ] Can create a new interview session

## 🐛 Still Having Issues?

### 404 Error on Root Path
- Check: `frontend/build` directory exists
- Check: Vercel build logs show successful build
- Solution: Redeploy after ensuring `buildCommand` runs successfully

### 404 on API Routes
- Check: Environment variables are set
- Check: API function deployed successfully
- Check: Vercel function logs for errors

### Database Connection Errors
- Check: MongoDB URI is correct
- Check: MongoDB Atlas network access includes 0.0.0.0/0
- Check: Database user has read/write permissions

### API Returns Empty or Errors
- Check: Function logs in Vercel Dashboard
- Check: All environment variables are set
- Check: OpenAI/Claude API keys are valid

## 📚 Full Documentation

- Detailed guide: `VERCEL_FIX_SUMMARY.md`
- Original deployment guide: `VERCEL_DEPLOYMENT.md`

## 🆘 Emergency Rollback

If deployment breaks your app:

```bash
vercel list
vercel rollback <previous-deployment-url>
```

---

**Quick Help:**
- Vercel Status: https://www.vercel-status.com/
- Build not starting? Check package.json scripts
- Function timing out? Check MongoDB connection
- Still stuck? Check Vercel deployment logs
