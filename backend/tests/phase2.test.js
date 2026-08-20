const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Phase 2 Features - API Tests', () => {
  let testUser1;
  let testUser2;
  let authToken1;
  let authToken2;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test');
    
    // Clear test database
    await User.deleteMany({});
    await Event.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});

    // Create test users
    // Create users directly in database to avoid rate limiting
    const hashedPassword = await bcrypt.hash('TestPass123', 10);
    
    testUser1 = new User({
      firstName: 'Test',
      lastName: 'User1',
      email: 'test1@example.com',
      password: hashedPassword,
      age: 25,
      interests: ['sports', 'music', 'travel']
    });
    await testUser1.save();

    testUser2 = new User({
      firstName: 'Test',
      lastName: 'User2',
      email: 'test2@example.com',
      password: hashedPassword,
      age: 30,
      interests: ['travel', 'social']
    });
    await testUser2.save();

    // Generate auth tokens
    authToken1 = jwt.sign(
      { userId: testUser1._id, email: testUser1.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
      { expiresIn: '7d' }
    );

    authToken2 = jwt.sign(
      { userId: testUser2._id, email: testUser2.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
      { expiresIn: '7d' }
    );
  });

  // ============================================
  // CALENDAR SETTINGS TESTS
  // ============================================

  describe('Calendar Settings', () => {
    describe('GET /api/users/calendar-settings', () => {
      it('should return default calendar settings (private)', async () => {
        const response = await request(app)
          .get('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(response.body.privacy).toBe('private');
        expect(response.body.sharedWith).toEqual([]);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/users/calendar-settings')
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });
    });

    describe('PUT /api/users/calendar-settings', () => {
      it('should update calendar privacy to shared', async () => {
        const response = await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            privacy: 'shared'
          })
          .expect(200);

        expect(response.body.privacy).toBe('shared');
        expect(response.body.sharedWith).toEqual([]);

        // Verify in database
        const user = await User.findById(testUser1._id);
        expect(user.calendarSettings.privacy).toBe('shared');
      });

      it('should update calendar to private', async () => {
        // First set to shared
        await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ privacy: 'shared' });

        // Then set back to private
        const response = await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            privacy: 'private'
          })
          .expect(200);

        expect(response.body.privacy).toBe('private');
      });

      it('should update sharedWith email addresses', async () => {
        const response = await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            privacy: 'shared',
            sharedWith: [testUser2.email, 'friend@example.com']
          })
          .expect(200);

        expect(response.body.privacy).toBe('shared');
        expect(response.body.sharedWith).toContain(testUser2.email);
        expect(response.body.sharedWith).toContain('friend@example.com');

        // Verify in database
        const user = await User.findById(testUser1._id);
        expect(user.calendarSettings.sharedWith).toContain(testUser2.email);
      });

      it('should reject invalid privacy value', async () => {
        const response = await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            privacy: 'invalid'
          })
          .expect(400);

        expect(response.body.message).toContain('Invalid privacy setting');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .put('/api/users/calendar-settings')
          .send({
            privacy: 'shared'
          })
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });
    });
  });

  // ============================================
  // ACCOMMODATIONS TESTS
  // ============================================

  describe('Accommodations Search', () => {
    describe('POST /api/accommodations/search', () => {
      it('should return mock accommodations for a location', async () => {
        const response = await request(app)
          .post('/api/accommodations/search')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            location: 'London, UK'
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        // Check structure of accommodation objects
        const accommodation = response.body[0];
        expect(accommodation).toHaveProperty('name');
        expect(accommodation).toHaveProperty('address');
        expect(accommodation).toHaveProperty('price');
        expect(accommodation).toHaveProperty('rating');
        expect(accommodation).toHaveProperty('distance');
        expect(accommodation).toHaveProperty('type');
        expect(accommodation).toHaveProperty('bookingLink');
      });

      it('should filter accommodations by radius', async () => {
        const response = await request(app)
          .post('/api/accommodations/search')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            location: 'London, UK',
            radius: 1.0
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        // All accommodations should be within 1km
        response.body.forEach(acc => {
          expect(acc.distance).toBeLessThanOrEqual(1.0);
        });
      });

      it('should require location parameter', async () => {
        const response = await request(app)
          .post('/api/accommodations/search')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({})
          .expect(400);

        expect(response.body.message).toBe('Location is required');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/accommodations/search')
          .send({
            location: 'London, UK'
          })
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });

      it('should accept eventDate parameter (for future API integration)', async () => {
        const response = await request(app)
          .post('/api/accommodations/search')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            location: 'London, UK',
            eventDate: '2024-12-25'
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // EVENT RECOMMENDATIONS TESTS
  // ============================================

  describe('Event Recommendations', () => {
    describe('GET /api/recommendations/events', () => {
      it('should return recommendations for user with no events (based on interests)', async () => {
        const response = await request(app)
          .get('/api/recommendations/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(response.body).toHaveProperty('recommendations');
        expect(response.body).toHaveProperty('preferences');
        expect(Array.isArray(response.body.recommendations)).toBe(true);
        
        // User has interests: ['sports', 'music', 'travel']
        // Should have interest-based recommendations
        const hasInterestBased = response.body.recommendations.some(
          rec => rec.type === 'interest_based'
        );
        expect(hasInterestBased).toBe(true);
      });

      it('should return category-based recommendations when user has events', async () => {
        // Create events with different categories
        const events = [
          {
            title: 'Football Match',
            description: 'Local football game',
            eventDate: '2024-01-15',
            eventTime: '15:00',
            location: 'London',
            category: 'sports',
            budget: { totalAmount: 50 }
          },
          {
            title: 'Concert',
            description: 'Music concert',
            eventDate: '2024-02-20',
            eventTime: '19:00',
            location: 'Manchester',
            category: 'concert',
            budget: { totalAmount: 100 }
          },
          {
            title: 'Another Football Match',
            description: 'Second football game',
            eventDate: '2024-03-10',
            eventTime: '16:00',
            location: 'London',
            category: 'sports',
            budget: { totalAmount: 60 }
          }
        ];

        for (const eventData of events) {
          await request(app)
            .post('/api/events')
            .set('Authorization', `Bearer ${authToken1}`)
            .send(eventData);
        }

        const response = await request(app)
          .get('/api/recommendations/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(response.body.recommendations.length).toBeGreaterThan(0);
        
        // Should have category-based recommendations (sports is most frequent)
        const categoryBased = response.body.recommendations.filter(
          rec => rec.type === 'category_based'
        );
        expect(categoryBased.length).toBeGreaterThan(0);
        
        // Check preferences are calculated
        expect(response.body.preferences.favoriteCategories).toContain('sports');
        expect(response.body.preferences.favoriteLocations).toContain('London');
        expect(response.body.preferences.averageBudget).toBeGreaterThan(0);
      });

      it('should return location-based recommendations', async () => {
        // Create events in same location
        const events = [
          {
            title: 'Event in Paris',
            eventDate: '2024-01-15',
            eventTime: '15:00',
            location: 'Paris',
            category: 'travel'
          },
          {
            title: 'Another Event in Paris',
            eventDate: '2024-02-20',
            eventTime: '19:00',
            location: 'Paris',
            category: 'social'
          }
        ];

        for (const eventData of events) {
          await request(app)
            .post('/api/events')
            .set('Authorization', `Bearer ${authToken1}`)
            .send(eventData);
        }

        const response = await request(app)
          .get('/api/recommendations/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        // Should have location-based recommendations
        const locationBased = response.body.recommendations.filter(
          rec => rec.type === 'location_based'
        );
        expect(locationBased.length).toBeGreaterThan(0);
        
        const parisRecommendation = locationBased.find(
          rec => rec.location === 'Paris'
        );
        expect(parisRecommendation).toBeDefined();
      });

      it('should return budget-based recommendations when events have budgets', async () => {
        // Create events with budgets
        const events = [
          {
            title: 'Expensive Event',
            eventDate: '2024-01-15',
            eventTime: '15:00',
            location: 'London',
            category: 'travel',
            budget: { totalAmount: 500 }
          },
          {
            title: 'Another Event',
            eventDate: '2024-02-20',
            eventTime: '19:00',
            location: 'Manchester',
            category: 'social',
            budget: { totalAmount: 300 }
          }
        ];

        for (const eventData of events) {
          await request(app)
            .post('/api/events')
            .set('Authorization', `Bearer ${authToken1}`)
            .send(eventData);
        }

        const response = await request(app)
          .get('/api/recommendations/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        // Should have budget-based recommendations
        const budgetBased = response.body.recommendations.filter(
          rec => rec.type === 'budget_based'
        );
        expect(budgetBased.length).toBeGreaterThan(0);
        expect(response.body.preferences.averageBudget).toBe(400);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/recommendations/events')
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });

      it('should include confidence levels in recommendations', async () => {
        const response = await request(app)
          .get('/api/recommendations/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        if (response.body.recommendations.length > 0) {
          const recommendation = response.body.recommendations[0];
          expect(['high', 'medium', 'low']).toContain(recommendation.confidence);
          expect(recommendation).toHaveProperty('reason');
          expect(recommendation).toHaveProperty('suggestedDate');
        }
      });
    });
  });

  // ============================================
  // EVENTS ENDPOINTS (for calendar integration)
  // ============================================

  describe('Events Endpoints (Calendar Integration)', () => {
    describe('GET /api/events', () => {
      it('should return user events', async () => {
        // Create an event
        const eventData = {
          title: 'Test Event',
          description: 'Test description',
          eventDate: '2024-12-25',
          eventTime: '10:00',
          location: 'London',
          category: 'social'
        };

        await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .send(eventData);

        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe('Test Event');
        expect(response.body[0].user.toString()).toBe(testUser1._id.toString());
      });

      it('should return empty array when user has no events', async () => {
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should only return events for the authenticated user', async () => {
        // Create event for user 1
        const eventData1 = {
          title: 'User 1 Event',
          eventDate: '2024-12-25',
          eventTime: '10:00',
          location: 'London',
          category: 'social'
        };

        await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .send(eventData1);

        // Create event for user 2
        const eventData2 = {
          title: 'User 2 Event',
          eventDate: '2024-12-26',
          eventTime: '11:00',
          location: 'Manchester',
          category: 'travel'
        };

        await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken2}`)
          .send(eventData2);

        // User 1 should only see their own event
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe('User 1 Event');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/events')
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });
    });

    describe('GET /api/events/shared', () => {
      it('should return events explicitly shared with user', async () => {
        // Create a shared event from user 2, shared with user 1
        const eventData = {
          title: 'Shared Event',
          eventDate: '2024-12-25',
          eventTime: '10:00',
          location: 'London',
          category: 'social',
          isShared: true,
          sharedWith: [testUser1._id]
        };

        await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken2}`)
          .send(eventData);

        const response = await request(app)
          .get('/api/events/shared')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe('Shared Event');
      });

      it('should return events from users who shared their calendar', async () => {
        // User 2 shares their calendar with user 1 (by email)
        await request(app)
          .put('/api/users/calendar-settings')
          .set('Authorization', `Bearer ${authToken2}`)
          .send({
            privacy: 'shared',
            sharedWith: [testUser1.email]
          });

        // Create an event for user 2
        const eventData = {
          title: 'Calendar Shared Event',
          eventDate: '2024-12-25',
          eventTime: '10:00',
          location: 'London',
          category: 'social'
        };

        await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken2}`)
          .send(eventData);

        const response = await request(app)
          .get('/api/events/shared')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        // Should include events from user 2's shared calendar
        const hasSharedEvent = response.body.some(
          event => event.title === 'Calendar Shared Event'
        );
        expect(hasSharedEvent).toBe(true);
      });

      it('should return empty array when no shared events exist', async () => {
        const response = await request(app)
          .get('/api/events/shared')
          .set('Authorization', `Bearer ${authToken1}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/events/shared')
          .expect(401);

        expect(response.body.message).toBe('No token, authorization denied');
      });
    });
  });
});

