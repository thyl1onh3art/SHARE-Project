const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactorController');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validation for 2FA setup
const validate2FASetup = [
  body('method').isIn(['email', 'sms']).withMessage('Method must be either "email" or "sms"'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number format'),
  handleValidationErrors
];

// Validation for 2FA verification
const validate2FAVerification = [
  body('method').isIn(['email', 'sms', 'backup']).withMessage('Method must be "email", "sms", or "backup"'),
  body('code').isLength({ min: 4, max: 8 }).withMessage('Code must be between 4 and 8 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number format'),
  handleValidationErrors
];

// Validation for sending 2FA code
const validateSend2FACode = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('method').isIn(['email', 'sms']).withMessage('Method must be either "email" or "sms"'),
  handleValidationErrors
];

// Validation for verifying 2FA code
const validateVerify2FACode = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('code').isLength({ min: 4, max: 8 }).withMessage('Code must be between 4 and 8 characters'),
  body('method').isIn(['email', 'sms', 'backup']).withMessage('Method must be "email", "sms", or "backup"'),
  handleValidationErrors
];

// Validation for disabling 2FA
const validateDisable2FA = [
  body('method').isIn(['email', 'sms', 'all']).withMessage('Method must be "email", "sms", or "all"'),
  handleValidationErrors
];

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes

// Setup 2FA
router.post('/setup', validate2FASetup, asyncHandler(twoFactorController.setup2FA));

// Verify and enable 2FA
router.post('/verify-setup', validate2FAVerification, asyncHandler(twoFactorController.verifyAndEnable2FA));

// Get 2FA status
router.get('/status', asyncHandler(twoFactorController.get2FAStatus));

// Disable 2FA
router.post('/disable', validateDisable2FA, asyncHandler(twoFactorController.disable2FA));

// Public routes (for login flow)
router.post('/send-code', validateSend2FACode, asyncHandler(twoFactorController.send2FACode));
router.post('/verify-code', validateVerify2FACode, asyncHandler(twoFactorController.verify2FACode));

module.exports = router;
