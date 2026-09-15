const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  GENERIC_REQUEST_MESSAGE,
  GENERIC_INVALID_MESSAGE,
  generateResetToken,
  hashResetToken,
  applyResetToken,
  clearResetToken,
  consumeResetTokenUpdate,
  resetExpiryFrom,
  shouldExposeDevelopmentResetUrl,
  forgotPasswordResponse,
  RESET_TOKEN_BYTES
} = require('../utils/passwordReset');

const mockUsers = [];

function mockMatchesQuery(user, query) {
  if (query.email && user.email !== query.email) return false;
  if (query.passwordResetTokenHash && user.passwordResetTokenHash !== query.passwordResetTokenHash) {
    return false;
  }
  if (query.passwordResetExpiresAt && query.passwordResetExpiresAt.$gt) {
    if (!user.passwordResetExpiresAt || !(user.passwordResetExpiresAt > query.passwordResetExpiresAt.$gt)) {
      return false;
    }
  }
  return true;
}

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
}));

const User = require('../models/User');
const emailService = require('../services/emailService');
const userRoutes = require('../routes/userRoutes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
}

function seedUser(overrides = {}) {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Sam',
    lastName: 'Brown',
    email: 'sam@example.com',
    password: bcrypt.hashSync('OldPass123', 10),
    createdAt: new Date(),
    async save() {
      return this;
    },
    ...overrides
  };
  mockUsers.push(user);
  return user;
}

describe('password reset helpers', () => {
  it('creates a long random token and stores only a hash', () => {
    const raw = generateResetToken();
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.from(raw, 'hex')).toHaveLength(RESET_TOKEN_BYTES);
    expect(hashResetToken(raw)).not.toBe(raw);
    expect(hashResetToken(raw)).toBe(hashResetToken(raw));
    expect(hashResetToken(raw)).not.toBe(hashResetToken(`${raw}x`));
  });

  it('applies and clears hashed token fields without keeping the raw token', () => {
    const user = {};
    const raw = generateResetToken();
    applyResetToken(user, raw, new Date('2026-09-13T12:00:00.000Z'));
    expect(user.passwordResetTokenHash).toBe(hashResetToken(raw));
    expect(JSON.stringify(user)).not.toContain(raw);
    expect(user.passwordResetExpiresAt).toEqual(resetExpiryFrom(new Date('2026-09-13T12:00:00.000Z')));
    clearResetToken(user);
    expect(user).not.toHaveProperty('passwordResetTokenHash');
    expect(user).not.toHaveProperty('passwordResetExpiresAt');
    expect(consumeResetTokenUpdate('hashed')).toEqual({
      $set: { password: 'hashed' },
      $inc: { authVersion: 1 },
      $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 }
    });
  });

  it('exposes a development reset URL only outside production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    expect(shouldExposeDevelopmentResetUrl()).toBe(true);
    expect(forgotPasswordResponse('http://localhost:3000/reset-password/abc').developmentResetUrl)
      .toBe('http://localhost:3000/reset-password/abc');
    process.env.NODE_ENV = 'production';
    expect(shouldExposeDevelopmentResetUrl()).toBe(false);
    expect(forgotPasswordResponse('http://localhost:3000/reset-password/abc')).toEqual({
      message: GENERIC_REQUEST_MESSAGE
    });
    process.env.NODE_ENV = previous;
  });
});

describe('password reset API', () => {
  const app = makeApp();

  beforeEach(() => {
    mockUsers.splice(0, mockUsers.length);
    jest.clearAllMocks();
    User.findOne.mockImplementation(async (query) => mockUsers.find((user) => mockMatchesQuery(user, query)) || null);
    User.findOneAndUpdate.mockImplementation(async (query, update) => {
      const user = mockUsers.find((row) => mockMatchesQuery(row, query));
      if (!user) return null;
      if (update.$set) Object.assign(user, update.$set);
      if (update.$inc) {
        Object.entries(update.$inc).forEach(([key, amount]) => {
          user[key] = (user[key] || 0) + amount;
        });
      }
      if (update.$unset) {
        Object.keys(update.$unset).forEach((key) => {
          delete user[key];
        });
      }
      return user;
    });
    User.findById.mockImplementation((id) => {
      const user = mockUsers.find((row) => String(row._id) === String(id)) || null;
      return {
        select: async () => (user ? { ...user } : null)
      };
    });
    emailService.sendPasswordResetEmail.mockResolvedValue({ success: true });
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
  });

  it('creates a hashed reset token and expiry for an existing email', async () => {
    const user = seedUser();
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'Sam@Example.com' })
      .expect(200);

    expect(response.body.message).toBe(GENERIC_REQUEST_MESSAGE);
    expect(user.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.passwordResetExpiresAt).toBeInstanceOf(Date);
    expect(user.passwordResetExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(user)).not.toContain(response.body.developmentResetUrl?.split('/').pop());
    expect(user).not.toHaveProperty('passwordResetToken');
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('does not store the raw reset token', async () => {
    const user = seedUser();
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);

    const raw = response.body.developmentResetUrl.split('/reset-password/')[1];
    expect(user.passwordResetTokenHash).not.toBe(raw);
    expect(JSON.stringify(user)).not.toContain(raw);
  });

  it('returns the same generic success for an unknown email', async () => {
    const known = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(200);
    seedUser();
    const existing = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);

    expect(known.body.message).toBe(GENERIC_REQUEST_MESSAGE);
    expect(existing.body.message).toBe(GENERIC_REQUEST_MESSAGE);
    expect(known.status).toBe(existing.status);
    expect(known.body.message).toBe(existing.body.message);
  });

  it('does not say whether the account exists', async () => {
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'nobody@example.com' })
      .expect(200);

    expect(JSON.stringify(response.body).toLowerCase()).not.toMatch(/not found|no account|does not exist|unknown/);
    expect(response.body.message).toBe(GENERIC_REQUEST_MESSAGE);
  });

  it('resets the password with a valid token and keeps the existing login flow', async () => {
    const user = seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'NewPass123', confirmPassword: 'NewPass123' })
      .expect(200);

    expect(user.passwordResetTokenHash).toBeUndefined();
    expect(user.passwordResetExpiresAt).toBeUndefined();
    expect(user.authVersion).toBe(1);
    expect(await bcrypt.compare('NewPass123', user.password)).toBe(true);
    expect(await bcrypt.compare('OldPass123', user.password)).toBe(false);

    const login = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'NewPass123' })
      .expect(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.user.email).toBe('sam@example.com');
    expect(login.body.user.password).toBeUndefined();
    expect(login.body.user.passwordResetTokenHash).toBeUndefined();

    await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'OldPass123' })
      .expect(400);
  });

  it('rejects reuse of a spent token', async () => {
    seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'NewPass123', confirmPassword: 'NewPass123' })
      .expect(200);

    const reuse = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'ThirdPass123', confirmPassword: 'ThirdPass123' })
      .expect(400);
    expect(reuse.body.message).toBe(GENERIC_INVALID_MESSAGE);
  });

  it('rejects an expired token', async () => {
    const raw = generateResetToken();
    seedUser({
      passwordResetTokenHash: hashResetToken(raw),
      passwordResetExpiresAt: new Date(Date.now() - 60 * 1000)
    });

    const response = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'NewPass123', confirmPassword: 'NewPass123' })
      .expect(400);
    expect(response.body.message).toBe(GENERIC_INVALID_MESSAGE);
  });

  it('rejects an invalid token', async () => {
    seedUser();
    const response = await request(app)
      .post(`/api/users/reset-password/${'b'.repeat(64)}`)
      .send({ password: 'NewPass123', confirmPassword: 'NewPass123' })
      .expect(400);
    expect(response.body.message).toBe(GENERIC_INVALID_MESSAGE);
  });

  it('preserves the existing password requirements', async () => {
    seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    const weak = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'weak', confirmPassword: 'weak' })
      .expect(400);
    expect(weak.body.message).toBe('Validation failed');
  });

  it('never includes a reset token or URL in production responses', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    seedUser();

    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);

    expect(response.body).toEqual({ message: GENERIC_REQUEST_MESSAGE });
    expect(JSON.stringify(response.body)).not.toMatch(/reset-password|developmentResetUrl|token/i);
    process.env.NODE_ENV = previous;
  });

  it('includes a development-only reset URL outside production', async () => {
    seedUser();
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);

    expect(response.body.developmentResetUrl).toMatch(/\/reset-password\/[a-f0-9]{64}$/);
  });

  it('still rejects a weak password on register and accepts the existing login flow', async () => {
    const weak = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Pat Lee',
        email: 'pat@example.com',
        password: 'weak',
        age: 28
      })
      .expect(400);
    expect(weak.body.message).toBe('Validation failed');

    const user = seedUser({ email: 'login@example.com', password: bcrypt.hashSync('LoginPass123', 10) });
    const login = await request(app)
      .post('/api/users/login')
      .send({ email: 'login@example.com', password: 'LoginPass123' })
      .expect(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.user.email).toBe(user.email);
    expect(login.body.user.password).toBeUndefined();
  });

  it('rejects an immediate second POST with the same raw token and keeps the first password', async () => {
    const user = seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    const first = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'FirstPass123', confirmPassword: 'FirstPass123' })
      .expect(200);
    expect(first.body.message).toBe('Password updated');

    const replay = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'SecondPass123', confirmPassword: 'SecondPass123' })
      .expect(400);
    expect(replay.body.message).toBe(GENERIC_INVALID_MESSAGE);

    expect(user).not.toHaveProperty('passwordResetTokenHash');
    expect(user).not.toHaveProperty('passwordResetExpiresAt');
    expect(await bcrypt.compare('FirstPass123', user.password)).toBe(true);
    expect(await bcrypt.compare('SecondPass123', user.password)).toBe(false);

    const afterUse = await request(app)
      .get(`/api/users/reset-password/${raw}`)
      .expect(400);
    expect(afterUse.body.message).toBe(GENERIC_INVALID_MESSAGE);

    const loginFirst = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'FirstPass123' })
      .expect(200);
    expect(loginFirst.body.token).toBeTruthy();

    await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'SecondPass123' })
      .expect(400);
  });

  it('sets Cache-Control: no-store on forgot and reset responses', async () => {
    seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    expect(forgot.headers['cache-control']).toBe('no-store');

    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];
    const check = await request(app)
      .get(`/api/users/reset-password/${raw}`)
      .expect(200);
    expect(check.headers['cache-control']).toBe('no-store');

    const invalid = await request(app)
      .get(`/api/users/reset-password/${'c'.repeat(64)}`)
      .expect(400);
    expect(invalid.headers['cache-control']).toBe('no-store');

    const weak = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'Pass12', confirmPassword: 'Pass12' })
      .expect(400);
    expect(weak.headers['cache-control']).toBe('no-store');
    expect(weak.body.message).toBe('Validation failed');
  });

  it('rejects empty and too-short passwords without consuming the token', async () => {
    const user = seedUser();
    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];
    const hashBefore = user.passwordResetTokenHash;

    const empty = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: '', confirmPassword: '' })
      .expect(400);
    expect(empty.body.message).toBe('Validation failed');

    const short = await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'Pass12', confirmPassword: 'Pass12' })
      .expect(400);
    expect(short.body.message).toBe('Validation failed');

    expect(user.passwordResetTokenHash).toBe(hashBefore);
  });

  it('invalidates JWTs issued before a password reset for that user only', async () => {
    const user = seedUser();
    const other = seedUser({ email: 'other@example.com' });

    const login = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'OldPass123' })
      .expect(200);
    const oldToken = login.body.token;
    expect(jwt.decode(oldToken).authVersion).toBe(0);

    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'other@example.com', password: 'OldPass123' })
      .expect(200);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(200);

    const forgot = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'sam@example.com' })
      .expect(200);
    const raw = forgot.body.developmentResetUrl.split('/reset-password/')[1];

    await request(app)
      .post(`/api/users/reset-password/${raw}`)
      .send({ password: 'NewPass123', confirmPassword: 'NewPass123' })
      .expect(200);
    expect(user.authVersion).toBe(1);
    expect(other.authVersion || 0).toBe(0);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${otherLogin.body.token}`)
      .expect(200);

    const nextLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'sam@example.com', password: 'NewPass123' })
      .expect(200);
    expect(jwt.decode(nextLogin.body.token).authVersion).toBe(1);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${nextLogin.body.token}`)
      .expect(200);
  });
});
