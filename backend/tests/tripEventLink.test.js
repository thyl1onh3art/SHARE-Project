const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const Invite = require('../models/Invite');

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
    await FinanceRecord.deleteMany({});

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
        plannedContributors: 4,
        contributionFrequency: 'weekly',
        contributionPlanAgreed: true,
        eventId: trip._id.toString()
      })
      .expect(201);

    expect(response.body.sharedAccount.name).toBe('Canada costs');
    expect(response.body.sharedAccount.plannedContributors).toBe(4);
    expect(response.body.sharedAccount.contributionPlans[0].frequency).toBe('weekly');
    expect(response.body.sharedAccount.contributionPlans[0].agreed).toBe(true);
    expect(String(response.body.sharedAccount.event)).toBe(String(trip._id));

    const listed = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listed.body[0].tripMoney._id).toBe(String(response.body.sharedAccount._id));
    expect(listed.body[0].tripMoney.name).toBe('Canada costs');
    expect(listed.body[0].tripMoney.isDeleted).toBe(false);
    expect(listed.body[0].tripMoney.targetAmount).toBe(2000);
    expect(listed.body[0].tripMoney.recordedTotal).toBe(0);
    expect(listed.body[0].tripMoney.yourContribution).toBe(0);
  });

  it('summarises recorded contributions on the trip', async () => {
    const pot = await SharedAccount.create({
      owner: ownerUser._id,
      name: 'Canada costs',
      description: 'Flights and cabin',
      targetAmount: 2400,
      targetDate: futureDate(),
      event: trip._id
    });
    const record = await FinanceRecord.create({
      user: ownerUser._id,
      type: 'input',
      amount: 1800,
      description: 'First contribution',
      sharedAccount: pot._id
    });
    pot.financeRecords.push(record._id);
    await pot.save();

    const listed = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(listed.body[0].tripMoney.recordedTotal).toBe(1800);
    expect(listed.body[0].tripMoney.yourContribution).toBe(1800);
    expect(listed.body[0].tripMoney.targetAmount).toBe(2400);
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
        plannedContributors: 3,
        contributionFrequency: 'monthly',
        contributionPlanAgreed: true,
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

  it('creates a trip and linked Trip Money together', async () => {
    const beforeEvents = await Event.countDocuments();
    const beforePots = await SharedAccount.countDocuments();

    const response = await request(app)
      .post('/api/events/with-trip-money')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Barcelona',
        description: 'Friends trip',
        eventDate: '2027-09-01',
        eventTime: '10:00',
        location: 'Barcelona',
        category: 'holiday',
        targetAmount: 1000,
        plannedContributors: 4,
        contributionFrequency: 'weekly',
        contributionPlanAgreed: true
      })
      .expect(201);

    expect(response.body.sharedAccount.name).toBe('Barcelona');
    expect(response.body.sharedAccount.targetAmount).toBe(1000);
    expect(response.body.sharedAccount.plannedContributors).toBe(4);
    expect(response.body.sharedAccount.contributionPlans[0].frequency).toBe('weekly');
    expect(response.body.sharedAccount.contributionPlans[0].agreed).toBe(true);
    expect(String(response.body.sharedAccount.event)).toBe(String(response.body.event._id));
    expect(response.body.event.tripMoney._id).toBe(String(response.body.sharedAccount._id));
    expect(await Event.countDocuments()).toBe(beforeEvents + 1);
    expect(await SharedAccount.countDocuments()).toBe(beforePots + 1);

    const listed = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const created = listed.body.find((item) => item.title === 'Barcelona');
    expect(created.tripMoney._id).toBe(String(response.body.sharedAccount._id));
    expect(created.tripMoney.targetAmount).toBe(1000);
    expect(created.tripMoney.plannedContributors).toBe(4);
  });

  it('rejects a combined create without a valid planned contributor count', async () => {
    await request(app)
      .post('/api/events/with-trip-money')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'No people',
        eventDate: '2027-09-01',
        eventTime: '10:00',
        targetAmount: 1000,
        plannedContributors: 0
      })
      .expect(400);
  });

  it('rejects a combined create with a £0 or missing target', async () => {
    const beforeEvents = await Event.countDocuments();
    await request(app)
      .post('/api/events/with-trip-money')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'No target',
        eventDate: '2027-09-01',
        eventTime: '10:00',
        targetAmount: 0
      })
      .expect(400);

    await request(app)
      .post('/api/events/with-trip-money')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Missing target',
        eventDate: '2027-09-01',
        eventTime: '10:00'
      })
      .expect(400);

    expect(await Event.countDocuments()).toBe(beforeEvents);
    expect(await SharedAccount.countDocuments({ name: 'No target' })).toBe(0);
  });

  it('does not leave an Event if Trip Money creation fails', async () => {
    const beforeEvents = await Event.countDocuments();
    const saveSpy = jest.spyOn(SharedAccount.prototype, 'save').mockImplementationOnce(function failSave() {
      return Promise.reject(new Error('simulated pot failure'));
    });

    try {
      const response = await request(app)
        .post('/api/events/with-trip-money')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Rollback trip',
          eventDate: '2027-09-01',
          eventTime: '10:00',
          targetAmount: 500,
          plannedContributors: 2,
          contributionFrequency: 'weekly',
          contributionPlanAgreed: true
        })
        .expect(500);

      expect(response.body.message).toMatch(/could not create trip money/i);
      expect(response.body.message).not.toMatch(/mongo|objectid|simulated pot failure/i);
      expect(await Event.countDocuments()).toBe(beforeEvents);
      expect(await Event.findOne({ title: 'Rollback trip' })).toBeNull();
      expect(await SharedAccount.countDocuments({ name: 'Rollback trip' })).toBe(0);
    } finally {
      saveSpy.mockRestore();
    }
  });

  describe('accepted member listing', () => {
    let memberUser;
    let memberToken;
    let outsiderUser;
    let outsiderToken;

    const createMember = async (email) => {
      const hashedPassword = await bcrypt.hash('TestPass123', 10);
      return User.create({
        firstName: 'Member',
        lastName: 'User',
        email,
        password: hashedPassword,
        age: 27
      });
    };

    beforeEach(async () => {
      await Invite.deleteMany({});
      memberUser = await createMember('trip-link-member@test.com');
      outsiderUser = await createMember('trip-link-outsider@test.com');
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
    });

    it('lists a linked Shared Account for the owner and an accepted member, once each', async () => {
      const pot = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Canada costs',
        targetAmount: 2400,
        targetDate: futureDate(),
        event: trip._id,
        members: [memberUser._id]
      });

      const ownerList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(ownerList.body.filter((item) => item.title === 'Canada')).toHaveLength(1);
      expect(ownerList.body[0].ownedByCurrentUser).toBe(true);
      expect(ownerList.body[0].tripMoney._id).toBe(String(pot._id));
      expect(ownerList.body[0].tripMoney.members).toHaveLength(1);

      const memberList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberList.body).toHaveLength(1);
      expect(memberList.body[0]._id).toBe(String(trip._id));
      expect(memberList.body[0].title).toBe('Canada');
      expect(memberList.body[0].ownedByCurrentUser).toBe(false);
      expect(memberList.body[0].tripMoney._id).toBe(String(pot._id));
      expect(memberList.body[0].tripMoney.targetAmount).toBe(2400);
    });

    it('does not list a Shared Account for a pending invite, cancelled invite, or outsider', async () => {
      const pot = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Canada costs',
        targetAmount: 2400,
        targetDate: futureDate(),
        event: trip._id,
        members: []
      });
      const pendingInvite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: memberUser.email,
        sharedAccount: pot._id,
        status: 'pending'
      });
      const cancelledInvite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: outsiderUser.email,
        sharedAccount: pot._id,
        status: 'pending'
      });
      await request(app)
        .post('/api/invites/cancel')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteId: cancelledInvite._id.toString() })
        .expect(200);
      expect(await Invite.findById(pendingInvite._id)).toBeTruthy();
      expect(await Invite.findById(cancelledInvite._id)).toBeNull();

      const pendingList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(pendingList.body).toHaveLength(0);

      const cancelledList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(200);
      expect(cancelledList.body).toHaveLength(0);
    });

    it('lists the linked Event for a member after they accept an invitation', async () => {
      const pot = await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Canada costs',
        targetAmount: 2400,
        targetDate: futureDate(),
        event: trip._id,
        members: []
      });
      const invite = await Invite.create({
        sender: ownerUser._id,
        recipientEmail: memberUser.email,
        sharedAccount: pot._id,
        status: 'pending'
      });

      await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ inviteId: invite._id.toString() })
        .expect(200);

      const memberList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberList.body).toHaveLength(1);
      expect(memberList.body[0].tripMoney._id).toBe(String(pot._id));
    });

    it('marks an archived Shared Account as closed for an accepted member', async () => {
      await SharedAccount.create({
        owner: ownerUser._id,
        name: 'Canada costs',
        targetAmount: 2400,
        targetDate: futureDate(),
        event: trip._id,
        members: [memberUser._id],
        isDeleted: true,
        deletedAt: new Date()
      });

      const memberList = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberList.body).toHaveLength(1);
      expect(memberList.body[0].tripMoney.isDeleted).toBe(true);
    });
  });
});
