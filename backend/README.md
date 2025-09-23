# SHARE Project Backend API

A comprehensive Node.js backend API for the SHARE Project - social event planning and financial management application.

## Features

- 🔐 JWT Authentication & Authorization
- 🎉 Event Management with Budget Planning
- 📸 Image Gallery with File Upload
- 💰 Financial Records & Shared Accounts
- 👥 User Management & Invitations
- 🏨 Accommodation Recommendations
- 📊 Smart Event Recommendations
- 🔒 Security & Rate Limiting
- 📧 Email Services (Optional)
- 📱 SMS 2FA (Optional)

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer (File Upload)
- Nodemailer (Email)
- Twilio (SMS)
- Express Rate Limit
- Helmet (Security)

## Environment Variables

- `JWT_SECRET` - Secret key for JWT tokens
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)

## Getting Started

### Prerequisites

- Node.js 16+
- MongoDB database
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

### Production

```bash
NODE_ENV=production npm start
```

## API Endpoints

- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `GET /api/events` - Get user events
- `POST /api/events` - Create event
- `GET /api/gallery/images` - Get gallery images
- `POST /api/gallery/upload` - Upload image
- `GET /api/finance` - Get financial records
- `POST /api/finance` - Add financial record

## Deployment

This project is configured for deployment on Vercel as serverless functions.

## License

Private Project
