const paypal = require('paypal-rest-sdk');
const crypto = require('crypto');
const axios = require('axios');

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Generate unique transaction ID
const generateTransactionId = () => {
  return `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

// Create PayPal payment
exports.createPayment = async (req, res) => {
  try {
    const { amount, currency, description, returnUrl, cancelUrl } = req.body;
    const userId = req.user.userId;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0' 
      });
    }

    // Validate currency (default to GBP)
    const validCurrency = currency && ['GBP', 'USD', 'EUR'].includes(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : 'GBP';

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Create PayPal payment object
    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`
      },
      transactions: [{
        item_list: {
          items: [{
            name: description || `Payment from user ${userId}`,
            sku: transactionId,
            price: amount.toFixed(2),
            currency: validCurrency,
            quantity: 1
          }]
        },
        amount: {
          currency: validCurrency,
          total: amount.toFixed(2)
        },
        description: description || `Payment transaction ${transactionId}`,
        custom: JSON.stringify({
          userId: userId,
          transactionId: transactionId
        })
      }]
    };

    // Create payment with PayPal
    paypal.payment.create(createPaymentJson, (error, payment) => {
      if (error) {
        console.error('PayPal Payment Creation Error:', error);
        return res.status(500).json({ 
          error: 'Payment creation failed',
          message: error.response?.details?.[0]?.description || error.message 
        });
      }

      // Find approval URL
      const approvalUrl = payment.links.find(link => link.rel === 'approval_url');

      // Log transaction attempt
      console.log('PayPal Payment Created:', {
        transactionId,
        userId,
        amount,
        currency: validCurrency,
        paymentId: payment.id,
        status: payment.state,
        timestamp: new Date().toISOString()
      });

      // TODO: Save transaction to database
      // await Transaction.create({
      //   transactionId,
      //   userId,
      //   amount,
      //   currency: validCurrency,
      //   paymentId: payment.id,
      //   status: 'pending',
      //   createdAt: new Date()
      // });

      res.json({
        success: true,
        paymentId: payment.id,
        transactionId: transactionId,
        approvalUrl: approvalUrl.href,
        amount: amount,
        currency: validCurrency
      });
    });
  } catch (error) {
    console.error('Payment Creation Error:', error);
    res.status(500).json({ 
      error: 'Payment processing failed',
      message: error.message 
    });
  }
};

// Execute PayPal payment (after user approves)
exports.executePayment = async (req, res) => {
  try {
    const { paymentId, payerId } = req.body;
    const userId = req.user.userId;

    if (!paymentId || !payerId) {
      return res.status(400).json({ 
        error: 'Payment ID and Payer ID are required' 
      });
    }

    // Execute payment with PayPal
    const executePaymentJson = {
      payer_id: payerId
    };

    paypal.payment.execute(paymentId, executePaymentJson, (error, payment) => {
      if (error) {
        console.error('PayPal Payment Execution Error:', error);
        return res.status(500).json({ 
          error: 'Payment execution failed',
          message: error.response?.details?.[0]?.description || error.message 
        });
      }

      // Extract transaction details
      const transaction = payment.transactions[0];
      const customData = JSON.parse(transaction.custom || '{}');

      // Verify the payment belongs to this user
      if (customData.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to payment' });
      }

      // Log payment execution
      console.log('PayPal Payment Executed:', {
        paymentId: payment.id,
        userId: customData.userId,
        transactionId: customData.transactionId,
        amount: transaction.amount.total,
        currency: transaction.amount.currency,
        status: payment.state,
        timestamp: new Date().toISOString()
      });

      // TODO: Update transaction in database
      // await Transaction.updateOne(
      //   { paymentId },
      //   { 
      //     status: payment.state === 'approved' ? 'succeeded' : payment.state,
      //     payerId: payerId,
      //     completedAt: new Date()
      //   }
      // );

      res.json({
        success: true,
        status: payment.state,
        payment: {
          id: payment.id,
          state: payment.state,
          amount: transaction.amount.total,
          currency: transaction.amount.currency,
          transactionId: customData.transactionId,
          payer: payment.payer.payer_info
        }
      });
    });
  } catch (error) {
    console.error('Payment Execution Error:', error);
    res.status(500).json({ 
      error: 'Payment execution failed',
      message: error.message 
    });
  }
};

// Get payment details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Retrieve payment from PayPal
    paypal.payment.get(paymentId, (error, payment) => {
      if (error) {
        console.error('Get Payment Error:', error);
        return res.status(500).json({ 
          error: 'Failed to retrieve payment',
          message: error.response?.details?.[0]?.description || error.message 
        });
      }

      // Extract custom data
      const transaction = payment.transactions[0];
      const customData = JSON.parse(transaction.custom || '{}');

      // Verify the payment belongs to this user
      if (customData.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to payment' });
      }

      res.json({
        success: true,
        payment: {
          id: payment.id,
          state: payment.state,
          amount: transaction.amount.total,
          currency: transaction.amount.currency,
          transactionId: customData.transactionId,
          createdAt: payment.create_time,
          updatedAt: payment.update_time
        }
      });
    });
  } catch (error) {
    console.error('Get Payment Details Error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment details',
      message: error.message 
    });
  }
};

// Get payment history for user
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    // Note: PayPal doesn't provide a direct way to list payments by custom metadata
    // You should store transactions in your database and query from there
    // This is a placeholder - implement with your Transaction model

    res.json({
      success: true,
      message: 'Payment history should be retrieved from your database',
      payments: [],
      count: 0
    });

    // TODO: Implement with Transaction model
    // const transactions = await Transaction.find({ userId })
    //   .sort({ createdAt: -1 })
    //   .limit(limit);
    // 
    // res.json({
    //   success: true,
    //   payments: transactions,
    //   count: transactions.length
    // });
  } catch (error) {
    console.error('Get Payment History Error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment history',
      message: error.message 
    });
  }
};

// Cancel/refund payment (if applicable)
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId, amount, currency } = req.body;
    const userId = req.user.userId;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Get payment details first to verify ownership
    paypal.payment.get(paymentId, (error, payment) => {
      if (error) {
        return res.status(500).json({ 
          error: 'Failed to retrieve payment',
          message: error.message 
        });
      }

      const transaction = payment.transactions[0];
      const customData = JSON.parse(transaction.custom || '{}');

      // Verify the payment belongs to this user
      if (customData.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to payment' });
      }

      // Get sale ID from payment
      const saleId = payment.transactions[0].related_resources[0]?.sale?.id;

      if (!saleId) {
        return res.status(400).json({ error: 'Sale ID not found. Payment may not be completed.' });
      }

      // Create refund
      const refundRequest = {
        amount: {
          currency: currency || transaction.amount.currency,
          total: amount ? amount.toFixed(2) : transaction.amount.total
        }
      };

      paypal.sale.refund(saleId, refundRequest, (refundError, refund) => {
        if (refundError) {
          console.error('Refund Error:', refundError);
          return res.status(500).json({ 
            error: 'Refund failed',
            message: refundError.response?.details?.[0]?.description || refundError.message 
          });
        }

        console.log('Payment Refunded:', {
          paymentId,
          saleId,
          refundId: refund.id,
          amount: refund.amount.total,
          status: refund.state
        });

        res.json({
          success: true,
          message: 'Refund processed successfully',
          refund: {
            id: refund.id,
            state: refund.state,
            amount: refund.amount.total,
            currency: refund.amount.currency
          }
        });
      });
    });
  } catch (error) {
    console.error('Refund Payment Error:', error);
    res.status(500).json({ 
      error: 'Refund processing failed',
      message: error.message 
    });
  }
};
