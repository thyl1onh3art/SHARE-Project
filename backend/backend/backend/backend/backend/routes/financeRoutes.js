const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/auth');
const { validateFinanceRecord } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a finance record
router.post('/', auth, validateFinanceRecord, asyncHandler(financeController.createRecord));

// Get all finance records for the logged-in user
router.get('/', auth, asyncHandler(financeController.getUserRecords));

// Update a finance record
router.put('/:id', auth, validateFinanceRecord, asyncHandler(financeController.updateRecord));

// Delete a finance record
router.delete('/:id', auth, asyncHandler(financeController.deleteRecord));

module.exports = router;
