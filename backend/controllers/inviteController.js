const Invite = require('../models/Invite');
const SharedAccount = require('../models/SharedAccount');
const User = require('../models/User');
const { rememberFriendByEmail, rememberFriendsMutual } = require('../services/friendService');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const sendSMS = (to, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
};

const canAccessSharedAccount = (sharedAccount, userId) => {
  const userIdStr = userId.toString();
  const isOwner = sharedAccount.owner.toString() === userIdStr;
  const isMember = sharedAccount.members.some((memberId) => memberId.toString() === userIdStr);
  return isOwner || isMember;
};

const buildUnreadReceivedFilter = (userEmail, userPhone) => {
  const now = new Date();
  const recipientConditions = [];
  const normalizedEmail = userEmail?.trim().toLowerCase();

  if (normalizedEmail) {
    recipientConditions.push({ recipientEmail: normalizedEmail });
  }
  if (userPhone) {
    recipientConditions.push({ recipientPhone: userPhone });
  }

  return {
    $and: [
      recipientConditions.length > 0
        ? { $or: recipientConditions }
        : { recipientEmail: '__none__' },
      { status: 'pending' },
      { $or: [{ readAt: null }, { readAt: { $exists: false } }] },
      { expiresAt: { $gt: now } }
    ]
  };
};

const getUserContact = async (userId, tokenEmail, tokenPhone) => {
  const user = await User.findById(userId).select('email');
  return {
    email: (user?.email || tokenEmail || '').trim().toLowerCase(),
    phone: tokenPhone
  };
};

const sendInviteNotifications = (sharedAccountName, recipientEmail, recipientPhone) => {
  try {
    if (recipientEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      transporter?.sendMail?.({
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'You have been invited to a shared account',
        text: `You have been invited to join the shared account "${sharedAccountName}". Please log in to accept the invite.`
      }, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info?.response);
        }
      });
    }
  } catch (error) {
    console.error('Error setting up email notification:', error.message);
  }

  if (recipientPhone && process.env.TWILIO_ACCOUNT_SID) {
    sendSMS(recipientPhone, `You have been invited to join the shared account '${sharedAccountName}'. Please log in to accept the invite.`)
      .then(message => console.log('SMS sent:', message.sid))
      .catch(error => console.error('Error sending SMS:', error));
  }
};

const createInviteForAccount = async ({ sharedAccount, senderId, recipientEmail, recipientPhone }) => {
  if (!recipientEmail?.trim()) {
    throw new Error('Recipient email is required');
  }

  const normalizedEmail = recipientEmail.trim().toLowerCase();
  const normalizedPhone = recipientPhone?.trim();

  const existingInvite = await Invite.findOne({
    sharedAccount: sharedAccount._id,
    status: 'pending',
    $or: [
      { recipientEmail: normalizedEmail },
      ...(normalizedPhone ? [{ recipientPhone: normalizedPhone }] : [])
    ]
  });

  if (existingInvite) {
    const error = new Error('Invite already sent');
    error.statusCode = 400;
    throw error;
  }

  const invite = new Invite({
    sender: senderId,
    recipientEmail: normalizedEmail,
    recipientPhone: normalizedPhone,
    sharedAccount: sharedAccount._id
  });
  await invite.save();
  sendInviteNotifications(sharedAccount.name, normalizedEmail, normalizedPhone);
  await rememberFriendByEmail(senderId, normalizedEmail);
  return invite;
};

exports.listInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email: userEmail, phone: userPhone } = await getUserContact(
      userId,
      req.user.email,
      req.user.phone
    );
    const status = req.query.status;
    const now = new Date();
    const filter = {
      $or: [
        { sender: userId },
        ...(userEmail ? [{ recipientEmail: userEmail }] : []),
        ...(userPhone ? [{ recipientPhone: userPhone }] : [])
      ],
      expiresAt: { $gt: now }
    };
    if (status) filter.status = status;
    const invites = await Invite.find(filter).populate('sharedAccount', 'name');
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { email: userEmail, phone: userPhone } = await getUserContact(
      req.user.userId,
      req.user.email,
      req.user.phone
    );
    const count = await Invite.countDocuments(
      buildUnreadReceivedFilter(userEmail, userPhone)
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.markInvitesRead = async (req, res) => {
  try {
    const { email: userEmail, phone: userPhone } = await getUserContact(
      req.user.userId,
      req.user.email,
      req.user.phone
    );
    const result = await Invite.updateMany(
      buildUnreadReceivedFilter(userEmail, userPhone),
      { $set: { readAt: new Date() } }
    );
    res.json({ message: 'Messages marked as read', updatedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.sendInvite = async (req, res) => {
  try {
    const { sharedAccountId, recipientEmail, recipientPhone } = req.body;
    const senderId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);

    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    if (!canAccessSharedAccount(sharedAccount, senderId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const invite = await createInviteForAccount({
      sharedAccount,
      senderId,
      recipientEmail,
      recipientPhone
    });

    res.status(201).json(invite);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.sendBulkInvite = async (req, res) => {
  try {
    const { sharedAccountId, recipients } = req.body;
    const senderId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);

    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    if (!canAccessSharedAccount(sharedAccount, senderId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required' });
    }

    const results = { success: [], failed: [] };

    for (const recipient of recipients) {
      try {
        const invite = await createInviteForAccount({
          sharedAccount,
          senderId,
          recipientEmail: recipient.recipientEmail,
          recipientPhone: recipient.recipientPhone
        });
        results.success.push({ recipient, inviteId: invite._id });
      } catch (error) {
        results.failed.push({
          recipient,
          error: error.message || 'Failed to send invite'
        });
      }
    }

    res.status(201).json({
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email?.toLowerCase();
    const now = new Date();

    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (invite.recipientEmail?.toLowerCase() !== userEmail) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (invite.status === 'accepted') return res.status(400).json({ message: 'Invite already accepted' });
    if (invite.expiresAt && invite.expiresAt < now) {
      return res.status(400).json({ message: 'Invite has expired' });
    }

    const sharedAccount = await SharedAccount.findById(invite.sharedAccount);
    if (!sharedAccount || sharedAccount.isDeleted) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    const alreadyMember = sharedAccount.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );
    if (!alreadyMember) {
      sharedAccount.members.push(userId);
      await sharedAccount.save();
    }

    invite.status = 'accepted';
    await invite.save();

    await rememberFriendsMutual(userId, invite.sender);

    res.json({ message: 'Invite accepted', sharedAccount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.cancelInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.userId;
    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (!invite.sender.equals(userId)) return res.status(403).json({ message: 'Not authorized' });
    await Invite.findByIdAndDelete(inviteId);
    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.resendInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.userId;
    const invite = await Invite.findById(inviteId).populate('sharedAccount', 'name');
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (!invite.sender.equals(userId)) return res.status(403).json({ message: 'Not authorized' });

    sendInviteNotifications(
      invite.sharedAccount?.name || 'shared account',
      invite.recipientEmail,
      invite.recipientPhone
    );

    res.json({ message: 'Invite resent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { sharedAccountId, memberId } = req.body;
    const userId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) return res.status(404).json({ message: 'Shared account not found' });
    if (!(sharedAccount.owner.equals(userId) || memberId === userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    sharedAccount.members = sharedAccount.members.filter(id => id.toString() !== memberId);
    await sharedAccount.save();
    res.json({ message: 'Member removed', sharedAccount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
