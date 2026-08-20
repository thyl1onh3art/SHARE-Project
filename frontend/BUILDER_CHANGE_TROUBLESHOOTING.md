# Troubleshooting: Can't Change Builder from Nixpacks to Default

## Issue
Railway won't let you change the builder setting from Nixpacks to Railway Default.

## Important: Make Sure You're on Frontend Service

⚠️ **You mentioned "backend settings" - make sure you're changing the FRONTEND service builder, not backend!**

- Frontend Service → Settings → Builder (change this one)
- Backend Service → Already Railway Default (leave as is)

## Common Reasons Builder Can't Be Changed

### 1. Active Deployment Running
- **Solution**: Wait for current deployment to finish, then try again
- OR: Cancel the deployment first, then change builder

### 2. Builder Setting is Locked/Disabled
- Railway sometimes locks builder during active deployments
- **Solution**: Cancel any active deployments, then change builder

### 3. nixpacks.toml File Still Exists
- Even if setting looks changeable, Railway might detect nixpacks.toml
- **Check**: Verify nixpacks.toml is removed from frontend directory
- **Status**: ✅ Already removed and pushed to GitHub

### 4. Need to Trigger Redeploy First
- Sometimes Railway needs a fresh deployment to recognize changes
- **Solution**: 
  1. Make sure nixpacks.toml is removed (✅ done)
  2. Trigger a redeploy from main branch
  3. Then try changing builder setting

### 5. Railway UI Bug/Limitation
- Sometimes the dropdown is disabled for unknown reasons
- **Workaround**: Try refreshing the page, or try from different browser

## Step-by-Step Troubleshooting

### Step 1: Verify You're on Frontend Service
- Railway Dashboard → SHARE Project → **Frontend** Service (not Backend)
- Settings tab

### Step 2: Check for Active Deployments
- Go to "Deployments" tab
- If there's an active deployment, wait for it to finish OR cancel it
- Then go back to Settings

### Step 3: Try Alternative Approach

**Option A: Change Builder THEN Redeploy**
1. Settings → Builder → Try changing to Default
2. If it won't change, try Option B

**Option B: Trigger Redeploy First**
1. Go to Deployments tab
2. Click "Redeploy" → "Deploy from main branch"
3. Wait for deployment to start
4. Go back to Settings → Try changing builder

**Option C: Contact Railway Support**
- If builder setting is completely locked/disabled
- Railway support can change it manually
- Or check Railway documentation for your account type

### Step 4: Verify nixpacks.toml is Gone
```bash
# Check if file exists (should not exist)
ls frontend/nixpacks.toml
# Should say: file not found
```

## Alternative: Railway Might Auto-Detect

Since we removed nixpacks.toml, Railway's **next deployment** might automatically switch to Default builder even if the setting still shows Nixpacks.

**Try this:**
1. Don't worry about changing the setting manually
2. Just trigger a new deployment
3. Railway might auto-detect and use Default builder
4. Check deployment logs to see which builder it uses

## Quick Checklist

- [ ] Confirming you're on **Frontend** service (not Backend)
- [ ] No active deployments running
- [ ] nixpacks.toml is removed (✅ verified)
- [ ] Tried refreshing Railway page
- [ ] Tried redeploying first, then changing builder
- [ ] Builder dropdown is visible but disabled/grayed out?

Let me know which step you're stuck on!

