# NIXPACKS_PATH Error Fix

## Error
```
UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH' (line 18)
Variables should be defined before their use
```

## Root Cause
Railway is trying to use Nixpacks builder, but Nixpacks is deprecated and Railway's default builder should be used instead.

## Solution Options

### Option 1: Use Railway Default Builder (Recommended)

1. **Railway Dashboard** → Frontend Service → Settings
2. Find **"Builder"** or **"Build Configuration"**
3. Change from **"Nixpacks"** to **"Default"** or **"Railway Default"**
4. Save changes
5. Redeploy

The default builder will:
- Auto-detect React app
- Run `npm install`
- Run `npm run build`
- Serve with `npx serve -s build -l $PORT`

### Option 2: Remove nixpacks.toml (if using Default Builder)

If Railway is set to use Default builder, you can remove `nixpacks.toml`:
- Railway Default builder ignores nixpacks.toml
- This might resolve the conflict

### Option 3: Keep nixpacks.toml but Verify Settings

The current `nixpacks.toml` looks correct. The error might be from Railway's internal Nixpacks processing. 

**Recommended:** Switch to Railway Default builder instead.

## Current Configuration

**railway.json** (correct):
```json
{
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT"
  }
}
```

**nixpacks.toml** (works with Nixpacks, but Nixpacks is deprecated):
- Uses Node.js 20
- Runs `npm ci`
- Runs `npm run build`

## Action Required

**Go to Railway Dashboard and change builder to "Default"**

This is the recommended approach per Railway's documentation.

