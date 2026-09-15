const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const Invite = require('../models/Invite');
const { hashInviteToken, generateInviteToken } = require('../utils/inviteLink');

describe('Shareable invite links', () => {
  let ownerUser;
  let memberUser;
  let inviteeUser;
  let outsiderUser;
  let ownerToken;
  let memberToken;
  let inviteeToken;
  let outsiderToken;
  let account;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27018/share_task23_invite_links');
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
      email: 'link-owner@test.com',
      password: hashedPassword,
      age: 25,
      friends: []
    });
    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'link-member@test.com',
      password: hashedPassword,
      age: 26,
      friends: []
    });
    inviteeUser = await User.create({
      firstName: 'Invitee',
      lastName: 'User',
      email: 'link-invitee@test.com',
      password: hashedPassword,
      age: 28,
      friends: []
    });
    outsiderUser = await User.create({
      firstName: 'Out',
      lastName: 'Sider',
      email: 'link-out@test.com',
      password: hashedPassword,
      age: 30,
      friends: []
    });

    ownerToken = jwt.sign({ userId: ownerUser._id, email: ownerUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    memberToken = jwt.sign({ userId: memberUser._id, email: memberUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    inviteeToken = jwt.sign({ userId: inviteeUser._id, email: inviteeUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    outsiderToken = jwt.sign({ userId: outsiderUser._id, email: outsiderUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    account = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Holiday fund',
      members: [],
      targetAmount: 400,
      targetDate: '2027-06-01'
    });
  });

  function createLink(token = ownerToken) {
    return request(app)
      .post('/api/invites/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ sharedAccountId: account._id.toString() });
  }

  it('lets the organiser create a shareable invite with a random token', async () => {
    const response = await createLink().expect(201);
    expect(response.body.token).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.token).not.toBe(account._id.toString());
    expect(response.body.token).not.toBe(ownerUser._id.toString());
    expect(response.body.inviteUrl).toContain(`/invite/${response.body.token}`);

    const stored = await Invite.findById(response.body.inviteId);
    expect(stored.inviteType).toBe('link');
    expect(stored.status).toBe('pending');
    expect(stored.inviteTokenHash).toBe(hashInviteToken(response.body.token));
    expect(stored.inviteTokenHash).not.toBe(response.body.token);
    expect(account.members).toHaveLength(0);
  });

  it('rejects a non-organiser creating a shareable invite', async () => {
    await createLink(outsiderToken).expect(403);
    account.members = [memberUser._id];
    await account.save();
    await createLink(memberToken).expect(403);
  });

  it('resolves a valid token without adding a member', async () => {
    const created = await createLink().expect(201);
    const preview = await request(app)
      .get(`/api/invites/link/${created.body.token}`)
      .expect(200);

    expect(preview.body.state).toBe('pending');
    expect(preview.body.accountName).toBe('Holiday fund');
    expect(preview.body.organiserName).toBe('Owner User');
    expect(preview.body.targetAmount).toBe(400);
    expect(preview.body.members).toBeUndefined();
    expect(JSON.stringify(preview.body)).not.toMatch(/@test\.com/);
    const pot = await SharedAccount.findById(account._id);
    expect(pot.members).toHaveLength(0);
  });

  it('rejects invalid, expired, used, and declined tokens', async () => {
    await request(app).get('/api/invites/link/not-a-token').expect(404);
    await request(app).get(`/api/invites/link/${generateInviteToken()}`).expect(404);

    const created = await createLink().expect(201);
    const invite = await Invite.findOne({ inviteTokenHash: hashInviteToken(created.body.token) });
    invite.expiresAt = new Date(Date.now() - 1000);
    await invite.save();
    const expired = await request(app).get(`/api/invites/link/${created.body.token}`).expect(200);
    expect(expired.body.state).toBe('expired');

    const live = await createLink().expect(201);
    await request(app)
      .post(`/api/invites/link/${live.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);
    const used = await request(app).get(`/api/invites/link/${live.body.token}`).expect(200);
    expect(used.body.state).toBe('accepted');
    expect(used.body.message).toBe('This invitation has already been accepted.');
    expect(used.body.acceptedBy).toBeUndefined();
    expect(used.body.acceptedByCurrentUser).toBe(false);
    expect(used.body.accountId).toBeUndefined();
    expect(used.headers['cache-control']).toMatch(/no-store/i);

    const toDecline = await createLink().expect(201);
    await request(app)
      .post(`/api/invites/link/${toDecline.body.token}/decline`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
    const declined = await request(app).get(`/api/invites/link/${toDecline.body.token}`).expect(200);
    expect(declined.body.state).toBe('unavailable');
  });

  it('requires authentication to accept and adds the signed-in user once', async () => {
    const created = await createLink().expect(201);
    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .expect(401);

    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);

    const pot = await SharedAccount.findById(account._id);
    expect(pot.members.map(String)).toEqual([inviteeUser._id.toString()]);
    const stored = await Invite.findOne({ inviteTokenHash: hashInviteToken(created.body.token) });
    expect(stored.status).toBe('accepted');
    expect(String(stored.acceptedBy)).toBe(String(inviteeUser._id));

    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(409);

    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(409);

    const after = await SharedAccount.findById(account._id);
    expect(after.members.map(String)).toEqual([inviteeUser._id.toString()]);
  });

  it('does not re-run acceptance when the same used link is opened again', async () => {
    const created = await createLink().expect(201);
    const first = await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);
    expect(first.body.sharedAccount._id).toBe(String(account._id));
    expect(first.body.sharedAccount.members.map(String)).toEqual([inviteeUser._id.toString()]);

    const preview = await request(app)
      .get(`/api/invites/link/${created.body.token}`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);
    expect(preview.body.state).toBe('accepted');
    expect(preview.body.message).toBe('This invitation has already been accepted.');
    expect(preview.body.acceptedByCurrentUser).toBe(true);
    expect(preview.body.accountId).toBe(String(account._id));
    expect(preview.body.sharedAccount).toBeUndefined();

    const outsiderPreview = await request(app)
      .get(`/api/invites/link/${created.body.token}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
    expect(outsiderPreview.body.state).toBe('accepted');
    expect(outsiderPreview.body.acceptedByCurrentUser).toBe(false);
    expect(outsiderPreview.body.accountId).toBeUndefined();

    const reuse = await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(409);
    expect(reuse.body.state).toBe('accepted');
    expect(reuse.body.message).toBe('This invitation has already been accepted.');
    expect(reuse.body.sharedAccount).toBeUndefined();

    const otherUser = await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(409);
    expect(otherUser.body.state).toBe('accepted');
    expect(otherUser.body.sharedAccount).toBeUndefined();

    const stored = await Invite.findOne({ inviteTokenHash: hashInviteToken(created.body.token) });
    expect(stored).toBeTruthy();
    expect(stored.status).toBe('accepted');
    expect(stored.inviteTokenHash).toBe(hashInviteToken(created.body.token));
    expect(String(stored.acceptedBy)).toBe(String(inviteeUser._id));

    const after = await SharedAccount.findById(account._id);
    expect(after.members.map(String)).toEqual([inviteeUser._id.toString()]);
  });

  it('does not let the organiser accept their own link as a duplicate member', async () => {
    const created = await createLink().expect(201);
    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    const pot = await SharedAccount.findById(account._id);
    expect(pot.members).toHaveLength(0);
    const stored = await Invite.findOne({ inviteTokenHash: hashInviteToken(created.body.token) });
    expect(stored.status).toBe('pending');
  });

  it('does not count a pending link invite as an accepted member', async () => {
    await createLink().expect(201);
    const pot = await SharedAccount.findById(account._id);
    expect(pot.members).toHaveLength(0);
  });

  it('does not add a member on decline', async () => {
    const created = await createLink().expect(201);
    await request(app)
      .post(`/api/invites/link/${created.body.token}/decline`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);
    const pot = await SharedAccount.findById(account._id);
    expect(pot.members).toHaveLength(0);
    await request(app)
      .post(`/api/invites/link/${created.body.token}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(400);
  });

  it('keeps the existing email invite flow working', async () => {
    const sent = await request(app)
      .post('/api/invites/send')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        sharedAccountId: account._id.toString(),
        recipientEmail: 'link-invitee@test.com'
      })
      .expect(201);

    expect(sent.body.inviteType === undefined || sent.body.inviteType === 'email').toBe(true);

    await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({ inviteId: sent.body._id })
      .expect(200);

    const pot = await SharedAccount.findById(account._id);
    expect(pot.members.map(String)).toContain(inviteeUser._id.toString());
  });
});
