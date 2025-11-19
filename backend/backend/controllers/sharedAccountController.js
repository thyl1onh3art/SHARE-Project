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

// Update a shared account
exports.updateSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const account = await SharedAccount.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    
    // Only owner can update
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the owner can update this account' });
    }
    
    // Update fields
    if (req.body.name !== undefined) account.name = req.body.name;
    if (req.body.description !== undefined) account.description = req.body.description;
    if (req.body.targetAmount !== undefined) account.targetAmount = req.body.targetAmount;
    if (req.body.targetDate !== undefined) account.targetDate = req.body.targetDate;
    if (req.body.perPersonAmount !== undefined) account.perPersonAmount = req.body.perPersonAmount;
    
    // Handle member removal
    if (req.body.memberIds && req.body.action === 'remove') {
      const memberIdsToRemove = req.body.memberIds.map((id: string) => id.toString());
      account.members = account.members.filter((memberId: any) => {
        const memberIdStr = memberId.toString();
        // Don't allow removing owner
        return memberIdStr !== account.owner.toString() && !memberIdsToRemove.includes(memberIdStr);
      });
    }
    
    await account.save();
    res.json({ message: 'Shared account updated successfully', account });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a shared account
exports.deleteSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const account = await SharedAccount.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    
    // Only owner can delete
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the owner can delete this account' });
    }
    
    // Remove sharedAccount reference from all finance records
    await FinanceRecord.updateMany(
      { sharedAccount: id },
      { $unset: { sharedAccount: 1 } }
    );
    
    // Delete the shared account
    await SharedAccount.findByIdAndDelete(id);
    
    res.json({ message: 'Shared account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};