# Vercel Deployment - Current Status & Debug Guide

**Last Updated:** 2025-11-17
**Deployment URL:** https://notes-lake-delta.vercel.app

## Current Issue

API endpoints are returning "Cannot GET" errors:
- `/api/health` → Cannot GET
- `/api/sessions` → Cannot GET
- `/api/sessions/:id` → Cannot GET

## What's Working

✅ Frontend is deployed and loading
✅ MongoDB is connecting (seen in logs)
✅ Environment variables are set
✅ Build completes successfully

## What's NOT Working

❌ API routes not responding
❌ Express app not handling requests
❌ Session list not loading on dashboard

## Current Architecture

```
/api
├── _app.js              # Express app with all routes
├── sessions.js          # Handler for /api/sessions*
├── health.js            # Handler for /api/health
├── keyword-answers.js   # Handler for /api/keyword-answers*
└── package.json
```

## Debug Steps

### 1. Check Vercel Function Logs

Go to: Vercel Dashboard → Project → Deployments → Latest → Function Logs

Look for:
- "Health endpoint called" messages
- "Sessions endpoint called" messages
- Any error messages

### 2. Test Endpoints Manually

```bash
# Test health
curl https://notes-lake-delta.vercel.app/api/health

# Test sessions list
curl https://notes-lake-delta.vercel.app/api/sessions

# Test specific session
curl https://notes-lake-delta.vercel.app/api/sessions/691ac2d57f283f29248f8789
```

### 3. Check What Vercel Is Deploying

In Vercel Dashboard → Deployments → Latest:
- Check "Source Files" tab
- Verify `api/` directory has all files
- Verify `frontend/build` exists

## Potential Issues

1. **Express App Not Being Called**
   - Handlers might not be invoking Express correctly
   - URL rewriting might be wrong

2. **Vercel Routing Config**
   - Rewrites in `vercel.json` might not be working
   - File-based routing might not detect handlers

3. **Module Resolution**
   - `_app.js` might not be loading correctly
   - Dependencies might be missing

## Next Steps

1. **Check logs** - See console.log outputs in Vercel
2. **Simplify handler** - Create minimal test without Express
3. **Alternative approach** - Use Vercel's native serverless pattern

## Alternative Solutions to Try

### Option 1: Simpler Handler (No Express)

Create `api/test-simple.js`:
```javascript
module.exports = (req, res) => {
  res.json({ message: 'Simple handler works!' });
};
```

### Option 2: Use @vercel/node Runtime

Update `vercel.json`:
```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "@vercel/node@3"
    }
  }
}
```

### Option 3: Move Back to Traditional Deployment

Use Vercel's Build Output API or deploy to a different platform.

## Files to Check

- `/api/_app.js` - Express app configuration
- `/api/sessions.js` - Sessions handler
- `/api/health.js` - Health check handler
- `/vercel.json` - Vercel configuration
- `/frontend/src/services/sessionApi.js` - Frontend API calls

## Verification Checklist

- [ ] Vercel function logs show handler being called
- [ ] Console.log messages appear in logs
- [ ] Express routes are registered correctly
- [ ] URL rewriting is working
- [ ] MongoDB connection succeeds
- [ ] Environment variables are accessible
- [ ] Frontend can reach API endpoints

## Contact/Support

- Vercel Docs: https://vercel.com/docs/functions
- Vercel Support: https://vercel.com/support
- Express with Vercel: https://vercel.com/guides/using-express-with-vercel
