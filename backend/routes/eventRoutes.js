const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a new event
router.post('/', auth, asyncHandler(eventController.createEvent));

// Create a trip together with linked Trip Money
router.post('/with-trip-money', auth, asyncHandler(eventController.createEventWithTripMoney));

// Get all events for the user
router.get('/', auth, asyncHandler(eventController.getUserEvents));

// Get upcoming events (next 30 days)
router.get('/upcoming', auth, asyncHandler(eventController.getUpcomingEvents));

// Get events shared with the user
router.get('/shared', auth, asyncHandler(eventController.getSharedEvents));

// Get a specific event
router.get('/:id', auth, asyncHandler(eventController.getEvent));

// Update an event
router.put('/:id', auth, asyncHandler(eventController.updateEvent));

// Delete an event
router.delete('/:id', auth, asyncHandler(eventController.deleteEvent));

module.exports = router;
