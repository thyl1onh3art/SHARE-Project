# Deploy Commit af0a7fa to Railway

## Current Situation

- **Current Deployment ID:** `100afac8-3cf3-4912-82e5-43ddf5347cdb`
- **Target Commit:** `af0a7fa` - "Change background to red"
- **Goal:** Make Railway deploy from commit `af0a7fa`

**Note:** You cannot directly change a deployment ID (they're Railway-managed UUIDs), but you can create a NEW deployment from commit `af0a7fa`.

---

## Method 1: Manual Redeploy (Recommended)

### Step-by-Step:

1. **Go to Railway Dashboard**
   - Navigate to your Railway project
   - Click on **Frontend** service

2. **Check Current Deployment**
   - Click **"Deployments"** tab
   - Look at the latest deployment
   - Check which commit it's from (hover over deployment to see commit hash)

3. **Find or Create Deployment from af0a7fa**
   
   **Option A: If deployment from af0a7fa already exists:**
   - Look through deployments list
   - Find the one with commit `af0a7fa`
   - Click on it
   - Click **"Redeploy"** or **"Activate"**
   
   **Option B: If no deployment from af0a7fa exists:**
   - Click **"Deploy"** button (top right)
   - Select **"Deploy Latest Commit"** (if `af0a7fa` is latest)
   - OR select **"Deploy from GitHub"** and choose commit `af0a7fa`

4. **Verify the New Deployment**
   - Wait for build to complete
   - Check deployment shows commit `af0a7fa`
   - Check build logs for success
   - Deployment should become "Active" automatically

---

## Method 2: Force New Deployment via Git Push

If Railway isn't detecting the commit, force a new deployment by making a tiny change:

```bash
# Navigate to project root
cd "C:\Users\rabro\OneDrive\Projects\SHARE Project"

# Make a tiny change to force rebuild (add a comment)
# Edit frontend/src/App.css and add a comment like:
# /* Updated: Force redeploy */

# Stage and commit
git add frontend/src/App.css
git commit -m "Force redeploy to trigger Railway"

# Push to trigger Railway
git push origin main
```

This will create a new commit AFTER `af0a7fa`, but since `af0a7fa` is already the latest commit, this won't help. Better to use Method 1.

---

## Method 3: Deploy Specific Commit via Railway CLI (If Installed)

If you have Railway CLI installed:

```bash
railway up --detach
```

Or to deploy a specific commit:

```bash
# This requires Railway CLI and proper authentication
railway deploy --detach
```

**Note:** Most users should use Method 1 (Railway Dashboard) instead.

---

## Method 4: Check and Redeploy via Railway Dashboard

### Quick Steps:

1. **Railway Dashboard** → **Frontend Service** → **Deployments Tab**

2. **Look for deployment from `af0a7fa`:**
   - Each deployment shows its commit hash
   - Look for one showing `af0a7fa` or `af0a7fa...`
   - If found, click it → **"Redeploy"** or **"Activate"**

3. **If not found, create new deployment:**
   - Click **"Deploy"** button
   - Select **"Deploy Latest Commit"**
   - This should deploy `af0a7fa` if it's the latest on `main` branch

4. **Monitor the build:**
   - Watch build logs
   - Ensure it completes successfully
   - Verify it shows commit `af0a7fa`

---

## Verification Steps

After deploying, verify:

1. **Check Deployment:**
   - Deployment tab shows new deployment
   - Commit hash shows `af0a7fa`
   - Status is "Active"

2. **Check Build Logs:**
   - Click on new deployment
   - View build logs
   - Should see: "Building from commit af0a7fa" or similar
   - Build should complete successfully

3. **Check Live Site:**
   - Visit your Railway frontend URL
   - Open in incognito window (to bypass cache)
   - Hard refresh: `Ctrl + Shift + R`
   - Background should be **red**

4. **Check Network Tab (DevTools):**
   - Open DevTools → Network tab
   - Reload page
   - Find CSS file (e.g., `main.*.css`)
   - Open it → Search for "background"
   - Should see: `background:red` or `background: red;`

---

## If Railway Shows Different Commit

If Railway shows a commit other than `af0a7fa`:

### Check 1: Verify Git Status
```bash
git log --oneline -5
# Should show af0a7fa as latest

git log origin/main --oneline -5
# Should match local
```

### Check 2: Force Push (Only if needed)
```bash
# Only if your local and remote are out of sync
git push origin main --force-with-lease
```

**Warning:** Only use `--force` if you're sure no one else is working on the repo.

### Check 3: Check Railway Branch Setting
- Railway Dashboard → Frontend Service → Settings → Source
- Verify **Branch** is set to `main`
- If wrong, change it and save

---

## Troubleshooting

### Issue: Can't find deployment from af0a7fa

**Solution:**
- Make sure you're looking at the correct service (Frontend, not Backend)
- Check all deployments (scroll down in deployments list)
- If it doesn't exist, Railway hasn't built it yet → use "Deploy Latest Commit"

### Issue: Deployment fails to build

**Solution:**
- Check build logs for errors
- Common issues: TypeScript errors, ESLint errors, missing dependencies
- Fix errors and push again

### Issue: New deployment not becoming active

**Solution:**
- Manually click "Activate" on the new deployment
- Check if there's an active deployment that needs to be deactivated first

### Issue: Still showing old deployment

**Solution:**
- Wait 1-2 minutes for DNS propagation
- Clear browser cache (incognito window)
- Check Railway logs for runtime errors

---

## Quick Action Checklist

- [ ] Go to Railway Dashboard → Frontend Service
- [ ] Click "Deployments" tab
- [ ] Check if deployment from `af0a7fa` exists
  - [ ] If yes: Click it → "Redeploy" or "Activate"
  - [ ] If no: Click "Deploy" → "Deploy Latest Commit"
- [ ] Wait for build to complete
- [ ] Verify commit hash shows `af0a7fa`
- [ ] Test live site in incognito window
- [ ] Verify background is red

---

## Expected Result

After completing the steps:

✅ Railway has a new deployment (new UUID, e.g., `xyz-123-...`)  
✅ Deployment is built from commit `af0a7fa`  
✅ Deployment is marked "Active"  
✅ Live site shows red background  
✅ Old deployment `100afac8-3cf3-4912-82e5-43ddf5347cdb` may still exist but won't be active  

**Note:** The old deployment ID `100afac8-3cf3-4912-82e5-43ddf5347cdb` will remain in Railway's history. You're creating a NEW deployment, not changing the old one. The old one will just become inactive.

---

## Summary

**You cannot change a deployment ID**, but you can:
1. Create a new deployment from commit `af0a7fa`
2. Activate that new deployment
3. The old deployment will become inactive

The simplest way: Go to Railway Dashboard → Deployments → Click "Deploy" → "Deploy Latest Commit" (since `af0a7fa` is your latest commit).

