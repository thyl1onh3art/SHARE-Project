const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const Invite = require('../models/Invite');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { rememberFriendByEmail } = require('../services/friendService');
const paymentRequestController = require('./paymentRequestController');
const {
  resolveUserId,
  isAccountParticipant,
  hasSharedAccountAccess
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

const USER_PROFILE_FIELDS = 'name firstName lastName email';

const getSharedAccountBalance = async (sharedAccountId) => {
  const records = await FinanceRecord.find({ sharedAccount: sharedAccountId });
  return records.reduce(
    (sum, record) => sum + (record.type === 'input' ? record.amount : -record.amount),
    0
  );
};

// Ensure owner and every member ID resolves to a full user profile
const enrichAccountProfiles = async (account) => {
  const accountData = account.toObject ? account.toObject({ virtuals: true }) : { ...account };
  const ownerId = resolveUserId(accountData.owner);
  const memberIds = (accountData.members || []).map(resolveUserId).filter(Boolean);
  const userIds = [...new Set([...(ownerId ? [ownerId] : []), ...memberIds])];

  if (!userIds.length) return accountData;

  const users = await User.find({ _id: { $in: userIds } }).select(USER_PROFILE_FIELDS);
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  if (ownerId) {
    accountData.owner = userMap.get(ownerId) || accountData.owner;
  }

  accountData.members = memberIds.map((memberId) => (
    userMap.get(memberId) || { _id: memberId, email: 'Unknown member' }
  ));

  return accountData;
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
        
        const normalizedEmail = recipientEmail.trim().toLowerCase();
        const normalizedPhone = recipientPhone?.trim();

        // Check for existing pending invite
        const existingInvite = await Invite.findOne({
          sharedAccount: sharedAccount._id,
          $or: [
            { recipientEmail: normalizedEmail },
            ...(normalizedPhone ? [{ recipientPhone: normalizedPhone }] : [])
          ],
          status: 'pending'
        });
        
        if (existingInvite) {
          continue; // Skip if invite already exists
        }
        
        // Create invite
        const invite = new Invite({
          sender: senderId,
          recipientEmail: normalizedEmail,
          recipientPhone: normalizedPhone,
          sharedAccount: sharedAccount._id
        });
        await invite.save();
        createdInvites.push(invite);
        await rememberFriendByEmail(senderId, normalizedEmail);
        
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
      .populate('owner', 'name firstName lastName email')
      .populate('members', 'name firstName lastName email');
    
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

    const financeAccountIds = await FinanceRecord.distinct('sharedAccount', {
      user: userId,
      sharedAccount: { $exists: true, $ne: null }
    });

    // Fetch accounts the user owns, belongs to, or has contributed to
    const accounts = await SharedAccount.find({
      isDeleted: { $ne: true },
      $or: [
        { owner: userId },
        { members: userId },
        { _id: { $in: financeAccountIds } }
      ]
    })
      .populate('owner', USER_PROFILE_FIELDS)
      .populate('members', USER_PROFILE_FIELDS)
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: USER_PROFILE_FIELDS }
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

    const enrichedAccounts = await Promise.all(accounts.map((account) => enrichAccountProfiles(account)));
    
    res.json(enrichedAccounts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get details of a shared account (including finance records)
exports.getSharedAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SharedAccount.findById(id)
      .populate('owner', USER_PROFILE_FIELDS)
      .populate('members', USER_PROFILE_FIELDS)
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: USER_PROFILE_FIELDS }
      });
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    if (account.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    // Allow owner, members, or anyone with transaction history on this account
    if (!(await hasSharedAccountAccess(account, req.user.userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Recalculate perPersonAmount to ensure it's always accurate
    if (account.targetAmount && account.targetAmount > 0) {
      const currentMemberCount = Array.isArray(account.members) ? account.members.length : 0;
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, currentMemberCount) * 100) / 100;
      // Save the updated perPersonAmount
      await account.save();
    }
    
    const enrichedAccount = await enrichAccountProfiles(account);
    res.json(enrichedAccount);
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

// Delete a shared account (owner only) — soft delete, preserves transaction history
exports.deleteSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can delete this account' });
    }

    if (account.isDeleted) {
      return res.status(400).json({ message: 'Shared account is already deleted' });
    }

    const balance = await getSharedAccountBalance(id);
    if (balance > 0) {
      return res.status(400).json({
        message: 'This account still has funds. Transfer administration to another member before deleting.',
        balance
      });
    }

    await FinanceRecord.updateMany(
      { sharedAccount: id },
      { $set: { archivedAccountName: account.name } }
    );

    account.isDeleted = true;
    account.deletedAt = new Date();
    await account.save();

    res.json({
      message: 'Shared account deleted. All transaction records have been kept for your history.',
      archivedAccountName: account.name
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Permanently delete a shared account (owner only) — removes account from database
exports.permanentlyDeleteSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can permanently delete this account' });
    }

    const pendingPaymentRequest = await PaymentRequest.findOne({
      sharedAccount: id,
      status: 'pending'
    });
    if (pendingPaymentRequest) {
      return res.status(400).json({
        message: 'Resolve or cancel the pending payment or withdrawal approval before permanently deleting this account.'
      });
    }

    const balance = await getSharedAccountBalance(id);
    if (balance > 0) {
      return res.status(400).json({
        message: 'This account still has funds. Transfer administration to another member before deleting.',
        balance
      });
    }

    await FinanceRecord.updateMany(
      { sharedAccount: id },
      {
        $set: { archivedAccountName: account.name },
        $unset: { sharedAccount: '' }
      }
    );

    await Invite.deleteMany({ sharedAccount: id });
    await PaymentRequest.deleteMany({ sharedAccount: id });
    await SharedAccount.findByIdAndDelete(id);

    res.json({
      message: 'Shared account permanently deleted. Transaction history has been archived in your finance records.',
      archivedAccountName: account.name
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Withdraw funds from shared account — creates an approval request instead of moving money immediately
exports.withdrawFunds = async (req, res) => {
  req.body = {
    ...req.body,
    sharedAccountId: req.params.id,
    requestType: 'withdrawal'
  };
  return paymentRequestController.createPaymentRequest(req, res);
};