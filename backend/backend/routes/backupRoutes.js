const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
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

// Validation for creating backup
const validateCreateBackup = [
  body('type').optional().isIn(['manual', 'daily', 'weekly', 'monthly']).withMessage('Invalid backup type'),
  handleValidationErrors
];

// All backup routes require authentication
router.use(auth);

// Create a manual backup
router.post('/create', validateCreateBackup, asyncHandler(backupController.createBackup));

// List available backups
router.get('/list', asyncHandler(backupController.listBackups));

// Get backup status
router.get('/status', asyncHandler(backupController.getBackupStatus));

// Restore from backup
router.post('/restore/:backupName', asyncHandler(backupController.restoreBackup));

// Download backup
router.get('/download/:backupName', asyncHandler(backupController.downloadBackup));

// Delete backup
router.delete('/delete/:backupName', asyncHandler(backupController.deleteBackup));

module.exports = router;
