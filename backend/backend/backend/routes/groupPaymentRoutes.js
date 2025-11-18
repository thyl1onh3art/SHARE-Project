const express = require('express');
const router = express.Router();
const groupPaymentController = require('../controllers/groupPaymentController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Set target amount for group payment (owner only)
router.post('/set-target', 
  auth, 
  asyncHandler(groupPaymentController.setGroupPaymentTarget)
);

// Commit contribution (members)
router.post('/commit', 
  auth, 
  asyncHandler(groupPaymentController.commitContribution)
);

// Get group payment status
router.get('/status/:sharedAccountId', 
  auth, 
  asyncHandler(groupPaymentController.getGroupPaymentStatus)
);

// Create PayPal payment when all committed (owner only)
router.post('/create-payment', 
  auth, 
  asyncHandler(groupPaymentController.createGroupPayment)
);

// Cancel group payment (owner only)
router.post('/cancel', 
  auth, 
  asyncHandler(groupPaymentController.cancelGroupPayment)
);

module.exports = router;

