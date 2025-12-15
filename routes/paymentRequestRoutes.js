const express = require('express');
const router = express.Router();
const paymentRequestController = require('../controllers/paymentRequestController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a payment request
router.post('/', auth, asyncHandler(paymentRequestController.createPaymentRequest));

// Get payment requests for the user (pending approvals)
router.get('/', auth, asyncHandler(paymentRequestController.getPaymentRequests));

// Approve a payment request
router.post('/:requestId/approve', auth, asyncHandler(paymentRequestController.approvePaymentRequest));

// Reject a payment request
router.post('/:requestId/reject', auth, asyncHandler(paymentRequestController.rejectPaymentRequest));

module.exports = router;

