const Invite = require('../models/Invite');
const SharedAccount = require('../models/SharedAccount');
const User = require('../models/User');
const { rememberFriendsMutual } = require('../services/friendService');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Helper: Send SMS via Twilio
const sendSMS = (to, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
};

const getUserContact = async (userId, tokenEmail, tokenPhone) => {
  const user = await User.findById(userId).select('email phone');
  return {
    email: (user?.email || tokenEmail || '').trim().toLowerCase(),
    phone: user?.phone || tokenPhone
  };
};

/** Pending received invites for this recipient that have not been read. */
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

const isCurrentParticipant = (sharedAccount, userId) => {
  const userIdStr = userId.toString();
  const isOwner = sharedAccount.owner && sharedAccount.owner.toString() === userIdStr;
  const isMember = Array.isArray(sharedAccount.members) && sharedAccount.members.some(
    (m) => m && m.toString() === userIdStr
  );
  return isOwner || isMember;
};

// List invites for the logged-in user (with optional status filter, only non-expired)
exports.listInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email: userEmail, phone: userPhone } = await getUserContact(
      userId,
      req.user.email,
      req.user.phone
    );
    const status = req.query.status; // e.g., ?status=pending
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
    const invites = await Invite.find(filter)
      .populate('sharedAccount', 'name description')
      .populate('sender', 'firstName lastName name email');
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/** Unread pending invitations for the authenticated recipient only. */
exports.getUnreadCount = async (req, res) => {
  try {
    const { email: userEmail, phone: userPhone } = await getUserContact(
      req.user.userId,
      req.user.email,
      req.user.phone
    );
    const count = await Invite.countDocuments(buildUnreadReceivedFilter(userEmail, userPhone));
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Mark the authenticated recipient's pending unread invitations as read.
 * Sender cannot change another person's read state.
 */
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
    res.json({
      message: 'Invitations marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/** Mark a single invitation read — recipient only. */
exports.markInviteRead = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { email: userEmail, phone: userPhone } = await getUserContact(
      req.user.userId,
      req.user.email,
      req.user.phone
    );

    const invite = await Invite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const emailMatch =
      userEmail &&
      invite.recipientEmail &&
      invite.recipientEmail.trim().toLowerCase() === userEmail;
    const phoneMatch = userPhone && invite.recipientPhone && invite.recipientPhone === userPhone;

    if (!emailMatch && !phoneMatch) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending invitations can be marked as read'
      });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invite has expired' });
    }

    if (!invite.readAt) {
      invite.readAt = new Date();
      await invite.save();
    }

    res.json({ message: 'Invitation marked as read', invite });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Send an invite to a user by email or phone (with SMS)
exports.sendInvite = async (req, res) => {
  try {
    const { sharedAccountId, recipientEmail, recipientPhone } = req.body;
    const senderId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) return res.status(404).json({ message: 'Shared account not found' });
    if (sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. New invitations cannot be sent.'
      });
    }
    if (!isCurrentParticipant(sharedAccount, senderId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const normalizedEmail = recipientEmail?.trim().toLowerCase();
    const normalizedPhone = recipientPhone?.trim();

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Either recipient email or phone must be provided' });
    }

    const existingInvite = await Invite.findOne({
      sharedAccount: sharedAccountId,
      status: 'pending',
      $or: [
        ...(normalizedEmail ? [{ recipientEmail: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ recipientPhone: normalizedPhone }] : [])
      ]
    });
    if (existingInvite) return res.status(400).json({ message: 'Invite already sent' });

    const invite = new Invite({
      sender: senderId,
      recipientEmail: normalizedEmail || '',
      recipientPhone: normalizedPhone,
      sharedAccount: sharedAccountId
    });
    await invite.save();

    // Notify when credentials exist — never fail the invite create on mail/SMS errors
    if (normalizedEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: normalizedEmail,
          subject: `You're invited to join "${sharedAccount.name}" on SHARE`,
          text: `You've been invited to join "${sharedAccount.name}" on SHARE to help coordinate shared trip costs.\n\nLog in or register on SHARE, then open Invitations to accept. SHARE records contributions — it does not hold a bank balance for the group.`
        }, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
          } else {
            console.log('Email sent:', info.response);
          }
        });
      } catch (error) {
        console.error('Error setting up email notification:', error.message);
      }
    }
    if (normalizedPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      sendSMS(normalizedPhone, `You're invited to join "${sharedAccount.name}" on SHARE. Log in, open Invitations, and accept. SHARE coordinates trip costs — it does not hold group bank funds.`)
        .then(message => console.log('SMS sent:', message.sid))
        .catch(error => console.error('Error sending SMS:', error));
    }
    // Friendship is NOT created on send — only after a genuine accept (see acceptInvite).
    res.status(201).json(invite);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Accept an invite (prevent accepting expired invites)
exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const now = new Date();
    const { email: userEmail } = await getUserContact(
      req.user.userId,
      req.user.email,
      req.user.phone
    );

    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ message: 'Invite not found' });

    const inviteEmail = (invite.recipientEmail || '').trim().toLowerCase();
    if (!userEmail || inviteEmail !== userEmail) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (invite.status === 'accepted') return res.status(400).json({ message: 'Invite already accepted' });
    if (invite.expiresAt && invite.expiresAt < now) return res.status(400).json({ message: 'Invite has expired' });

    const sharedAccount = await SharedAccount.findById(invite.sharedAccount);
    if (!sharedAccount) return res.status(404).json({ message: 'Shared account not found' });
    if (sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. Invitations can no longer be accepted.'
      });
    }

    const alreadyMember = sharedAccount.members.some(
      (id) => id && id.toString() === req.user.userId.toString()
    );
    if (!alreadyMember) {
      sharedAccount.members.push(req.user.userId);
      await sharedAccount.save();
    }

    invite.status = 'accepted';
    if (!invite.readAt) {
      invite.readAt = new Date();
    }
    await invite.save();

    // After a genuine accepted trip invitation, remember each other as reusable contacts.
    // Friends lists are one-way saved contacts; mutual add keeps both organisers' pickers useful.
    // Friendship still grants no Trip Money access by itself.
    await rememberFriendsMutual(invite.sender, req.user.userId);

    res.json({ message: 'Invite accepted', sharedAccount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Cancel (revoke) an invite
exports.cancelInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.userId;
    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (!invite.sender.equals(userId)) return res.status(403).json({ message: 'Not authorized' });
    await Invite.deleteOne({ _id: invite._id });
    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Resend an invite (email/SMS)
exports.resendInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.userId;
    const invite = await Invite.findById(inviteId).populate('sharedAccount', 'name isDeleted');
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (!invite.sender.equals(userId)) return res.status(403).json({ message: 'Not authorized' });
    if (!invite.sharedAccount) {
      return res.status(400).json({ message: 'This invitation is no longer linked to an active Trip Money pot.' });
    }
    if (invite.sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. Invitations cannot be resent.'
      });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending invitations can be resent' });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invite has expired' });
    }

    // Resend email
    if (invite.recipientEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: invite.recipientEmail,
          subject: `You're invited to join "${invite.sharedAccount.name}" on SHARE`,
          text: `You've been invited to join "${invite.sharedAccount.name}" on SHARE to help coordinate shared trip costs.\n\nLog in or register on SHARE, then open Invitations to accept.`
        }, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
          } else {
            console.log('Email sent:', info.response);
          }
        });
      } catch (error) {
        console.error('Error setting up email notification:', error.message);
      }
    }
    // Resend SMS
    if (invite.recipientPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      sendSMS(invite.recipientPhone, `You're invited to join "${invite.sharedAccount.name}" on SHARE. Log in, open Invitations, and accept.`)
        .then(message => console.log('SMS sent:', message.sid))
        .catch(error => console.error('Error sending SMS:', error));
    }
    res.json({ message: 'Invite resent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove a member from a shared account
exports.removeMember = async (req, res) => {
  try {
    const { sharedAccountId, memberId } = req.body;
    const userId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) return res.status(404).json({ message: 'Shared account not found' });
    if (sharedAccount.isDeleted) {
      return res.status(400).json({
        message: 'This Trip Money pot is archived. Membership cannot be changed.'
      });
    }
    // Only owner or the member themselves can remove
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
