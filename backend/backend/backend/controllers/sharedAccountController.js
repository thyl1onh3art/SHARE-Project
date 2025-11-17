const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

// Create a shared account
exports.createSharedAccount = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const sharedAccount = new SharedAccount({
      owner: req.user.userId,
      name,
      members: [req.user.userId, ...(memberIds || [])],
      financeRecords: [],
    });
    await sharedAccount.save();
    res.status(201).json(sharedAccount);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List shared accounts for the user (owner or member)
exports.getUserSharedAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const accounts = await SharedAccount.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get details of a shared account (including finance records)
exports.getSharedAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SharedAccount.findById(id)
      .populate('members', 'name email')
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: 'name email' }
      });
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    // Only allow if user is a member or owner
    if (!account.members.some(m => m._id.equals(req.user.userId)) && !account.owner.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
