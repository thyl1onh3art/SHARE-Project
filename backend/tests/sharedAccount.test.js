const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

const futureTargetDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const validAccountData = (overrides = {}) => ({
  name: 'Test Shared Account',
  description: 'Holiday savings pot',
  targetAmount: 1000,
  targetDate: futureTargetDate(),
  ...overrides
});

describe('Shared Account API Endpoints', () => {
  let ownerUser;
  let memberUser;
  let ownerToken;
  let memberToken;
  let sharedAccount;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
    await User.deleteMany({});
    await SharedAccount.deleteMany({});
    await FinanceRecord.deleteMany({});
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
      email: 'owner@test.com',
      password: hashedPassword,
      age: 25
    });

    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'member@test.com',
      password: hashedPassword,
      age: 30
    });

    ownerToken = jwt.sign(
      { userId: ownerUser._id, email: ownerUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    memberToken = jwt.sign(
      { userId: memberUser._id, email: memberUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/shared-accounts', () => {
    it('should create a shared account with valid data', async () => {
      const accountData = validAccountData({
        memberIds: [memberUser._id.toString()]
      });

      const response = await request(app)
        .post('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body.sharedAccount.name).toBe(accountData.name);
      expect(response.body.sharedAccount.description).toBe(accountData.description);
      expect(response.body.sharedAccount.targetAmount).toBe(accountData.targetAmount);
      expect(response.body.sharedAccount.owner.toString()).toBe(ownerUser._id.toString());

      const memberIds = response.body.sharedAccount.members.map((m) =>
        (typeof m === 'object' ? m._id : m).toString()
      );
      expect(memberIds).toContain(memberUser._id.toString());
    });

    it('should reject creation without authentication', async () => {
      await request(app)
        .post('/api/shared-accounts')
        .send(validAccountData())
        .expect(401);
    });

    it('should reject creation with invalid name', async () => {
      const response = await request(app)
        .post('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validAccountData({ name: 'A' }))
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/shared-accounts', () => {
    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Test Account',
        description: 'Test description',
        targetAmount: 500,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [memberUser._id]
      });
    });

    it('should return shared accounts for owner', async () => {
      const response = await request(app)
        .get('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe('Test Account');
    });

    it('should return shared accounts for member', async () => {
      const response = await request(app)
        .get('/api/shared-accounts')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/shared-accounts')
        .expect(401);
    });
  });

  describe('GET /api/shared-accounts/:id', () => {
    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Test Account',
        description: 'Test description',
        targetAmount: 500,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [memberUser._id]
      });
    });

    it('should return account details for owner', async () => {
      const response = await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.name).toBe('Test Account');
      expect(response.body.owner).toBeDefined();
      expect(response.body.owner.firstName).toBe('Owner');
    });

    it('should return account details for member', async () => {
      const response = await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.name).toBe('Test Account');
    });

    it('should reject access for non-member', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123', 10);
      await User.create({
        firstName: 'Non',
        lastName: 'Member',
        email: 'nonmember@test.com',
        password: hashedPassword,
        age: 25
      });

      const nonMember = await User.findOne({ email: 'nonmember@test.com' });
      const nonMemberToken = jwt.sign(
        { userId: nonMember._id, email: nonMember.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it('should allow access for removed members who still have finance records', async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 50,
        description: 'Past contribution',
        sharedAccount: sharedAccount._id
      });

      sharedAccount.members = [];
      await sharedAccount.save();

      const response = await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.name).toBeTruthy();
    });
  });

  describe('PUT /api/shared-accounts/:id', () => {
    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Original Name',
        description: 'Original description',
        targetAmount: 500,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [memberUser._id]
      });
    });

    it('should update account name by owner', async () => {
      const response = await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.message).toBe('Shared account updated successfully');
      expect(response.body.account.name).toBe('Updated Name');
    });

    it('should remove members by owner', async () => {
      await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          memberIds: [memberUser._id.toString()],
          action: 'remove'
        })
        .expect(200);

      const updatedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(updatedAccount.members.map((m) => m.toString())).not.toContain(memberUser._id.toString());
    });

    it('should reject update by non-owner', async () => {
      await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('DELETE /api/shared-accounts/:id', () => {
    let financeRecord;

    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Account to Delete',
        description: 'Delete test',
        targetAmount: 500,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [memberUser._id]
      });

      financeRecord = await FinanceRecord.create({
        user: ownerUser._id,
        type: 'output',
        amount: 100,
        description: 'Test expense',
        sharedAccount: sharedAccount._id
      });

      sharedAccount.financeRecords.push(financeRecord._id);
      await sharedAccount.save();
    });

    it('should soft-delete account by owner and keep finance records', async () => {
      const response = await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toContain('transaction records have been kept');

      const deletedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(deletedAccount).toBeTruthy();
      expect(deletedAccount.isDeleted).toBe(true);
      expect(deletedAccount.deletedAt).toBeTruthy();
    });

    it('should archive shared account name on finance records when deleted', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const updatedRecord = await FinanceRecord.findById(financeRecord._id);
      expect(updatedRecord).toBeTruthy();
      expect(updatedRecord.archivedAccountName).toBe('Account to Delete');
      expect(updatedRecord.sharedAccount.toString()).toBe(sharedAccount._id.toString());
    });

    it('should reject deletion by non-owner', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      const account = await SharedAccount.findById(sharedAccount._id);
      expect(account).toBeTruthy();
    });

    it('should reject deletion without authentication', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .expect(401);
    });

    it('should return 404 for non-existent account', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/shared-accounts/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should reject deletion when account has a positive balance', async () => {
      const fundedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Funded Account',
        description: 'Has money',
        targetAmount: 500,
        targetDate: futureTargetDate(),
        members: [memberUser._id]
      });

      const deposit = await FinanceRecord.create({
        user: ownerUser._id,
        type: 'input',
        amount: 150,
        description: 'Deposit',
        sharedAccount: fundedAccount._id
      });
      fundedAccount.financeRecords.push(deposit._id);
      await fundedAccount.save();

      const response = await request(app)
        .delete(`/api/shared-accounts/${fundedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body.message).toContain('still has funds');

      const account = await SharedAccount.findById(fundedAccount._id);
      expect(account.isDeleted).not.toBe(true);
    });
  });

  describe('DELETE /api/shared-accounts/:id/permanent', () => {
    let permanentDeleteAccount;
    let permanentFinanceRecord;

    beforeEach(async () => {
      permanentDeleteAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Permanent Delete Account',
        description: 'To be removed forever',
        targetAmount: 200,
        targetDate: futureTargetDate(),
        members: [memberUser._id]
      });

      permanentFinanceRecord = await FinanceRecord.create({
        user: ownerUser._id,
        type: 'input',
        amount: 75,
        description: 'Saved contribution',
        sharedAccount: permanentDeleteAccount._id
      });

      await FinanceRecord.create({
        user: ownerUser._id,
        type: 'output',
        amount: 75,
        description: 'Fully withdrawn',
        sharedAccount: permanentDeleteAccount._id
      });

      permanentDeleteAccount.financeRecords.push(permanentFinanceRecord._id);
      await permanentDeleteAccount.save();
    });

    it('should permanently delete account by owner', async () => {
      const response = await request(app)
        .delete(`/api/shared-accounts/${permanentDeleteAccount._id}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toContain('permanently deleted');

      const deletedAccount = await SharedAccount.findById(permanentDeleteAccount._id);
      expect(deletedAccount).toBeNull();
    });

    it('should archive finance records when permanently deleted', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${permanentDeleteAccount._id}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const updatedRecord = await FinanceRecord.findById(permanentFinanceRecord._id);
      expect(updatedRecord).toBeTruthy();
      expect(updatedRecord.archivedAccountName).toBe('Permanent Delete Account');
      expect(updatedRecord.sharedAccount).toBeFalsy();
    });

    it('should reject permanent deletion by non-owner', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${permanentDeleteAccount._id}/permanent`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should reject permanent deletion when account has a positive balance', async () => {
      const fundedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Funded Permanent Delete Account',
        description: 'Has money',
        targetAmount: 200,
        targetDate: futureTargetDate(),
        members: [memberUser._id]
      });

      await FinanceRecord.create({
        user: ownerUser._id,
        type: 'input',
        amount: 40,
        description: 'Deposit',
        sharedAccount: fundedAccount._id
      });

      const response = await request(app)
        .delete(`/api/shared-accounts/${fundedAccount._id}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body.message).toContain('still has funds');
    });
  });
});
