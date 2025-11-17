const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/mongoose/User');

describe('User API Endpoints', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
    
    // Clear test database
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/users/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        age: 25,
        interests: ['finance', 'technology']
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      
      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.firstName || user.name).toBeTruthy();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'TestPass123',
        age: 25
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.errors || response.body.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak',
        age: 25
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      // First user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        age: 25
      };

      await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      // Second user with same email
      const duplicateUserData = {
        name: 'Another User',
        email: 'test@example.com',
        password: 'AnotherPass123',
        age: 30
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(duplicateUserData)
        .expect(400);

      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        age: 25
      };

      await request(app)
        .post('/api/users/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      
      authToken = response.body.token;
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(400);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(400);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/users/me', () => {
    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        age: 25
      };

      await request(app)
        .post('/api/users/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        });

      authToken = loginResponse.body.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.message).toBe('No token, authorization denied');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Token is not valid');
    });
  });
});
