# Manual Redeployment Guide

## 🚂 Railway Deployment

### Backend Redeployment

1. **Via Railway Dashboard:**
   - Go to [Railway Dashboard](https://railway.app)
   - Select your backend project
   - Click on the **"Deployments"** tab
   - Click **"Redeploy"** button on the latest deployment
   - Or click **"Deploy"** to trigger a new deployment from the latest commit

2. **Via Railway CLI:**
   ```bash
   # Install Railway CLI (if not installed)
   npm i -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Navigate to backend directory
   cd backend
   
   # Link to your Railway project (first time only)
   railway link
   
   # Deploy
   railway up
   ```

3. **Via Git Push (Auto-deploy):**
   ```bash
   cd backend
   git add .
   git commit -m "Redeploy backend"
   git push origin main
   # Railway will automatically detect and deploy
   ```

### Frontend Redeployment

1. **Via Railway Dashboard:**
   - Go to Railway Dashboard
   - Select your frontend project
   - Click **"Deployments"** tab
   - Click **"Redeploy"** button

2. **Via Railway CLI:**
   ```bash
   cd frontend
   railway link  # If not already linked
   railway up
   ```

3. **Via Git Push:**
   ```bash
   cd frontend
   git add .
   git commit -m "Redeploy frontend"
   git push origin main
   ```

---

## ▲ Vercel Deployment

### Backend Redeployment

1. **Via Vercel Dashboard:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your backend project
   - Click **"Deployments"** tab
   - Click **"..."** (three dots) on latest deployment
   - Click **"Redeploy"**

2. **Via Vercel CLI:**
   ```bash
   # Install Vercel CLI (if not installed)
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Navigate to backend directory
   cd backend
   
   # Deploy
   vercel --prod
   ```

3. **Via Git Push:**
   ```bash
   cd backend
   git add .
   git commit -m "Redeploy backend"
   git push origin main
   # Vercel will automatically deploy if connected
   ```

### Frontend Redeployment

1. **Via Vercel Dashboard:**
   - Go to Vercel Dashboard
   - Select your frontend project
   - Click **"Deployments"** tab
   - Click **"Redeploy"** on latest deployment

2. **Via Vercel CLI:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Via Git Push:**
   ```bash
   cd frontend
   git add .
   git commit -m "Redeploy frontend"
   git push origin main
   ```

---

## 🔄 Quick Redeploy Commands

### Railway (Both Services)
```bash
# Backend
cd backend && railway up

# Frontend  
cd frontend && railway up
```

### Vercel (Both Services)
```bash
# Backend
cd backend && vercel --prod

# Frontend
cd frontend && vercel --prod
```

---

## 📋 Pre-Redeployment Checklist

Before redeploying, make sure:

- [ ] All code changes are committed
- [ ] Environment variables are set correctly
- [ ] No breaking changes in API
- [ ] Frontend API URL matches backend URL
- [ ] Database connection string is correct
- [ ] JWT_SECRET is set
- [ ] CORS_ORIGIN matches frontend domain

---

## 🔍 Verify Deployment

### Check Backend Health
```bash
curl https://your-backend-url.com/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": ...,
  "timestamp": ...
}
```

### Check Frontend
- Visit your frontend URL
- Check browser console for errors
- Test login/registration
- Verify API calls work

---

## 🐛 Troubleshooting

### Deployment Fails

1. **Check Logs:**
   - Railway: Go to "Deployments" → Click on failed deployment → View logs
   - Vercel: Go to "Deployments" → Click on failed deployment → View build logs

2. **Common Issues:**
   - Missing environment variables
   - Build errors (check package.json scripts)
   - Database connection issues
   - Port configuration errors

3. **Rollback:**
   - Railway: Go to "Deployments" → Select previous successful deployment → Click "Redeploy"
   - Vercel: Go to "Deployments" → Select previous deployment → Click "..." → "Promote to Production"

### Environment Variables Not Working

1. **Railway:**
   - Go to project → "Variables" tab
   - Verify all variables are set
   - Make sure they're set for "Production" environment
   - Redeploy after adding/updating variables

2. **Vercel:**
   - Go to project → "Settings" → "Environment Variables"
   - Verify variables are set for "Production"
   - Redeploy after changes

---

## 🚀 Force Redeploy (Clear Cache)

### Railway
```bash
# Via CLI
railway up --detach

# Or trigger via dashboard:
# Settings → Clear Build Cache → Redeploy
```

### Vercel
```bash
# Via CLI
vercel --prod --force

# Or via dashboard:
# Deployments → Redeploy → "Use existing Build Cache" (uncheck)
```

---

## 📝 Notes

- **Railway**: Auto-deploys on git push if GitHub is connected
- **Vercel**: Auto-deploys on git push if GitHub is connected
- **Build Time**: Backend ~2-5 min, Frontend ~3-7 min
- **Zero Downtime**: Both platforms support zero-downtime deployments
- **Rollback**: Always keep previous deployment for quick rollback

---

## 🔗 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs

