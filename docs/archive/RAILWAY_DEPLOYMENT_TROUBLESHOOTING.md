# Railway Deployment Troubleshooting

## ⚠️ About the "CS WAX not initialized" Error

This error in your browser console is **NOT related to your app**. It's from a browser extension (likely a WAX Cloud Wallet or similar cryptocurrency wallet extension). You can safely ignore it - it doesn't affect your app functionality.

**To suppress this error:**
- Disable the wallet extension temporarily
- Or ignore it - it won't break your app

---

## 🚂 App Not Updating on Railway

### Step 1: Check Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your **SHARE Project**
3. Check **Deployments** tab for both backend and frontend services
4. Look for:
   - ✅ Green checkmarks = deployment successful
   - ⏳ Spinning icon = deployment in progress
   - ❌ Red X = deployment failed

### Step 2: Verify Auto-Deploy is Enabled

1. Go to each service (backend & frontend)
2. Open **Settings** tab
3. Scroll to **Deploy** section
4. Ensure **"Auto Deploy"** is **ON**
5. Check **"Branch"** is set to `main`

### Step 3: Manual Redeploy

If auto-deploy isn't working or you want to force a redeploy:

**Option A: Via Railway Dashboard (Easiest)**
1. Go to your service (backend or frontend)
2. Click **"Deployments"** tab
3. Click the **"⋮"** (three dots) menu on the latest deployment
4. Click **"Redeploy"**
5. Wait 3-7 minutes for completion

**Option B: Trigger via Git (Alternative)**
Make a small change and push:
```bash
# Create an empty commit to trigger deployment
git commit --allow-empty -m "Trigger Railway redeploy"
git push origin main
```

**Option C: Via Railway CLI**
```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
cd backend
railway up

cd ../frontend
railway up
```

### Step 4: Verify Deployment Contains New Code

Check that the deployed version matches your latest commit:

**Backend:**
- Visit: `https://your-backend.railway.app/health`
- Should return healthy status

**Frontend:**
- Visit your frontend URL
- Check browser DevTools → Network tab
- Look for latest build timestamp in response headers
- Or check if new features (Pay button, Delete button, etc.) are visible

### Step 5: Check Build Logs

If deployment failed:

1. In Railway Dashboard, click on failed deployment
2. Check **"Build Logs"** tab
3. Look for errors like:
   - Build failures
   - Missing environment variables
   - npm install errors
   - Port conflicts

### Common Issues:

1. **Build failing due to nixpacks.toml:**
   - Remove `nixpacks.toml` files if they cause issues
   - Railway will auto-detect Node.js projects

2. **Environment variables missing:**
   - Check Railway → Settings → Variables
   - Ensure all required env vars are set

3. **Port configuration:**
   - Railway automatically sets `PORT` environment variable
   - Your app should use `process.env.PORT || 3000`

---

## ✅ Quick Fix: Force Redeploy

If nothing works, try this to trigger a fresh deployment:

```bash
# Make a trivial change to trigger rebuild
echo "# Railway deploy trigger $(date)" >> DEPLOY_TRIGGER.md
git add DEPLOY_TRIGGER.md
git commit -m "Trigger Railway redeploy - $(date)"
git push origin main
```

Then check Railway dashboard - you should see a new deployment starting.

---

## 📊 Verify Changes Are Live

After deployment completes, verify:

1. **Backend changes:**
   - Test new endpoints (PUT/DELETE for shared accounts)
   - Check API responses

2. **Frontend changes:**
   - Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
   - Check for new features:
     - Pay Full Balance button
     - Delete Account button
     - Participant count display
     - Balance display

3. **Clear browser cache:**
   - DevTools → Application → Clear Storage
   - Or use Incognito/Private window

---

**Last updated:** Check your Railway dashboard for deployment status!

