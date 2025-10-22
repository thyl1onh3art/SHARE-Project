const express = require('express');
const router = express.Router();
const emailVerificationController = require('../controllers/emailVerificationController');
const { body } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware for email verification
const validateEmailVerification = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Code must be a 6-digit number'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
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
  }
];

const validateEmailOnly = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
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
  }
];

// Send verification code
router.post('/send-code', validateEmailOnly, asyncHandler(emailVerificationController.sendVerificationCode));

// Verify code
router.post('/verify', validateEmailVerification, asyncHandler(emailVerificationController.verifyCode));

// Check verification status
router.get('/status/:email', asyncHandler(emailVerificationController.checkVerificationStatus));

module.exports = router;
