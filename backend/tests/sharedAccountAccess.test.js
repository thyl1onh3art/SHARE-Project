const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

describe('SharedAccount historical read access', () => {
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
      email: 'owner-access@test.com',
      password: hashedPassword,
      age: 25
    });

    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'member-access@test.com',
      password: hashedPassword,
      age: 28
    });

    outsiderUser = await User.create({
      firstName: 'Outsider',
      lastName: 'User',
      email: 'outsider-access@test.com',
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
    outsiderToken = jwt.sign(
      { userId: outsiderUser._id, email: outsiderUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    account = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Trip Money Pot',
      members: [memberUser._id]
    });
  });

  describe('GET /api/shared-accounts/:id', () => {
    it('allows the owner to read', async () => {
      const response = await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.name).toBe('Trip Money Pot');
    });

    it('allows a current member to read', async () => {
      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('rejects an unrelated user', async () => {
      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('allows a former member with historical FinanceRecord to read', async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 50,
        description: 'Past contribution',
        sharedAccount: account._id
      });

      account.members = [];
      await account.save();

      const response = await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.name).toBe('Trip Money Pot');
    });

    it('rejects a former member with no FinanceRecord on this account', async () => {
      account.members = [];
      await account.save();

      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('rejects a user whose FinanceRecord belongs to a different account', async () => {
      const otherAccount = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Other Pot',
        members: []
      });

      await FinanceRecord.create({
        user: outsiderUser._id,
        type: 'input',
        amount: 25,
        description: 'Other pot activity',
        sharedAccount: otherAccount._id
      });

      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('handles malformed IDs safely', async () => {
      await request(app)
        .get('/api/shared-accounts/not-a-valid-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('rejects unauthenticated requests', async () => {
      await request(app)
        .get(`/api/shared-accounts/${account._id}`)
        .expect(401);
    });
  });

  describe('mutations remain participant-only', () => {
    beforeEach(async () => {
      await FinanceRecord.create({
        user: memberUser._id,
        type: 'input',
        amount: 80,
        description: 'Past contribution',
        sharedAccount: account._id
      });
      account.members = [];
      await account.save();
    });

    it('denies a former historical reader from updating the pot', async () => {
      await request(app)
        .put(`/api/shared-accounts/${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('denies a former historical reader from recording new Trip Money activity', async () => {
      await request(app)
        .post('/api/finance')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          type: 'input',
          amount: 10,
          description: 'Should fail',
          sharedAccount: account._id.toString()
        })
        .expect(403);
    });

    it('denies a former historical reader from withdrawing recorded activity', async () => {
      await request(app)
        .post(`/api/shared-accounts/${account._id}/withdraw`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 10, description: 'Should fail' })
        .expect(403);
    });

    it('still allows historical reader to fetch finance ledger for that pot', async () => {
      const response = await request(app)
        .get(`/api/finance?sharedAccount=${account._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
