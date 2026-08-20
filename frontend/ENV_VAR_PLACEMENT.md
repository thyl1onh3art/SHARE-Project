# REACT_APP_API_URL Variable Placement

## Answer: FRONTEND Service ✅

The `REACT_APP_API_URL` environment variable belongs in the **Frontend** service, NOT the backend.

## Why?

### Frontend Service
- ✅ React apps use environment variables that start with `REACT_APP_`
- ✅ The frontend code reads this variable to know where to send API requests
- ✅ Used during the React build process
- ✅ Configured in: **Frontend Service → Settings → Variables**

### Backend Service
- ❌ Backend doesn't need to know about `REACT_APP_API_URL`
- ❌ Backend doesn't use React environment variables
- ✅ Backend has its own variables (like `MONGO_URI`, `JWT_SECRET`, etc.)

## How It Works

1. **Frontend Service** has: `REACT_APP_API_URL=https://backend-url.com/api`
2. **React build process** reads this variable
3. **Frontend code** uses it to configure API calls:
   ```typescript
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'default-url';
   axios.defaults.baseURL = API_BASE_URL;
   ```
4. **Frontend makes requests** to the backend using this URL
5. **Backend receives requests** and responds

## Where to Set It

**Railway Dashboard:**
1. **Frontend Service** → Settings → Variables
2. Add: `REACT_APP_API_URL`
3. Value: `https://share-project-production.up.railway.app/api`
   (Your backend URL + `/api`)

## Backend Variables (Separate)

The backend has its own variables like:
- `MONGO_URI` or `MONGODB_URI` - Database connection
- `JWT_SECRET` - For authentication tokens
- `PORT` - Server port
- `CORS_ORIGIN` - Which frontend domains to allow

These are configured in: **Backend Service → Settings → Variables**

## Summary

| Variable | Service | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | **Frontend** ✅ | Tells frontend where backend API is |
| `MONGO_URI` | **Backend** ✅ | Database connection for backend |
| `JWT_SECRET` | **Backend** ✅ | Authentication secret for backend |
| `CORS_ORIGIN` | **Backend** ✅ | Which frontends backend allows |

So yes, `REACT_APP_API_URL` should be in the **Frontend** service, which is where you saw it in your Railway dashboard. That's correct! ✅

