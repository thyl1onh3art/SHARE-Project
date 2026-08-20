# How to Add New Frontend Service in Railway

## Step-by-Step Instructions

### Step 1: Go to Your Project
1. Log in to **Railway Dashboard**: https://railway.app/dashboard
2. Click on your **SHARE Project** (or project name)

### Step 2: Add New Service
1. In your project view, look for:
   - **"+ New"** button (usually at the top right or bottom)
   - OR **"Add Service"** button
   - OR **"Create Service"** option
2. Click it

### Step 3: Choose Service Type
You'll see options like:
- **"GitHub Repo"** ← Select this one
- "Empty Service"
- "Database"
- etc.

Click **"GitHub Repo"** or **"From GitHub"**

### Step 4: Select Your Repository
1. Railway will show a list of your GitHub repositories
2. Find and select: **"SHARE-Project"** (or your repo name)
3. Click **"Deploy"** or **"Add"**

### Step 5: Configure the Service

After adding, Railway will ask you to configure it:

#### A. Service Name (if prompted)
- Name it: **"Frontend"** or **"frontend"**

#### B. Root Directory (IMPORTANT!)
1. Go to **Settings** tab
2. Find **"Root Directory"** or **"Source"** section
3. Set it to: **`frontend`** (no leading slash, just `frontend`)
4. This tells Railway where your frontend code is

#### C. Branch
1. Make sure branch is set to: **`main`**
2. (Or whatever branch you're using)

#### D. Builder (Should Auto-Detect)
- Railway should automatically detect React app
- Builder should show: **"Default"** or **"RAILPACK"**
- If it shows Nixpacks, you can change it to Default

### Step 6: Configure Build Settings

**Settings → Build:**
- Builder: Should be **"Default"** or **"RAILPACK"** ✅
- Build Command: Should auto-detect `npm run build`
- Output Directory: Should auto-detect `build`

**Settings → Deploy:**
- Start Command: Should read from `railway.json`
- Should show: `npx serve -s build -l $PORT`

### Step 7: Add Environment Variables

**Settings → Variables:**

Add any environment variables you had before, especially:

```env
REACT_APP_API_URL=https://share-project-production.up.railway.app/api
```

(Or whatever backend URL you're using)

### Step 8: Deploy

Railway should automatically:
1. Detect the code
2. Build the app
3. Deploy it

**OR** manually trigger:
1. Go to **Deployments** tab
2. Click **"Deploy"** or **"Redeploy"**

### Step 9: Verify

1. **Check Build Logs:**
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Should see: "Building with RAILPACK" or "Default builder"
   - Should NOT see NIXPACKS_PATH errors ✅

2. **Get Service URL:**
   - Go to **Settings → Networking**
   - Find the **Public Domain** or **Railway URL**
   - Copy it (e.g., `https://share-project-frontend-production.up.railway.app`)

3. **Test the App:**
   - Visit the URL
   - Should see red background (from our earlier change)
   - App should work normally

## Quick Checklist

- [ ] Created new service from GitHub repo
- [ ] Set Root Directory to `frontend`
- [ ] Branch set to `main`
- [ ] Builder is Default/RAILPACK (not Nixpacks)
- [ ] Environment variables added (especially REACT_APP_API_URL)
- [ ] Service is deployed
- [ ] Build logs show no errors
- [ ] App is accessible via Railway URL

## Important Settings Summary

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Branch** | `main` |
| **Builder** | `Default` or `RAILPACK` |
| **Start Command** | `npx serve -s build -l $PORT` (from railway.json) |
| **Build Command** | `npm run build` (auto-detected) |

## Troubleshooting

### If Builder Shows Nixpacks:
1. Settings → Build → Builder
2. Change to "Default" or "RAILPACK"
3. Save and redeploy

### If Build Fails:
1. Check Root Directory is `frontend` (not `/frontend`)
2. Verify `railway.json` exists in frontend folder
3. Check deployment logs for specific errors

### If App Doesn't Load:
1. Check environment variables are set
2. Verify backend URL is correct in `REACT_APP_API_URL`
3. Check Railway service logs for errors

Good luck! The new service should work perfectly with RAILPACK builder.

