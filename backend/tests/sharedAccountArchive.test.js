const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

describe('Trip Money archive and organiser admin', () => {
  let ownerUser;
  let memberUser;
  let outsiderUser;
  let ownerToken;
  let memberToken;
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
    await FinanceRecord.deleteMany({});

    const hashedPassword = await bcrypt.hash('TestPass123', 10);

    ownerUser = await User.create({
      firstName: 'Owner',
      lastName: 'User',
      email: 'archive-owner@test.com',
      password: hashedPassword,
      age: 25
    });
    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'archive-member@test.com',
      password: hashedPassword,
      age: 28
    });
    outsiderUser = await User.create({
      firstName: 'Out',
      lastName: 'Sider',
      email: 'archive-out@test.com',
      password: hashedPassword,
      age: 30
    });

    ownerToken = jwt.sign({ userId: ownerUser._id, email: ownerUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    memberToken = jwt.sign({ userId: memberUser._id, email: memberUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    outsiderToken = jwt.sign({ userId: outsiderUser._id, email: outsiderUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    account = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Lisbon Trip Money',
      members: [memberUser._id],
      targetAmount: 500
    });
  });

  describe('archive', () => {
    it('allows organiser to archive', async () => {
      const response = await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/archived/i);

      const updated = await SharedAccount.findById(account._id);
      expect(updated.isDeleted).toBe(true);
      expect(updated.deletedAt).toBeTruthy();
    });

    it('rejects archive by normal member', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('rejects archive by unrelated user', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('excludes archived pots from the active list', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const active = await request(app)
        .get('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(active.body.find((a) => a._id === account._id.toString())).toBeUndefined();

      const archived = await request(app)
        .get('/api/shared-accounts?archived=true')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(archived.body).toHaveLength(1);
      expect(archived.body[0].name).toBe('Lisbon Trip Money');
    });

    it('allows historical reader to read an archived pot', async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 40,
        description: 'Contribution',
        sharedAccount: account._id
      });

      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      account.members = [];
      await account.save();

      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('rejects new contributions on archived pots', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .post('/api/finance')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          type: 'input',
          amount: 10,
          description: 'Should fail',
          sharedAccount: account._id.toString()
        })
        .expect(403);
    });

    it('rejects target updates on archived pots', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .put(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ targetAmount: 999 })
        .expect(400);
    });

    it('rejects invites on archived pots', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .post('/api/invites/send')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          recipientEmail: 'friend@example.com'
        })
        .expect(400);
    });
  });

  describe('organiser transfer', () => {
    it('allows organiser to transfer to a current member', async () => {
      const response = await request(app)
        .post(`/api/shared-accounts/${account._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: memberUser._id.toString() })
        .expect(200);

      expect(response.body.message).toMatch(/organiser/i);

      const updated = await SharedAccount.findById(account._id);
      expect(updated.owner.toString()).toBe(memberUser._id.toString());
      expect(updated.members.map((m) => m.toString())).toContain(ownerUser._id.toString());
    });

    it('rejects transfer by non-organiser', async () => {
      await request(app)
        .post(`/api/shared-accounts/${account._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ newOwnerId: memberUser._id.toString() })
        .expect(403);
    });

    it('rejects transfer to unrelated user', async () => {
      await request(app)
        .post(`/api/shared-accounts/${account._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: outsiderUser._id.toString() })
        .expect(400);
    });

    it('rejects transfer to historical-only former member', async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 20,
        sharedAccount: account._id
      });
      account.members = [];
      await account.save();

      await request(app)
        .post(`/api/shared-accounts/${account._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: memberUser._id.toString() })
        .expect(400);
    });

    it('gives new organiser admin authority', async () => {
      await request(app)
        .post(`/api/shared-accounts/${account._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: memberUser._id.toString() })
        .expect(200);

      await request(app)
        .put(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated by new organiser' })
        .expect(200);
    });
  });

  describe('permanent delete', () => {
    it('requires archive first', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('preserves finance history with archivedAccountName', async () => {
      const record = await FinanceRecord.create({
        user: ownerUser._id,
        type: 'input',
        amount: 55,
        description: 'Keep me',
        sharedAccount: account._id
      });

      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .delete(`/api/shared-accounts/${account._id}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(await SharedAccount.findById(account._id)).toBeNull();

      const preserved = await FinanceRecord.findById(record._id);
      expect(preserved).toBeTruthy();
      expect(preserved.archivedAccountName).toBe('Lisbon Trip Money');
      expect(preserved.sharedAccount).toBeFalsy();
    });

    it('rejects permanent delete by non-organiser', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .delete(`/api/shared-accounts/${account._id}/permanent`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});
