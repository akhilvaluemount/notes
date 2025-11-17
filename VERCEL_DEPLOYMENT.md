# Vercel Deployment Guide

This guide will help you deploy the Voice Notes Interview App to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. MongoDB Atlas account for database (https://www.mongodb.com/cloud/atlas)
3. OpenAI API key (https://platform.openai.com/api-keys)
4. Claude API key from Anthropic (https://console.anthropic.com/)
5. Git repository (GitHub, GitLab, or Bitbucket)

## Project Structure

The project is configured as a monorepo with:
- **Frontend**: React app in `/frontend` directory
- **Backend**: Express API in `/backend` directory
- **Configuration**: `vercel.json` at root for deployment settings

## Step 1: Prepare Your Repository

1. Push your code to a Git repository (GitHub recommended):
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin master
```

## Step 2: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (or use existing one)
3. Go to "Database Access" and create a database user
4. Go to "Network Access" and add `0.0.0.0/0` to allow access from anywhere
5. Click "Connect" on your cluster, choose "Connect your application"
6. Copy the connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net/database`)

## Step 3: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: Leave default or use `npm run vercel-build`
   - **Output Directory**: Leave default

5. **Add Environment Variables**:
   Click "Environment Variables" and add the following:

   ```
   MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/database
   OPENAI_API_KEY = sk-your-openai-api-key-here
   CLAUDE_API_KEY = sk-ant-your-claude-api-key-here
   ```

6. Click "Deploy"

### Option B: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts and set up environment variables when asked

## Step 4: Configure Environment Variables in Vercel

After deployment, you can add/update environment variables:

1. Go to your project in Vercel Dashboard
2. Click "Settings" tab
3. Click "Environment Variables"
4. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `MONGODB_URI` | Your MongoDB Atlas connection string | Production, Preview, Development |
| `OPENAI_API_KEY` | Your OpenAI API key | Production, Preview, Development |
| `CLAUDE_API_KEY` | Your Anthropic Claude API key | Production, Preview, Development |

**Important**: Make sure to select all environments (Production, Preview, Development) for each variable.

## Step 5: Verify Deployment

1. Once deployed, Vercel will provide you with a URL (e.g., `https://your-project.vercel.app`)
2. Visit the URL and test the application
3. Check the Vercel logs if you encounter any issues:
   - Go to "Deployments" tab
   - Click on the latest deployment
   - View the "Build Logs" and "Function Logs"

## API Routes

After deployment, your API endpoints will be available at:
- `https://your-project.vercel.app/api/sessions`
- `https://your-project.vercel.app/api/ask-ai`
- `https://your-project.vercel.app/api/ask-ai-stream`
- `https://your-project.vercel.app/api/ask-ai-vision`
- `https://your-project.vercel.app/health`

## Troubleshooting

### Build Fails

1. Check the build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify `vercel.json` configuration is correct

### API Errors

1. Check that environment variables are set correctly
2. View Function Logs in Vercel dashboard
3. Ensure MongoDB Atlas allows connections from `0.0.0.0/0`

### Frontend Can't Connect to Backend

1. The frontend should automatically use the same domain for API calls
2. Check browser console for CORS errors
3. Verify `vercel.json` routes are configured correctly

### Database Connection Issues

1. Verify MongoDB connection string is correct
2. Check that your IP is whitelisted in MongoDB Atlas
3. Ensure database user has proper permissions

### WebSocket/Real-time Features

Note: Vercel Serverless Functions have a 10-second timeout for Hobby tier and 60-second for Pro tier. Long-running connections may not work as expected. Consider using Vercel Edge Functions or a different platform for WebSocket features.

## Environment-Specific Configuration

### Development
For local development, create a `.env` file in the `backend` directory:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your local values
```

And optionally in `frontend` directory:
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed
```

### Production
All production environment variables are managed through Vercel Dashboard.

## Continuous Deployment

Vercel automatically deploys your app when you push to your Git repository:
- **Production**: Commits to `main` or `master` branch
- **Preview**: Commits to other branches (like `develop`, `feature/*`)

## Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click "Settings" > "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Performance Optimization

1. **Frontend**: Already optimized with React build process
2. **Backend**: Serverless functions auto-scale
3. **Database**: Use MongoDB indexes for frequently queried fields
4. **CDN**: Vercel automatically serves static assets via CDN

## Costs

- **Vercel**: Free tier includes 100GB bandwidth/month
- **MongoDB Atlas**: Free tier (M0) includes 512MB storage
- **OpenAI API**: Pay-per-use (check your usage limits)
- **Claude API**: Pay-per-use (check Anthropic pricing)

## Security Best Practices

1. Never commit `.env` files to Git
2. Rotate API keys regularly
3. Monitor API usage to prevent abuse
4. Set up rate limiting (already implemented in backend)
5. Use Vercel's built-in DDoS protection

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Project Issues: [Your GitHub Issues URL]

## Useful Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View deployment logs
vercel logs <deployment-url>

# List all deployments
vercel ls

# Remove a deployment
vercel rm <deployment-url>
```

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up analytics (Vercel Analytics)
5. Enable Vercel Insights for performance monitoring
