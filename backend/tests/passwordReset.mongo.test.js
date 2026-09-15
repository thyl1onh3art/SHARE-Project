const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const {
  GENERIC_REQUEST_MESSAGE,
  GENERIC_INVALID_MESSAGE
} = require('../utils/passwordReset');

const MONGO_URI = 'mongodb://127.0.0.1:27018/share_task27_password_reset';

describe('password reset Mongo lifecycle (isolated)', () => {
  let mongoAvailable = false;

  beforeAll(async () => {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      mongoAvailable = true;
    } catch (err) {
      console.warn(`Task 27 Mongo integration skipped (${MONGO_URI}): ${err.message}`);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    if (!mongoAvailable) return;
    await User.deleteMany({});
  });

  it('resets once, removes token fields, rejects replay, and invalidates the previous JWT', async () => {
    if (!mongoAvailable) {
      console.warn('Skipped: isolated Mongo on 27018 was not available');
      return;
    }

    const oldPassword = 'OldPass123';
    const newPassword = 'NewPass123';
    await User.create({
      firstName: 'Sam',
      lastName: 'Brown',
      email: 'sam-reset@example.com',
      password: await bcrypt.hash(oldPassword, 10),
      age: 30
    });

    const before = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam-reset@example.com', password: oldPassword })
      .expect(200);
    const oldToken = before.body.token;
    expect(jwt.decode(oldToken).authVersion).toBe(0);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(200);

    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam-reset@example.com' })
      .expect(200);
    expect(forgot.headers['cache-control']).toBe('no-store');
    expect(forgot.body.message).toBe(GENERIC_REQUEST_MESSAGE);
    expect(forgot.body.developmentResetUrl).toMatch(/\/reset-password\/[a-f0-9]{64}$/);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    const check = await request(app)
      .get(`/api/users/reset-password/${raw}`)
      .expect(200);
    expect(check.headers['cache-control']).toBe('no-store');

    const reset = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: newPassword, confirmPassword: newPassword })
      .expect(200);
    expect(reset.headers['cache-control']).toBe('no-store');
    expect(reset.body.message).toBe('Password updated');
    expect(JSON.stringify(reset.body)).not.toContain(raw);

    const stored = await User.findOne({ email: 'sam-reset@example.com' }).lean();
    expect(stored.passwordResetTokenHash).toBeUndefined();
    expect(stored.passwordResetExpiresAt).toBeUndefined();
    expect(stored.authVersion).toBe(1);
    expect(await bcrypt.compare(newPassword, stored.password)).toBe(true);
    expect(await bcrypt.compare(oldPassword, stored.password)).toBe(false);

    const replay = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'ThirdPass123', confirmPassword: 'ThirdPass123' })
      .expect(400);
    expect(replay.headers['cache-control']).toBe('no-store');
    expect(replay.body.message).toBe(GENERIC_INVALID_MESSAGE);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    const after = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam-reset@example.com', password: newPassword })
      .expect(200);
    expect(jwt.decode(after.body.token).authVersion).toBe(1);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${after.body.token}`)
      .expect(200);

    await request(app)
      .post('/api/users/login')
      .send({ email: 'sam-reset@example.com', password: oldPassword })
      .expect(400);
  });

  it('lets only one of two concurrent reset POSTs succeed', async () => {
    if (!mongoAvailable) {
      console.warn('Skipped: isolated Mongo on 27018 was not available');
      return;
    }

    await User.create({
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'pat-reset@example.com',
      password: await bcrypt.hash('OldPass123', 10),
      age: 28
    });

    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'pat-reset@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/users/reset-password/${raw}`)
        .send({ password: 'FirstPass123', confirmPassword: 'FirstPass123' }),
      request(app)
        .post(`/api/users/reset-password/${raw}`)
        .send({ password: 'SecondPass123', confirmPassword: 'SecondPass123' })
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 400]);
    const winner = first.status === 200 ? 'FirstPass123' : 'SecondPass123';
    const loser = winner === 'FirstPass123' ? 'SecondPass123' : 'FirstPass123';

    const stored = await User.findOne({ email: 'pat-reset@example.com' }).lean();
    expect(stored.passwordResetTokenHash).toBeUndefined();
    expect(stored.passwordResetExpiresAt).toBeUndefined();
    expect(await bcrypt.compare(winner, stored.password)).toBe(true);
    expect(await bcrypt.compare(loser, stored.password)).toBe(false);
    expect(await bcrypt.compare('OldPass123', stored.password)).toBe(false);
  });
});
