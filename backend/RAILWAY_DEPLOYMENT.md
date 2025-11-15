# Railway Deployment Guide - MongoDB Version

## Environment Variables to Set in Railway

### Required Variables:
```
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_12345
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-frontend-domain.vercel.app
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/share-project?retryWrites=true&w=majority
```

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

1. **Set up MongoDB Database**
   - Create a MongoDB Atlas account (free tier available)
   - Create a new cluster
   - Create a database user with read/write permissions
   - Whitelist Railway's IP addresses (0.0.0.0/0 for development)
   - Get your connection string

2. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your backend repository

3. **Set Environment Variables**
   - Go to your project settings
   - Navigate to "Variables" tab
   - Add all the required environment variables above
   - Make sure to set MONGODB_URI with your actual MongoDB connection string

4. **Deploy**
   - Railway will automatically detect the Node.js app
   - It will use the `railway.json` configuration
   - The app will be available at the provided Railway URL

5. **Update Frontend**
   - Update your frontend to use the new Railway backend URL
   - Deploy frontend to Vercel with the new API URL

## Data Storage:
- **MongoDB Atlas**: Cloud-hosted MongoDB database
- **Mongoose ODM**: Object Document Mapper for MongoDB
- **Automatic Indexing**: Optimized queries with proper indexes
- **Data Persistence**: Reliable cloud storage with backups

## Health Check:
- Railway will automatically check `/health` endpoint
- Your app will respond with MongoDB connection status
- Database health is included in the response

## Logs:
- Check Railway dashboard for deployment logs
- Monitor the "Deployments" tab for any issues
- MongoDB connection status is logged on startup

## Benefits of MongoDB Approach:
- ✅ **Scalable**: MongoDB Atlas handles scaling automatically
- ✅ **Reliable**: Built-in backups and high availability
- ✅ **Production Ready**: Optimized for production workloads
- ✅ **Rich Queries**: Complex queries and aggregations
- ✅ **ACID Compliance**: Data consistency guarantees
- ✅ **Free Tier**: MongoDB Atlas offers generous free tier
