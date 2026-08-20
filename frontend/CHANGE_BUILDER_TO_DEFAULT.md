# Change Frontend Builder from Nixpacks to Default

## Current Status
- ✅ **Backend**: Railway Default (correct)
- ❌ **Frontend**: Nixpacks (deprecated) - NEEDS TO CHANGE

## Why Change?
- Nixpacks is deprecated and causing build errors
- Railway Default builder is the recommended approach
- Matches your backend configuration

## How to Change

### Step-by-Step

1. **Railway Dashboard** → Your Project (SHARE Project)

2. **Click on Frontend Service**

3. **Go to Settings Tab**
   - Click "Settings" at the top of the service page

4. **Find Build Section**
   - Scroll down to "Build" section
   - Look for "Builder" or "Build Method" dropdown

5. **Change Builder**
   - Current: `Nixpacks (deprecated)`
   - Change to: `Default` or `Railway Default`
   - Select from dropdown

6. **Save Changes**
   - Click "Save" or "Update" button

7. **Redeploy**
   - Railway may auto-redeploy, or
   - Click "Redeploy" button manually
   - Wait for build to complete

## After Changing

Railway Default builder will:
- ✅ Auto-detect React app from `package.json`
- ✅ Run `npm install`
- ✅ Run `npm run build`
- ✅ Use start command from `railway.json`: `npx serve -s build -l $PORT`

## Verification

After changing and redeploying:
1. Check Railway logs - should show "Building with Railway Default builder"
2. Build should complete without NIXPACKS_PATH errors
3. Deployment should succeed

## Files Already Updated

- ✅ `nixpacks.toml` - Removed (already done)
- ✅ `railway.json` - Configured correctly
- ✅ Code pushed to GitHub

Just need to change the builder setting in Railway Dashboard!

