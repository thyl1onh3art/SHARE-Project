# Solution: Force Builder via railway.json

## Problem
Railway UI won't let you change builder from Nixpacks to Default, even though dropdown works.

## Solution Applied
Added builder configuration directly to `railway.json` file:

```json
{
  "build": {
    "builder": "RAILPACK"
  }
}
```

## What This Does
- `RAILPACK` is Railway's default/standard builder (the modern replacement for Nixpacks)
- By specifying it in `railway.json`, Railway will use it regardless of UI settings
- This overrides any manual UI settings

## Changes Made
✅ Updated `frontend/railway.json` to include builder specification
✅ Committed and pushed to GitHub
✅ Railway will use RAILPACK builder on next deployment

## Next Steps

1. **Railway should auto-detect** the change and redeploy
2. **OR manually redeploy**: Frontend Service → Deployments → Redeploy
3. **Check logs** to confirm it's using RAILPACK builder
4. **Build should succeed** without NIXPACKS_PATH errors

## Verification

After deployment, check logs for:
- "Building with RAILPACK builder" ✅
- "Building with Railway Default builder" ✅  
- "Building with Nixpacks" ❌ (shouldn't see this)

The builder is now forced via configuration file, so Railway UI settings don't matter!

