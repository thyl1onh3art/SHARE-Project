# How to Disable Auto-Deployment on Railway

## Option 1: Disable Auto-Deploy in Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Log in to your account

2. **Select Your Project**
   - Click on your "SHARE Project" project

3. **Go to Service Settings**
   - Click on your **backend** service
   - Go to the **Settings** tab
   - Scroll down to **Deploy** section

4. **Disable Auto-Deploy**
   - Find **"Auto Deploy"** toggle
   - Turn it **OFF**
   - Repeat for **frontend** service if you have separate services

5. **Save Changes**
   - Changes are saved automatically

## Option 2: Disconnect GitHub Integration (More Drastic)

If you want to completely stop automatic deployments:

1. **Go to Project Settings**
   - Click on your project
   - Go to **Settings** tab

2. **Disconnect GitHub**
   - Find **"GitHub"** or **"Source"** section
   - Click **"Disconnect"** or **"Remove"**
   - This will stop all automatic deployments from GitHub

3. **Manual Deployment**
   - You can still deploy manually using Railway CLI or by reconnecting when needed

## Option 3: Use a Different Branch

If you want to keep auto-deploy but only for specific branches:

1. **Go to Service Settings**
   - Click on your service
   - Go to **Settings** tab

2. **Configure Branch**
   - Find **"Branch"** setting
   - Change it to a branch that you don't push to (e.g., `production-only`)
   - Or create a separate branch for manual deployments

## Manual Deployment After Disabling Auto-Deploy

Once auto-deploy is disabled, you can manually trigger deployments:

1. **Via Railway Dashboard**
   - Go to your service
   - Click **"Deploy"** or **"Redeploy"** button

2. **Via Railway CLI**
   ```bash
   railway up
   ```

3. **Via GitHub (if still connected)**
   - Push to a specific branch that triggers manual deployment
   - Or use Railway's manual deploy trigger

## Re-enabling Auto-Deploy

To re-enable auto-deployment later:

1. Go to service **Settings**
2. Turn **"Auto Deploy"** toggle **ON**
3. Select the branch you want to auto-deploy from (usually `main`)

## Notes

- Disabling auto-deploy does NOT affect existing deployments
- Your app will continue running normally
- You'll just need to manually trigger new deployments
- This is useful when you want to test changes locally before deploying

