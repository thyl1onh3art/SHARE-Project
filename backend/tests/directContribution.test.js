const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

describe('Direct Trip Money contribution', () => {
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
      email: 'direct-owner@test.com',
      password: hashedPassword,
      age: 25
    });
    memberUser = await User.create({
      firstName: 'Member',
      lastName: 'User',
      email: 'direct-member@test.com',
      password: hashedPassword,
      age: 28
    });
    outsiderUser = await User.create({
      firstName: 'Outsider',
      lastName: 'User',
      email: 'direct-outsider@test.com',
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
      name: 'Canada costs',
      description: 'Group holiday',
      targetAmount: 2000,
      members: [memberUser._id]
    });
  });

  it('lets a member with no personal records contribute to Trip Money', async () => {
    const personal = await FinanceRecord.find({ user: memberUser._id, sharedAccount: { $exists: false } });
    expect(personal).toHaveLength(0);

    const response = await request(app)
      .post('/api/finance')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'input',
        amount: 100,
        description: 'Prototype contribution',
        sharedAccount: account._id.toString()
      })
      .expect(201);

    expect(response.body.amount).toBe(100);
    expect(response.body.type).toBe('input');
    expect(String(response.body.sharedAccount)).toBe(String(account._id));

    const ledger = await request(app)
      .get(`/api/finance?sharedAccount=${account._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(ledger.body).toHaveLength(1);
    expect(ledger.body[0].amount).toBe(100);
    expect(ledger.body[0].user).toEqual(expect.objectContaining({
      firstName: 'Member',
      lastName: 'User',
      email: 'direct-member@test.com'
    }));
  });

  it('rejects invalid contribution amounts', async () => {
    await request(app)
      .post('/api/finance')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'input',
        amount: 0,
        sharedAccount: account._id.toString()
      })
      .expect(400);

    await request(app)
      .post('/api/finance')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'input',
        amount: -10,
        sharedAccount: account._id.toString()
      })
      .expect(400);
  });

  it('rejects an unauthorised user from contributing', async () => {
    await request(app)
      .post('/api/finance')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        type: 'input',
        amount: 50,
        sharedAccount: account._id.toString()
      })
      .expect(403);
  });

  it('rejects contributions on archived Trip Money and keeps history readable', async () => {
    const created = await FinanceRecord.create({
      user: memberUser._id,
      type: 'input',
      amount: 80,
      description: 'Before close',
      sharedAccount: account._id
    });
    account.financeRecords.push(created._id);
    account.isDeleted = true;
    account.deletedAt = new Date();
    await account.save();

    await request(app)
      .post('/api/finance')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'input',
        amount: 20,
        sharedAccount: account._id.toString()
      })
      .expect(403);

    const history = await request(app)
      .get(`/api/finance?sharedAccount=${account._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(history.body.some((row) => row.amount === 80)).toBe(true);
  });
});
