const Invite = require('../models/Invite');
const SharedAccount = require('../models/SharedAccount');
const User = require('../models/User');
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

// List invites for the logged-in user (with optional status filter, only non-expired)
exports.listInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const status = req.query.status; // e.g., ?status=pending
    const now = new Date();
    const filter = {
      $or: [
        { sender: userId },
        { recipientEmail: userEmail },
        { recipientPhone: req.user.phone }
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

// Send an invite to a user by email or phone (with SMS)
exports.sendInvite = async (req, res) => {
  try {
    const { sharedAccountId, recipientEmail, recipientPhone } = req.body;
    const senderId = req.user.userId;
    const sharedAccount = await SharedAccount.findById(sharedAccountId);
    if (!sharedAccount) return res.status(404).json({ message: 'Shared account not found' });
    const senderIdStr = senderId.toString();
    const isOwner = sharedAccount.owner && sharedAccount.owner.toString() === senderIdStr;
    const isMember = Array.isArray(sharedAccount.members) && sharedAccount.members.some(
      (m) => m && m.toString() === senderIdStr
    );
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const existingInvite = await Invite.findOne({ sharedAccount: sharedAccountId, $or: [ { recipientEmail }, { recipientPhone } ], status: 'pending' });
    if (existingInvite) return res.status(400).json({ message: 'Invite already sent' });
    const invite = new Invite({ sender: senderId, recipientEmail, recipientPhone, sharedAccount: sharedAccountId });
    await invite.save();
    // Send email notification if email provided
    if (recipientEmail) {
      // Set up nodemailer transporter (example with Gmail, replace with your config)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `You're invited to join "${sharedAccount.name}" on SHARE`,
        text: `You've been invited to join "${sharedAccount.name}" on SHARE to help coordinate shared trip costs.\n\nLog in or register on SHARE, then open Invitations to accept. SHARE records contributions — it does not hold a bank balance for the group.`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    }
    // Send SMS notification if phone provided
    if (recipientPhone) {
      sendSMS(recipientPhone, `You're invited to join "${sharedAccount.name}" on SHARE. Log in, open Invitations, and accept. SHARE coordinates trip costs — it does not hold group bank funds.`)
        .then(message => console.log('SMS sent:', message.sid))
        .catch(error => console.error('Error sending SMS:', error));
    }
    res.status(201).json(invite);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Accept an invite (prevent accepting expired invites)
exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userEmail = req.user.email;
    const now = new Date();
    // Find invite
    const invite = await Invite.findById(inviteId);
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (invite.recipientEmail !== userEmail) return res.status(403).json({ message: 'Not authorized' });
    if (invite.status === 'accepted') return res.status(400).json({ message: 'Invite already accepted' });
    if (invite.expiresAt && invite.expiresAt < now) return res.status(400).json({ message: 'Invite has expired' });
    // Add user to shared account
    const sharedAccount = await SharedAccount.findById(invite.sharedAccount);
    if (!sharedAccount.members.includes(req.user.userId)) {
      sharedAccount.members.push(req.user.userId);
      await sharedAccount.save();
    }
    // Update invite status
    invite.status = 'accepted';
    await invite.save();
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
    await invite.remove();
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
    const invite = await Invite.findById(inviteId).populate('sharedAccount', 'name');
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (!invite.sender.equals(userId)) return res.status(403).json({ message: 'Not authorized' });
    // Resend email
    if (invite.recipientEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: invite.recipientEmail,
        subject: `You're invited to join "${invite.sharedAccount.name}" on SHARE`,
        text: `You've been invited to join "${invite.sharedAccount.name}" on SHARE to help coordinate shared trip costs.\n\nLog in or register on SHARE, then open Invitations to accept.`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    }
    // Resend SMS
    if (invite.recipientPhone) {
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
