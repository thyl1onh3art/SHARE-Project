const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/mongoose/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

describe('Shared Account API Endpoints', () => {
  let ownerUser;
  let memberUser;
  let ownerToken;
  let memberToken;
  let sharedAccount;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
    
    // Clear test database
    await User.deleteMany({});
    await SharedAccount.deleteMany({});
    await FinanceRecord.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await SharedAccount.deleteMany({});
    await FinanceRecord.deleteMany({});

    // Create owner user
    const ownerData = {
      username: 'owner',
      firstName: 'Owner',
      lastName: 'User',
      email: 'owner@test.com',
      password: 'TestPass123',
      age: 25
    };
    ownerUser = await User.create(ownerData);
    
    // Create member user
    const memberData = {
      username: 'member',
      firstName: 'Member',
      lastName: 'User',
      email: 'member@test.com',
      password: 'TestPass123',
      age: 30
    };
    memberUser = await User.create(memberData);

    // Login owner and get token
    const ownerLoginResponse = await request(app)
      .post('/api/users/login')
      .send({ email: 'owner@test.com', password: 'TestPass123' });
    ownerToken = ownerLoginResponse.body.token;

    // Login member and get token
    const memberLoginResponse = await request(app)
      .post('/api/users/login')
      .send({ email: 'member@test.com', password: 'TestPass123' });
    memberToken = memberLoginResponse.body.token;
  });

  describe('POST /api/shared-accounts', () => {
    it('should create a shared account with valid data', async () => {
      const accountData = {
        name: 'Test Shared Account',
        memberIds: [memberUser._id.toString()]
      };

      const response = await request(app)
        .post('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body.name).toBe(accountData.name);
      expect(response.body.owner).toBe(ownerUser._id.toString());
      expect(response.body.members).toContain(ownerUser._id.toString());
      expect(response.body.members).toContain(memberUser._id.toString());
    });

    it('should reject creation without authentication', async () => {
      const accountData = {
        name: 'Test Shared Account'
      };

      await request(app)
        .post('/api/shared-accounts')
        .send(accountData)
        .expect(401);
    });

    it('should reject creation with invalid name', async () => {
      const accountData = {
        name: 'A' // Too short
      };

      const response = await request(app)
        .post('/api/shared-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(accountData)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/shared-accounts', () => {
    beforeEach(async () => {
      // Create a shared account
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Test Account',
        members: [ownerUser._id, memberUser._id]
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
        members: [ownerUser._id, memberUser._id]
      });
    });

    it('should return account details for owner', async () => {
      const response = await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.name).toBe('Test Account');
      expect(response.body.owner).toBeDefined();
    });

    it('should return account details for member', async () => {
      const response = await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.name).toBe('Test Account');
    });

    it('should reject access for non-member', async () => {
      const nonMember = await User.create({
        username: 'nonmember',
        firstName: 'Non',
        lastName: 'Member',
        email: 'nonmember@test.com',
        password: 'TestPass123',
        age: 25
      });

      const nonMemberLogin = await request(app)
        .post('/api/users/login')
        .send({ email: 'nonmember@test.com', password: 'TestPass123' });
      const nonMemberToken = nonMemberLogin.body.token;

      await request(app)
        .get(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/shared-accounts/:id', () => {
    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Original Name',
        members: [ownerUser._id, memberUser._id]
      });
    });

    it('should update account name by owner', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Shared account updated successfully');
      expect(response.body.account.name).toBe('Updated Name');
    });

    it('should remove members by owner', async () => {
      const updateData = {
        memberIds: [memberUser._id.toString()],
        action: 'remove'
      };

      const response = await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      const updatedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(updatedAccount.members.map(m => m.toString())).not.toContain(memberUser._id.toString());
    });

    it('should reject update by non-owner', async () => {
      const updateData = {
        name: 'Hacked Name'
      };

      await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should not allow removing owner', async () => {
      const updateData = {
        memberIds: [ownerUser._id.toString()],
        action: 'remove'
      };

      const response = await request(app)
        .put(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      // Owner should still be in members
      const updatedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(updatedAccount.members.map(m => m.toString())).toContain(ownerUser._id.toString());
    });
  });

  describe('DELETE /api/shared-accounts/:id', () => {
    beforeEach(async () => {
      sharedAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Account to Delete',
        members: [ownerUser._id, memberUser._id]
      });

      // Create a finance record linked to this account
      const financeRecord = await FinanceRecord.create({
        user: ownerUser._id,
        type: 'output',
        amount: 100,
        description: 'Test expense',
        sharedAccount: sharedAccount._id
      });

      sharedAccount.financeRecords.push(financeRecord._id);
      await sharedAccount.save();
    });

    it('should delete account by owner', async () => {
      const response = await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toBe('Shared account deleted successfully');

      // Verify account is deleted
      const deletedAccount = await SharedAccount.findById(sharedAccount._id);
      expect(deletedAccount).toBeNull();
    });

    it('should remove sharedAccount reference from finance records', async () => {
      const financeRecord = await FinanceRecord.findOne({ sharedAccount: sharedAccount._id });
      expect(financeRecord).toBeTruthy();
      expect(financeRecord.sharedAccount).toBeDefined();

      await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Verify finance record still exists but reference is removed
      const updatedRecord = await FinanceRecord.findById(financeRecord._id);
      expect(updatedRecord).toBeTruthy();
      expect(updatedRecord.sharedAccount).toBeUndefined();
    });

    it('should reject deletion by non-owner', async () => {
      await request(app)
        .delete(`/api/shared-accounts/${sharedAccount._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      // Verify account still exists
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
  });
});

