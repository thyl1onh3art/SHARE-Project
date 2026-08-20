# Railway Deployment Checklist

## Current Issue: App Not Updating

### ✅ Completed Steps
1. **Local Changes**: ✅ Background set to `red` in `App.css`
2. **Git Commit**: ✅ Committed (commit `af0a7fa`)
3. **Git Push**: ✅ Pushed to `origin/main`
4. **Local Build**: ✅ Builds successfully

### 🔍 Things to Check in Railway Dashboard

#### Step 1: Verify Latest Deployment
1. Go to Railway Dashboard
2. Select your **Frontend** service
3. Click **"Deployments"** tab
4. Check the **latest deployment**:
   - ✅ Commit SHA should match: `af0a7fa`
   - ✅ Status should be: **Active** or **Building**
   - ✅ Build should have completed successfully
   - ❌ If status is **Failed**, check build logs

#### Step 2: Check Build Logs
1. Click on the latest deployment
2. View **Build Logs**:
   - Look for errors
   - Verify it says: "Building from commit af0a7fa"
   - Check if build completes: "Build successful"
   - Check start command runs: `npx serve -s build -l $PORT`

#### Step 3: Verify Service Settings
1. Go to **Settings** tab
2. Check **Source** section:
   - ✅ Repository: `thyl1onh3art/SHARE-Project`
   - ✅ Branch: `main`
   - ✅ Root Directory: `frontend` (NO leading slash!)
   - ✅ Auto-deploy: Enabled

#### Step 4: Check Builder Configuration
1. Go to **Settings** → **Build** section
2. Verify:
   - ✅ Builder: **Railpack** or **Default**
   - ✅ Build Command: Should auto-detect (or `npm run build`)
   - ✅ Start Command: `npx serve -s build -l $PORT`

#### Step 5: Manual Redeploy (If Needed)
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. OR click **"Deploy"** → **"Deploy Latest Commit"**
4. Watch the build process

### 🐛 Common Issues & Fixes

#### Issue 1: Railway Not Detecting New Commits
**Symptoms**: Latest deployment is old, doesn't show new commit  
**Fix**: 
- Verify GitHub connection in Railway
- Check branch is set to `main`
- Try manual redeploy

#### Issue 2: Build Failing
**Symptoms**: Deployment shows "Failed" status  
**Fix**:
- Check build logs for errors
- Verify all dependencies are in `package.json`
- Check for TypeScript/ESLint errors
- Verify `railway.json` is correct

#### Issue 3: Root Directory Wrong
**Symptoms**: Build succeeds but wrong files deployed  
**Fix**:
- Set Root Directory to: `frontend` (without leading slash)
- Save settings and redeploy

#### Issue 4: Browser Cache
**Symptoms**: Changes deployed but not showing  
**Fix**:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try incognito/private window
- Check Network tab: CSS files should have new timestamps

#### Issue 5: Old Deployment Still Active
**Symptoms**: New build succeeded but old version still showing  
**Fix**:
- Check if new deployment is marked "Active"
- Manually activate the new deployment
- Wait 1-2 minutes for DNS propagation

### 🔧 Quick Diagnostic Commands

```bash
# Verify local commit was pushed
git log --oneline -5
# Should show: af0a7fa Change background to red

# Verify remote connection
git remote -v
# Should show: origin https://github.com/thyl1onh3art/SHARE-Project.git

# Verify local file has correct content
grep "background:" frontend/src/App.css
# Should show: background: red;
```

### 📊 Expected Timeline

1. **Commit & Push**: Instant
2. **Railway Detects**: 10-30 seconds
3. **Build Starts**: Immediately after detection
4. **Build Completes**: 1-3 minutes
5. **Deployment Active**: Immediately after build
6. **Live on Website**: 1-2 minutes (DNS propagation)

**Total**: ~5-8 minutes from push to live

### ✅ Verification Steps

After deployment completes:

1. **Check Railway**: 
   - Latest deployment shows commit `af0a7fa`
   - Status: Active
   - Build: Successful

2. **Check Live Site**:
   - Visit your Railway URL
   - Hard refresh (Ctrl+Shift+R)
   - Background should be **red**

3. **Check CSS File**:
   - Open DevTools → Network tab
   - Reload page
   - Check `main.*.css` file
   - Should contain: `background:red` or `background: red;`

### 🚨 If Still Not Working

1. **Force Fresh Deployment**:
   - Make a tiny change (add a space or comment)
   - Commit and push
   - This forces Railway to rebuild

2. **Check Railway Logs**:
   - Go to service → Logs tab
   - Check for runtime errors
   - Verify server is running

3. **Verify Environment Variables**:
   - Check if any env vars affect builds
   - Verify `REACT_APP_API_URL` is set

4. **Contact Railway Support**:
   - If build logs show errors
   - If deployments are stuck
   - If service won't start

### 📝 Current Status

- ✅ Local file updated: `App.css` → `background: red;`
- ✅ Committed: `af0a7fa`
- ✅ Pushed: `origin/main`
- ⏳ Waiting: Railway deployment
- ❓ Need to verify: Railway dashboard status

### Next Action

**Go to Railway Dashboard and verify**:
1. Latest deployment is from commit `af0a7fa`
2. Build completed successfully
3. Deployment is active
4. If not, manually redeploy

