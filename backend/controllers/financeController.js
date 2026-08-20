const FinanceRecord = require('../models/FinanceRecord');
const SharedAccount = require('../models/SharedAccount');
const { hasSharedAccountAccess } = require('../utils/sharedAccountAccess');

// Create a finance record
exports.createRecord = async (req, res) => {
  try {
    const { type, amount, date, description, sharedAccount } = req.body;
    const record = new FinanceRecord({
      user: req.user.userId,
      type,
      amount,
      date,
      description,
      sharedAccount,
    });
    await record.save();

    // If this record is for a shared account, add it to the shared account's financeRecords array
    if (sharedAccount) {
      const account = await SharedAccount.findById(sharedAccount);
      if (account) {
        if (!account.financeRecords) {
          account.financeRecords = [];
        }
        // Check if record is already in the array to avoid duplicates
        if (!account.financeRecords.includes(record._id)) {
          account.financeRecords.push(record._id);
          await account.save();
        }
      }
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get finance records for the logged-in user (optionally scoped to a shared account)
exports.getUserRecords = async (req, res) => {
  try {
    const { sharedAccount } = req.query;

    if (sharedAccount) {
      const account = await SharedAccount.findById(sharedAccount);
      if (!account) {
        return res.status(404).json({ message: 'Shared account not found' });
      }

      if (!(await hasSharedAccountAccess(account, req.user.userId))) {
        return res.status(403).json({ message: 'Access denied. You must be a member of this account.' });
      }

      const records = await FinanceRecord.find({ sharedAccount })
        .populate('user', 'name firstName lastName email');
      return res.json(records);
    }

    const records = await FinanceRecord.find({ user: req.user.userId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get transaction history from deleted shared accounts
exports.getArchivedRecords = async (req, res) => {
  try {
    const records = await FinanceRecord.find({
      user: req.user.userId,
      archivedAccountName: { $exists: true, $ne: null }
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await FinanceRecord.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      req.body,
      { new: true }
    );
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a finance record
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await FinanceRecord.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};