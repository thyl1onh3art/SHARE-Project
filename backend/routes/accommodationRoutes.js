const express = require('express');
const router = express.Router();
const accommodationController = require('../controllers/accommodationController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Search accommodations
router.post('/search', auth, asyncHandler(accommodationController.searchAccommodations));

module.exports = router;

