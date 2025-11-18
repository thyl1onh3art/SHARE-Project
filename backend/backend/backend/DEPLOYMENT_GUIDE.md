# Railway + MongoDB + GitHub Deployment Guide

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **MongoDB Atlas Account**: Free tier available at [mongodb.com/atlas](https://mongodb.com/atlas)
3. **Railway Account**: Sign up at [railway.app](https://railway.app)

## Step 1: Set up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for a free account
   - Choose the free M0 cluster (512MB storage)

2. **Create a Cluster**
   - Choose your preferred cloud provider and region
   - Select M0 Sandbox (free tier)
   - Name your cluster (e.g., "share-project-cluster")

3. **Set up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password (save these!)
   - Set privileges to "Read and write to any database"

4. **Set up Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, add `0.0.0.0/0` (allows access from anywhere)
   - For production, you can restrict to Railway's IP ranges

5. **Get Connection String**
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., "share-project")

## Step 2: Deploy to Railway

1. **Connect GitHub Repository**
   - Go to [railway.app](https://railway.app)
   - Sign in with your GitHub account
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your backend repository

2. **Configure Environment Variables**
   - Go to your project dashboard
   - Click on your service
   - Go to "Variables" tab
   - Add the following environment variables:

   ```
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_12345
   NODE_ENV=production
   PORT=5000
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/share-project?retryWrites=true&w=majority
   ```

3. **Deploy**
   - Railway will automatically detect your Node.js app
   - It will install dependencies and start your application
   - Your app will be available at the provided Railway URL

## Step 3: Test Your Deployment

1. **Check Health Endpoint**
   - Visit `https://your-railway-url.railway.app/health`
   - You should see a response with MongoDB connection status

2. **Test API Endpoints**
   - Try registering a new user
   - Test login functionality
   - Verify data is being saved to MongoDB

## Step 4: Update Frontend

1. **Update API URL**
   - Update your frontend to use the new Railway backend URL
   - Replace any localhost URLs with your Railway URL

2. **Deploy Frontend**
   - Deploy your frontend to Vercel or your preferred platform
   - Update CORS_ORIGIN in Railway to match your frontend URL

## Step 5: Monitor and Maintain

1. **Monitor Logs**
   - Check Railway dashboard for deployment logs
   - Monitor MongoDB Atlas for database metrics

2. **Set up Monitoring**
   - Consider setting up uptime monitoring
   - Monitor database performance and storage usage

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**
   - Check your MONGODB_URI environment variable
   - Verify database user credentials
   - Ensure network access is configured correctly

2. **CORS Errors**
   - Update CORS_ORIGIN to match your frontend URL
   - Check that your frontend is making requests to the correct backend URL

3. **Build Failures**
   - Check Railway logs for specific error messages
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

### Useful Commands:

```bash
# Install dependencies locally
npm install

# Run migration script (if migrating from file store)
npm run migrate

# Verify migration
npm run migrate:verify

# Test locally with MongoDB
npm run dev
```

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret key for JWT tokens | `your_super_secret_key_12345` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `5000` |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS | `https://your-app.vercel.app` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `EMAIL_HOST` | No | SMTP server for emails | `smtp.gmail.com` |
| `EMAIL_PORT` | No | SMTP port | `587` |
| `EMAIL_USER` | No | Email username | `your-email@gmail.com` |
| `EMAIL_PASS` | No | Email password/app password | `your-app-password` |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token | `your_twilio_auth_token` |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number | `+1234567890` |

## Security Best Practices

1. **Environment Variables**
   - Never commit sensitive data to your repository
   - Use strong, unique passwords for database users
   - Rotate JWT secrets regularly

2. **Database Security**
   - Use strong database user passwords
   - Restrict network access to necessary IP ranges
   - Enable MongoDB Atlas security features

3. **Application Security**
   - Keep dependencies updated
   - Use HTTPS in production
   - Implement proper error handling

## Cost Considerations

- **Railway**: Free tier available with usage limits
- **MongoDB Atlas**: Free M0 cluster (512MB storage)
- **Total**: Can run completely free for development and small production use

## Next Steps

1. Set up automated backups for MongoDB Atlas
2. Configure custom domain for Railway
3. Set up monitoring and alerting
4. Implement CI/CD pipeline
5. Add database migrations for schema changes
