const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');

describe('Friends API Endpoints', () => {
  let userA;
  let userB;
  let tokenA;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash('TestPass123', 10);

    userA = await User.create({
      firstName: 'Alice',
      lastName: 'Owner',
      email: 'alice@test.com',
      password: hashedPassword,
      age: 25
    });

    userB = await User.create({
      firstName: 'Bob',
      lastName: 'Friend',
      email: 'bob@test.com',
      password: hashedPassword,
      age: 28
    });

    tokenA = jwt.sign(
      { userId: userA._id, email: userA.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('GET /api/friends', () => {
    it('should return an empty friends list for a new user', async () => {
      const response = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/friends', () => {
    it('should add a friend by email', async () => {
      const response = await request(app)
        .post('/api/friends')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ email: 'bob@test.com' })
        .expect(201);

      expect(response.body.friend.email).toBe('bob@test.com');

      const listResponse = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].email).toBe('bob@test.com');
    });

    it('should reject adding yourself', async () => {
      await request(app)
        .post('/api/friends')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ email: 'alice@test.com' })
        .expect(400);
    });
  });

  describe('DELETE /api/friends/:friendId', () => {
    it('should remove a friend from the list', async () => {
      userA.friends.push(userB._id);
      await userA.save();

      await request(app)
        .delete(`/api/friends/${userB._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const listResponse = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(listResponse.body).toEqual([]);
    });
  });
});
