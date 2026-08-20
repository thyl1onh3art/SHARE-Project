# Frontend Service Recreation Checklist

## Before Deleting - Save These Settings

### 1. Environment Variables
**Railway Dashboard → Frontend Service → Variables**

Save all environment variables, especially:
- `REACT_APP_API_URL` (if set)
- `PORT` (if custom)
- Any API keys or secrets
- Any other custom variables

**How to save:**
- Take screenshots
- OR copy each variable name and value
- OR export if Railway has export option

### 2. Service Settings
**Railway Dashboard → Frontend Service → Settings**

Note down:
- Root Directory (should be `frontend`)
- Health Check settings
- Any custom build commands
- Restart policy settings

### 3. Domain/URL
**Railway Dashboard → Frontend Service → Settings → Networking**

Note:
- Custom domain (if any)
- Railway-generated URL

### 4. GitHub Connection
**Railway Dashboard → Frontend Service → Settings → Source**

Note:
- Which GitHub repo is connected
- Which branch (should be `main`)

## Steps to Recreate Service

### Step 1: Delete Old Service
1. Railway Dashboard → Your Project
2. Click on **Frontend** service
3. Settings → Scroll to bottom
4. Click **"Delete Service"** or **"Remove Service"**
5. Confirm deletion

### Step 2: Create New Service
1. Railway Dashboard → Your Project
2. Click **"+ New"** or **"Add Service"**
3. Select **"GitHub Repo"**
4. Choose your repository (SHARE-Project)
5. Railway will detect it's a React app

### Step 3: Configure New Service

**Settings → Source:**
- Root Directory: `frontend` (important!)
- Branch: `main`

**Settings → Build:**
- Builder should automatically be **"Default"** or **"RAILPACK"** ✅
- (This is why we're recreating - new service will use correct builder)

**Settings → Deploy:**
- Start Command: Should auto-detect from `railway.json`
- Should show: `npx serve -s build -l $PORT`

### Step 4: Restore Environment Variables
1. Settings → Variables
2. Add back all the variables you saved
3. Make sure `REACT_APP_API_URL` is set correctly:
   - For production: `https://share-project-production.up.railway.app/api`
   - For local dev: `http://localhost:5000/api`

### Step 5: Deploy
1. Railway should auto-deploy after connecting to GitHub
2. OR manually: Deployments → Redeploy
3. Wait for build to complete
4. Check logs - should show "Building with RAILPACK" or "Default builder"

### Step 6: Verify
1. Check deployment logs - no NIXPACKS_PATH errors ✅
2. Visit the Railway-generated URL
3. Background should be red (from our earlier change)
4. App should work normally

## Current Configuration Files (Already Set)

✅ `railway.json` - Configured with RAILPACK builder
✅ `package.json` - Has build scripts
✅ No `nixpacks.toml` - Removed (good)
✅ Code pushed to GitHub

## Expected Result

New service will:
- ✅ Use RAILPACK/Default builder automatically
- ✅ Build successfully without NIXPACKS_PATH errors
- ✅ Deploy correctly
- ✅ Match backend service configuration

## Quick Reference

**Root Directory:** `frontend`
**Branch:** `main`
**Builder:** Should auto-detect as Default/RAILPACK
**Start Command:** `npx serve -s build -l $PORT` (from railway.json)

Good luck! This should work perfectly since the new service will use the correct builder from the start.

