const express = require('express');
const router = express.Router();
const sharedAccountController = require('../controllers/sharedAccountController');
const auth = require('../middleware/auth');
const { validateSharedAccount } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a shared account
router.post('/', auth, validateSharedAccount, asyncHandler(sharedAccountController.createSharedAccount));

// List shared accounts for the user
router.get('/', auth, asyncHandler(sharedAccountController.getUserSharedAccounts));

// Get details of a shared account
router.get('/:id', auth, asyncHandler(sharedAccountController.getSharedAccountDetails));

// Update a shared account
router.put('/:id', auth, asyncHandler(sharedAccountController.updateSharedAccount));

// Transfer ownership of a shared account
router.post('/:id/transfer-ownership', auth, asyncHandler(sharedAccountController.transferOwnership));

// Delete a shared account
router.delete('/:id', auth, asyncHandler(sharedAccountController.deleteSharedAccount));

// Withdraw funds from shared account
router.post('/:id/withdraw', auth, asyncHandler(sharedAccountController.withdrawFunds));

module.exports = router;
