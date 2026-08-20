# Railway Deployment Guide

## Environment Variables to Set in Railway

### Required Variables:
```
MONGO_URI=mongodb+srv://<db-user>:<db-password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret-set-only-in-Railway>
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-frontend-domain.example
```

> Do not commit real credentials. Prefer `docs/DEPLOYMENT.md` for current monorepo deploy guidance.

### Optional Variables:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Deployment Steps:

1. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your backend repository

2. **Set Environment Variables**
   - Go to your project settings
   - Navigate to "Variables" tab
   - Add all the required environment variables above

3. **Deploy**
   - Railway will automatically detect the Node.js app
   - It will use the `railway.json` configuration
   - The app will be available at the provided Railway URL

4. **Update Frontend**
   - Update your frontend to use the new Railway backend URL
   - Deploy frontend to Vercel with the new API URL

## Health Check:
- Railway will automatically check `/health` endpoint
- Your app should respond with status 200

## Logs:
- Check Railway dashboard for deployment logs
- Monitor the "Deployments" tab for any issues
