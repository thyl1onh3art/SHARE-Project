# Railway Builder Migration - Nixpacks to Default

## Issue
Railway is showing "nixpacks deprecated" for the frontend builder.

## What This Means
- **Nixpacks** is being deprecated by Railway
- Railway now uses a **default builder** (Railway's new build system)
- You should migrate to the default builder

## Solution

### Option 1: Use Railway's Default Builder (Recommended)
Railway can auto-detect your project type and build it automatically.

**Steps:**
1. **Railway Dashboard** → Frontend Service
2. **Settings** → **Build**
3. **Builder** dropdown:
   - Change from: `Nixpacks`
   - Change to: `Default` or `Railway Default`
4. **Save**
5. **Redeploy**

Railway will automatically:
- Detect it's a React app (from `package.json`)
- Run `npm install`
- Run `npm run build`
- Serve the `build` folder

### Option 2: Remove nixpacks.toml (If Using Default)
If you switch to Default builder, you can remove `nixpacks.toml` as it won't be used.

**However**, keep it for now until you verify Default builder works.

### Option 3: Keep nixpacks.toml for Reference
The `nixpacks.toml` file can stay - Railway will just ignore it if using Default builder.

## What Railway Default Builder Does

For React apps, Railway Default builder automatically:
1. Detects `package.json`
2. Runs `npm install` (or `npm ci`)
3. Runs `npm run build` (from package.json scripts)
4. Serves from `build/` directory
5. Uses `npx serve -s build -l $PORT` (or similar)

This is exactly what your `nixpacks.toml` was doing, so the migration should be seamless.

## Migration Steps

### Step 1: Update Frontend Builder
1. Frontend Service → Settings → Build
2. Builder: Change to `Default` or `Railway Default`
3. Save

### Step 2: Update Backend Builder (If Needed)
1. Backend Service → Settings → Build
2. Check if it also shows "nixpacks deprecated"
3. If yes, change to `Default`
4. Save

### Step 3: Redeploy Both Services
1. Frontend → Deployments → Redeploy
2. Backend → Deployments → Redeploy
3. Wait for builds to complete

### Step 4: Verify
After deployment:
- Frontend should work the same
- Backend should work the same
- No build errors

## Benefits of Default Builder
- ✅ Faster builds
- ✅ Better caching
- ✅ Automatic detection
- ✅ Less configuration needed
- ✅ Railway's recommended approach

## Your Current Setup

**Frontend:**
- `railway.json` - Already configured correctly
- `nixpacks.toml` - Can be removed after migration (optional)
- `package.json` - Has build script ✅

**Backend:**
- `railway.json` - Already configured correctly
- `nixpacks.toml` - Can be removed after migration (optional)
- `package.json` - Has start script ✅

## Recommendation

**Switch to Default builder** - It will work the same but is Railway's current recommended approach and may fix the deployment issues you're experiencing.

