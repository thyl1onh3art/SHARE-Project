const FinanceRecord = require('../models/FinanceRecord');
const SharedAccount = require('../models/SharedAccount');
const mongoose = require('mongoose');
const {
  canReadSharedAccount,
  canMutateSharedAccount
} = require('../utils/sharedAccountAccess');

// Create a finance record
exports.createRecord = async (req, res) => {
  try {
    const { type, amount, date, description, sharedAccount } = req.body;

    // Linking activity to a Trip Money pot requires current participant status
    if (sharedAccount) {
      if (!mongoose.Types.ObjectId.isValid(sharedAccount)) {
        return res.status(404).json({ message: 'Shared account not found' });
      }
      const account = await SharedAccount.findById(sharedAccount);
      if (!account) {
        return res.status(404).json({ message: 'Shared account not found' });
      }
      if (!canMutateSharedAccount(account, req.user.userId)) {
        return res.status(403).json({
          message: 'Access denied. You must be a current member of this Trip Money pot to record activity.'
        });
      }
    }

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
      if (!mongoose.Types.ObjectId.isValid(sharedAccount)) {
        return res.status(404).json({ message: 'Shared account not found' });
      }
      const account = await SharedAccount.findById(sharedAccount);
      if (!account) {
        return res.status(404).json({ message: 'Shared account not found' });
      }

      if (!(await canReadSharedAccount(account, req.user.userId))) {
        return res.status(403).json({ message: 'Access denied. You must be a member of this account.' });
      }

      // Trip Money pot ledger (group activity for this SharedAccount), not personal-only rows
      const records = await FinanceRecord.find({ sharedAccount });
      return res.json(records);
    }

    const records = await FinanceRecord.find({ user: req.user.userId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Permanently deleted Trip Money history for the authenticated user only.
 * Soft-archived pots keep sharedAccount and are viewed via Trip Money ?archived=true.
 * Permanently deleted rows have archivedAccountName and no sharedAccount link.
 */
exports.getArchivedRecords = async (req, res) => {
  try {
    const records = await FinanceRecord.find({
      user: req.user.userId,
      archivedAccountName: { $exists: true, $nin: [null, ''] },
      $or: [
        { sharedAccount: null },
        { sharedAccount: { $exists: false } }
      ]
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a finance record
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await FinanceRecord.findOne({ _id: id, user: req.user.userId });
    if (!existing) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Preserved history from permanently deleted Trip Money is read-only
    if (existing.archivedAccountName && !existing.sharedAccount) {
      return res.status(400).json({
        message: 'This archived Trip Money activity is historical only and cannot be changed.'
      });
    }

    if (existing.sharedAccount) {
      const account = await SharedAccount.findById(existing.sharedAccount);
      if (!account || !canMutateSharedAccount(account, req.user.userId)) {
        return res.status(403).json({
          message: 'Access denied. You must be a current member of this Trip Money pot to change recorded activity.'
        });
      }
    }

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
    const existing = await FinanceRecord.findOne({ _id: id, user: req.user.userId });
    if (!existing) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (existing.archivedAccountName && !existing.sharedAccount) {
      return res.status(400).json({
        message: 'This archived Trip Money activity is historical only and cannot be removed here.'
      });
    }

    if (existing.sharedAccount) {
      const account = await SharedAccount.findById(existing.sharedAccount);
      if (!account || !canMutateSharedAccount(account, req.user.userId)) {
        return res.status(403).json({
          message: 'Access denied. You must be a current member of this Trip Money pot to remove recorded activity.'
        });
      }
    }

    const record = await FinanceRecord.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
