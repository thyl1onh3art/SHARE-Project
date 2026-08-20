const PaymentRequest = require('../models/PaymentRequest');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

const getParticipantIds = (sharedAccount) => {
  const ownerId = typeof sharedAccount.owner === 'object'
    ? sharedAccount.owner._id.toString()
    : sharedAccount.owner.toString();
  const memberIds = sharedAccount.members.map((member) => (
    typeof member === 'object' ? member._id.toString() : member.toString()
  ));
  return { ownerId, memberIds, allParticipants: [ownerId, ...memberIds] };
};

const isAccountParticipant = (sharedAccount, userId) => {
  const { allParticipants } = getParticipantIds(sharedAccount);
  return allParticipants.includes(userId.toString());
};

const validateWithdrawalAmount = async (sharedAccountId, userId, amount) => {
  const userInputRecords = await FinanceRecord.find({
    sharedAccount: sharedAccountId,
    user: userId,
    type: 'input'
  });
  const totalContributions = userInputRecords.reduce((sum, record) => sum + (record.amount || 0), 0);

  const userOutputRecords = await FinanceRecord.find({
    sharedAccount: sharedAccountId,
    user: userId,
    type: 'output'
  });
  const totalWithdrawals = userOutputRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
  const availableAmount = totalContributions - totalWithdrawals;

  if (amount > availableAmount) {
    throw new Error(
      `Insufficient funds. You can withdraw up to £${availableAmount.toFixed(2)}`
    );
  }

  const allRecords = await FinanceRecord.find({ sharedAccount: sharedAccountId });
  const accountBalance = allRecords.reduce((sum, record) => (
    sum + (record.type === 'input' ? record.amount : -record.amount)
  ), 0);

  if (amount > accountBalance) {
    throw new Error(`Insufficient account balance. Account has £${accountBalance.toFixed(2)}`);
  }

  return availableAmount;
};

const executeApprovedRequest = async (paymentRequest, sharedAccount) => {
  const requestedById = typeof paymentRequest.requestedBy === 'object'
    ? paymentRequest.requestedBy._id
    : paymentRequest.requestedBy;
  const sharedAccountId = typeof paymentRequest.sharedAccount === 'object'
    ? paymentRequest.sharedAccount._id
    : paymentRequest.sharedAccount;

  if (paymentRequest.requestType === 'withdrawal') {
    await validateWithdrawalAmount(sharedAccountId, requestedById, paymentRequest.amount);

    const withdrawalRecord = new FinanceRecord({
      user: requestedById,
      type: 'output',
      amount: paymentRequest.amount,
      date: new Date(),
      description: paymentRequest.description,
      sharedAccount: sharedAccountId
    });
    await withdrawalRecord.save();

    const personalInputRecord = new FinanceRecord({
      user: requestedById,
      type: 'input',
      amount: paymentRequest.amount,
      date: new Date(),
      description: `Withdrawal from shared account: ${sharedAccount.name}`,
      sharedAccount: null
    });
    await personalInputRecord.save();

    if (!sharedAccount.financeRecords) {
      sharedAccount.financeRecords = [];
    }
    sharedAccount.financeRecords.push(withdrawalRecord._id);
    await sharedAccount.save();
    return withdrawalRecord;
  }

  const financeRecord = new FinanceRecord({
    user: requestedById,
    type: 'output',
    amount: paymentRequest.amount,
    date: new Date(),
    description: paymentRequest.description,
    sharedAccount: sharedAccountId
  });
  await financeRecord.save();

  if (!sharedAccount.financeRecords) {
    sharedAccount.financeRecords = [];
  }
  sharedAccount.financeRecords.push(financeRecord._id);
  await sharedAccount.save();
  return financeRecord;
};

const userHasVoted = (paymentRequest, userId) => {
  const userIdStr = userId.toString();
  const hasApproved = paymentRequest.approvals.some((approval) => {
    const approvalUserId = typeof approval.user === 'object'
      ? approval.user._id.toString()
      : approval.user.toString();
    return approvalUserId === userIdStr;
  });
  const hasRejected = paymentRequest.rejections.some((rejection) => {
    const rejectionUserId = typeof rejection.user === 'object'
      ? rejection.user._id.toString()
      : rejection.user.toString();
    return rejectionUserId === userIdStr;
  });
  return { hasApproved, hasRejected };
};

const buildActionablePaymentRequestFilter = (userId, accountIds) => ({
  sharedAccount: { $in: accountIds },
  status: 'pending',
  expiresAt: { $gt: new Date() },
  requestedBy: { $ne: userId }
});

// Create a payment or withdrawal approval request
exports.createPaymentRequest = async (req, res) => {
  try {
    const { sharedAccountId, amount, description, requestType = 'payment' } = req.body;
    const userId = req.user.userId;

    if (!sharedAccountId || !amount) {
      return res.status(400).json({
        message: 'Missing required fields: sharedAccountId and amount are required'
      });
    }

    if (!['payment', 'withdrawal'].includes(requestType)) {
      return res.status(400).json({ message: 'Invalid request type' });
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    await sharedAccount.populate('owner', 'firstName lastName email');
    await sharedAccount.populate('members', 'firstName lastName email');

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this account.' });
    }

    if (requestType === 'withdrawal') {
      try {
        await validateWithdrawalAmount(sharedAccountId, userId, parsedAmount);
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    }

    const { allParticipants } = getParticipantIds(sharedAccount);
    const otherParticipants = allParticipants.filter((id) => id !== userId.toString());
    const requiredApprovals = otherParticipants.length;

    const existingRequest = await PaymentRequest.findOne({
      sharedAccount: sharedAccountId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        message: 'There is already a pending approval request for this account. Please wait for it to be resolved.'
      });
    }

    const defaultDescription = requestType === 'withdrawal'
      ? `Withdrawal request for ${sharedAccount.name}`
      : `Full payment for ${sharedAccount.name}`;

    const paymentRequest = new PaymentRequest({
      sharedAccount: sharedAccountId,
      requestedBy: userId,
      amount: parsedAmount,
      description: description || defaultDescription,
      requestType,
      requiredApprovals,
      status: 'pending'
    });

    await paymentRequest.save();
    await paymentRequest.populate('requestedBy', 'firstName lastName email');
    await paymentRequest.populate('sharedAccount', 'name');

    res.status(201).json({
      message: requestType === 'withdrawal'
        ? 'Withdrawal request created. Other participants must approve before funds are released.'
        : 'Payment request created. Waiting for participant approvals.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPaymentRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userAccounts = await SharedAccount.find({
      isDeleted: { $ne: true },
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).select('_id');

    const accountIds = userAccounts.map((account) => account._id);

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

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userAccounts = await SharedAccount.find({
      isDeleted: { $ne: true },
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id');
    const accountIds = userAccounts.map((account) => account._id);

    const paymentRequests = await PaymentRequest.find(
      buildActionablePaymentRequestFilter(userId, accountIds)
    );

    const actionableCount = paymentRequests.filter((paymentRequest) => {
      const { hasApproved, hasRejected } = userHasVoted(paymentRequest, userId);
      return !hasApproved && !hasRejected;
    }).length;

    res.json({ count: actionableCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

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

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Payment request is already ${paymentRequest.status}`
      });
    }

    if (paymentRequest.expiresAt < new Date()) {
      paymentRequest.status = 'cancelled';
      await paymentRequest.save();
      return res.status(400).json({ message: 'Payment request has expired' });
    }

    const sharedAccount = await SharedAccount.findById(paymentRequest.sharedAccount);
    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requesterId = typeof paymentRequest.requestedBy === 'object'
      ? paymentRequest.requestedBy._id.toString()
      : paymentRequest.requestedBy.toString();
    if (requesterId === userId.toString()) {
      return res.status(400).json({ message: 'You cannot approve your own request' });
    }

    const { hasApproved, hasRejected } = userHasVoted(paymentRequest, userId);
    if (hasApproved) {
      return res.status(400).json({ message: 'You have already approved this request' });
    }
    if (hasRejected) {
      return res.status(400).json({ message: 'You have already rejected this request' });
    }

    paymentRequest.approvals.push({
      user: userId,
      status: 'approved',
      timestamp: new Date()
    });

    const approvalCount = paymentRequest.approvals.length;
    if (approvalCount >= paymentRequest.requiredApprovals) {
      paymentRequest.status = 'approved';
      await executeApprovedRequest(paymentRequest, sharedAccount);
      paymentRequest.status = 'executed';
    }

    await paymentRequest.save();
    await paymentRequest.populate('requestedBy', 'firstName lastName email');
    await paymentRequest.populate('sharedAccount', 'name');

    res.json({
      message: approvalCount >= paymentRequest.requiredApprovals
        ? `${paymentRequest.requestType === 'withdrawal' ? 'Withdrawal' : 'Payment'} approved and processed successfully`
        : 'Request approved. Waiting for more approvals.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId)
      .populate('sharedAccount');

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Payment request is already ${paymentRequest.status}`
      });
    }

    const sharedAccount = await SharedAccount.findById(paymentRequest.sharedAccount);
    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requesterId = typeof paymentRequest.requestedBy === 'object'
      ? paymentRequest.requestedBy._id.toString()
      : paymentRequest.requestedBy.toString();
    if (requesterId === userId.toString()) {
      return res.status(400).json({ message: 'Use cancel to withdraw your own request' });
    }

    const { hasApproved, hasRejected } = userHasVoted(paymentRequest, userId);
    if (hasApproved) {
      return res.status(400).json({ message: 'You have already approved this request' });
    }
    if (hasRejected) {
      return res.status(400).json({ message: 'You have already rejected this request' });
    }

    paymentRequest.rejections.push({
      user: userId,
      timestamp: new Date()
    });
    paymentRequest.status = 'rejected';
    await paymentRequest.save();

    res.json({
      message: `${paymentRequest.requestType === 'withdrawal' ? 'Withdrawal' : 'Payment'} request rejected.`,
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.cancelPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId);
    if (!paymentRequest) {
      return res.status(404).json({ message: 'Payment request not found' });
    }

    if (paymentRequest.requestedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the requester can cancel this request' });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Request is already ${paymentRequest.status}`
      });
    }

    paymentRequest.status = 'cancelled';
    await paymentRequest.save();

    res.json({
      message: 'Request cancelled. No funds were moved.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
