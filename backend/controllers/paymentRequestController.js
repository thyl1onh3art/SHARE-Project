const PaymentRequest = require('../models/PaymentRequest');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

// Create a payment request
exports.createPaymentRequest = async (req, res) => {
  try {
    const { sharedAccountId, amount, description } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!sharedAccountId || !amount) {
      return res.status(400).json({ 
        message: 'Missing required fields: sharedAccountId and amount are required' 
      });
    }

    // Get the shared account
    const sharedAccount = await SharedAccount.findById(sharedAccountId);

    if (!sharedAccount) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. Settlement records cannot be created.'
      });
    }

    // Populate owner and members
    await sharedAccount.populate('owner', 'firstName lastName email');
    await sharedAccount.populate('members', 'firstName lastName email');

    // Check if user is owner or member
    const ownerId = typeof sharedAccount.owner === 'object' ? sharedAccount.owner._id.toString() : sharedAccount.owner.toString();
    const isOwner = ownerId === userId;
    const isMember = sharedAccount.members.some((m) => {
      const memberId = typeof m === 'object' ? m._id.toString() : m.toString();
      return memberId === userId;
    });
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this account.' });
    }

    // Calculate required approvals (all participants except the requester)
    const ownerIdStr = typeof sharedAccount.owner === 'object' ? sharedAccount.owner._id.toString() : sharedAccount.owner.toString();
    const memberIds = sharedAccount.members.map((m) => {
      return typeof m === 'object' ? m._id.toString() : m.toString();
    });
    const allParticipants = [ownerIdStr, ...memberIds];
    const otherParticipants = allParticipants.filter(id => id !== userId);
    const requiredApprovals = otherParticipants.length;

    // Check if there's already a pending payment request for this account
    const existingRequest = await PaymentRequest.findOne({
      sharedAccount: sharedAccountId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'There is already a pending payment request for this account. Please wait for it to be resolved.' 
      });
    }

    // Create payment request
    const paymentRequest = new PaymentRequest({
      sharedAccount: sharedAccountId,
      requestedBy: userId,
      amount: parseFloat(amount),
      description: description || `Full payment for ${sharedAccount.name}`,
      requiredApprovals: requiredApprovals,
      status: 'pending'
    });

    await paymentRequest.save();

    // Populate the request for response
    await paymentRequest.populate('requestedBy', 'firstName lastName email');
    await paymentRequest.populate('sharedAccount', 'name');

    res.status(201).json({
      message: 'Payment request created. Waiting for participant approvals.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get payment requests for a user (pending approvals)
exports.getPaymentRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all shared accounts where user is a member
    const userAccounts = await SharedAccount.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).select('_id');

    const accountIds = userAccounts.map(acc => acc._id);

    // Get pending payment requests for these accounts
    const paymentRequests = await PaymentRequest.find({
      sharedAccount: { $in: accountIds },
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('sharedAccount', 'name')
      .populate('requestedBy', 'firstName lastName email')
      .populate('approvals.user', 'firstName lastName email')
      .populate('rejections.user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(paymentRequests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Approve a payment request
exports.approvePaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId)
      .populate('sharedAccount')
      .populate('requestedBy');

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    // Check if request is still pending
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Payment request is already ${paymentRequest.status}` 
      });
    }

    // Check if request has expired
    if (paymentRequest.expiresAt < new Date()) {
      paymentRequest.status = 'cancelled';
      await paymentRequest.save();
      return res.status(400).json({ message: 'Payment request has expired' });
    }

    // Resolve linked Trip Money pot (historical rows may have sharedAccount unset)
    const sharedAccountId =
      typeof paymentRequest.sharedAccount === 'object' && paymentRequest.sharedAccount
        ? paymentRequest.sharedAccount._id || paymentRequest.sharedAccount
        : paymentRequest.sharedAccount;

    if (!sharedAccountId) {
      return res.status(400).json({
        message: 'This settlement request is historical only. The Trip Money pot no longer exists.'
      });
    }

    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    await sharedAccount.populate('owner', 'firstName lastName email');
    await sharedAccount.populate('members', 'firstName lastName email');

    // Check if user is a participant
    const ownerId = typeof sharedAccount.owner === 'object' ? sharedAccount.owner._id.toString() : sharedAccount.owner.toString();
    const isOwner = ownerId === userId;
    const isMember = sharedAccount.members.some((m) => {
      const memberId = typeof m === 'object' ? m._id.toString() : m.toString();
      return memberId === userId;
    });
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user already approved or rejected
    const alreadyApproved = paymentRequest.approvals.some((a) => {
      const userIdFromApproval = typeof a.user === 'object' ? a.user._id.toString() : a.user.toString();
      return userIdFromApproval === userId;
    });
    const alreadyRejected = paymentRequest.rejections.some((r) => {
      const userIdFromRejection = typeof r.user === 'object' ? r.user._id.toString() : r.user.toString();
      return userIdFromRejection === userId;
    });

    if (alreadyApproved) {
      return res.status(400).json({ message: 'You have already approved this payment request' });
    }

    if (alreadyRejected) {
      return res.status(400).json({ message: 'You have already rejected this payment request' });
    }

    // Add approval
    paymentRequest.approvals.push({
      user: userId,
      status: 'approved',
      timestamp: new Date()
    });

    // Check if we have enough approvals
    const approvalCount = paymentRequest.approvals.length;
    if (approvalCount >= paymentRequest.requiredApprovals) {
      // Execute the payment
      paymentRequest.status = 'approved';
      
      // Create the finance record (output from shared account)
      const requestedById = typeof paymentRequest.requestedBy === 'object' 
        ? paymentRequest.requestedBy._id 
        : paymentRequest.requestedBy;
      const sharedAccountId = typeof paymentRequest.sharedAccount === 'object'
        ? paymentRequest.sharedAccount._id
        : paymentRequest.sharedAccount;
        
      const financeRecord = new FinanceRecord({
        user: requestedById,
        type: 'output',
        amount: paymentRequest.amount,
        date: new Date(),
        description: paymentRequest.description,
        sharedAccount: sharedAccountId
      });

      await financeRecord.save();

      // Add finance record to shared account
      if (!sharedAccount.financeRecords) {
        sharedAccount.financeRecords = [];
      }
      sharedAccount.financeRecords.push(financeRecord._id);
      await sharedAccount.save();
      
      // Refresh payment request to get updated status
      await paymentRequest.populate('requestedBy', 'firstName lastName email');
      await paymentRequest.populate('sharedAccount', 'name');

      paymentRequest.status = 'executed';
    }

    await paymentRequest.save();

    res.json({
      message: approvalCount >= paymentRequest.requiredApprovals 
        ? 'Payment approved and executed successfully'
        : 'Payment request approved. Waiting for more approvals.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reject a payment request
exports.rejectPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId)
      .populate('sharedAccount');

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    // Check if request is still pending
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Payment request is already ${paymentRequest.status}` 
      });
    }

    const rejectSharedAccountId =
      typeof paymentRequest.sharedAccount === 'object' && paymentRequest.sharedAccount
        ? paymentRequest.sharedAccount._id || paymentRequest.sharedAccount
        : paymentRequest.sharedAccount;

    if (!rejectSharedAccountId) {
      return res.status(400).json({
        message: 'This settlement request is historical only. The Trip Money pot no longer exists.'
      });
    }

    // Get shared account to check membership
    const sharedAccount = await SharedAccount.findById(rejectSharedAccountId);
    if (!sharedAccount) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    await sharedAccount.populate('owner', 'firstName lastName email');
    await sharedAccount.populate('members', 'firstName lastName email');

    // Check if user is a participant
    const ownerId = typeof sharedAccount.owner === 'object' ? sharedAccount.owner._id.toString() : sharedAccount.owner.toString();
    const isOwner = ownerId === userId;
    const isMember = sharedAccount.members.some((m) => {
      const memberId = typeof m === 'object' ? m._id.toString() : m.toString();
      return memberId === userId;
    });
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user already approved or rejected
    const alreadyApproved = paymentRequest.approvals.some((a) => {
      const userIdFromApproval = typeof a.user === 'object' ? a.user._id.toString() : a.user.toString();
      return userIdFromApproval === userId;
    });
    const alreadyRejected = paymentRequest.rejections.some((r) => {
      const userIdFromRejection = typeof r.user === 'object' ? r.user._id.toString() : r.user.toString();
      return userIdFromRejection === userId;
    });

    if (alreadyApproved) {
      return res.status(400).json({ message: 'You have already approved this payment request' });
    }

    if (alreadyRejected) {
      return res.status(400).json({ message: 'You have already rejected this payment request' });
    }

    // Add rejection
    paymentRequest.rejections.push({
      user: userId,
      timestamp: new Date()
    });

    // If any participant rejects, cancel the request
    paymentRequest.status = 'rejected';

    await paymentRequest.save();

    res.json({
      message: 'Payment request rejected. The payment will not be processed.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

