const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get event recommendations
router.get('/events', auth, asyncHandler(recommendationController.getEventRecommendations));

module.exports = router;

