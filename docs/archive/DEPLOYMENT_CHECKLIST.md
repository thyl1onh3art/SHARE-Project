# SHARE Project - Deployment Checklist

## Pre-Deployment Testing ✅

### Backend Tests
- [x] User API endpoints tested
- [x] Shared Account CRUD operations tested
- [x] Authentication and authorization tested
- [x] Rate limiting disabled in test environment
- [x] Test database configuration verified

### Frontend Tests
- [ ] Component rendering tests
- [ ] Integration tests with backend
- [ ] Build process verified

## Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=your_mongodb_connection_string
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_secure_jwt_secret_key

# Server
NODE_ENV=production
PORT=5000

# Email (Gmail)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Twilio (SMS - Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-api.com/api
```

## Build Steps

### Backend
```bash
cd backend
npm install
npm run lint
npm test
# No build step needed for Node.js
```

### Frontend
```bash
cd frontend
npm install
npm run build
# Build output in frontend/build/
```

## Deployment Platforms

### Railway (Recommended)
1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy backend service
4. Deploy frontend service
5. Configure custom domains

### Vercel
1. Import project
2. Configure build settings
3. Set environment variables
4. Deploy

### Heroku
1. Create Heroku app
2. Set config vars
3. Deploy via Git or CLI

## Post-Deployment Verification

### Health Checks
- [ ] Backend health endpoint: `GET /health`
- [ ] Frontend loads correctly
- [ ] API endpoints respond correctly
- [ ] Database connection verified

### Security Checks
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Environment variables not exposed
- [ ] JWT tokens working

### Functionality Tests
- [ ] User registration works
- [ ] User login works
- [ ] Email verification works
- [ ] Shared accounts CRUD works
- [ ] Finance records work
- [ ] Invitations work

## Monitoring

### Recommended Tools
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure logging (Winston, Morgan)
- [ ] Set up database backups

## Rollback Plan

1. Keep previous deployment version
2. Document rollback procedure
3. Test rollback process
4. Have backup database ready

## Notes

- Email verification requires Gmail app password
- SMS 2FA requires Twilio account (optional)
- MongoDB Atlas recommended for production
- Use strong JWT secret in production
- Enable HTTPS for all endpoints
- Configure CORS for your frontend domain only

