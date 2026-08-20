# Railway Root Directory Fix

## Issue
Root Directory is set to `/frontend` but should be `frontend` (no leading slash)

## Why This Matters

### `/frontend` (with slash)
- Treated as **absolute path** from system root
- Railway might look for `/frontend` on the server (doesn't exist)
- **WRONG** for Railway

### `frontend` (no slash)
- Treated as **relative path** from repository root
- Railway looks for `frontend/` folder in your repo
- **CORRECT** for Railway

## Fix Steps

1. **Railway Dashboard** → Frontend Service
2. **Settings** → **Source**
3. **Root Directory** field:
   - Change from: `/frontend`
   - Change to: `frontend` (remove the leading slash)
4. **Save**
5. **Redeploy**:
   - Go to **Deployments** tab
   - Click **Redeploy**
   - Select **"Deploy from main branch"**

## Expected Result

After fixing and redeploying:
- Railway will find `frontend/package.json`
- Railway will find `frontend/src/components/Calendar.tsx`
- Build will succeed
- Calendar and Accommodations pages will appear

## Verification

After deployment, check build logs:
- ✅ Should see: "Installing dependencies"
- ✅ Should see: "Building for production"
- ✅ Should see: "Compiled successfully"
- ❌ Should NOT see: "Cannot find module" or "package.json not found"

## Why This Happens

Railway's Root Directory expects a **relative path** from your repository root, not an absolute system path. The leading slash makes Railway think it's an absolute path, which causes it to look in the wrong place.

