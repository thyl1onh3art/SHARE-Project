const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const Invite = require('../models/Invite');

describe('Trip invitation helpers', () => {
  let ownerUser;
  let inviteeUser;
  let outsiderUser;
  let ownerToken;
  let inviteeToken;
  let outsiderToken;
  let account;

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
      email: 'invite-owner@test.com',
      password: hashedPassword,
      age: 25,
      friends: []
    });
    inviteeUser = await User.create({
      firstName: 'Invitee',
      lastName: 'User',
      email: 'invitee@test.com',
      password: hashedPassword,
      age: 28,
      friends: []
    });
    outsiderUser = await User.create({
      firstName: 'Out',
      lastName: 'Sider',
      email: 'invite-out@test.com',
      password: hashedPassword,
      age: 30,
      friends: []
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
    outsiderToken = jwt.sign(
      { userId: outsiderUser._id, email: outsiderUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    account = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Invite Pot',
      members: []
    });
  });

  describe('SEND', () => {
    it('allows a current participant to send an invite', async () => {
      const response = await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
      expect(response.body.recipientEmail).toBe('invitee@test.com');
      expect(response.body.readAt).toBeNull();
    });

    it('rejects unauthorised senders', async () => {
      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(403);
    });

    it('rejects invites on archived pots', async () => {
      account.isDeleted = true;
      account.deletedAt = new Date();
      await account.save();

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(400);
    });

    it('prevents duplicate pending invites', async () => {
      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(201);

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'Invitee@test.com'
        })
        .expect(400);
    });

    it('does not auto-friend on send', async () => {
      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(201);

      const owner = await User.findById(ownerUser._id);
      expect(owner.friends.map(String)).not.toContain(inviteeUser._id.toString());
    });
  });

  describe('ACCEPT', () => {
    let inviteId;

    beforeEach(async () => {
      const invite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: account._id,
        status: 'pending'
      });
      inviteId = invite._id;
    });

    it('allows the invited authenticated user to accept', async () => {
      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(200);

      const updated = await Invite.findById(inviteId);
      expect(updated.status).toBe('accepted');

      const pot = await SharedAccount.findById(account._id);
      expect(pot.members.map(String)).toContain(inviteeUser._id.toString());
    });

    it('rejects the wrong authenticated user', async () => {
      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(403);
    });

    it('cannot accept twice', async () => {
      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(200);

      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(400);
    });

    it('cannot accept when pot is archived', async () => {
      account.isDeleted = true;
      await account.save();

      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(400);
    });

    it('cannot accept an expired invite', async () => {
      await Invite.findByIdAndUpdate(inviteId, {
        expiresAt: new Date(Date.now() - 60_000)
      });

      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(400);
    });

    it('mutually remembers contacts after accept without granting outsider access', async () => {
      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(200);

      const owner = await User.findById(ownerUser._id);
      const invitee = await User.findById(inviteeUser._id);
      expect(owner.friends.map(String)).toContain(inviteeUser._id.toString());
      expect(invitee.friends.map(String)).toContain(ownerUser._id.toString());

      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('does not duplicate friends on repeated accept attempts after first success', async () => {
      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({ inviteId: inviteId.toString() })
        .expect(200);

      const owner = await User.findById(ownerUser._id);
      const count = owner.friends.filter((id) => id.equals(inviteeUser._id)).length;
      expect(count).toBe(1);
    });
  });

  describe('CANCEL', () => {
    it('allows sender to cancel; unrelated user cannot', async () => {
      const invite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: account._id,
        status: 'pending'
      });

      await request(app)
        .post('/api/invites/cancel')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ inviteId: invite._id.toString() })
        .expect(403);

      await request(app)
        .post('/api/invites/cancel')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteId: invite._id.toString() })
        .expect(200);

      expect(await Invite.findById(invite._id)).toBeNull();
    });
  });

  describe('READ / UNREAD', () => {
    let inviteId;

    beforeEach(async () => {
      const invite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: 'invitee@test.com',
        sharedAccount: account._id,
        status: 'pending',
        readAt: null
      });
      inviteId = invite._id;
    });

    it('counts unread pending invites for the recipient only', async () => {
      const inviteeCount = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      expect(inviteeCount.body.count).toBe(1);

      const ownerCount = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(ownerCount.body.count).toBe(0);
    });

    it('allows recipient to mark own invite read', async () => {
      await request(app)
        .post(`/api/invites/${inviteId}/mark-read`)
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      const updated = await Invite.findById(inviteId);
      expect(updated.readAt).toBeTruthy();

      const count = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      expect(count.body.count).toBe(0);
    });

    it('prevents another user from marking the invite read', async () => {
      await request(app)
        .post(`/api/invites/${inviteId}/mark-read`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);

      await request(app)
        .post(`/api/invites/${inviteId}/mark-read`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('does not count accepted invites as unread', async () => {
      await Invite.findByIdAndUpdate(inviteId, { status: 'accepted', readAt: null });

      const count = await request(app)
        .get('/api/invites/unread-count')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      expect(count.body.count).toBe(0);
    });

    it('mark-read bulk only updates recipient pending unread invites', async () => {
      await request(app)
        .post('/api/invites/mark-read')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .expect(200);

      const updated = await Invite.findById(inviteId);
      expect(updated.readAt).toBeTruthy();
    });
  });

  describe('MULTI-RECIPIENT (sequential)', () => {
    it('can send several sequential invites with clear duplicate failure', async () => {
      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(201);

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invite-out@test.com'
        })
        .expect(201);

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'invitee@test.com'
        })
        .expect(400);

      const invites = await Invite.find({ sharedAccount: account._id });
      expect(invites).toHaveLength(2);
    });
  });
});
