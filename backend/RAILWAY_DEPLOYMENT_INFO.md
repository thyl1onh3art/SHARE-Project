# Railway Deployment - What You Need

## ✅ Files You Need (Railway)

### Backend
- ✅ `railway.json` - Railway configuration
- ✅ `package.json` - Dependencies and scripts
- ✅ `app.js` - Main application file
- ✅ `Procfile` - Process file (optional, Railway uses railway.json)

### Frontend
- ✅ `railway.json` - Railway configuration
- ✅ `package.json` - Dependencies and scripts
- ✅ `build/` - Production build folder (created by `npm run build`)

## ❌ Files You DON'T Need (Vercel)

- ❌ `vercel.json` - **REMOVED** (Vercel-specific, not needed for Railway)
- ❌ `.vercelignore` - Not needed
- ❌ Any Vercel CLI files

## 📋 Railway Configuration

### Backend (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node app.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Frontend (`frontend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🚀 Railway Deployment Steps

1. **Backend Service:**
   - Root Directory: `backend`
   - Build Command: (auto-detected by Nixpacks)
   - Start Command: `node app.js` (from railway.json)
   - Environment Variables: Set in Railway dashboard

2. **Frontend Service:**
   - Root Directory: `frontend`
   - Build Command: `npm run build` (set in Railway)
   - Start Command: `npx serve -s build -l $PORT` (from railway.json)
   - Environment Variables: `REACT_APP_API_URL=https://your-backend-url.up.railway.app/api`

## 📝 Notes

- Railway uses `railway.json` for configuration
- Nixpacks auto-detects Node.js projects
- No need for Vercel-specific files
- All Vercel files have been removed ✅

