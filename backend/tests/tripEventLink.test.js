const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const SharedAccount = require('../models/SharedAccount');

describe('Trip ↔ Trip Money link', () => {
  let ownerUser;
  let ownerToken;
  let trip;

  const futureDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 4);
    return date.toISOString();
  };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await SharedAccount.deleteMany({});

    const hashedPassword = await bcrypt.hash('TestPass123', 10);
    ownerUser = await User.create({
      firstName: 'Owner',
      lastName: 'User',
      email: 'trip-link-owner@test.com',
      password: hashedPassword,
      age: 25
    });
    ownerToken = jwt.sign(
      { userId: ownerUser._id, email: ownerUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    trip = await Event.create({
      user: ownerUser._id,
      title: 'Canada',
      description: 'Group holiday',
      eventDate: '2027-06-01',
      eventTime: '10:00',
      category: 'holiday'
    });
  });

  it('lists a trip without Trip Money as unlinked', async () => {
    const response = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].tripMoney).toBeNull();
  });

  it('creates Trip Money linked to a trip', async () => {
    const response = await request(app)
      .post('/api/shared-accounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Canada costs',
        description: 'Flights and cabin',
        targetAmount: 2000,
        targetDate: futureDate(),
        eventId: trip._id.toString()
      })
      .expect(201);

    expect(response.body.sharedAccount.name).toBe('Canada costs');
    expect(String(response.body.sharedAccount.event)).toBe(String(trip._id));

    const listed = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listed.body[0].tripMoney._id).toBe(String(response.body.sharedAccount._id));
    expect(listed.body[0].tripMoney.name).toBe('Canada costs');
    expect(listed.body[0].tripMoney.isDeleted).toBe(false);
  });

  it('rejects a second Trip Money pot for the same trip', async () => {
    await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Existing Canada pot',
      description: 'Already linked',
      targetAmount: 100,
      targetDate: futureDate(),
      event: trip._id
    });

    const response = await request(app)
      .post('/api/shared-accounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Second pot',
        description: 'Should fail',
        targetAmount: 50,
        targetDate: futureDate(),
        eventId: trip._id.toString()
      })
      .expect(400);

    expect(response.body.message).toMatch(/already has Trip Money/i);
  });

  it('keeps unlinked recovered Trip Money usable', async () => {
    const unlinked = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Legacy pot',
      description: 'No trip link',
      targetAmount: 80,
      members: []
    });

    const list = await request(app)
      .get('/api/shared-accounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body.some((item) => String(item._id) === String(unlinked._id))).toBe(true);
    expect(list.body.find((item) => String(item._id) === String(unlinked._id)).event).toBeUndefined();

    await request(app)
      .get(`/api/shared-accounts/${unlinked._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('keeps archived linked Trip Money readable from the trip', async () => {
    const pot = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Canada costs',
      description: 'Closed',
      targetAmount: 200,
      event: trip._id,
      isDeleted: true,
      deletedAt: new Date()
    });

    const tripResponse = await request(app)
      .get(`/api/events/${trip._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(tripResponse.body.tripMoney._id).toBe(String(pot._id));
    expect(tripResponse.body.tripMoney.isDeleted).toBe(true);

    await request(app)
      .get(`/api/shared-accounts/${pot._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });
});
