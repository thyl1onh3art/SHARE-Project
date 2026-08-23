# Legacy API notes

**This folder is not the live backend.** The deployed API is `backend/`. This document describes an older root-level Express tree and may be outdated.

# SHARE Project Backend API

A robust, production-ready backend API for group financial management and shared expense tracking.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication with password hashing
- **Financial Management**: Track personal and shared income/expenses
- **Shared Accounts**: Create and manage group financial accounts
- **Invitation System**: Email and SMS-based invitations with expiration
- **Real-time Notifications**: Email and SMS notifications via Nodemailer and Twilio
- **Security**: Rate limiting, input validation, CORS protection, and security headers

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Morgan, custom request logging
- **Notifications**: Nodemailer (email), Twilio (SMS)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Gmail account (for email notifications)
- Twilio account (for SMS notifications)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd share-project-backend
npm install
```

### 2. Environment Configuration

Copy the `.env.example` file to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/share_project

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_12345
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Security Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### User Management

##### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "age": 25,
  "interests": ["finance", "technology"]
}
```

##### Login User
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

##### Get User Profile
```http
GET /api/users/me
Authorization: Bearer <jwt_token>
```

#### Financial Management

##### Create Financial Record
```http
POST /api/finance
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "output",
  "amount": 50.00,
  "description": "Grocery shopping",
  "date": "2024-01-15T10:00:00Z"
}
```

##### Get User Financial Records
```http
GET /api/finance
Authorization: Bearer <jwt_token>
```

##### Update Financial Record
```http
PUT /api/finance/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 55.00,
  "description": "Updated grocery shopping"
}
```

##### Delete Financial Record
```http
DELETE /api/finance/:id
Authorization: Bearer <jwt_token>
```

#### Shared Accounts

##### Create Shared Account
```http
POST /api/shared-accounts
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Roommate Expenses",
  "memberIds": ["user_id_1", "user_id_2"]
}
```

##### Get User's Shared Accounts
```http
GET /api/shared-accounts
Authorization: Bearer <jwt_token>
```

##### Get Shared Account Details
```http
GET /api/shared-accounts/:id
Authorization: Bearer <jwt_token>
```

#### Invitations

##### Send Invitation
```http
POST /api/invites/send
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sharedAccountId": "account_id",
  "recipientEmail": "friend@example.com",
  "recipientPhone": "+1234567890"
}
```

##### Accept Invitation
```http
POST /api/invites/accept
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "inviteId": "invite_id"
}
```

##### List Invitations
```http
GET /api/invites/list?status=pending
Authorization: Bearer <jwt_token>
```

##### Cancel Invitation
```http
POST /api/invites/cancel
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "inviteId": "invite_id"
}
```

##### Remove Member
```http
POST /api/invites/remove-member
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sharedAccountId": "account_id",
  "memberId": "user_id"
}
```

### Health Check

```http
GET /health
```

Returns server status and uptime information.

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive validation for all endpoints
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Input Sanitization**: Automatic trimming and sanitization
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## 🚀 Production Deployment

### Environment Variables
- Set `NODE_ENV=production`
- Use strong, unique `JWT_SECRET`
- Configure production MongoDB URI
- Set up production email and SMS services

### Security Checklist
- [ ] Change default JWT secret
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete user management system
- Financial tracking capabilities
- Shared account management
- Invitation system with email/SMS
- Comprehensive security features
- Production-ready architecture







