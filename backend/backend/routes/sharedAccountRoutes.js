const express = require('express');
const router = express.Router();
const sharedAccountController = require('../controllers/sharedAccountController');
const auth = require('../middleware/auth');
const { validateSharedAccount, validateUpdateSharedAccount } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a shared account
router.post('/', auth, validateSharedAccount, asyncHandler(sharedAccountController.createSharedAccount));

// List shared accounts for the user
router.get('/', auth, asyncHandler(sharedAccountController.getUserSharedAccounts));

// Get details of a shared account
router.get('/:id', auth, asyncHandler(sharedAccountController.getSharedAccountDetails));

// Update a shared account (owner only)
router.put('/:id', auth, validateUpdateSharedAccount, asyncHandler(sharedAccountController.updateSharedAccount));

// Delete a shared account (owner only)
router.delete('/:id', auth, asyncHandler(sharedAccountController.deleteSharedAccount));

module.exports = router;
