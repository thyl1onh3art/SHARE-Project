const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

describe('Archived Trip Money activity history', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

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
    userA = await User.create({
      firstName: 'Alice',
      lastName: 'Owner',
      email: 'archive-hist-a@test.com',
      password: hashedPassword,
      age: 25
    });
    userB = await User.create({
      firstName: 'Bob',
      lastName: 'Other',
      email: 'archive-hist-b@test.com',
      password: hashedPassword,
      age: 28
    });

    tokenA = jwt.sign({ userId: userA._id, email: userA.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    tokenB = jwt.sign({ userId: userB._id, email: userB.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  it('returns only the authenticated user preserved permanently-deleted records', async () => {
    await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 40,
      description: 'Alice contribution',
      archivedAccountName: 'Lisbon Trip Money',
      sharedAccount: undefined
    });
    await FinanceRecord.create({
      user: userB._id,
      type: 'input',
      amount: 55,
      description: 'Bob contribution',
      archivedAccountName: 'Lisbon Trip Money',
      sharedAccount: undefined
    });

    const response = await request(app)
      .get('/api/finance/archived')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].archivedAccountName).toBe('Lisbon Trip Money');
    expect(response.body[0].amount).toBe(40);
    expect(response.body[0].sharedAccount == null).toBe(true);
  });

  it('does not classify soft-archived or active records as permanently deleted history', async () => {
    const activePot = await SharedAccount.create({
      owner: userA._id,
      name: 'Active Pot',
      members: []
    });
    const softArchivedPot = await SharedAccount.create({
      owner: userA._id,
      name: 'Soft Archived Pot',
      members: [],
      isDeleted: true,
      deletedAt: new Date()
    });

    await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 10,
      sharedAccount: activePot._id,
      description: 'Active contribution'
    });
    await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 20,
      sharedAccount: softArchivedPot._id,
      archivedAccountName: 'Soft Archived Pot',
      description: 'Soft-archived still linked'
    });
    await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 30,
      archivedAccountName: 'Gone Pot',
      description: 'Permanent history'
    });

    const response = await request(app)
      .get('/api/finance/archived')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].archivedAccountName).toBe('Gone Pot');
    expect(response.body[0].amount).toBe(30);
  });

  it('rejects unauthenticated access', async () => {
    await request(app)
      .get('/api/finance/archived')
      .expect(401);
  });

  it('blocks mutation of permanently deleted history rows', async () => {
    const record = await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 12,
      archivedAccountName: 'Gone Pot',
      description: 'Keep me'
    });

    await request(app)
      .put(`/api/finance/${record._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'output', amount: 1, description: 'tamper' })
      .expect(400);

    await request(app)
      .delete(`/api/finance/${record._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    const stillThere = await FinanceRecord.findById(record._id);
    expect(stillThere).toBeTruthy();
    expect(stillThere.amount).toBe(12);
  });

  it('permanent delete preserves FinanceRecord with archivedAccountName and no broken link', async () => {
    const account = await SharedAccount.create({
      owner: userA._id,
      name: 'Lisbon Trip Money',
      members: [userB._id]
    });
    const record = await FinanceRecord.create({
      user: userA._id,
      type: 'input',
      amount: 75,
      sharedAccount: account._id,
      description: 'Deposit'
    });

    await request(app)
      .delete(`/api/shared-accounts/${account._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(app)
      .delete(`/api/shared-accounts/${account._id}/permanent`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const preserved = await FinanceRecord.findById(record._id);
    expect(preserved.archivedAccountName).toBe('Lisbon Trip Money');
    expect(preserved.sharedAccount).toBeUndefined();

    const archived = await request(app)
      .get('/api/finance/archived')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(archived.body.some((row) => row._id === record._id.toString())).toBe(true);
  });
});
