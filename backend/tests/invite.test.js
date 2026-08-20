const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const Invite = require('../models/Invite');

const futureTargetDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

describe('Invite API Endpoints', () => {
  let ownerUser;
  let inviteeUser;
  let ownerToken;
  let inviteeToken;
  let sharedAccount;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await SharedAccount.deleteMany({});
    await Invite.deleteMany({});

    const hashedPassword = await bcrypt.hash('TestPass123', 10);

    ownerUser = await User.create({
      firstName: 'Owner',
      lastName: 'User',
      email: 'owner@test.com',
      password: hashedPassword,
      age: 25
    });

    inviteeUser = await User.create({
      firstName: 'Invitee',
      lastName: 'User',
      email: 'invitee@test.com',
      password: hashedPassword,
      age: 28
    });

    sharedAccount = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Trip Fund',
      description: 'Holiday savings',
      targetAmount: 500,
      targetDate: futureTargetDate(),
      members: []
    });

    ownerToken = jwt.sign(
      { userId: ownerUser._id, email: ownerUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    inviteeToken = jwt.sign(
      { userId: inviteeUser._id, email: inviteeUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/invites/send', () => {
    it('should allow the account owner to send an invite', async () => {
      const response = await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: sharedAccount._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(201);

      expect(response.body.recipientEmail).toBe('invitee@test.com');
      expect(response.body.status).toBe('pending');
    });

    it('should reject invite from non-owner non-member', async () => {
      const outsider = await User.create({
        firstName: 'Out',
        lastName: 'Side',
        email: 'outsider@test.com',
        password: await bcrypt.hash('TestPass123', 10),
        age: 30
      });
      const outsiderToken = jwt.sign(
        { userId: outsider._id, email: outsider.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          sharedAccountId: sharedAccount._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(403);
    });
  });

  describe('POST /api/invites/accept', () => {
    it('should let the invitee accept and join the shared account', async () => {
      const invite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: sharedAccount._id,
        status: 'pending',
        expiresAt: futureTargetDate()
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: invite._id.toString() })
        .expect(200);

      expect(response.body.message).toBe('Invite accepted');

      const updatedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(updatedAccount.members.map((id) => id.toString())).toContain(inviteeUser._id.toString());
    });
  });

  describe('POST /api/invites/send-bulk', () => {
    it('should send multiple invites for the owner', async () => {
      const response = await request(app)
        .post('/api/invites/send-bulk')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: sharedAccount._id.toString(),
          recipients: [
            { recipientEmail: 'invitee@test.com' },
            { recipientEmail: 'friend@test.com' }
          ]
        })
        .expect(201);

      expect(response.body.successCount).toBe(2);
      expect(response.body.failedCount).toBe(0);
    });
  });

  describe('GET /api/invites/unread-count', () => {
    it('should count unread received invites for the invitee', async () => {
      await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: sharedAccount._id,
        status: 'pending',
        expiresAt: futureTargetDate()
      });

      const response = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      expect(response.body.count).toBe(1);
    });

    it('should not count invites sent by the current user', async () => {
      await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: sharedAccount._id,
        status: 'pending',
        expiresAt: futureTargetDate()
      });

      const response = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/invites/mark-read', () => {
    it('should mark received invites as read', async () => {
      await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: sharedAccount._id,
        status: 'pending',
        expiresAt: futureTargetDate()
      });

      await request(app)
        .post('/api/invites/mark-read')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      const countResponse = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      expect(countResponse.body.count).toBe(0);
    });
  });
});
