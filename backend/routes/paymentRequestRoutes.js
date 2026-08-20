const express = require('express');
const router = express.Router();
const paymentRequestController = require('../controllers/paymentRequestController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Create a settlement-record request
router.post('/', auth, asyncHandler(paymentRequestController.createPaymentRequest));

// Pending settlement requests for the user
router.get('/', auth, asyncHandler(paymentRequestController.getPaymentRequests));

// Actionable settlement-approval count (per-user, not a shared readAt)
router.get('/unread-count', auth, asyncHandler(paymentRequestController.getUnreadCount));

// Approve a settlement request
router.post('/:requestId/approve', auth, asyncHandler(paymentRequestController.approvePaymentRequest));

// Reject a settlement request
router.post('/:requestId/reject', auth, asyncHandler(paymentRequestController.rejectPaymentRequest));

// Cancel a pending settlement request (requester only)
router.post('/:requestId/cancel', auth, asyncHandler(paymentRequestController.cancelPaymentRequest));

module.exports = router;

