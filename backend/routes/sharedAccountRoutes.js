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

// Transfer organiser role
router.post('/:id/transfer-ownership', auth, asyncHandler(sharedAccountController.transferOwnership));

// Archive Trip Money (soft-archive)
router.delete('/:id', auth, asyncHandler(sharedAccountController.deleteSharedAccount));

// Permanently delete an archived Trip Money pot
router.delete('/:id/permanent', auth, asyncHandler(sharedAccountController.permanentlyDeleteSharedAccount));

// Reverse / withdraw recorded contribution from shared account
router.post('/:id/withdraw', auth, asyncHandler(sharedAccountController.withdrawFunds));

module.exports = router;
