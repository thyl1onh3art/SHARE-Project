const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Register
router.post('/register', validateUserRegistration, asyncHandler(userController.register));

// Login
router.post('/login', validateUserLogin, asyncHandler(userController.login));

// Get current user profile
router.get('/me', auth, asyncHandler(userController.getProfile));

// Update user profile
router.put('/profile', auth, asyncHandler(userController.updateProfile));

// Delete user account
router.delete('/account', auth, asyncHandler(userController.deleteAccount));

// Get calendar settings
router.get('/calendar-settings', auth, asyncHandler(userController.getCalendarSettings));

// Update calendar settings
router.put('/calendar-settings', auth, asyncHandler(userController.updateCalendarSettings));

module.exports = router; 