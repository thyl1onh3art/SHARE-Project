const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

// Helper function to calculate per-person amount
const calculatePerPersonAmount = (targetAmount, memberCount) => {
  const totalParticipants = memberCount + 1; // owner + members
  return totalParticipants > 0 ? targetAmount / totalParticipants : 0;
};

// Create a shared account
exports.createSharedAccount = async (req, res) => {
  try {
    const { name, description, targetAmount, targetDate, memberIds } = req.body;
    
    // Validate required fields
    if (!name || !description || !targetAmount || !targetDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, targetAmount, and targetDate are required' 
      });
    }

    // Validate targetDate is in the future
    const targetDateObj = new Date(targetDate);
    if (isNaN(targetDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid target date' });
    }
    if (targetDateObj <= new Date()) {
      return res.status(400).json({ message: 'Target date must be in the future' });
    }

    // Prepare members array (owner is automatically included, but not in members array)
    const members = memberIds && Array.isArray(memberIds) ? memberIds : [];
    const totalParticipants = members.length + 1; // owner + members
    const perPersonAmount = calculatePerPersonAmount(targetAmount, members.length);

    const sharedAccount = new SharedAccount({
      owner: req.user.userId,
      name: name.trim(),
      description: description.trim(),
      targetAmount: parseFloat(targetAmount),
      targetDate: targetDateObj,
      perPersonAmount: Math.round(perPersonAmount * 100) / 100, // Round to 2 decimal places
      members,
      financeRecords: [],
    });
    
    await sharedAccount.save();
    
    // Populate members for response
    const populatedAccount = await SharedAccount.findById(sharedAccount._id)
      .populate('members', 'firstName lastName email');
    
    res.status(201).json(populatedAccount);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List shared accounts for the user (owner or member)
exports.getUserSharedAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Fetch accounts and populate owner and members with user details
    const accounts = await SharedAccount.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    })
      .populate('owner', 'name firstName lastName email')
      .populate('members', 'name firstName lastName email');
    
    // Recalculate perPersonAmount for each account to ensure it's always accurate
    for (const account of accounts) {
      if (account.targetAmount && account.targetAmount > 0) {
        const currentMemberCount = Array.isArray(account.members) ? account.members.length : 0;
        account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, currentMemberCount) * 100) / 100;
        // Save the updated perPersonAmount
        await account.save();
      }
    }
    
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
    
    // Recalculate perPersonAmount to ensure it's always accurate
    if (account.targetAmount && account.targetAmount > 0) {
      const currentMemberCount = Array.isArray(account.members) ? account.members.length : 0;
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, currentMemberCount) * 100) / 100;
      // Save the updated perPersonAmount
      await account.save();
    }
    
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a shared account (owner only)
exports.updateSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, description, targetAmount, targetDate, memberIds, action } = req.body;

    // Find the shared account
    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    // Only the owner can update the account
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can update this account' });
    }

    // Update account name if provided
    if (name !== undefined) {
      account.name = name.trim();
    }

    // Update description if provided
    if (description !== undefined) {
      account.description = description.trim();
    }

    // Update target amount if provided
    if (targetAmount !== undefined) {
      account.targetAmount = parseFloat(targetAmount);
      // Recalculate per-person amount
      const totalParticipants = account.members.length + 1;
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, account.members.length) * 100) / 100;
    }

    // Update target date if provided
    if (targetDate !== undefined) {
      const targetDateObj = new Date(targetDate);
      if (isNaN(targetDateObj.getTime())) {
        return res.status(400).json({ message: 'Invalid target date' });
      }
      if (targetDateObj <= new Date()) {
        return res.status(400).json({ message: 'Target date must be in the future' });
      }
      account.targetDate = targetDateObj;
    }

    // Handle member management
    let membersChanged = false;
    if (memberIds !== undefined && Array.isArray(memberIds)) {
      if (action === 'add') {
        // Add new members (avoid duplicates and owner)
        const existingMembers = account.members.map(m => m.toString());
        const ownerId = account.owner.toString();
        const newMembers = memberIds.filter(
          memberId => !existingMembers.includes(memberId) && memberId !== ownerId
        );
        if (newMembers.length > 0) {
          account.members.push(...newMembers);
          membersChanged = true;
        }
      } else if (action === 'remove') {
        // Remove members (but not the owner)
        const ownerId = account.owner.toString();
        const beforeCount = account.members.length;
        account.members = account.members.filter(
          member => !memberIds.includes(member.toString()) && member.toString() !== ownerId
        );
        if (account.members.length !== beforeCount) {
          membersChanged = true;
        }
      } else {
        // Replace members list (but always keep the owner)
        const ownerId = account.owner.toString();
        const newMembers = memberIds.filter(id => id !== ownerId);
        if (JSON.stringify(account.members.map(m => m.toString()).sort()) !== JSON.stringify(newMembers.sort())) {
          account.members = newMembers;
          membersChanged = true;
        }
      }
    }

    // Recalculate per-person amount if members changed or target amount changed
    if (membersChanged || targetAmount !== undefined) {
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, account.members.length) * 100) / 100;
    }

    // Save the updated account
    await account.save();

    // Populate members for response
    const updatedAccount = await SharedAccount.findById(id)
      .populate('members', 'firstName lastName email');

    res.json({
      message: 'Shared account updated successfully',
      account: updatedAccount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a shared account (owner only)
exports.deleteSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the shared account
    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    // Only the owner can delete the account
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can delete this account' });
    }

    // Remove sharedAccount reference from related finance records
    if (account.financeRecords && account.financeRecords.length > 0) {
      await FinanceRecord.updateMany(
        { _id: { $in: account.financeRecords } },
        { $unset: { sharedAccount: '' } }
      );
    }

    // Delete the shared account
    await SharedAccount.findByIdAndDelete(id);

    res.json({ message: 'Shared account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};