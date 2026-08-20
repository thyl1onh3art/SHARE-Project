# Solution: Railway Won't Let You Change Builder

## ⚠️ Important Clarification

You mentioned you're on "backend settings" - make sure you're changing the **FRONTEND** service builder, not backend!

- ✅ Backend: Already Railway Default (leave it)
- ❌ Frontend: Needs to change from Nixpacks to Default

## Why Builder Setting Might Be Disabled

### Reason 1: Active Deployment
Railway locks builder settings during active deployments.

**Solution:**
1. Go to **Frontend Service → Deployments** tab
2. Check if there's a deployment in progress
3. If yes: Wait for it to finish OR cancel it
4. Then go back to **Settings → Build → Builder**
5. Try changing again

### Reason 2: Setting is Locked/Read-Only
Sometimes Railway locks builder settings for certain account types or service configurations.

**Solutions:**

**Option A: Try Manual Redeploy First**
1. Frontend Service → Deployments
2. Click "Redeploy" → "Deploy from main branch"
3. This might trigger Railway to auto-detect Default builder
4. Check deployment logs to see which builder it uses

**Option B: Railway Auto-Detection**
Since we removed `nixpacks.toml`, Railway's **next deployment** might automatically use Default builder even if the setting still shows Nixpacks.

**Try this:**
- Don't change the setting manually
- Just trigger a new deployment
- Railway might auto-detect and switch to Default
- Check logs to confirm

**Option C: Contact Railway Support**
If the setting is completely locked, Railway support can change it.

## Step-by-Step: Change Frontend Builder

1. **Railway Dashboard** → Your Project
2. Click **"Frontend"** service (NOT Backend!)
3. Click **"Settings"** tab
4. Scroll to **"Build"** section
5. Find **"Builder"** dropdown
6. If disabled/grayed out:
   - Check Deployments tab for active builds
   - Cancel or wait for active deployment
   - Try again
7. Change from: `Nixpacks`
8. Change to: `Default` or `Railway Default`
9. Click **"Save"**

## Alternative: Don't Change Setting, Just Redeploy

If Railway won't let you change the setting, try this:

1. **Frontend Service → Deployments**
2. Click **"Redeploy"**
3. Select **"Deploy from main branch"**
4. Wait for deployment to start
5. Check **Logs** tab
6. Look for which builder it uses:
   - Should say "Building with Railway Default builder" or similar
   - OR "Building with Nixpacks" (if still using it)

If logs show it's still using Nixpacks after removing nixpacks.toml, then you'll need to contact Railway support to change the builder setting.

## Quick Check

- [ ] Are you on **Frontend** service (not Backend)?
- [ ] Are there any active deployments running?
- [ ] Is the Builder dropdown disabled/grayed out?
- [ ] Have you tried canceling active deployments first?

