const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Create PayPal payment (requires authentication)
router.post('/create', 
  auth, 
  asyncHandler(paymentController.createPayment)
);

// Execute PayPal payment after user approval (requires authentication)
router.post('/execute', 
  auth, 
  asyncHandler(paymentController.executePayment)
);

// Get payment details (requires authentication)
router.get('/:paymentId', 
  auth, 
  asyncHandler(paymentController.getPaymentDetails)
);

// Get payment history (requires authentication)
router.get('/history', 
  auth, 
  asyncHandler(paymentController.getPaymentHistory)
);

// Refund payment (requires authentication)
router.post('/refund', 
  auth, 
  asyncHandler(paymentController.refundPayment)
);

module.exports = router;

