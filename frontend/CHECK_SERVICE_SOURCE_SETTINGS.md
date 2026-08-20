# Check Frontend Service Source Settings

## Why You Don't See GitHub in Integrations

If you only see "Vercel" in Integrations, it means:
- GitHub might already be connected at the project level (just not shown in Integrations)
- OR GitHub connection is managed at the **Service level** (which is what we need to check!)

**The important thing is to check your Frontend Service's Source settings** - that's where the actual repository connection is configured.

---

## Step-by-Step: Check Frontend Service Source

### Step 1: Close Project Settings

1. Click the **X** button (top right of the modal)
2. OR click outside the modal
3. This takes you back to the main project view

---

### Step 2: Open Frontend Service

1. In the main project view, find your **Frontend** service
2. Click on it to open the service dashboard

---

### Step 3: Go to Settings Tab

1. At the top of the service page, you should see tabs like:
   - "Deployments"
   - "Metrics"
   - "Logs"
   - **"Settings"** ← Click this one

---

### Step 4: Check Source Section

In the Settings tab, look for a section called **"Source"** (or "Repository" or "GitHub")

**What you should see:**

| Setting | What to Look For |
|---------|------------------|
| **Repository** | Should show: `thyl1onh3art/SHARE-Project` |
| **Branch** | Should show: `main` |
| **Root Directory** | Should show: `frontend` |
| **Auto Deploy** | Should be: Enabled/On |

---

## What Each Setting Means

### Repository
- This is the GitHub repository the service is connected to
- **Should be:** `thyl1onh3art/SHARE-Project`
- **If wrong:** Click to change it or disconnect/reconnect

### Branch
- Which branch Railway watches for changes
- **Should be:** `main`
- **If wrong:** Change it to `main`

### Root Directory
- Where Railway should look for your code (since you have frontend/backend in same repo)
- **Should be:** `frontend` (no leading slash!)
- **If empty or wrong:** Set it to `frontend`

### Auto Deploy
- Whether Railway automatically deploys when you push to GitHub
- **Should be:** Enabled/On
- **If disabled:** Turn it on

---

## What to Do If Settings Are Wrong

### If Repository is Wrong:

1. Click on the repository dropdown or "Change" button
2. Select `thyl1onh3art/SHARE-Project`
3. If it's not listed, you may need to:
   - Go back to Project Settings → Integrations
   - Look for a way to add GitHub connection
   - OR disconnect current connection and reconnect

### If Branch is Wrong:

1. Change it to `main`
2. Save the settings

### If Root Directory is Wrong:

1. Set it to: `frontend` (type it in, no leading slash)
2. Save the settings

### If Auto Deploy is Off:

1. Turn it on/enable it
2. Save the settings

---

## After Checking/Fixing Settings

1. **Save any changes** you made
2. **Go to Deployments tab**
3. **Check the latest deployment:**
   - Does it show commit `af0a7fa`?
   - If not, click "Deploy" → "Deploy Latest Commit"
4. **Wait for deployment to complete**
5. **Test your site**

---

## Visual Guide

```
Railway Dashboard
│
├── Project View (main page)
│   └── Frontend Service (click here)
│       │
│       ├── Deployments Tab
│       ├── Metrics Tab
│       ├── Logs Tab
│       │
│       └── Settings Tab ← GO HERE
│           │
│           ├── Source Section ← CHECK THIS
│           │   ├── Repository: thyl1onh3art/SHARE-Project
│           │   ├── Branch: main
│           │   ├── Root Directory: frontend
│           │   └── Auto Deploy: Enabled
│           │
│           ├── Build Section
│           ├── Deploy Section
│           └── Environment Variables
│
└── Project Settings (modal)
    └── Integrations ← You were here, but GitHub not shown
```

---

## If You Still Can't Find Source Settings

Sometimes Railway's UI varies. Try these:

1. **Look for tabs at the top** of the service page - Settings should be there
2. **Look for a gear icon** ⚙️ - that's usually Settings
3. **Check if there's a dropdown** next to the service name
4. **Look for "Configure" or "Edit"** buttons

---

## What to Report Back

After checking the Frontend Service → Settings → Source, tell me:

1. **Repository:** What does it show? (Should be `thyl1onh3art/SHARE-Project`)
2. **Branch:** What does it show? (Should be `main`)
3. **Root Directory:** What does it show? (Should be `frontend`)
4. **Auto Deploy:** Is it enabled or disabled?

This will help me identify the exact issue!

