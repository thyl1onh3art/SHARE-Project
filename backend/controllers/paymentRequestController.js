const PaymentRequest = require('../models/PaymentRequest');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

const resolveId = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

const getParticipantIds = (sharedAccount) => {
  const ownerId = resolveId(sharedAccount.owner);
  const memberIds = (sharedAccount.members || []).map((member) => resolveId(member));
  return { ownerId, memberIds, allParticipants: [ownerId, ...memberIds].filter(Boolean) };
};

const isAccountParticipant = (sharedAccount, userId) => {
  const { allParticipants } = getParticipantIds(sharedAccount);
  return allParticipants.includes(userId.toString());
};

const userHasVoted = (paymentRequest, userId) => {
  const userIdStr = userId.toString();
  const hasApproved = (paymentRequest.approvals || []).some(
    (approval) => resolveId(approval.user) === userIdStr
  );
  const hasRejected = (paymentRequest.rejections || []).some(
    (rejection) => resolveId(rejection.user) === userIdStr
  );
  return { hasApproved, hasRejected };
};

const loadActiveSharedAccount = async (sharedAccountRef) => {
  const sharedAccountId = resolveId(sharedAccountRef);
  if (!sharedAccountId) {
    return { error: { status: 400, message: 'This settlement request is historical only. The Trip Money pot no longer exists.' } };
  }

  const sharedAccount = await SharedAccount.findById(sharedAccountId);
  if (!sharedAccount) {
    return { error: { status: 404, message: 'Shared account not found' } };
  }
  if (sharedAccount.isDeleted) {
    return {
      error: {
        status: 400,
        message: 'This Trip Money pot is archived. Settlement records cannot be changed.'
      }
    };
  }

  await sharedAccount.populate('owner', 'firstName lastName email');
  await sharedAccount.populate('members', 'firstName lastName email');
  return { sharedAccount };
};

// Create a settlement-record approval request (ledger coordination only)
exports.createPaymentRequest = async (req, res) => {
  try {
    const { sharedAccountId, amount, description, requestType } = req.body;
    const userId = req.user.userId;

    if (!sharedAccountId || !amount) {
      return res.status(400).json({
        message: 'Missing required fields: sharedAccountId and amount are required'
      });
    }

    // Withdrawal request type from recovered WIP is deferred — not exposed as customer API.
    if (requestType && requestType !== 'payment') {
      return res.status(400).json({
        message:
          'Only settlement records are supported. Contribution reversal uses Trip Money reverse-recorded-contribution, not a withdrawal request.'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    if (sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. Settlement records cannot be created.'
      });
    }

    await sharedAccount.populate('owner', 'firstName lastName email');
    await sharedAccount.populate('members', 'firstName lastName email');

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({
        message: 'Access denied. You must be a current traveller on this Trip Money pot.'
      });
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
        message:
          'There is already a pending settlement request for this Trip Money pot. Wait for it to be resolved or cancel it.'
      });
    }

    const paymentRequest = new PaymentRequest({
      sharedAccount: sharedAccountId,
      requestedBy: userId,
      amount: parsedAmount,
      description: description || `Settlement record for ${sharedAccount.name}`,
      requestType: 'payment',
      requiredApprovals,
      status: 'pending'
    });

    await paymentRequest.save();
    await paymentRequest.populate('requestedBy', 'firstName lastName email');
    await paymentRequest.populate('sharedAccount', 'name');

    res.status(201).json({
      message:
        'Settlement request created. Travellers must approve before the ledger settlement is recorded. SHARE does not send bank payments.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Pending settlement requests for the user's active Trip Money pots
exports.getPaymentRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userAccounts = await SharedAccount.find({
      isDeleted: { $ne: true },
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id');

    const accountIds = userAccounts.map((acc) => acc._id);

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

/**
 * Actionable settlement-approval count for the authenticated user.
 * Derived per-user from pending requests where the user has not yet approved/rejected.
 * Not a shared readAt field (unsafe for multi-recipient semantics).
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userAccounts = await SharedAccount.find({
      isDeleted: { $ne: true },
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id');

    const accountIds = userAccounts.map((account) => account._id);

    const paymentRequests = await PaymentRequest.find({
      sharedAccount: { $in: accountIds },
      status: 'pending',
      expiresAt: { $gt: new Date() },
      requestedBy: { $ne: userId }
    });

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
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    if (paymentRequest.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot approve a cancelled settlement request' });
    }
    if (paymentRequest.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot approve a rejected settlement request' });
    }
    if (paymentRequest.status === 'executed' || paymentRequest.status === 'approved') {
      return res.status(400).json({
        message: 'This settlement request has already been completed. No further ledger activity will be recorded.'
      });
    }
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Settlement request is already ${paymentRequest.status}`
      });
    }

    if (paymentRequest.expiresAt < new Date()) {
      paymentRequest.status = 'cancelled';
      await paymentRequest.save();
      return res.status(400).json({ message: 'Settlement request has expired and was cancelled' });
    }

    const { sharedAccount, error } = await loadActiveSharedAccount(paymentRequest.sharedAccount);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (resolveId(paymentRequest.requestedBy) === userId.toString()) {
      return res.status(400).json({
        message: 'You cannot approve your own settlement request. Cancel it instead if it is no longer needed.'
      });
    }

    const { hasApproved, hasRejected } = userHasVoted(paymentRequest, userId);
    if (hasApproved) {
      return res.status(400).json({ message: 'You have already approved this settlement request' });
    }
    if (hasRejected) {
      return res.status(400).json({ message: 'You have already rejected this settlement request' });
    }

    paymentRequest.approvals.push({
      user: userId,
      status: 'approved',
      timestamp: new Date()
    });
    await paymentRequest.save();

    const approvalCount = paymentRequest.approvals.length;
    let executed = false;

    if (approvalCount >= paymentRequest.requiredApprovals) {
      // Atomically claim execution so concurrent approvals cannot double-write ledger output
      const claimed = await PaymentRequest.findOneAndUpdate(
        { _id: paymentRequest._id, status: 'pending' },
        { $set: { status: 'executed' } },
        { new: true }
      );

      if (claimed) {
        const requestedById = resolveId(paymentRequest.requestedBy);
        const sharedAccountId = sharedAccount._id;

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
        executed = true;
      }
    }

    const refreshed = await PaymentRequest.findById(paymentRequest._id)
      .populate('requestedBy', 'firstName lastName email')
      .populate('sharedAccount', 'name')
      .populate('approvals.user', 'firstName lastName email')
      .populate('rejections.user', 'firstName lastName email');

    res.json({
      message: executed
        ? 'Settlement record approved and recorded on the Trip Money ledger. SHARE does not send bank payments.'
        : 'Settlement record approved. Waiting for more traveller approvals.',
      paymentRequest: refreshed
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId).populate('sharedAccount');

    if (!paymentRequest) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    if (paymentRequest.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot reject a cancelled settlement request' });
    }
    if (paymentRequest.status === 'executed' || paymentRequest.status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject a completed settlement request' });
    }
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Settlement request is already ${paymentRequest.status}`
      });
    }

    const { sharedAccount, error } = await loadActiveSharedAccount(paymentRequest.sharedAccount);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (!isAccountParticipant(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (resolveId(paymentRequest.requestedBy) === userId.toString()) {
      return res.status(400).json({
        message: 'Use Cancel settlement request for your own pending request'
      });
    }

    const { hasApproved, hasRejected } = userHasVoted(paymentRequest, userId);
    if (hasApproved) {
      return res.status(400).json({ message: 'You have already approved this settlement request' });
    }
    if (hasRejected) {
      return res.status(400).json({ message: 'You have already rejected this settlement request' });
    }

    paymentRequest.rejections.push({
      user: userId,
      timestamp: new Date()
    });
    paymentRequest.status = 'rejected';
    await paymentRequest.save();

    res.json({
      message: 'Settlement record rejected. No ledger settlement was recorded.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Cancel pending settlement request (requester only) — history retained as cancelled
exports.cancelPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const paymentRequest = await PaymentRequest.findById(requestId).populate('sharedAccount');
    if (!paymentRequest) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    if (resolveId(paymentRequest.requestedBy) !== userId.toString()) {
      return res.status(403).json({ message: 'Only the requester can cancel this settlement request' });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot cancel a settlement request that is already ${paymentRequest.status}`
      });
    }

    // Archived pots are read-only (Integration 4); cancel is a mutation.
    const sharedAccountId = resolveId(paymentRequest.sharedAccount);
    if (sharedAccountId) {
      const sharedAccount = await SharedAccount.findById(sharedAccountId);
      if (sharedAccount?.isDeleted) {
        return res.status(400).json({
          message: 'This Trip Money pot is archived. Settlement records cannot be changed.'
        });
      }
    }

    paymentRequest.status = 'cancelled';
    await paymentRequest.save();

    res.json({
      message: 'Settlement request cancelled. No ledger settlement was recorded.',
      paymentRequest
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
