const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const paypal = require('paypal-rest-sdk');
const crypto = require('crypto');

// Generate unique contribution ID
const generateContributionId = () => {
  return `contrib_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * VIRTUAL ACCOUNT SYSTEM - Legal Implementation
 * 
 * This system tracks "commitments" to pay, not actual money holding.
 * When all members have committed, a single PayPal payment is created.
 * Each person pays their share directly to PayPal - we never hold money.
 */

// Track a user's commitment to contribute
exports.commitContribution = async (req, res) => {
  try {
    const { sharedAccountId, amount, description } = req.body;
    const userId = req.user.userId;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0' 
      });
    }

    // Find shared account
    const account = await SharedAccount.findById(sharedAccountId);
    if (!account) {
      return res.status(404).json({ error: 'Shared account not found' });
    }

    // Verify user is a member
    const isMember = account.owner.toString() === userId || 
                    account.members.some(m => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this account' });
    }

    // Check if account has a pending group payment
    if (!account.groupPayment) {
      account.groupPayment = {
        targetAmount: 0,
        totalCommitted: 0,
        contributions: [],
        status: 'pending',
        paymentId: null
      };
    }

    // Check if user already committed
    const existingCommitment = account.groupPayment.contributions.find(
      c => c.userId.toString() === userId
    );

    if (existingCommitment) {
      // Update existing commitment
      existingCommitment.amount = amount;
      existingCommitment.description = description || `Contribution from user`;
      existingCommitment.updatedAt = new Date();
    } else {
      // Add new commitment
      account.groupPayment.contributions.push({
        userId: userId,
        amount: amount,
        description: description || `Contribution from user`,
        contributionId: generateContributionId(),
        status: 'committed',
        committedAt: new Date()
      });
    }

    // Recalculate total committed
    account.groupPayment.totalCommitted = account.groupPayment.contributions.reduce(
      (sum, c) => sum + c.amount, 0
    );

    await account.save();

    res.json({
      success: true,
      message: 'Contribution committed',
      contribution: {
        amount: amount,
        totalCommitted: account.groupPayment.totalCommitted,
        targetAmount: account.groupPayment.targetAmount,
        remaining: account.groupPayment.targetAmount - account.groupPayment.totalCommitted
      }
    });
  } catch (error) {
    console.error('Commit Contribution Error:', error);
    res.status(500).json({ 
      error: 'Failed to commit contribution',
      message: error.message 
    });
  }
};

// Set target amount for group payment
exports.setGroupPaymentTarget = async (req, res) => {
  try {
    const { sharedAccountId, targetAmount, description } = req.body;
    const userId = req.user.userId;

    // Validate amount
    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid target amount',
        message: 'Target amount must be greater than 0' 
      });
    }

    // Find shared account
    const account = await SharedAccount.findById(sharedAccountId);
    if (!account) {
      return res.status(404).json({ error: 'Shared account not found' });
    }

    // Only owner can set target
    if (account.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only account owner can set payment target' });
    }

    // Initialize or update group payment
    if (!account.groupPayment) {
      account.groupPayment = {
        targetAmount: targetAmount,
        totalCommitted: 0,
        contributions: [],
        status: 'pending',
        paymentId: null,
        description: description || `Group payment for ${account.name}`,
        createdAt: new Date()
      };
    } else {
      account.groupPayment.targetAmount = targetAmount;
      if (description) {
        account.groupPayment.description = description;
      }
    }

    await account.save();

    res.json({
      success: true,
      message: 'Payment target set',
      groupPayment: {
        targetAmount: account.groupPayment.targetAmount,
        totalCommitted: account.groupPayment.totalCommitted,
        remaining: account.groupPayment.targetAmount - account.groupPayment.totalCommitted,
        contributions: account.groupPayment.contributions.length
      }
    });
  } catch (error) {
    console.error('Set Group Payment Target Error:', error);
    res.status(500).json({ 
      error: 'Failed to set payment target',
      message: error.message 
    });
  }
};

// Create single PayPal payment when all contributions are committed
exports.createGroupPayment = async (req, res) => {
  try {
    const { sharedAccountId, merchantEmail, merchantName } = req.body;
    const userId = req.user.userId;

    // Find shared account
    const account = await SharedAccount.findById(sharedAccountId);
    if (!account) {
      return res.status(404).json({ error: 'Shared account not found' });
    }

    // Only owner can create payment
    if (account.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only account owner can create payment' });
    }

    // Check if group payment exists
    if (!account.groupPayment || account.groupPayment.status !== 'pending') {
      return res.status(400).json({ 
        error: 'No pending group payment found' 
      });
    }

    // Verify all contributions are committed
    if (account.groupPayment.totalCommitted < account.groupPayment.targetAmount) {
      return res.status(400).json({ 
        error: 'Not all contributions committed',
        message: `Committed: £${account.groupPayment.totalCommitted}, Required: £${account.groupPayment.targetAmount}`,
        remaining: account.groupPayment.targetAmount - account.groupPayment.totalCommitted
      });
    }

    // Create PayPal payment for the full amount
    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?accountId=${sharedAccountId}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel?accountId=${sharedAccountId}`
      },
      transactions: [{
        item_list: {
          items: [{
            name: account.groupPayment.description || `Group payment for ${account.name}`,
            sku: `group_payment_${sharedAccountId}`,
            price: account.groupPayment.targetAmount.toFixed(2),
            currency: 'GBP',
            quantity: 1
          }]
        },
        amount: {
          currency: 'GBP',
          total: account.groupPayment.targetAmount.toFixed(2)
        },
        description: account.groupPayment.description || `Group payment: ${account.name}`,
        payee: merchantEmail ? {
          email: merchantEmail
        } : undefined,
        custom: JSON.stringify({
          sharedAccountId: sharedAccountId,
          groupPayment: true,
          contributions: account.groupPayment.contributions.map(c => ({
            userId: c.userId.toString(),
            amount: c.amount
          }))
        })
      }]
    };

    // Wrap PayPal callback in Promise
    await new Promise((resolve, reject) => {
      paypal.payment.create(createPaymentJson, (error, payment) => {
        if (error) {
          console.error('PayPal Payment Creation Error:', error);
          reject(error);
          return;
        }

        // Update account with payment ID
        account.groupPayment.paymentId = payment.id;
        account.groupPayment.status = 'payment_created';
        account.groupPayment.paymentCreatedAt = new Date();

        account.save().then(() => {
          // Find approval URL
          const approvalUrl = payment.links.find(link => link.rel === 'approval_url');

          res.json({
            success: true,
            message: 'Group payment created. Owner must approve on PayPal.',
            paymentId: payment.id,
            approvalUrl: approvalUrl.href,
            amount: account.groupPayment.targetAmount,
            currency: 'GBP',
            note: 'The account owner will be redirected to PayPal to complete the payment. Each member has already committed their share.'
          });
          resolve(payment);
        }).catch(saveError => {
          console.error('Save Error:', saveError);
          reject(saveError);
        });
      });
    });
  } catch (error) {
    console.error('Create Group Payment Error:', error);
    res.status(500).json({ 
      error: 'Failed to create group payment',
      message: error.message 
    });
  }
};

// Get group payment status
exports.getGroupPaymentStatus = async (req, res) => {
  try {
    const { sharedAccountId } = req.params;
    const userId = req.user.userId;

    // Find shared account
    const account = await SharedAccount.findById(sharedAccountId)
      .populate('groupPayment.contributions.userId', 'name email');

    if (!account) {
      return res.status(404).json({ error: 'Shared account not found' });
    }

    // Verify user is a member
    const isMember = account.owner.toString() === userId || 
                    account.members.some(m => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this account' });
    }

    if (!account.groupPayment) {
      return res.json({
        success: true,
        hasGroupPayment: false,
        message: 'No group payment set up'
      });
    }

    res.json({
      success: true,
      hasGroupPayment: true,
      groupPayment: {
        targetAmount: account.groupPayment.targetAmount,
        totalCommitted: account.groupPayment.totalCommitted,
        remaining: account.groupPayment.targetAmount - account.groupPayment.totalCommitted,
        status: account.groupPayment.status,
        paymentId: account.groupPayment.paymentId,
        description: account.groupPayment.description,
        contributions: account.groupPayment.contributions.map(c => ({
          userId: c.userId._id || c.userId,
          userName: c.userId.name || 'Unknown',
          amount: c.amount,
          status: c.status,
          committedAt: c.committedAt
        })),
        progress: account.groupPayment.targetAmount > 0 
          ? (account.groupPayment.totalCommitted / account.groupPayment.targetAmount * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Get Group Payment Status Error:', error);
    res.status(500).json({ 
      error: 'Failed to get group payment status',
      message: error.message 
    });
  }
};

// Cancel group payment (before payment is created)
exports.cancelGroupPayment = async (req, res) => {
  try {
    const { sharedAccountId } = req.body;
    const userId = req.user.userId;

    // Find shared account
    const account = await SharedAccount.findById(sharedAccountId);
    if (!account) {
      return res.status(404).json({ error: 'Shared account not found' });
    }

    // Only owner can cancel
    if (account.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only account owner can cancel group payment' });
    }

    // Only cancel if payment hasn't been created yet
    if (account.groupPayment && account.groupPayment.status === 'payment_created') {
      return res.status(400).json({ 
        error: 'Cannot cancel - payment already created. Cancel the PayPal payment instead.' 
      });
    }

    // Reset group payment
    account.groupPayment = null;
    await account.save();

    res.json({
      success: true,
      message: 'Group payment cancelled. All commitments have been cleared.'
    });
  } catch (error) {
    console.error('Cancel Group Payment Error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel group payment',
      message: error.message 
    });
  }
};

