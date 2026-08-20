const { body, validationResult } = require('express-validator');

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

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('age')
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Finance record validation
const validateFinanceRecord = [
  body('type')
    .isIn(['input', 'output'])
    .withMessage('Type must be either "input" or "output"'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  body('sharedAccount')
    .optional()
    .isMongoId()
    .withMessage('Shared account ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// Shared account validation
const validateSharedAccount = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('targetAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be greater than 0'),
  body('targetDate')
    .isISO8601()
    .withMessage('Valid target date is required'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array'),
  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each member ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// Invite validation
const validateInvite = [
  body('sharedAccountId')
    .isMongoId()
    .withMessage('Shared account ID must be a valid MongoDB ObjectId'),
  body('recipientEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Recipient email must be a valid email address'),
  body('recipientPhone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Recipient phone must be a valid international phone number'),
  body('recipientEmail', 'recipientPhone')
    .custom((value, { req }) => {
      if (!req.body.recipientEmail && !req.body.recipientPhone) {
        throw new Error('Either recipient email or phone must be provided');
      }
      return true;
    }),
  handleValidationErrors
];

// Accept invite validation
const validateAcceptInvite = [
  body('inviteId')
    .isMongoId()
    .withMessage('Invite ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// Remove member validation
const validateRemoveMember = [
  body('sharedAccountId')
    .isMongoId()
    .withMessage('Shared account ID must be a valid MongoDB ObjectId'),
  body('memberId')
    .isMongoId()
    .withMessage('Member ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

const validateAddFriend = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateFinanceRecord,
  validateSharedAccount,
  validateInvite,
  validateAcceptInvite,
  validateRemoveMember,
  validateAddFriend,
  handleValidationErrors
};



