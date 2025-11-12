# Environment Variables for Vercel Deployment

## Required Variables

### JWT_SECRET
- **Description**: Secret key for JWT token generation
- **Value**: `your_super_secret_jwt_key_here_make_it_long_and_secure_12345`
- **Type**: String

### MONGODB_URI
- **Description**: MongoDB connection string
- **Value**: `mongodb+srv://username:password@cluster.mongodb.net/share_project`
- **Type**: String
- **Note**: Replace with your actual MongoDB Atlas connection string

### NODE_ENV
- **Description**: Environment mode
- **Value**: `production`
- **Type**: String

## Optional Variables

### EMAIL_USER
- **Description**: Email service username
- **Value**: Your email address
- **Type**: String

### EMAIL_PASS
- **Description**: Email service password/app password
- **Value**: Your email password
- **Type**: String

### TWILIO_ACCOUNT_SID
- **Description**: Twilio Account SID for SMS
- **Value**: Your Twilio Account SID
- **Type**: String

### TWILIO_AUTH_TOKEN
- **Description**: Twilio Auth Token for SMS
- **Value**: Your Twilio Auth Token
- **Type**: String

### TWILIO_PHONE_NUMBER
- **Description**: Twilio phone number for SMS
- **Value**: Your Twilio phone number
- **Type**: String

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables"
4. Add each variable with its value
5. Make sure to set them for "Production" environment
