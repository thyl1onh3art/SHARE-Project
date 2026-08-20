const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const Invite = require('../models/Invite');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const mongoose = require('mongoose');
const {
  canReadSharedAccount,
  canMutateSharedAccount
} = require('../utils/sharedAccountAccess');

// Helper: Send SMS via Twilio
const sendSMS = (to, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
};

// Helper function to calculate per-person amount
const calculatePerPersonAmount = (targetAmount, memberCount) => {
  const totalParticipants = memberCount + 1; // owner + members
  return totalParticipants > 0 ? targetAmount / totalParticipants : 0;
};

// Create a shared account
exports.createSharedAccount = async (req, res) => {
  try {
    const { name, description, targetAmount, targetDate, memberIds, invites } = req.body;
    const senderId = req.user.userId;
    
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
      owner: senderId,
      name: name.trim(),
      description: description.trim(),
      targetAmount: parseFloat(targetAmount),
      targetDate: targetDateObj,
      perPersonAmount: Math.round(perPersonAmount * 100) / 100, // Round to 2 decimal places
      members,
      financeRecords: [],
    });
    
    await sharedAccount.save();
    
    // Create invitations if provided
    const createdInvites = [];
    if (invites && Array.isArray(invites) && invites.length > 0) {
      for (const inviteData of invites) {
        const { recipientEmail, recipientPhone } = inviteData;
        
        // Skip if email is not provided (email is required for invite acceptance)
        if (!recipientEmail?.trim()) {
          continue;
        }
        
        // Check for existing pending invite
        const existingInvite = await Invite.findOne({
          sharedAccount: sharedAccount._id,
          $or: [
            { recipientEmail: recipientEmail.trim() },
            ...(recipientPhone?.trim() ? [{ recipientPhone: recipientPhone.trim() }] : [])
          ],
          status: 'pending'
        });
        
        if (existingInvite) {
          continue; // Skip if invite already exists
        }
        
        // Create invite
        const invite = new Invite({
          sender: senderId,
          recipientEmail: recipientEmail.trim(),
          recipientPhone: recipientPhone?.trim(),
          sharedAccount: sharedAccount._id
        });
        await invite.save();
        createdInvites.push(invite);
        
        // Send email notification
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail.trim(),
            subject: 'You have been invited to a shared account',
            text: `You have been invited to join the shared account "${sharedAccount.name}". Please log in to accept the invite.`
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
          });
        } catch (emailError) {
          console.error('Error setting up email:', emailError);
        }
        
        // Send SMS notification if phone provided
        if (recipientPhone?.trim()) {
          try {
            sendSMS(recipientPhone.trim(), `You have been invited to join the shared account '${sharedAccount.name}'. Please log in to accept the invite.`)
              .then(message => console.log('SMS sent:', message.sid))
              .catch(error => console.error('Error sending SMS:', error));
          } catch (smsError) {
            console.error('Error sending SMS:', smsError);
          }
        }
      }
    }
    
    // Populate members for response
    const populatedAccount = await SharedAccount.findById(sharedAccount._id)
      .populate('members', 'firstName lastName email');
    
    res.status(201).json({
      sharedAccount: populatedAccount,
      invitesCreated: createdInvites.length,
      message: createdInvites.length > 0 
        ? `Shared account created and ${createdInvites.length} invitation(s) sent`
        : 'Shared account created successfully'
    });
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
      .populate('members', 'name firstName lastName email')
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: 'firstName lastName email' }
      });
    
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
// Read: current owner/member, or former participant with own historical FinanceRecord on this pot.
exports.getSharedAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    const account = await SharedAccount.findById(id)
      .populate('members', 'name email')
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: 'name email' }
      });
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    if (!(await canReadSharedAccount(account, req.user.userId))) {
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

// Transfer ownership of a shared account (owner only)
exports.transferOwnership = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { newOwnerId, removeCurrentOwner } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: 'New owner ID is required' });
    }

    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can transfer ownership' });
    }

    const memberIds = account.members.map((member) => member.toString());
    if (!memberIds.includes(newOwnerId)) {
      return res.status(400).json({ message: 'New owner must be an existing member of the account' });
    }

    const previousOwnerId = account.owner.toString();
    account.owner = newOwnerId;
    account.members = account.members.filter((member) => member.toString() !== newOwnerId);

    if (!removeCurrentOwner) {
      if (!account.members.some((member) => member.toString() === previousOwnerId)) {
        account.members.push(previousOwnerId);
      }
    } else {
      account.members = account.members.filter((member) => member.toString() !== previousOwnerId);
    }

    await account.save();

    const updatedAccount = await SharedAccount.findById(id)
      .populate('owner', 'firstName lastName email')
      .populate('members', 'firstName lastName email');

    res.json({
      message: 'Ownership transferred successfully',
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

// Withdraw funds from shared account (participant can withdraw their contributions)
exports.withdrawFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid withdrawal amount is required' });
    }

    // Get the shared account
    const sharedAccount = await SharedAccount.findById(id);
    if (!sharedAccount) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    // Mutations require current owner/member — historical read access is not enough
    if (!canMutateSharedAccount(sharedAccount, userId)) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this account.' });
    }

    // Calculate user's total contributions (input records only)
    const userInputRecords = await FinanceRecord.find({
      sharedAccount: id,
      user: userId,
      type: 'input'
    });

    const totalContributions = userInputRecords.reduce((sum, record) => sum + (record.amount || 0), 0);

    // Calculate user's total withdrawals (output records)
    const userOutputRecords = await FinanceRecord.find({
      sharedAccount: id,
      user: userId,
      type: 'output'
    });

    const totalWithdrawals = userOutputRecords.reduce((sum, record) => sum + (record.amount || 0), 0);

    // Calculate available withdrawal amount
    const availableAmount = totalContributions - totalWithdrawals;

    if (amount > availableAmount) {
      return res.status(400).json({ 
        message: `Insufficient funds. You can withdraw up to £${availableAmount.toFixed(2)} (your total contributions: £${totalContributions.toFixed(2)}, already withdrawn: £${totalWithdrawals.toFixed(2)})` 
      });
    }

    // Check account balance
    const allRecords = await FinanceRecord.find({ sharedAccount: id });
    const accountBalance = allRecords.reduce((sum, record) => {
      return sum + (record.type === 'input' ? record.amount : -record.amount);
    }, 0);

    if (amount > accountBalance) {
      return res.status(400).json({ 
        message: `Insufficient account balance. Account has £${accountBalance.toFixed(2)}` 
      });
    }

    // Create withdrawal record (output from shared account)
    const withdrawalRecord = new FinanceRecord({
      user: userId,
      type: 'output',
      amount: parseFloat(amount),
      date: new Date(),
      description: description || `Withdrawal from ${sharedAccount.name}`,
      sharedAccount: id
    });

    await withdrawalRecord.save();

    // Add finance record to shared account
    if (!sharedAccount.financeRecords) {
      sharedAccount.financeRecords = [];
    }
    sharedAccount.financeRecords.push(withdrawalRecord._id);
    await sharedAccount.save();

    // Create input record in user's personal account (add to personal balance)
    const personalInputRecord = new FinanceRecord({
      user: userId,
      type: 'input',
      amount: parseFloat(amount),
      date: new Date(),
      description: `Withdrawal from shared account: ${sharedAccount.name}`,
      sharedAccount: null // This is a personal account record
    });

    await personalInputRecord.save();

    res.status(201).json({
      message: 'Withdrawal successful',
      withdrawalRecord,
      availableAmount: availableAmount - amount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};