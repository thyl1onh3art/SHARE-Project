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
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('ageGroup')
    .optional()
    .isIn(['16-20', '21-25', '26-30', '31-35', '36-40', '40+'])
    .withMessage('Age group must be one of the valid options'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  // Custom validation: ensure either name or firstName/lastName is provided
  body('name')
    .custom((value, { req }) => {
      // If name is not provided, check if firstName and lastName are provided
      if (!value && (!req.body.firstName || !req.body.lastName)) {
        throw new Error('Either name or both firstName and lastName must be provided');
      }
      return true;
    }),
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
    .isLength({ min: 3, max: 500 })
    .withMessage('Description must be between 3 and 500 characters'),
  body('targetAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be a positive number greater than 0'),
  body('targetDate')
    .isISO8601()
    .withMessage('Target date must be a valid ISO date')
    .custom((value) => {
      const targetDate = new Date(value);
      if (targetDate <= new Date()) {
        throw new Error('Target date must be in the future');
      }
      return true;
    }),
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

// Update shared account validation
const validateUpdateSharedAccount = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Description must be between 3 and 500 characters'),
  body('targetAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be a positive number greater than 0'),
  body('targetDate')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid ISO date')
    .custom((value) => {
      if (value) {
        const targetDate = new Date(value);
        if (targetDate <= new Date()) {
          throw new Error('Target date must be in the future');
        }
      }
      return true;
    }),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array'),
  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each member ID must be a valid MongoDB ObjectId'),
  body('action')
    .optional()
    .isIn(['add', 'remove'])
    .withMessage('Action must be either "add" or "remove"'),
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

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateFinanceRecord,
  validateSharedAccount,
  validateUpdateSharedAccount,
  validateInvite,
  validateAcceptInvite,
  validateRemoveMember,
  handleValidationErrors
};



