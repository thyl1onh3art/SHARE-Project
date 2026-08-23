const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const PaymentRequest = require('../models/PaymentRequest');

describe('Trip Money settlement records', () => {
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
    await PaymentRequest.deleteMany({});

    const hashedPassword = await bcrypt.hash('TestPass123', 10);
    ownerUser = await User.create({
      firstName: 'Owner',
      lastName: 'User',
      email: 'settle-owner@test.com',
      password: hashedPassword,
      age: 25
    });
    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'settle-member@test.com',
      password: hashedPassword,
      age: 28
    });
    outsiderUser = await User.create({
      firstName: 'Out',
      lastName: 'Sider',
      email: 'settle-out@test.com',
      password: hashedPassword,
      age: 30
    });

    ownerToken = jwt.sign({ userId: ownerUser._id, email: ownerUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    memberToken = jwt.sign({ userId: memberUser._id, email: memberUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    outsiderToken = jwt.sign({ userId: outsiderUser._id, email: outsiderUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    account = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Settlement Pot',
      members: [memberUser._id],
      targetAmount: 50
    });
  });

  async function fundPot(amount) {
    const record = await FinanceRecord.create({
      user: ownerUser._id,
      type: 'input',
      amount,
      sharedAccount: account._id
    });
    account.financeRecords.push(record._id);
    await account.save();
    return record;
  }

  describe('CREATE', () => {
    it('allows a current participant to create a settlement request', async () => {
      await fundPot(50);

      const response = await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 50, description: 'Close-out settlement' })
        .expect(201);

      expect(response.body.paymentRequest.status).toBe('pending');
      expect(response.body.paymentRequest.requestType).toBe('payment');
      expect(response.body.paymentRequest.amount).toBe(50);
    });

    it('rejects a request while recorded total is below target', async () => {
      await fundPot(20);

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 50 })
        .expect(400);
    });

    it('rejects an amount other than the contribution target', async () => {
      await fundPot(50);

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 10 })
        .expect(400);

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 80 })
        .expect(400);
    });

    it('allows a request at the target amount when recorded total is above target', async () => {
      await fundPot(80);

      const response = await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          amount: 50,
          payee: 'Hotel North',
          reference: 'INV-22'
        })
        .expect(201);

      expect(response.body.paymentRequest.amount).toBe(50);
      expect(response.body.paymentRequest.description).toMatch(/Hotel North/);
      expect(response.body.paymentRequest.description).toMatch(/INV-22/);
    });

    it('does not require a personal finance balance', async () => {
      await fundPot(50);
      const personal = await FinanceRecord.find({ user: ownerUser._id, sharedAccount: { $exists: false } });
      expect(personal).toHaveLength(0);

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 50 })
        .expect(201);
    });

    it('rejects unrelated users', async () => {
      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 50 })
        .expect(403);
    });

    it('rejects historical-only former participants', async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 20,
        sharedAccount: account._id
      });
      account.members = [];
      await account.save();

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 10 })
        .expect(403);
    });

    it('rejects creation on archived pots', async () => {
      account.isDeleted = true;
      account.deletedAt = new Date();
      await account.save();

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 10 })
        .expect(400);
    });

    it('rejects withdrawal requestType', async () => {
      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedAccountId: account._id.toString(),
          amount: 10,
          requestType: 'withdrawal'
        })
        .expect(400);
    });

    it('rejects creation when there is no contribution target', async () => {
      account.targetAmount = undefined;
      await account.save();
      await fundPot(50);

      await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedAccountId: account._id.toString(), amount: 50 })
        .expect(400);
    });
  });

  describe('CANCEL', () => {
    let pendingId;

    beforeEach(async () => {
      const created = await PaymentRequest.create({
        sharedAccount: account._id,
        requestedBy: ownerUser._id,
        amount: 30,
        status: 'pending',
        requiredApprovals: 1
      });
      pendingId = created._id;
    });

    it('allows the requester to cancel pending', async () => {
      const response = await request(app)
        .post(`/api/payment-requests/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.paymentRequest.status).toBe('cancelled');
      expect(await PaymentRequest.findById(pendingId)).toBeTruthy();
    });

    it('rejects cancel by unrelated user', async () => {
      await request(app)
        .post(`/api/payment-requests/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('cannot cancel approved/rejected/executed', async () => {
      for (const status of ['approved', 'rejected', 'executed']) {
        const row = await PaymentRequest.create({
          sharedAccount: account._id,
          requestedBy: ownerUser._id,
          amount: 5,
          status,
          requiredApprovals: 1
        });
        await request(app)
          .post(`/api/payment-requests/${row._id}/cancel`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(400);
      }
    });

    it('cannot cancel twice', async () => {
      await request(app)
        .post(`/api/payment-requests/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app)
        .post(`/api/payment-requests/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('cannot cancel on archived pot', async () => {
      account.isDeleted = true;
      account.deletedAt = new Date();
      await account.save();

      await request(app)
        .post(`/api/payment-requests/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });

  describe('APPROVE / REJECT', () => {
    let pendingId;

    beforeEach(async () => {
      const created = await PaymentRequest.create({
        sharedAccount: account._id,
        requestedBy: ownerUser._id,
        amount: 40,
        description: 'Ledger settlement',
        status: 'pending',
        requiredApprovals: 1
      });
      pendingId = created._id;
    });

    it('allows authorised member approval and records one ledger output', async () => {
      await request(app)
        .post(`/api/payment-requests/${pendingId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const updated = await PaymentRequest.findById(pendingId);
      expect(updated.status).toBe('executed');

      const outputs = await FinanceRecord.find({
        sharedAccount: account._id,
        type: 'output',
        amount: 40
      });
      expect(outputs).toHaveLength(1);
    });

    it('rejects unauthorised approval', async () => {
      await request(app)
        .post(`/api/payment-requests/${pendingId}/approve`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('duplicate approval does not create duplicate ledger activity', async () => {
      await request(app)
        .post(`/api/payment-requests/${pendingId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      await request(app)
        .post(`/api/payment-requests/${pendingId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      const outputs = await FinanceRecord.find({
        sharedAccount: account._id,
        type: 'output',
        amount: 40
      });
      expect(outputs).toHaveLength(1);
    });

    it('cannot approve cancelled or rejected requests', async () => {
      const cancelled = await PaymentRequest.create({
        sharedAccount: account._id,
        requestedBy: ownerUser._id,
        amount: 12,
        status: 'cancelled',
        requiredApprovals: 1
      });
      const rejected = await PaymentRequest.create({
        sharedAccount: account._id,
        requestedBy: ownerUser._id,
        amount: 13,
        status: 'rejected',
        requiredApprovals: 1
      });

      await request(app)
        .post(`/api/payment-requests/${cancelled._id}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      await request(app)
        .post(`/api/payment-requests/${rejected._id}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('rejects settlement on archived pot', async () => {
      account.isDeleted = true;
      await account.save();

      await request(app)
        .post(`/api/payment-requests/${pendingId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });
  });

  describe('ACTIONABLE COUNT', () => {
    it('counts pending requests awaiting the authenticated user', async () => {
      await PaymentRequest.create({
        sharedAccount: account._id,
        requestedBy: ownerUser._id,
        amount: 15,
        status: 'pending',
        requiredApprovals: 1,
        expiresAt: new Date(Date.now() + 86400000)
      });

      const memberCount = await request(app)
        .get('/api/payment-requests/unread-count')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberCount.body.count).toBe(1);

      const ownerCount = await request(app)
        .get('/api/payment-requests/unread-count')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Requester is excluded from actionable count
      expect(ownerCount.body.count).toBe(0);
    });
  });
});
