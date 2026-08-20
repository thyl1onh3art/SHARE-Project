# How to Find Railway Builder Setting

## Location in Railway Dashboard

### Step-by-Step Instructions

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Log in if needed

2. **Select Your Project**
   - Click on your project name (SHARE Project)

3. **Select Frontend Service**
   - In the project view, click on the **"Frontend"** service
   - This opens the service details page

4. **Go to Settings**
   - Look for **"Settings"** tab (usually at the top)
   - Click on **"Settings"**

5. **Find Build Section**
   - Scroll down to find the **"Build"** section
   - OR look for **"Builder"** or **"Build Configuration"** option

6. **Change Builder**
   - Find the dropdown/selector labeled **"Builder"** or **"Build Method"**
   - Current value might show: `Nixpacks` or `nixpacks`
   - Change it to: `Default` or `Railway Default`
   - Click **"Save"** or **"Update"**

## Alternative Locations (Railway UI Can Vary)

If you don't see it in Settings, try these locations:

### Option A: Service Settings → Build
- Service → Settings → Scroll to "Build" section
- Look for "Builder" dropdown

### Option B: Service → Deploy Tab
- Service → "Deploy" tab
- Look for build configuration options

### Option C: Service → Variables/Environment
- Sometimes build settings are near environment variables
- Look for "Build Configuration" or "Builder" option

### Option D: Project Settings
- Sometimes it's at the project level
- Project → Settings → Build Configuration

## Visual Guide

```
Railway Dashboard
└── Your Project (SHARE Project)
    └── Frontend Service
        └── Settings Tab
            └── Build Section
                └── Builder: [Nixpacks ▼]  ← Change this dropdown
                    Options:
                    - Default (Recommended)
                    - Railway Default
                    - Nixpacks (Deprecated)
```

## What to Look For

The builder setting might be labeled as:
- **"Builder"**
- **"Build Method"**
- **"Build System"**
- **"Build Configuration"**
- **"Build Tool"**

## After Changing

1. **Save** the changes
2. Click **"Redeploy"** or Railway will auto-redeploy
3. Wait for build to complete
4. Check logs to verify it's using Default builder

## Note

Since we already removed `nixpacks.toml`, Railway should automatically use the Default builder. But if you're still seeing Nixpacks errors, manually changing this setting will force it to use Default builder.

