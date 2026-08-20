# How to Make Frontend Server Public on Railway

## Step 1: Ensure Service is Deployed

1. **Railway Dashboard** → Your Project → Frontend Service
2. Go to **Deployments** tab
3. Make sure there's a successful deployment
4. If not, click **"Redeploy"** → **"Deploy from main branch"**

## Step 2: Generate Public Domain

1. **Railway Dashboard** → Frontend Service
2. Go to **Settings** tab
3. Scroll to **"Networking"** or **"Domains"** section
4. Look for **"Generate Domain"** or **"Public Domain"** button
5. Click it

Railway will generate a public URL like:
- `https://share-project-frontend-production.up.railway.app`

## Step 3: Configure Domain (Optional - Custom Domain)

If you want to use a custom domain:

1. **Settings** → **Networking** → **Custom Domain**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow Railway's DNS instructions
5. Add the CNAME record to your domain provider

## Step 4: Verify Service is Running

1. **Settings** → **Networking**
2. Check **"Public Domain"** is set
3. Copy the URL
4. Visit it in your browser
5. Should see your app (with red background)

## Step 5: Environment Variables (If Needed)

Make sure environment variables are set:

**Settings** → **Variables**:

```env
REACT_APP_API_URL=https://share-project-production.up.railway.app/api
```

(Or whatever your backend URL is)

## Quick Checklist

- [ ] Frontend service is deployed successfully
- [ ] Public domain is generated
- [ ] Service is accessible via Railway URL
- [ ] Environment variables are set (if needed)
- [ ] App loads correctly in browser

## Common Issues

### Service Not Accessible
- Check deployment status - must be "Active"
- Verify public domain is generated
- Check service logs for errors

### App Shows Blank Page
- Check browser console for errors
- Verify `REACT_APP_API_URL` is set correctly
- Check Railway service logs

### CORS Errors
- Backend needs to allow frontend domain in CORS settings
- Check backend `app.js` CORS configuration

## Current Configuration

Your frontend should already be configured with:
- ✅ `railway.json` - Start command configured
- ✅ Build process working (RAILPACK builder)
- ✅ Root directory set to `frontend`

Just need to generate the public domain!

