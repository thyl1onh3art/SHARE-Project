# How to Connect Backend to Frontend

## Overview

To connect frontend to backend, you need:
1. Frontend knows backend URL (environment variable)
2. Backend allows frontend domain (CORS configuration)
3. Both services are deployed and accessible

## Step 1: Get Backend URL

1. **Railway Dashboard** → **Backend** Service
2. Go to **Settings** → **Networking**
3. Copy the **Public Domain** URL
   - Example: `https://share-project-production.up.railway.app`
4. Add `/api` to the end for the API base URL:
   - Example: `https://share-project-production.up.railway.app/api`

## Step 2: Configure Frontend Environment Variable

1. **Railway Dashboard** → **Frontend** Service
2. Go to **Settings** → **Variables**
3. Click **"+ New Variable"** or **"Add Variable"**
4. Add:
   - **Variable Name:** `REACT_APP_API_URL`
   - **Value:** Your backend URL + `/api`
     ```
     https://share-project-production.up.railway.app/api
     ```
5. Click **"Add"** or **"Save"**

## Step 3: Verify Backend CORS Configuration

The backend should already allow Railway domains, but verify:

**Backend** → **Settings** → **Variables** should have:
```env
CORS_ORIGIN=https://share-project-frontend-production.up.railway.app
```

OR the backend code (already configured) should allow:
- All `.up.railway.app` domains automatically
- Your specific frontend domain

## Step 4: Redeploy Frontend

After adding the environment variable:

1. **Frontend Service** → **Deployments**
2. Click **"Redeploy"** → **"Deploy from main branch"**
3. Wait for deployment to complete

The frontend needs to be redeployed to pick up the new environment variable.

## Step 5: Verify Connection

1. Visit your frontend URL:
   ```
   https://share-project-frontend-production.up.railway.app
   ```

2. **Open browser Developer Tools** (F12)
3. Go to **Console** tab
4. Try logging in or using the app
5. Check **Network** tab for API requests
   - Should see requests to: `https://share-project-production.up.railway.app/api/...`
   - Status should be `200` (success) not `CORS error` or `401`

## Current Configuration Status

### Frontend Code
✅ Already configured in `frontend/src/contexts/AuthContext.tsx`:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://share-project-production.up.railway.app/api';
```

This means:
- If `REACT_APP_API_URL` is set → uses that
- If not set → defaults to production backend URL

### Backend CORS
✅ Already configured in `backend/app.js`:
- Allows all `.up.railway.app` domains
- Specifically allows `https://share-project-frontend-production.up.railway.app`

## Quick Checklist

- [ ] Backend service has public domain
- [ ] Backend URL noted (e.g., `https://share-project-production.up.railway.app`)
- [ ] Frontend environment variable `REACT_APP_API_URL` set to backend URL + `/api`
- [ ] Frontend service redeployed after adding variable
- [ ] Frontend service has public domain
- [ ] Backend CORS allows frontend domain (already configured ✅)
- [ ] Test connection in browser

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:
1. Check backend CORS configuration
2. Make sure frontend domain is in allowed origins
3. Verify backend allows `.up.railway.app` domains

### 401 Unauthorized
If API calls return 401:
- Frontend is connecting correctly
- Issue is authentication (login/signup)
- Check if tokens are being saved correctly

### 404 Not Found
If API calls return 404:
- Check backend URL is correct
- Verify backend routes are set up
- Check backend deployment logs

### Connection Refused
If you see connection refused:
- Backend service might not be running
- Check backend deployment status
- Verify backend public domain is accessible

## Example Configuration

**Frontend Environment Variable:**
```
REACT_APP_API_URL=https://share-project-production.up.railway.app/api
```

**Backend CORS (already configured):**
- Allows: `https://share-project-frontend-production.up.railway.app`
- Allows: All `.up.railway.app` domains

That's it! Once you add the `REACT_APP_API_URL` environment variable and redeploy, they should be connected.

